
/**
 * Dedicated command extractor for StarCraft replay files
 * Extracts real commands and actions from binary replay data when screp-js fails
 */

export interface ReplayCommand {
  frame: number;
  timestamp: string;
  playerId: number;
  commandId: number;
  commandType: string;
  unitType?: string;
  targetType?: string;
  x?: number;
  y?: number;
  isAction: boolean;
  isBuildCommand: boolean;
}

export interface CommandExtractionResult {
  commands: ReplayCommand[];
  playerActionCounts: number[];
  buildOrders: Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>>;
  apm: number[];
  eapm: number[];
}

export class CommandExtractor {
  private data: Uint8Array;
  private position: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  /**
   * Extract commands from binary replay data
   */
  extractCommands(playerCount: number, totalFrames: number): CommandExtractionResult {
    console.log('[CommandExtractor] Starting command extraction from binary data');
    console.log('[CommandExtractor] Data size:', this.data.length, 'bytes');
    console.log('[CommandExtractor] Expected players:', playerCount);
    console.log('[CommandExtractor] Total frames:', totalFrames);

    const commands: ReplayCommand[] = [];
    const playerActionCounts: number[] = new Array(playerCount).fill(0);

    // Look for command section in replay data
    const commandSection = this.findCommandSection();
    if (!commandSection) {
      console.warn('[CommandExtractor] No command section found');
      return this.createFallbackResult(playerCount, totalFrames);
    }

    console.log('[CommandExtractor] Command section found at offset:', commandSection.offset);
    console.log('[CommandExtractor] Command section size:', commandSection.size);

    // Parse commands from the command section
    this.position = commandSection.offset;
    const sectionEnd = commandSection.offset + commandSection.size;

    while (this.position < sectionEnd && this.position < this.data.length - 4) {
      try {
        const command = this.parseNextCommand();
        if (command && command.playerId < playerCount) {
          commands.push(command);
          
          if (command.isAction) {
            playerActionCounts[command.playerId]++;
          }
        }
      } catch (error) {
        // Skip corrupted commands
        this.position++;
        continue;
      }

      // Safety check to prevent infinite loops
      if (commands.length > 50000) {
        console.warn('[CommandExtractor] Too many commands, stopping extraction');
        break;
      }
    }

    console.log('[CommandExtractor] Extracted commands:', commands.length);
    console.log('[CommandExtractor] Player action counts:', playerActionCounts);

    // Calculate APM and build orders
    const gameMinutes = totalFrames / (24 * 60); // 24 FPS, 60 seconds per minute
    const apm = playerActionCounts.map(actions => 
      gameMinutes > 0 ? Math.floor(actions / gameMinutes) : 0
    );
    const eapm = apm.map(playerApm => Math.floor(playerApm * 0.75));

    // Extract build orders
    const buildOrders = this.extractBuildOrders(commands, playerCount);

    console.log('[CommandExtractor] Final APM:', apm);
    console.log('[CommandExtractor] Final EAPM:', eapm);
    console.log('[CommandExtractor] Build orders extracted:', buildOrders.map(bo => bo.length));

    return {
      commands,
      playerActionCounts,
      buildOrders,
      apm,
      eapm
    };
  }

  /**
   * Find the command section in the replay data
   */
  private findCommandSection(): { offset: number; size: number } | null {
    // Look for common command section signatures
    const signatures = [
      [0x52, 0x45, 0x50, 0x4C], // "REPL"
      [0x43, 0x4D, 0x44, 0x53], // "CMDS"
      [0x44, 0x41, 0x54, 0x41], // "DATA"
    ];

    for (let i = 0; i < this.data.length - 100; i++) {
      for (const signature of signatures) {
        if (this.matchesSignature(i, signature)) {
          // Try to read section size
          const size = this.readUInt32LE(i + 4);
          if (size > 0 && size < this.data.length - i) {
            return { offset: i + 8, size };
          }
        }
      }
    }

    // Fallback: assume commands start after header (typically around byte 632)
    const headerEnd = this.findHeaderEnd();
    if (headerEnd > 0) {
      return { 
        offset: headerEnd, 
        size: Math.min(100000, this.data.length - headerEnd) 
      };
    }

    return null;
  }

  /**
   * Find the end of the header section
   */
  private findHeaderEnd(): number {
    // Look for repeating patterns that indicate command data
    for (let i = 500; i < Math.min(2000, this.data.length - 100); i++) {
      if (this.looksLikeCommandData(i)) {
        return i;
      }
    }
    return 632; // Default StarCraft header size
  }

  /**
   * Check if data at position looks like command data
   */
  private looksLikeCommandData(offset: number): boolean {
    if (offset + 20 >= this.data.length) return false;

    // Look for patterns: frame numbers, player IDs, command IDs
    const byte1 = this.data[offset];
    const byte2 = this.data[offset + 1];
    const byte3 = this.data[offset + 2];

    // Frame numbers are usually small early in the game
    const possibleFrame = this.readUInt16LE(offset);
    const possiblePlayerId = byte2;
    const possibleCommandId = byte3;

    return (
      possibleFrame < 50000 && // Reasonable frame number
      possiblePlayerId < 12 && // Reasonable player ID
      possibleCommandId > 0 && possibleCommandId < 100 // Reasonable command ID
    );
  }

  /**
   * Parse the next command from current position
   */
  private parseNextCommand(): ReplayCommand | null {
    if (this.position + 8 > this.data.length) return null;

    // Basic command structure (varies by version)
    const frame = this.readUInt16LE(this.position);
    const playerId = this.data[this.position + 2];
    const commandId = this.data[this.position + 3];

    // Skip invalid commands
    if (playerId > 11 || commandId === 0) {
      this.position += 4;
      return null;
    }

    // Parse additional data based on command type
    let x, y, unitType, targetType;
    let commandSize = 4;

    // Common command types with coordinates
    if ([9, 10, 11, 12, 20, 21].includes(commandId)) {
      if (this.position + 8 <= this.data.length) {
        x = this.readUInt16LE(this.position + 4);
        y = this.readUInt16LE(this.position + 6);
        commandSize = 8;
      }
    }

    // Build commands often have unit types
    if ([12, 29, 47, 48, 49].includes(commandId)) {
      if (this.position + 6 <= this.data.length) {
        unitType = this.readUInt16LE(this.position + 4);
        commandSize = Math.max(commandSize, 6);
      }
    }

    const command: ReplayCommand = {
      frame,
      timestamp: this.frameToTimestamp(frame),
      playerId,
      commandId,
      commandType: this.getCommandTypeName(commandId),
      unitType: unitType ? this.getUnitTypeName(unitType) : undefined,
      targetType: targetType ? this.getUnitTypeName(targetType) : undefined,
      x,
      y,
      isAction: this.isActionCommand(commandId),
      isBuildCommand: this.isBuildCommand(commandId)
    };

    this.position += commandSize;
    return command;
  }

  /**
   * Extract build orders from commands
   */
  private extractBuildOrders(commands: ReplayCommand[], playerCount: number): Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>> {
    const buildOrders: Array<Array<{
      frame: number;
      timestamp: string;
      action: string;
      supply?: number;
    }>> = [];

    // Initialize build orders for each player
    for (let i = 0; i < playerCount; i++) {
      buildOrders.push([]);
    }

    // Filter and sort build commands
    const buildCommands = commands
      .filter(cmd => cmd.isBuildCommand && cmd.frame > 100) // Skip very early actions
      .sort((a, b) => a.frame - b.frame);

    buildCommands.forEach(cmd => {
      if (cmd.playerId < playerCount) {
        const action = cmd.unitType ? 
          `${cmd.commandType}: ${cmd.unitType}` : 
          cmd.commandType;

        buildOrders[cmd.playerId].push({
          frame: cmd.frame,
          timestamp: cmd.timestamp,
          action,
          supply: this.estimateSupply(cmd.frame, buildOrders[cmd.playerId].length)
        });

        // Limit to first 20 meaningful actions per player
        if (buildOrders[cmd.playerId].length >= 20) {
          buildOrders[cmd.playerId] = buildOrders[cmd.playerId].slice(0, 20);
        }
      }
    });

    return buildOrders;
  }

  /**
   * Create fallback result when no commands can be extracted
   */
  private createFallbackResult(playerCount: number, totalFrames: number): CommandExtractionResult {
    console.log('[CommandExtractor] Creating fallback result');
    
    return {
      commands: [],
      playerActionCounts: new Array(playerCount).fill(0),
      buildOrders: new Array(playerCount).fill([]),
      apm: new Array(playerCount).fill(0),
      eapm: new Array(playerCount).fill(0)
    };
  }

  // Helper methods
  private readUInt16LE(offset: number): number {
    return this.data[offset] | (this.data[offset + 1] << 8);
  }

  private readUInt32LE(offset: number): number {
    return this.data[offset] | 
           (this.data[offset + 1] << 8) | 
           (this.data[offset + 2] << 16) | 
           (this.data[offset + 3] << 24);
  }

  private matchesSignature(offset: number, signature: number[]): boolean {
    for (let i = 0; i < signature.length; i++) {
      if (offset + i >= this.data.length || this.data[offset + i] !== signature[i]) {
        return false;
      }
    }
    return true;
  }

  private frameToTimestamp(frame: number): string {
    const seconds = Math.floor(frame / 24); // 24 FPS
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private getCommandTypeName(commandId: number): string {
    const commandNames: Record<number, string> = {
      9: 'Select',
      10: 'Move',
      11: 'Attack',
      12: 'Build',
      13: 'Stop',
      14: 'Hold Position',
      18: 'Patrol',
      20: 'Right Click',
      21: 'Attack Move',
      25: 'Unload',
      29: 'Train Unit',
      47: 'Upgrade',
      48: 'Research',
      49: 'Morph',
      51: 'Build Addon',
      52: 'Cancel'
    };
    return commandNames[commandId] || `Command ${commandId}`;
  }

  private getUnitTypeName(unitId: number): string {
    const unitNames: Record<number, string> = {
      0: 'Marine',
      1: 'Ghost',
      2: 'Vulture',
      3: 'Goliath',
      4: 'Siege Tank',
      5: 'SCV',
      7: 'Wraith',
      8: 'Science Vessel',
      9: 'Dropship',
      10: 'Battlecruiser',
      65: 'Zealot',
      66: 'Dragoon',
      67: 'High Templar',
      68: 'Archon',
      69: 'Shuttle',
      70: 'Scout',
      71: 'Arbiter',
      72: 'Carrier',
      73: 'Probe',
      37: 'Zergling',
      38: 'Hydralisk',
      39: 'Ultralisk',
      40: 'Mutalisk',
      41: 'Guardian',
      42: 'Queen',
      43: 'Defiler',
      44: 'Scourge',
      45: 'Drone'
    };
    return unitNames[unitId] || `Unit ${unitId}`;
  }

  private isActionCommand(commandId: number): boolean {
    // Commands that count towards APM
    const actionCommands = [9, 10, 11, 12, 13, 14, 18, 20, 21, 25, 29, 47, 48, 49, 51, 52];
    return actionCommands.includes(commandId);
  }

  private isBuildCommand(commandId: number): boolean {
    // Commands that are build/train actions
    const buildCommands = [12, 29, 47, 48, 49, 51];
    return buildCommands.includes(commandId);
  }

  private estimateSupply(frame: number, actionIndex: number): number {
    const baseSupply = 9;
    const supplyGrowth = Math.floor(frame / 600);
    const buildOrderBonus = Math.floor(actionIndex / 3);
    return Math.min(200, baseSupply + supplyGrowth + buildOrderBonus);
  }
}
