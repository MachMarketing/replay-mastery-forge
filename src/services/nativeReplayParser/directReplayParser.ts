
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
   * Find the actual start of the command stream
   */
  private findCommandStreamStart(): number {
    // Look for common frame sync patterns
    for (let i = 0x200; i < Math.min(0x400, this.buffer.length - 10); i++) {
      // Look for frame sync command (0x00) followed by reasonable data
      if (this.buffer[i] === 0x00 && 
          this.buffer[i + 4] === 0x00 && 
          this.buffer[i + 5] < 8) { // Player ID should be < 8
        return i;
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

    console.log('[DirectReplayParser] Starting command parsing from offset:', this.offset.toString(16));

    while (this.offset < this.buffer.length - 6 && consecutiveErrors < maxErrors) {
      try {
        const startOffset = this.offset;
        
        // Read frame (4 bytes, little endian)
        const frame = this.readUint32();
        
        // Read command ID
        const cmdId = this.readUint8();
        
        // Skip if this looks like padding or invalid data
        if (cmdId === 0xFF || frame > 0x7FFFFFFF) {
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
          frame,
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
      
      // Total APM
      apm[playerId] = gameTimeMinutes > 0 ? Math.round(actions.length / gameTimeMinutes) : 0;
      
      // EAPM (exclude selection and movement)
      const effectiveActions = actions.filter(a => 
        ![0x1B, 0x14, 0x15].includes(a.cmdId) // Exclude select, attack move, move
      );
      eapm[playerId] = gameTimeMinutes > 0 ? Math.round(effectiveActions.length / gameTimeMinutes) : 0;
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

  /**
   * Get build order for a specific player
   */
  getBuildOrder(playerId: number): BuildAction[] {
    const result = this.parseReplay();
    return result.buildOrders[playerId] || [];
  }
}
