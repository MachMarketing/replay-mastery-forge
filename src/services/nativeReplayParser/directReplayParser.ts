/**
 * Direct StarCraft Replay Parser based on BWAPI specifications
 * Enhanced with sync frame flooding detection and unit mapping
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

// Enhanced command length table based on BWAPI specifications
const COMMAND_LENGTHS: Record<number, number> = {
  0x09: 2,   // Select
  0x0A: 2,   // Shift Select  
  0x0B: 2,   // Shift Deselect
  0x0C: 10,  // Build (enhanced length)
  0x0D: 2,   // Vision
  0x0E: 4,   // Alliance
  0x13: 2,   // Hotkey
  0x14: 9,   // Move (enhanced length)
  0x15: 9,   // Attack (enhanced length)
  0x16: 1,   // Cancel
  0x17: 1,   // Cancel Hatch
  0x18: 1,   // Stop
  0x19: 1,   // Carrier Stop
  0x1A: 1,   // Reaver Stop
  0x1B: 3,   // Select (variable, minimum 3)
  0x1C: 1,   // Return Cargo
  0x1D: 6,   // Train (enhanced length)
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

// Valid action command IDs for APM calculation (excludes frame sync)
const VALID_APM_COMMANDS = [
  0x0C, 0x1D, 0x1B, 0x14, 0x15, 0x09, 0x0A, 0x0B, 0x13, 0x1E, 0x1F, 0x20,
  0x21, 0x23, 0x24, 0x25, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E,
  0x2F, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35
];

// Enhanced unit ID to name mapping based on BWAPI UnitTypes
const UNIT_MAPPING: Record<number, string> = {
  // Protoss Units
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
  
  // Protoss Buildings
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
  172: 'Observatory',
  
  // Terran Units
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
  
  // Terran Buildings
  106: 'Command Center',
  107: 'Comsat Station',
  108: 'Nuclear Silo',
  109: 'Supply Depot',
  110: 'Refinery',
  111: 'Barracks',
  112: 'Academy',
  113: 'Factory',
  114: 'Starport',
  115: 'Control Tower',
  116: 'Science Facility',
  117: 'Covert Ops',
  118: 'Physics Lab',
  120: 'Machine Shop',
  122: 'Engineering Bay',
  123: 'Armory',
  124: 'Missile Turret',
  125: 'Bunker',
  
  // Zerg Units
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
  103: 'Lurker',
  
  // Zerg Buildings
  131: 'Hatchery',
  132: 'Lair',
  133: 'Hive',
  134: 'Nydus Canal',
  135: 'Hydralisk Den',
  136: 'Defiler Mound',
  137: 'Greater Spire',
  138: 'Queens Nest',
  139: 'Evolution Chamber',
  140: 'Ultralisk Cavern',
  141: 'Spire',
  142: 'Spawning Pool',
  143: 'Creep Colony',
  144: 'Spore Colony',
  145: 'Sunken Colony',
  149: 'Extractor'
};

export class DirectReplayParser {
  private buffer: Uint8Array;
  private offset: number;
  private originalOffset: number;

  constructor(arrayBuffer: ArrayBuffer) {
    this.buffer = new Uint8Array(arrayBuffer);
    this.offset = 0x279; // Default offset, will be dynamically detected
    this.originalOffset = this.offset;
    console.log('[DirectReplayParser] Initialized with buffer size:', this.buffer.length);
  }

  /**
   * Parse the entire replay and extract all data with enhanced detection
   */
  parseReplay(): DirectParserResult {
    console.log('[DirectReplayParser] === STARTING ENHANCED DIRECT PARSING ===');
    
    try {
      // Dynamic command stream detection using sync frame flooding
      const commandStart = this.findCommandStreamWithSyncFlooding();
      if (commandStart !== -1) {
        this.offset = commandStart;
        console.log('[DirectReplayParser] Found command stream via sync flooding at offset:', commandStart.toString(16));
      } else {
        console.log('[DirectReplayParser] Using default offset:', this.offset.toString(16));
      }

      const commands = this.parseCommandsEnhanced();
      console.log('[DirectReplayParser] Parsed commands:', commands.length);

      // === DETAILED COMMAND ANALYSIS ===
      this.analyzeCommandsEnhanced(commands);

      const playerActions = this.groupCommandsByPlayer(commands);
      const buildOrders = this.generateEnhancedBuildOrders(playerActions);
      const { apm, eapm } = this.calculateEnhancedAPM(playerActions);
      const totalFrames = this.getTotalFrames(commands);

      console.log('[DirectReplayParser] === ENHANCED PARSING COMPLETE ===');
      console.log('  - Total commands:', commands.length);
      console.log('  - Total frames:', totalFrames);
      console.log('  - Players with actions:', Object.keys(playerActions).length);
      console.log('  - Build orders generated:', buildOrders.reduce((sum, bo) => sum + bo.length, 0));
      console.log('  - Enhanced APM:', apm);

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
      console.error('[DirectReplayParser] Enhanced parsing failed:', error);
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
   * Find command stream using sync frame flooding detection
   */
  private findCommandStreamWithSyncFlooding(): number {
    console.log('[DirectReplayParser] === SYNC FRAME FLOODING DETECTION ===');
    
    // Search for areas with 3-5 consecutive frame sync commands
    const searchEnd = Math.min(this.buffer.length - 100, 0x800); // Search first 2KB
    
    for (let testOffset = 0x200; testOffset < searchEnd; testOffset += 1) {
      let consecutiveSyncFrames = 0;
      let testPos = testOffset;
      
      // Look for consecutive sync frames (0x00, 0x01, 0x02)
      for (let i = 0; i < 20 && testPos < this.buffer.length - 5; i++) {
        const byte = this.buffer[testPos];
        
        if (byte === 0x00) {
          consecutiveSyncFrames++;
          testPos++;
        } else if (byte === 0x01 && testPos + 1 < this.buffer.length) {
          consecutiveSyncFrames++;
          testPos += 2; // Skip frame count
        } else if (byte === 0x02 && testPos + 2 < this.buffer.length) {
          consecutiveSyncFrames++;
          testPos += 3; // Skip frame count (16-bit)
        } else {
          // Check if it's a valid game command
          const cmdLength = COMMAND_LENGTHS[byte] || 1;
          if (cmdLength > 0 && testPos + cmdLength < this.buffer.length) {
            // Verify player ID is valid (next byte after command)
            const nextByte = this.buffer[testPos + 1];
            if (nextByte < 12) { // Valid player ID range
              consecutiveSyncFrames++;
            }
          }
          testPos += cmdLength;
        }
      }
      
      // If we found a good sync pattern, this is likely the command stream start
      if (consecutiveSyncFrames >= 4) {
        console.log(`[DirectReplayParser] Found sync flooding pattern at 0x${testOffset.toString(16)} with ${consecutiveSyncFrames} sync frames`);
        return testOffset;
      }
    }
    
    console.log('[DirectReplayParser] No sync flooding pattern found, using fallback detection');
    return this.findCommandStreamStartFallback();
  }

  /**
   * Fallback command stream detection
   */
  private findCommandStreamStartFallback(): number {
    const potentialOffsets = [
      0x279, 0x280, 0x300, 0x320, 0x350, 0x400, 0x450, 0x500
    ];
    
    for (const testOffset of potentialOffsets) {
      if (testOffset >= this.buffer.length - 50) continue;
      
      let validCommandCount = 0;
      let testPos = testOffset;
      
      for (let i = 0; i < 30 && testPos < this.buffer.length - 6; i++) {
        const byte = this.buffer[testPos];
        
        if ([0x00, 0x01, 0x02].includes(byte)) {
          validCommandCount++;
          testPos += byte === 0x00 ? 1 : (byte === 0x01 ? 2 : 3);
        } else {
          const cmdLength = COMMAND_LENGTHS[byte] || 1;
          if (cmdLength > 0 && testPos + cmdLength < this.buffer.length) {
            const nextByte = this.buffer[testPos + 1];
            if (nextByte < 12) {
              validCommandCount++;
            }
          }
          testPos += cmdLength;
        }
      }
      
      if (validCommandCount >= 8) {
        console.log(`[DirectReplayParser] Fallback found offset: 0x${testOffset.toString(16)}`);
        return testOffset;
      }
    }
    
    return -1;
  }

  /**
   * Enhanced command parsing with improved accuracy
   */
  parseCommandsEnhanced(): ParsedCommand[] {
    const commands: ParsedCommand[] = [];
    let consecutiveErrors = 0;
    const maxErrors = 15;
    let currentFrame = 0;

    console.log('[DirectReplayParser] Starting enhanced command parsing from offset:', this.offset.toString(16));

    while (this.offset < this.buffer.length - 6 && consecutiveErrors < maxErrors) {
      try {
        const startOffset = this.offset;
        
        // Handle frame sync commands first
        const cmdByte = this.buffer[this.offset];
        
        if (cmdByte === 0x00) {
          currentFrame++;
          this.offset++;
          consecutiveErrors = 0;
          continue;
        } else if (cmdByte === 0x01) {
          if (this.offset + 1 < this.buffer.length) {
            const skipFrames = this.buffer[this.offset + 1];
            currentFrame += skipFrames;
            this.offset += 2;
            consecutiveErrors = 0;
          }
          continue;
        } else if (cmdByte === 0x02) {
          if (this.offset + 2 < this.buffer.length) {
            const skipFrames = this.buffer[this.offset + 1] | (this.buffer[this.offset + 2] << 8);
            currentFrame += skipFrames;
            this.offset += 3;
            consecutiveErrors = 0;
          }
          continue;
        }
        
        // Parse game command with enhanced validation
        const cmdId = this.readUint8();
        
        // Skip invalid commands
        if (cmdId === 0xFF || cmdId > 0x50) {
          this.offset = startOffset + 1;
          consecutiveErrors++;
          continue;
        }

        consecutiveErrors = 0;

        // Read player ID with validation
        const playerId = this.readUint8();
        if (playerId > 11) {
          this.offset = startOffset + 1;
          continue;
        }

        const command: ParsedCommand = {
          frame: currentFrame,
          cmdId,
          playerId,
          type: this.getCommandType(cmdId)
        };

        // Enhanced command-specific data parsing
        this.parseEnhancedCommandData(command);

        commands.push(command);

        // Use enhanced command length table
        this.skipEnhancedCommandPayload(cmdId);

      } catch (error) {
        console.warn('[DirectReplayParser] Error parsing command at offset', this.offset.toString(16), ':', error);
        this.offset += 1;
        consecutiveErrors++;
      }
    }

    console.log('[DirectReplayParser] Enhanced parsing completed:', commands.length, 'commands');
    return commands;
  }

  /**
   * Enhanced command data parsing with unit mapping
   */
  private parseEnhancedCommandData(command: ParsedCommand): void {
    switch (command.cmdId) {
      case 0x0C: // Build
      case 0x1D: // Train
        if (this.offset + 2 < this.buffer.length) {
          command.unitType = this.readUint16();
          command.unitName = this.getUnitNameEnhanced(command.unitType);
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
          this.offset += Math.min(unitCount * 2, 24);
        }
        break;
    }
  }

  /**
   * Enhanced command payload skipping using command length table
   */
  private skipEnhancedCommandPayload(cmdId: number): void {
    const commandLength = COMMAND_LENGTHS[cmdId];
    
    if (commandLength) {
      // We already read cmdId (1 byte) and playerId (1 byte), so skip remaining
      const remainingBytes = Math.max(0, commandLength - 2);
      this.offset += Math.min(remainingBytes, this.buffer.length - this.offset);
    } else {
      // Unknown command, skip conservatively
      this.offset += Math.min(2, this.buffer.length - this.offset);
    }
  }

  /**
   * Enhanced unit name mapping
   */
  private getUnitNameEnhanced(unitType: number): string {
    return UNIT_MAPPING[unitType] || `Unit ${unitType}`;
  }

  /**
   * Enhanced command analysis with detailed breakdown
   */
  private analyzeCommandsEnhanced(commands: ParsedCommand[]): void {
    console.log('[DirectReplayParser] === ENHANCED COMMAND ANALYSIS ===');
    
    console.log(`Found ${commands.length} commands total.`);
    
    const commandsByType: Record<number, number> = {};
    const commandsByPlayer: Record<number, ParsedCommand[]> = {};
    
    commands.forEach(cmd => {
      commandsByType[cmd.cmdId] = (commandsByType[cmd.cmdId] || 0) + 1;
      
      if (!commandsByPlayer[cmd.playerId]) {
        commandsByPlayer[cmd.playerId] = [];
      }
      commandsByPlayer[cmd.playerId].push(cmd);
    });
    
    // Enhanced command type breakdown
    console.log('[DirectReplayParser] Command types found:');
    Object.entries(commandsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Top 10
      .forEach(([cmdId, count]) => {
        const cmdName = this.getCommandType(parseInt(cmdId));
        console.log(`  - 0x${parseInt(cmdId).toString(16).padStart(2, '0')} (${cmdName}): ${count}`);
      });
    
    // Enhanced per-player breakdown with action counting
    console.log('[DirectReplayParser] Enhanced per-player action breakdown:');
    Object.entries(commandsByPlayer).forEach(([playerId, playerCommands]) => {
      const pid = parseInt(playerId);
      
      const frameSync = playerCommands.filter(c => [0x00, 0x01, 0x02].includes(c.cmdId)).length;
      const build = playerCommands.filter(c => c.cmdId === 0x0C).length;
      const train = playerCommands.filter(c => c.cmdId === 0x1D).length;
      const moveAttack = playerCommands.filter(c => [0x14, 0x15].includes(c.cmdId)).length;
      const select = playerCommands.filter(c => c.cmdId === 0x1B).length;
      const validActions = playerCommands.filter(c => VALID_APM_COMMANDS.includes(c.cmdId));
      
      console.log(`Player ${pid}: ${playerCommands.length} total commands`);
      console.log(`  - ${frameSync} FrameSync (excluded from APM)`);
      console.log(`  - ${build} Build Commands`);
      console.log(`  - ${train} Train Commands`);
      console.log(`  - ${moveAttack} Move/Attack Commands`);
      console.log(`  - ${select} Select Commands`);
      console.log(`  - ${validActions.length} Valid APM Actions`);
      
      // Calculate enhanced APM for this player
      const lastFrame = Math.max(...playerCommands.map(c => c.frame), 0);
      const minutes = lastFrame / (24 * 60);
      const playerAPM = minutes > 0 ? Math.round(validActions.length / minutes) : 0;
      
      console.log(`  - Game duration: ${minutes.toFixed(2)} minutes`);
      console.log(`  - Enhanced APM: ${playerAPM}`);
    });
  }

  /**
   * Enhanced APM calculation using valid action commands only
   */
  private calculateEnhancedAPM(playerActions: ParsedCommand[][]): { apm: number[]; eapm: number[] } {
    const apm: number[] = [];
    const eapm: number[] = [];

    console.log('[DirectReplayParser] === ENHANCED APM CALCULATION ===');

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
      
      // Enhanced APM: Only count valid action commands (exclude frame sync)
      const validActions = actions.filter(a => VALID_APM_COMMANDS.includes(a.cmdId));
      
      // Enhanced EAPM: Exclude selection and movement for effective actions
      const effectiveActions = validActions.filter(a => 
        ![0x1B, 0x14, 0x15, 0x09, 0x0A, 0x0B].includes(a.cmdId)
      );
      
      const playerAPM = gameTimeMinutes > 0 ? Math.round(validActions.length / gameTimeMinutes) : 0;
      const playerEAPM = gameTimeMinutes > 0 ? Math.round(effectiveActions.length / gameTimeMinutes) : 0;
      
      apm[playerId] = playerAPM;
      eapm[playerId] = playerEAPM;
      
      console.log(`[DirectReplayParser] Enhanced APM for Player ${playerId}:`);
      console.log(`  - Total commands: ${actions.length}`);
      console.log(`  - Valid actions: ${validActions.length}`);
      console.log(`  - Effective actions: ${effectiveActions.length}`);
      console.log(`  - Game time: ${gameTimeMinutes.toFixed(2)} minutes`);
      console.log(`  - Final APM: ${playerAPM}`);
      console.log(`  - Final EAPM: ${playerEAPM}`);
    });

    return { apm, eapm };
  }

  /**
   * Enhanced build order generation with readable unit names
   */
  private generateEnhancedBuildOrders(playerActions: ParsedCommand[][]): BuildAction[][] {
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

  private framesToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private estimateSupply(frame: number, buildIndex: number): number {
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
