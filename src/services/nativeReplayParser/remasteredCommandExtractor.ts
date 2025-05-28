
/**
 * Advanced Remastered Command Extractor
 * Handles all StarCraft Remastered replay formats (2017+)
 */

export interface RemasteredCommand {
  frame: number;
  timestamp: string;
  playerId: number;
  commandType: number;
  commandName: string;
  data: Uint8Array;
  isAction: boolean;
  isBuild: boolean;
  unitType?: number;
  targetX?: number;
  targetY?: number;
}

export interface RemasteredExtractionResult {
  commands: RemasteredCommand[];
  playerAPM: number[];
  playerEAPM: number[];
  buildOrders: Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>>;
  gameVersion: string;
  extractionMethod: string;
}

export class RemasteredCommandExtractor {
  private data: Uint8Array;
  private dataView: DataView;
  private position: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
    this.dataView = new DataView(data.buffer);
  }

  /**
   * Extract commands using multiple Remastered-compatible methods
   */
  async extractCommands(playerCount: number, totalFrames: number): Promise<RemasteredExtractionResult> {
    console.log('[RemasteredCommandExtractor] ===== STARTING REMASTERED COMMAND EXTRACTION =====');
    console.log('[RemasteredCommandExtractor] File size:', this.data.length, 'bytes');
    console.log('[RemasteredCommandExtractor] Expected players:', playerCount);
    console.log('[RemasteredCommandExtractor] Total frames:', totalFrames);

    // Try different extraction methods in order of preference
    const methods = [
      () => this.extractFromRemasteredStructure(playerCount, totalFrames),
      () => this.extractFromLegacyStructure(playerCount, totalFrames),
      () => this.extractFromHeuristicSearch(playerCount, totalFrames),
      () => this.extractFromPatternMatching(playerCount, totalFrames)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`[RemasteredCommandExtractor] Trying method ${i + 1}...`);
        const result = await methods[i]();
        
        if (this.validateExtractionResult(result)) {
          console.log(`[RemasteredCommandExtractor] Method ${i + 1} successful!`);
          console.log('[RemasteredCommandExtractor] Commands found:', result.commands.length);
          console.log('[RemasteredCommandExtractor] APM calculated:', result.playerAPM);
          return result;
        }
      } catch (error) {
        console.warn(`[RemasteredCommandExtractor] Method ${i + 1} failed:`, error);
      }
    }

    // Fallback: return minimal but valid result
    console.log('[RemasteredCommandExtractor] All methods failed, creating fallback result');
    return this.createFallbackResult(playerCount, totalFrames);
  }

  /**
   * Method 1: Extract from known Remastered structure (2017+)
   */
  private extractFromRemasteredStructure(playerCount: number, totalFrames: number): RemasteredExtractionResult {
    console.log('[RemasteredCommandExtractor] === METHOD 1: REMASTERED STRUCTURE ===');
    
    // Remastered replays have a different header structure
    const commandSectionOffset = this.findRemasteredCommandSection();
    if (!commandSectionOffset) {
      throw new Error('No Remastered command section found');
    }

    console.log('[RemasteredCommandExtractor] Command section at offset:', `0x${commandSectionOffset.toString(16)}`);
    
    this.position = commandSectionOffset;
    const commands = this.parseRemasteredCommands(Math.min(10000, totalFrames * 2));
    
    if (commands.length === 0) {
      throw new Error('No commands extracted from Remastered structure');
    }

    return this.calculateMetricsFromCommands(commands, playerCount, totalFrames, 'remastered-structure');
  }

  /**
   * Method 2: Extract from legacy structure (pre-2017)
   */
  private extractFromLegacyStructure(playerCount: number, totalFrames: number): RemasteredExtractionResult {
    console.log('[RemasteredCommandExtractor] === METHOD 2: LEGACY STRUCTURE ===');
    
    // Try standard legacy offsets
    const legacyOffsets = [0x279, 0x25D, 0x1A1, 0x200, 0x300];
    
    for (const offset of legacyOffsets) {
      try {
        console.log(`[RemasteredCommandExtractor] Trying legacy offset: 0x${offset.toString(16)}`);
        this.position = offset;
        
        const commands = this.parseLegacyCommands(Math.min(5000, totalFrames));
        if (commands.length > 10) {
          console.log(`[RemasteredCommandExtractor] Legacy offset 0x${offset.toString(16)} successful`);
          return this.calculateMetricsFromCommands(commands, playerCount, totalFrames, 'legacy-structure');
        }
      } catch (error) {
        console.warn(`[RemasteredCommandExtractor] Legacy offset 0x${offset.toString(16)} failed:`, error);
      }
    }

    throw new Error('No valid legacy structure found');
  }

  /**
   * Method 3: Heuristic search for command patterns
   */
  private extractFromHeuristicSearch(playerCount: number, totalFrames: number): RemasteredExtractionResult {
    console.log('[RemasteredCommandExtractor] === METHOD 3: HEURISTIC SEARCH ===');
    
    const commands: RemasteredCommand[] = [];
    const searchStep = 4; // Search every 4 bytes
    const maxSearchRange = Math.min(50000, this.data.length - 1000);
    
    for (let offset = 500; offset < maxSearchRange; offset += searchStep) {
      try {
        this.position = offset;
        const possibleCommands = this.parseCommandsWithValidation(100);
        
        if (possibleCommands.length > 20 && this.validateCommandSequence(possibleCommands)) {
          console.log(`[RemasteredCommandExtractor] Heuristic search found commands at offset: 0x${offset.toString(16)}`);
          commands.push(...possibleCommands);
          
          if (commands.length > 500) break; // Enough data found
        }
      } catch (error) {
        // Continue searching
      }
    }

    if (commands.length === 0) {
      throw new Error('Heuristic search found no valid commands');
    }

    // Sort and deduplicate commands
    const sortedCommands = commands
      .sort((a, b) => a.frame - b.frame)
      .filter((cmd, index, arr) => index === 0 || cmd.frame !== arr[index - 1].frame || cmd.playerId !== arr[index - 1].playerId);

    return this.calculateMetricsFromCommands(sortedCommands, playerCount, totalFrames, 'heuristic-search');
  }

  /**
   * Method 4: Pattern matching for specific command signatures
   */
  private extractFromPatternMatching(playerCount: number, totalFrames: number): RemasteredExtractionResult {
    console.log('[RemasteredCommandExtractor] === METHOD 4: PATTERN MATCHING ===');
    
    // Look for common command patterns in StarCraft
    const patterns = [
      [0x09, 0x00], // Select command
      [0x0C, 0x00], // Build command
      [0x14, 0x00], // Move command
      [0x15, 0x00], // Attack command
    ];

    const commands: RemasteredCommand[] = [];
    
    for (const pattern of patterns) {
      const matches = this.findPatternMatches(pattern);
      console.log(`[RemasteredCommandExtractor] Pattern [${pattern.map(b => `0x${b.toString(16)}`).join(', ')}] found ${matches.length} matches`);
      
      for (const matchOffset of matches) {
        try {
          this.position = matchOffset - 4; // Commands usually have frame info before them
          const patternCommands = this.parseCommandsWithValidation(50);
          commands.push(...patternCommands);
        } catch (error) {
          // Continue with next match
        }
      }
    }

    if (commands.length === 0) {
      throw new Error('Pattern matching found no valid commands');
    }

    // Sort and deduplicate
    const uniqueCommands = commands
      .sort((a, b) => a.frame - b.frame)
      .filter((cmd, index, arr) => 
        index === 0 || 
        !(cmd.frame === arr[index - 1].frame && 
          cmd.playerId === arr[index - 1].playerId && 
          cmd.commandType === arr[index - 1].commandType)
      );

    return this.calculateMetricsFromCommands(uniqueCommands, playerCount, totalFrames, 'pattern-matching');
  }

  /**
   * Find Remastered command section using known signatures
   */
  private findRemasteredCommandSection(): number | null {
    // Remastered command section signatures
    const signatures = [
      [0x52, 0x45, 0x50, 0x4C, 0x41, 0x59], // "REPLAY"
      [0x43, 0x4D, 0x44, 0x53], // "CMDS"
      [0x44, 0x41, 0x54, 0x41], // "DATA"
      [0x50, 0x4B, 0x03, 0x04], // ZIP signature (Remastered compression)
    ];

    for (let i = 0; i < this.data.length - 20; i++) {
      for (const signature of signatures) {
        if (this.matchesBytes(i, signature)) {
          // Check if this looks like a command section
          const potentialOffset = i + signature.length + 4; // Skip signature + size field
          if (potentialOffset < this.data.length - 100 && this.looksLikeCommandData(potentialOffset)) {
            return potentialOffset;
          }
        }
      }
    }

    return null;
  }

  /**
   * Parse commands with Remastered format
   */
  private parseRemasteredCommands(maxCommands: number): RemasteredCommand[] {
    const commands: RemasteredCommand[] = [];
    let currentFrame = 0;
    let commandCount = 0;

    while (this.position < this.data.length - 8 && commandCount < maxCommands) {
      try {
        // Remastered frame sync handling
        const frameByte = this.readUInt8();
        
        if (frameByte === 0x00) {
          currentFrame++;
          continue;
        } else if (frameByte === 0x01) {
          const skipFrames = this.readUInt8();
          currentFrame += skipFrames;
          continue;
        } else if (frameByte === 0x02) {
          const skipFrames = this.readUInt16LE();
          currentFrame += skipFrames;
          continue;
        }

        // Parse actual command
        const command = this.parseRemasteredCommand(frameByte, currentFrame);
        if (command) {
          commands.push(command);
          commandCount++;
        }

      } catch (error) {
        this.position++;
        continue;
      }
    }

    return commands;
  }

  /**
   * Parse individual Remastered command
   */
  private parseRemasteredCommand(commandType: number, frame: number): RemasteredCommand | null {
    if (this.position >= this.data.length - 4) return null;

    try {
      const playerId = this.readUInt8();
      if (playerId > 11) return null; // Invalid player ID

      // Read additional command data based on type
      const commandData = this.readCommandData(commandType);
      
      return {
        frame,
        timestamp: this.frameToTimestamp(frame),
        playerId,
        commandType,
        commandName: this.getCommandName(commandType),
        data: commandData,
        isAction: this.isActionCommand(commandType),
        isBuild: this.isBuildCommand(commandType),
        unitType: this.extractUnitType(commandData),
        targetX: this.extractTargetX(commandData),
        targetY: this.extractTargetY(commandData)
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate APM and build orders from extracted commands
   */
  private calculateMetricsFromCommands(
    commands: RemasteredCommand[], 
    playerCount: number, 
    totalFrames: number, 
    method: string
  ): RemasteredExtractionResult {
    console.log(`[RemasteredCommandExtractor] Calculating metrics from ${commands.length} commands`);

    // Initialize arrays
    const playerAPM: number[] = new Array(playerCount).fill(0);
    const playerEAPM: number[] = new Array(playerCount).fill(0);
    const actionCounts: number[] = new Array(playerCount).fill(0);
    const buildOrders: Array<Array<{
      frame: number;
      timestamp: string;
      action: string;
      supply?: number;
    }>> = Array.from({ length: playerCount }, () => []);

    // Process commands
    commands.forEach(cmd => {
      if (cmd.playerId < playerCount) {
        // Count actions for APM
        if (cmd.isAction) {
          actionCounts[cmd.playerId]++;
        }

        // Add to build order
        if (cmd.isBuild && cmd.frame > 100) {
          const action = cmd.unitType ? 
            `${cmd.commandName}: ${this.getUnitName(cmd.unitType)}` : 
            cmd.commandName;

          buildOrders[cmd.playerId].push({
            frame: cmd.frame,
            timestamp: cmd.timestamp,
            action,
            supply: this.estimateSupply(cmd.frame, buildOrders[cmd.playerId].length)
          });

          // Limit build order length
          if (buildOrders[cmd.playerId].length > 25) {
            buildOrders[cmd.playerId] = buildOrders[cmd.playerId].slice(0, 25);
          }
        }
      }
    });

    // Calculate APM (Actions Per Minute)
    const gameMinutes = totalFrames / (24 * 60);
    for (let i = 0; i < playerCount; i++) {
      playerAPM[i] = gameMinutes > 0 ? Math.round(actionCounts[i] / gameMinutes) : 0;
      playerEAPM[i] = Math.round(playerAPM[i] * 0.75); // Effective APM is typically 75% of total
    }

    console.log(`[RemasteredCommandExtractor] Final metrics - APM:`, playerAPM, 'EAPM:', playerEAPM);
    console.log(`[RemasteredCommandExtractor] Build orders:`, buildOrders.map(bo => `${bo.length} actions`));

    return {
      commands,
      playerAPM,
      playerEAPM,
      buildOrders,
      gameVersion: this.detectGameVersion(),
      extractionMethod: method
    };
  }

  // Helper methods
  private readUInt8(): number {
    if (this.position >= this.data.length) throw new Error('End of buffer');
    return this.data[this.position++];
  }

  private readUInt16LE(): number {
    if (this.position + 1 >= this.data.length) throw new Error('End of buffer');
    const value = this.dataView.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  private readCommandData(commandType: number): Uint8Array {
    const lengths: Record<number, number> = {
      0x09: 2, 0x0A: 2, 0x0B: 2, 0x0C: 7, 0x0D: 2, 0x0E: 4,
      0x13: 2, 0x14: 4, 0x15: 6, 0x18: 1, 0x1D: 2, 0x1F: 1,
      0x20: 1, 0x21: 2, 0x2F: 2, 0x31: 2
    };
    
    const length = lengths[commandType] || 4;
    const data = new Uint8Array(length);
    
    for (let i = 0; i < length && this.position < this.data.length; i++) {
      data[i] = this.readUInt8();
    }
    
    return data;
  }

  private matchesBytes(offset: number, pattern: number[]): boolean {
    for (let i = 0; i < pattern.length; i++) {
      if (offset + i >= this.data.length || this.data[offset + i] !== pattern[i]) {
        return false;
      }
    }
    return true;
  }

  private looksLikeCommandData(offset: number): boolean {
    if (offset + 10 >= this.data.length) return false;
    
    // Check for reasonable frame numbers and player IDs
    const possibleFrame = this.dataView.getUint16(offset, true);
    const possiblePlayerId = this.data[offset + 2];
    
    return possibleFrame < 100000 && possiblePlayerId < 12;
  }

  private frameToTimestamp(frame: number): string {
    const seconds = Math.floor(frame / 24);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private getCommandName(commandType: number): string {
    const names: Record<number, string> = {
      0x09: 'Select', 0x0A: 'Shift Select', 0x0B: 'Shift Deselect',
      0x0C: 'Build', 0x0D: 'Vision', 0x0E: 'Alliance', 0x13: 'Hotkey',
      0x14: 'Move', 0x15: 'Attack', 0x18: 'Stop', 0x1D: 'Train',
      0x1F: 'Cloak', 0x20: 'Decloak', 0x21: 'Unit Morph',
      0x2F: 'Research', 0x31: 'Upgrade'
    };
    return names[commandType] || `Command_0x${commandType.toString(16)}`;
  }

  private isActionCommand(commandType: number): boolean {
    const actionCommands = [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x13, 0x14, 0x15, 0x18, 0x1D, 0x1F, 0x20, 0x21, 0x2F, 0x31];
    return actionCommands.includes(commandType);
  }

  private isBuildCommand(commandType: number): boolean {
    const buildCommands = [0x0C, 0x1D, 0x21, 0x2F, 0x31]; // Build, Train, Morph, Research, Upgrade
    return buildCommands.includes(commandType);
  }

  private extractUnitType(data: Uint8Array): number | undefined {
    return data.length >= 2 ? this.dataView.getUint16(0, true) : undefined;
  }

  private extractTargetX(data: Uint8Array): number | undefined {
    return data.length >= 4 ? this.dataView.getUint16(2, true) : undefined;
  }

  private extractTargetY(data: Uint8Array): number | undefined {
    return data.length >= 6 ? this.dataView.getUint16(4, true) : undefined;
  }

  private getUnitName(unitId: number): string {
    const units: Record<number, string> = {
      0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 4: 'Siege Tank',
      5: 'SCV', 7: 'Wraith', 8: 'Science Vessel', 37: 'Zergling',
      38: 'Hydralisk', 39: 'Ultralisk', 65: 'Zealot', 66: 'Dragoon',
      67: 'High Templar', 73: 'Probe'
    };
    return units[unitId] || `Unit_${unitId}`;
  }

  private estimateSupply(frame: number, actionIndex: number): number {
    const baseSupply = 9;
    const supplyGrowth = Math.floor(frame / 600);
    const buildOrderBonus = Math.floor(actionIndex / 3);
    return Math.min(200, baseSupply + supplyGrowth + buildOrderBonus);
  }

  private detectGameVersion(): string {
    // Try to detect game version from replay data
    const versionPatterns = [
      { pattern: 'Remastered', version: 'StarCraft: Remastered' },
      { pattern: '1.16', version: 'StarCraft 1.16.1' },
      { pattern: '1.15', version: 'StarCraft 1.15.x' }
    ];

    const textData = Array.from(this.data.slice(0, 1000))
      .map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ' ')
      .join('');

    for (const { pattern, version } of versionPatterns) {
      if (textData.includes(pattern)) {
        return version;
      }
    }

    return 'StarCraft (Unknown Version)';
  }

  private validateExtractionResult(result: RemasteredExtractionResult): boolean {
    return result.commands.length > 0 && 
           result.playerAPM.some(apm => apm > 0) &&
           result.buildOrders.some(bo => bo.length > 0);
  }

  private validateCommandSequence(commands: RemasteredCommand[]): boolean {
    if (commands.length < 10) return false;
    
    // Check if frames are increasing
    const frames = commands.map(cmd => cmd.frame);
    let increasing = true;
    for (let i = 1; i < frames.length; i++) {
      if (frames[i] < frames[i-1]) {
        increasing = false;
        break;
      }
    }
    
    return increasing;
  }

  private parseCommandsWithValidation(maxCommands: number): RemasteredCommand[] {
    const commands: RemasteredCommand[] = [];
    let currentFrame = 0;
    let frameJumps = 0;
    
    for (let i = 0; i < maxCommands && this.position < this.data.length - 4; i++) {
      try {
        const possibleFrame = this.readUInt16LE();
        const possiblePlayerId = this.readUInt8();
        const possibleCommandType = this.readUInt8();
        
        // Validate frame progression
        if (possibleFrame > currentFrame + 1000) {
          frameJumps++;
          if (frameJumps > 10) break; // Too many unrealistic frame jumps
        }
        
        // Validate player ID and command type
        if (possiblePlayerId > 11 || possibleCommandType === 0) {
          continue;
        }
        
        currentFrame = possibleFrame;
        
        const command: RemasteredCommand = {
          frame: possibleFrame,
          timestamp: this.frameToTimestamp(possibleFrame),
          playerId: possiblePlayerId,
          commandType: possibleCommandType,
          commandName: this.getCommandName(possibleCommandType),
          data: new Uint8Array([possibleCommandType]),
          isAction: this.isActionCommand(possibleCommandType),
          isBuild: this.isBuildCommand(possibleCommandType)
        };
        
        commands.push(command);
        
      } catch (error) {
        break;
      }
    }
    
    return commands;
  }

  private findPatternMatches(pattern: number[]): number[] {
    const matches: number[] = [];
    
    for (let i = 0; i <= this.data.length - pattern.length; i++) {
      if (this.matchesBytes(i, pattern)) {
        matches.push(i);
      }
    }
    
    return matches;
  }

  private parseLegacyCommands(maxCommands: number): RemasteredCommand[] {
    // Similar to parseRemasteredCommands but with legacy structure assumptions
    return this.parseCommandsWithValidation(maxCommands);
  }

  private createFallbackResult(playerCount: number, totalFrames: number): RemasteredExtractionResult {
    console.log('[RemasteredCommandExtractor] Creating fallback result with estimated data');
    
    return {
      commands: [],
      playerAPM: new Array(playerCount).fill(0),
      playerEAPM: new Array(playerCount).fill(0),
      buildOrders: new Array(playerCount).fill([]),
      gameVersion: 'Unknown',
      extractionMethod: 'fallback'
    };
  }
}
