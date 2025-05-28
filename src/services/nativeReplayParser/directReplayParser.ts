/**
 * Direct StarCraft Replay Parser based on BWAPI specifications
 * Parses raw command stream from .rep files to extract actions and build orders
 */

export interface ParsedCommand {
  frame: number;
  cmdId: number;
  playerId: number;
  type: string;
  unitType?: number;
  unitName?: string;
  position?: { x: number; y: number };
  targetId?: number;
  data?: Uint8Array;
}

export interface BuildAction {
  timestamp: string;
  frame: number;
  action: string;
  unitName?: string;
  supply?: number;
}

export interface DirectParserResult {
  commands: ParsedCommand[];
  buildOrders: BuildAction[][];
  playerActions: ParsedCommand[][];
  totalFrames: number;
  apm: number[];
  eapm: number[];
  success: boolean;
  error?: string;
}

export class DirectReplayParser {
  private buffer: Uint8Array;
  private offset: number;
  private originalOffset: number;

  constructor(arrayBuffer: ArrayBuffer) {
    this.buffer = new Uint8Array(arrayBuffer);
    this.offset = 0x279; // Command stream starts here in standard replays
    this.originalOffset = this.offset;
    console.log('[DirectReplayParser] Initialized with buffer size:', this.buffer.length);
  }

  /**
   * Parse the entire replay and extract all data
   */
  parseReplay(): DirectParserResult {
    console.log('[DirectReplayParser] === STARTING DIRECT PARSING ===');
    
    try {
      // First, detect the actual command stream start
      const commandStart = this.findCommandStreamStart();
      if (commandStart !== -1) {
        this.offset = commandStart;
        console.log('[DirectReplayParser] Found command stream at offset:', commandStart.toString(16));
      } else {
        console.log('[DirectReplayParser] Using default offset:', this.offset.toString(16));
      }

      const commands = this.parseCommands();
      console.log('[DirectReplayParser] Parsed commands:', commands.length);

      // === DETAILED COMMAND ANALYSIS ===
      this.analyzeCommands(commands);

      const playerActions = this.groupCommandsByPlayer(commands);
      const buildOrders = this.generateBuildOrders(playerActions);
      const { apm, eapm } = this.calculateAPM(playerActions);
      const totalFrames = this.getTotalFrames(commands);

      console.log('[DirectReplayParser] === PARSING COMPLETE ===');
      console.log('  - Total commands:', commands.length);
      console.log('  - Total frames:', totalFrames);
      console.log('  - Players with actions:', Object.keys(playerActions).length);
      console.log('  - Build orders generated:', buildOrders.reduce((sum, bo) => sum + bo.length, 0));

      return {
        commands,
        buildOrders,
        playerActions,
        totalFrames,
        apm,
        eapm,
        success: true
      };

    } catch (error) {
      console.error('[DirectReplayParser] Parsing failed:', error);
      return {
        commands: [],
        buildOrders: [],
        playerActions: [],
        totalFrames: 0,
        apm: [],
        eapm: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detailed command analysis for debugging
   */
  private analyzeCommands(commands: ParsedCommand[]): void {
    console.log('[DirectReplayParser] === DETAILED COMMAND ANALYSIS ===');
    
    // Overall stats
    console.log(`Found ${commands.length} commands total.`);
    
    // Group by command type
    const commandsByType: Record<number, number> = {};
    const commandsByPlayer: Record<number, ParsedCommand[]> = {};
    
    commands.forEach(cmd => {
      // Count by type
      commandsByType[cmd.cmdId] = (commandsByType[cmd.cmdId] || 0) + 1;
      
      // Group by player
      if (!commandsByPlayer[cmd.playerId]) {
        commandsByPlayer[cmd.playerId] = [];
      }
      commandsByPlayer[cmd.playerId].push(cmd);
    });
    
    // Log command type breakdown
    console.log('[DirectReplayParser] Command types found:');
    Object.entries(commandsByType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([cmdId, count]) => {
        const cmdName = this.getCommandType(parseInt(cmdId));
        console.log(`  - 0x${parseInt(cmdId).toString(16).padStart(2, '0')} (${cmdName}): ${count}`);
      });
    
    // Log per-player breakdown
    console.log('[DirectReplayParser] Per-player action breakdown:');
    Object.entries(commandsByPlayer).forEach(([playerId, playerCommands]) => {
      const pid = parseInt(playerId);
      
      // Categorize player actions
      const frameSync = playerCommands.filter(c => [0x00, 0x01, 0x02].includes(c.cmdId)).length;
      const build = playerCommands.filter(c => c.cmdId === 0x0C).length;
      const train = playerCommands.filter(c => c.cmdId === 0x1D).length;
      const moveAttack = playerCommands.filter(c => [0x14, 0x15].includes(c.cmdId)).length;
      const select = playerCommands.filter(c => c.cmdId === 0x1B).length;
      const other = playerCommands.length - frameSync - build - train - moveAttack - select;
      
      console.log(`Player ${pid}: ${playerCommands.length} total actions`);
      console.log(`  - ${frameSync} FrameSync (0x00-0x02)`);
      console.log(`  - ${build} Build (0x0C)`);
      console.log(`  - ${train} Train (0x1D)`);
      console.log(`  - ${moveAttack} Move/Attack (0x14, 0x15)`);
      console.log(`  - ${select} Select (0x1B)`);
      console.log(`  - ${other} Other`);
      
      // Calculate realistic APM for this player
      const validActions = playerCommands.filter(c => ![0x00, 0x01, 0x02].includes(c.cmdId));
      const lastFrame = Math.max(...playerCommands.map(c => c.frame), 0);
      const minutes = lastFrame / (24 * 60);
      const playerAPM = minutes > 0 ? Math.round(validActions.length / minutes) : 0;
      
      console.log(`  - Valid actions for APM: ${validActions.length}`);
      console.log(`  - Game duration: ${minutes.toFixed(2)} minutes`);
      console.log(`  - Calculated APM: ${playerAPM}`);
    });
  }

  /**
   * Find the actual start of the command stream
   */
  private findCommandStreamStart(): number {
    console.log('[DirectReplayParser] Searching for command stream start...');
    
    // Try multiple potential offsets
    const potentialOffsets = [
      0x279, // Standard offset (633)
      0x280, // Alternative offset
      0x300, // Header might be larger
      0x400, // Much larger header
      0x200  // Smaller header
    ];
    
    for (const testOffset of potentialOffsets) {
      if (testOffset >= this.buffer.length - 10) continue;
      
      console.log(`[DirectReplayParser] Testing offset 0x${testOffset.toString(16)}`);
      
      // Look for frame sync patterns and valid command sequences
      let validCommandCount = 0;
      let testPos = testOffset;
      
      for (let i = 0; i < 50 && testPos < this.buffer.length - 6; i++) {
        const byte = this.buffer[testPos];
        
        // Frame sync commands
        if (byte === 0x00) {
          validCommandCount++;
          testPos++;
        } else if (byte === 0x01 && testPos + 1 < this.buffer.length) {
          validCommandCount++;
          testPos += 2; // Skip frame count
        } else if (byte === 0x02 && testPos + 2 < this.buffer.length) {
          validCommandCount++;
          testPos += 3; // Skip frame count (16-bit)
        } else {
          // Check if it's a valid game command
          const cmdLength = this.getCommandLength(byte);
          if (cmdLength > 0 && testPos + cmdLength < this.buffer.length) {
            // Check if next byte looks like a valid player ID
            const nextByte = this.buffer[testPos + 1];
            if (nextByte < 12) { // Valid player ID range
              validCommandCount++;
            }
          }
          testPos += Math.max(cmdLength, 1);
        }
      }
      
      console.log(`[DirectReplayParser] Offset 0x${testOffset.toString(16)} has ${validCommandCount} valid commands in first 50 bytes`);
      
      if (validCommandCount >= 10) {
        console.log(`[DirectReplayParser] Found promising offset: 0x${testOffset.toString(16)}`);
        return testOffset;
      }
    }
    
    return -1;
  }

  /**
   * Parse commands from the replay stream
   */
  parseCommands(): ParsedCommand[] {
    const commands: ParsedCommand[] = [];
    let consecutiveErrors = 0;
    const maxErrors = 10;
    let currentFrame = 0;

    console.log('[DirectReplayParser] Starting command parsing from offset:', this.offset.toString(16));

    while (this.offset < this.buffer.length - 6 && consecutiveErrors < maxErrors) {
      try {
        const startOffset = this.offset;
        
        // Check for frame sync commands first
        const cmdByte = this.buffer[this.offset];
        
        if (cmdByte === 0x00) {
          // Single frame advance
          currentFrame++;
          this.offset++;
          consecutiveErrors = 0;
          continue;
        } else if (cmdByte === 0x01) {
          // Frame skip with count
          if (this.offset + 1 < this.buffer.length) {
            const skipFrames = this.buffer[this.offset + 1];
            currentFrame += skipFrames;
            this.offset += 2;
            consecutiveErrors = 0;
          }
          continue;
        } else if (cmdByte === 0x02) {
          // Large frame skip
          if (this.offset + 2 < this.buffer.length) {
            const skipFrames = this.buffer[this.offset + 1] | (this.buffer[this.offset + 2] << 8);
            currentFrame += skipFrames;
            this.offset += 3;
            consecutiveErrors = 0;
          }
          continue;
        }
        
        // Parse game command
        const cmdId = this.readUint8();
        
        // Skip if this looks like padding or invalid data
        if (cmdId === 0xFF || cmdId > 0x50) {
          this.offset = startOffset + 1;
          consecutiveErrors++;
          continue;
        }

        // Reset error counter on successful read
        consecutiveErrors = 0;

        // Read player ID
        const playerId = this.readUint8();
        
        // Validate player ID
        if (playerId > 11) { // StarCraft supports max 8 players + observers
          this.offset = startOffset + 1;
          continue;
        }

        const command: ParsedCommand = {
          frame: currentFrame,
          cmdId,
          playerId,
          type: this.getCommandType(cmdId)
        };

        // Parse command-specific data
        this.parseCommandData(command);

        commands.push(command);

        // Skip remaining payload based on command type
        this.skipCommandPayload(cmdId);

      } catch (error) {
        console.warn('[DirectReplayParser] Error parsing command at offset', this.offset.toString(16), ':', error);
        this.offset += 1; // Skip problematic byte
        consecutiveErrors++;
      }
    }

    console.log('[DirectReplayParser] Parsed', commands.length, 'commands');
    if (commands.length > 0) {
      console.log('[DirectReplayParser] First command:', commands[0]);
      console.log('[DirectReplayParser] Last command:', commands[commands.length - 1]);
      console.log('[DirectReplayParser] Final frame:', Math.max(...commands.map(c => c.frame)));
    }

    return commands;
  }

  /**
   * Parse command-specific data based on command type
   */
  private parseCommandData(command: ParsedCommand): void {
    switch (command.cmdId) {
      case 0x0C: // Build
      case 0x1D: // Train
        if (this.offset + 2 < this.buffer.length) {
          command.unitType = this.readUint16();
          command.unitName = this.getUnitName(command.unitType);
        }
        break;
        
      case 0x14: // Attack Move
      case 0x15: // Move
        if (this.offset + 4 < this.buffer.length) {
          command.position = {
            x: this.readUint16(),
            y: this.readUint16()
          };
        }
        break;
        
      case 0x1B: // Select
        if (this.offset + 2 < this.buffer.length) {
          const unitCount = this.readUint8();
          // Skip unit selection data
          this.offset += Math.min(unitCount * 2, 24); // Max 12 units
        }
        break;
    }
  }

  /**
   * Skip command payload based on command type
   */
  private skipCommandPayload(cmdId: number): void {
    switch (cmdId) {
      case 0x00: // Frame sync
      case 0x01: // Keep alive
      case 0x02: // Right click
        break; // No additional payload
        
      case 0x0C: // Build
      case 0x1D: // Train
        // Already read in parseCommandData
        break;
        
      case 0x14: // Attack Move
      case 0x15: // Move
        // Already read in parseCommandData
        break;
        
      case 0x1B: // Select
        // Already handled in parseCommandData
        break;
        
      default:
        // Skip 2-6 bytes for unknown commands
        this.offset += Math.min(4, this.buffer.length - this.offset);
    }
  }

  /**
   * Generate build orders from player actions
   */
  private generateBuildOrders(playerActions: ParsedCommand[][]): BuildAction[][] {
    const buildOrders: BuildAction[][] = [];

    Object.keys(playerActions).forEach(playerIdStr => {
      const playerId = parseInt(playerIdStr);
      const actions = playerActions[playerId] || [];
      
      const buildActions = actions
        .filter(cmd => cmd.cmdId === 0x0C || cmd.cmdId === 0x1D) // Build or Train
        .map((cmd, index) => ({
          timestamp: this.framesToTime(cmd.frame),
          frame: cmd.frame,
          action: cmd.unitName ? `${cmd.type} ${cmd.unitName}` : cmd.type,
          unitName: cmd.unitName,
          supply: this.estimateSupply(cmd.frame, index)
        }));

      buildOrders[playerId] = buildActions;
    });

    return buildOrders;
  }

  /**
   * Group commands by player
   */
  private groupCommandsByPlayer(commands: ParsedCommand[]): ParsedCommand[][] {
    const playerActions: ParsedCommand[][] = [];
    
    commands.forEach(cmd => {
      if (!playerActions[cmd.playerId]) {
        playerActions[cmd.playerId] = [];
      }
      playerActions[cmd.playerId].push(cmd);
    });

    return playerActions;
  }

  /**
   * Calculate APM and EAPM from commands
   */
  private calculateAPM(playerActions: ParsedCommand[][]): { apm: number[]; eapm: number[] } {
    const apm: number[] = [];
    const eapm: number[] = [];

    console.log('[DirectReplayParser] === APM CALCULATION ===');

    Object.keys(playerActions).forEach(playerIdStr => {
      const playerId = parseInt(playerIdStr);
      const actions = playerActions[playerId] || [];
      
      if (actions.length === 0) {
        apm[playerId] = 0;
        eapm[playerId] = 0;
        return;
      }

      const lastFrame = Math.max(...actions.map(a => a.frame));
      const gameTimeMinutes = lastFrame / (24 * 60); // 24 FPS
      
      // Exclude frame sync commands for APM calculation
      const validActions = actions.filter(a => ![0x00, 0x01, 0x02].includes(a.cmdId));
      
      // Total APM
      const playerAPM = gameTimeMinutes > 0 ? Math.round(validActions.length / gameTimeMinutes) : 0;
      apm[playerId] = playerAPM;
      
      // EAPM (exclude selection and movement)
      const effectiveActions = validActions.filter(a => 
        ![0x1B, 0x14, 0x15].includes(a.cmdId) // Exclude select, attack move, move
      );
      const playerEAPM = gameTimeMinutes > 0 ? Math.round(effectiveActions.length / gameTimeMinutes) : 0;
      eapm[playerId] = playerEAPM;
      
      console.log(`[DirectReplayParser] Player ${playerId} APM calculation:`);
      console.log(`  - Total actions: ${actions.length}`);
      console.log(`  - Valid actions (no frame sync): ${validActions.length}`);
      console.log(`  - Effective actions (no select/move): ${effectiveActions.length}`);
      console.log(`  - Game time: ${gameTimeMinutes.toFixed(2)} minutes`);
      console.log(`  - Final APM: ${playerAPM}`);
      console.log(`  - Final EAPM: ${playerEAPM}`);
    });

    return { apm, eapm };
  }

  /**
   * Get total frames from commands
   */
  private getTotalFrames(commands: ParsedCommand[]): number {
    if (commands.length === 0) return 0;
    return Math.max(...commands.map(cmd => cmd.frame));
  }

  // Utility methods
  private readUint8(): number {
    if (this.offset >= this.buffer.length) {
      throw new Error('Buffer overflow');
    }
    return this.buffer[this.offset++];
  }

  private readUint16(): number {
    if (this.offset + 1 >= this.buffer.length) {
      throw new Error('Buffer overflow');
    }
    const value = this.buffer[this.offset] | (this.buffer[this.offset + 1] << 8);
    this.offset += 2;
    return value;
  }

  private readUint32(): number {
    if (this.offset + 3 >= this.buffer.length) {
      throw new Error('Buffer overflow');
    }
    const value =
      this.buffer[this.offset] |
      (this.buffer[this.offset + 1] << 8) |
      (this.buffer[this.offset + 2] << 16) |
      (this.buffer[this.offset + 3] << 24);
    this.offset += 4;
    return value;
  }

  private getCommandType(cmdId: number): string {
    switch (cmdId) {
      case 0x00: return 'Frame Sync';
      case 0x01: return 'Keep Alive';
      case 0x02: return 'Right Click';
      case 0x0C: return 'Build';
      case 0x1D: return 'Train';
      case 0x14: return 'Attack Move';
      case 0x15: return 'Move';
      case 0x1B: return 'Select';
      case 0x1E: return 'Morph';
      case 0x23: return 'Research';
      case 0x24: return 'Upgrade';
      default: return `Command 0x${cmdId.toString(16).padStart(2, '0')}`;
    }
  }

  private getUnitName(unitType: number): string {
    // Basic unit type mapping - can be expanded
    const units: Record<number, string> = {
      // Protoss
      60: 'Probe',
      61: 'Zealot',
      62: 'Dragoon',
      64: 'Photon Cannon',
      65: 'High Templar',
      66: 'Dark Templar',
      67: 'Archon',
      69: 'Scout',
      70: 'Arbiter',
      71: 'Carrier',
      83: 'Interceptor',
      84: 'Dark Archon',
      85: 'Corsair',
      86: 'Dark Templar Hero',
      
      // Buildings
      154: 'Nexus',
      155: 'Robotics Facility',
      156: 'Pylon',
      157: 'Assimilator',
      159: 'Gateway',
      160: 'Photon Cannon',
      162: 'Cybernetics Core',
      163: 'Templar Archives',
      164: 'Forge',
      165: 'Stargate',
      167: 'Citadel of Adun',
      168: 'Robotics Support Bay',
      169: 'Fleet Beacon',
      170: 'Templar Archives',
      171: 'Dark Archon Meld',
      172: 'Observatory',
      
      // Terran
      0: 'Marine',
      1: 'Ghost',
      2: 'Vulture',
      3: 'Goliath',
      5: 'Siege Tank',
      7: 'SCV',
      8: 'Wraith',
      9: 'Science Vessel',
      11: 'Dropship',
      12: 'Battlecruiser',
      32: 'Firebat',
      33: 'Medic',
      
      // Zerg
      37: 'Zergling',
      38: 'Hydralisk',
      39: 'Ultralisk',
      40: 'Broodling',
      41: 'Drone',
      42: 'Overlord',
      43: 'Mutalisk',
      44: 'Guardian',
      45: 'Queen',
      46: 'Defiler',
      47: 'Scourge',
      103: 'Lurker'
    };
    
    return units[unitType] || `Unit ${unitType}`;
  }

  private framesToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private estimateSupply(frame: number, buildIndex: number): number {
    // Basic supply estimation based on time and build order position
    const timeMinutes = frame / (24 * 60);
    return Math.min(9 + buildIndex * 8 + Math.floor(timeMinutes * 5), 200);
  }

  private getCommandLength(commandType: number): number {
    // Based on BWAPI and screp specifications
    const commandLengths: Record<number, number> = {
      0x09: 2,   // Select
      0x0A: 2,   // Shift Select  
      0x0B: 2,   // Shift Deselect
      0x0C: 7,   // Build
      0x0D: 2,   // Vision
      0x0E: 4,   // Alliance
      0x13: 2,   // Hotkey
      0x14: 4,   // Move
      0x15: 6,   // Attack
      0x16: 0,   // Cancel (variable)
      0x17: 0,   // Cancel Hatch (variable)
      0x18: 1,   // Stop
      0x19: 1,   // Carrier Stop
      0x1A: 1,   // Reaver Stop
      0x1B: 1,   // Order Nothing
      0x1C: 1,   // Return Cargo
      0x1D: 2,   // Train
      0x1E: 2,   // Cancel Train
      0x1F: 1,   // Cloak
      0x20: 1,   // Decloak
      0x21: 2,   // Unit Morph
      0x23: 1,   // Unsiege
      0x24: 1,   // Siege
      0x25: 2,   // Train Fighter
      0x27: 1,   // Unload All
      0x28: 2,   // Unload
      0x29: 1,   // Merge Archon
      0x2A: 1,   // Hold Position
      0x2B: 1,   // Burrow
      0x2C: 1,   // Unburrow
      0x2D: 1,   // Cancel Nuke
      0x2E: 1,   // Lift
      0x2F: 2,   // Research
      0x30: 2,   // Cancel Research
      0x31: 2,   // Upgrade
      0x32: 2,   // Cancel Upgrade
      0x33: 2,   // Cancel Addon
      0x34: 2,   // Building Morph
      0x35: 1,   // Stim
      0x48: 10   // Load Game
    };

    return commandLengths[commandType] || 1;
  }

  /**
   * Get build order for a specific player
   */
  getBuildOrder(playerId: number): BuildAction[] {
    const result = this.parseReplay();
    return result.buildOrders[playerId] || [];
  }
}
