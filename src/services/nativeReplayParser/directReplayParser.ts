/**
 * Enhanced Direct Replay Parser with aggressive command stream detection
 * Optimized for StarCraft: Brood War Remastered replays
 */

import { ParsedCommand, BuildOrderItem, DirectParserResult } from './types';

export class DirectReplayParser {
  private data: DataView;
  private position: number = 0;
  private totalFrames: number = 0;

  // Enhanced command length table
  private static readonly COMMAND_LENGTHS: Record<number, number> = {
    0x00: 1,   // Keep Alive / Sync
    0x01: 1,   // Save Game / Sync
    0x02: 1,   // Load Game / Sync
    0x05: 3,   // Restart Game
    0x06: 4,   // Select
    0x07: 6,   // Shift Select
    0x08: 12,  // Shift Deselect
    0x09: 2,   // Build
    0x0A: 3,   // Vision
    0x0B: 4,   // Alliance
    0x0C: 9,   // Game Speed
    0x0D: 1,   // Pause
    0x0E: 1,   // Resume
    0x0F: 5,   // Cheat
    0x10: 8,   // Hotkey
    0x11: 8,   // Move
    0x12: 9,   // Select
    0x13: 2,   // Cancel
    0x14: 8,   // Cancel Hatch
    0x15: 12,  // Stop
    0x16: 9,   // Carrier Stop
    0x17: 9,   // Reaver Stop
    0x18: 11,  // Order Nothing
    0x19: 10,  // Train Fighter
    0x1A: 29,  // Merge Dark Archon
    0x1B: 7,   // Merge High Templar
    0x1C: 7,   // Hold Position
    0x1D: 7,   // Unload All
    0x1E: 9,   // Unload
    0x1F: 10,  // Merge Dark Archon
    0x20: 26,  // Merge High Templar
    0x21: 30,  // Use Stim Pack
    0x22: 4,   // Synchronize Selection
    // More commands...
    0x5A: 1,   // Leave Game
  };

  // Unit ID to name mapping for readable build orders
  private static readonly UNIT_NAMES: Record<number, string> = {
    // Protoss Units
    64: 'Probe',
    65: 'Zealot',
    66: 'Dragoon',
    67: 'High Templar',
    68: 'Archon',
    69: 'Shuttle',
    70: 'Scout',
    71: 'Arbiter',
    72: 'Carrier',
    73: 'Interceptor',
    74: 'Dark Templar',
    75: 'Dark Archon',
    76: 'Observer',
    77: 'Warp Prism',
    78: 'Corsair',
    79: 'Disruption Web',
    
    // Protoss Buildings
    154: 'Nexus',
    155: 'Robotics Facility',
    156: 'Pylon',
    157: 'Assimilator',
    158: 'Observatory',
    159: 'Gateway',
    160: 'Photon Cannon',
    161: 'Citadel of Adun',
    162: 'Cybernetics Core',
    163: 'Templar Archives',
    164: 'Forge',
    165: 'Stargate',
    166: 'Fleet Beacon',
    167: 'Arbiter Tribunal',
    168: 'Robotics Support Bay',
    169: 'Shield Battery',
    
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
    13: 'Vulture Spider Mine',
    14: 'Nuclear Missile',
    15: 'Siege Tank (Siege Mode)',
    32: 'Firebat',
    33: 'Medic',
    58: 'Valkyrie',
    
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
    37: 'Larva',
    38: 'Egg',
    39: 'Zergling',
    40: 'Hydralisk',
    41: 'Ultralisk',
    42: 'Broodling',
    43: 'Drone',
    44: 'Overlord',
    45: 'Mutalisk',
    46: 'Guardian',
    47: 'Queen',
    48: 'Defiler',
    49: 'Scourge',
    62: 'Lurker',
    103: 'Devourer',
    
    // Zerg Buildings
    131: 'Infested Command Center',
    132: 'Hatchery',
    133: 'Lair',
    134: 'Hive',
    135: 'Nydus Canal',
    136: 'Hydralisk Den',
    137: 'Defiler Mound',
    138: 'Greater Spire',
    139: 'Queens Nest',
    140: 'Evolution Chamber',
    141: 'Ultralisk Cavern',
    142: 'Spire',
    143: 'Spawning Pool',
    144: 'Creep Colony',
    145: 'Spore Colony',
    147: 'Sunken Colony',
    149: 'Extractor',
  };

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new DataView(arrayBuffer);
    console.log('[DirectReplayParser] Initialized with buffer size:', arrayBuffer.byteLength);
  }

  parseReplay(): DirectParserResult {
    console.log('[DirectReplayParser] === STARTING ENHANCED DIRECT PARSING ===');
    
    try {
      // Phase 1: Find command stream using sync frame flooding
      const commandStreamStart = this.findCommandStreamStart();
      if (commandStreamStart === -1) {
        console.error('[DirectReplayParser] Could not find command stream start');
        return this.createFailureResult('Command stream not found');
      }

      console.log('[DirectReplayParser] Command stream found at offset:', commandStreamStart);
      this.position = commandStreamStart;

      // Phase 2: Parse commands with enhanced detection
      const commands = this.parseCommands();
      console.log('[DirectReplayParser] Commands parsed:', commands.length);

      // Phase 3: Organize by players and calculate metrics
      const playerActions = this.organizeCommandsByPlayer(commands);
      const { apm, eapm } = this.calculatePlayerMetrics(playerActions);
      const buildOrders = this.extractBuildOrders(playerActions);

      console.log('[DirectReplayParser] Player actions organized:');
      Object.keys(playerActions).forEach(playerId => {
        console.log(`  Player ${playerId}: ${playerActions[parseInt(playerId)].length} actions`);
      });

      console.log('[DirectReplayParser] APM calculated:', apm);
      console.log('[DirectReplayParser] Build orders extracted:', buildOrders.map(bo => bo.length));

      return {
        success: true,
        commands,
        playerActions,
        apm,
        eapm,
        buildOrders,
        totalFrames: this.totalFrames,
        error: undefined
      };

    } catch (error) {
      console.error('[DirectReplayParser] Parsing failed:', error);
      return this.createFailureResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Enhanced command stream detection using sync frame flooding
   */
  private findCommandStreamStart(): number {
    console.log('[DirectReplayParser] Searching for command stream using sync frame flooding...');
    
    // Search for patterns of sync commands (0x00, 0x01, 0x02)
    const syncCommands = [0x00, 0x01, 0x02];
    let consecutiveSyncs = 0;
    let potentialStart = -1;

    // Start searching after typical header size (skip first 1KB)
    for (let offset = 1024; offset < this.data.byteLength - 100; offset++) {
      try {
        const byte = this.data.getUint8(offset);
        
        if (syncCommands.includes(byte)) {
          if (consecutiveSyncs === 0) {
            potentialStart = offset;
          }
          consecutiveSyncs++;
          
          // If we find 3+ consecutive sync commands, we likely found the stream
          if (consecutiveSyncs >= 3) {
            console.log('[DirectReplayParser] Found sync frame flooding at offset:', potentialStart);
            
            // Validate by checking if we can parse a few commands
            if (this.validateCommandStream(potentialStart)) {
              return potentialStart;
            }
          }
        } else {
          consecutiveSyncs = 0;
          potentialStart = -1;
        }
      } catch (e) {
        // Continue searching if we hit a boundary error
        continue;
      }
    }

    // Fallback: Try common offsets for different replay formats
    const fallbackOffsets = [0x279, 0x300, 0x400, 0x500, 0x600, 0x800];
    for (const offset of fallbackOffsets) {
      if (offset < this.data.byteLength && this.validateCommandStream(offset)) {
        console.log('[DirectReplayParser] Using fallback offset:', offset);
        return offset;
      }
    }

    return -1;
  }

  /**
   * Validate command stream by trying to parse first few commands
   */
  private validateCommandStream(offset: number): boolean {
    try {
      let pos = offset;
      let validCommands = 0;
      
      for (let i = 0; i < 10 && pos < this.data.byteLength - 10; i++) {
        const cmdId = this.data.getUint8(pos);
        const length = this.getCommandLength(cmdId, pos);
        
        if (length > 0 && length < 50 && pos + length <= this.data.byteLength) {
          validCommands++;
          pos += length;
        } else {
          break;
        }
      }
      
      return validCommands >= 5; // Need at least 5 valid commands
    } catch (e) {
      return false;
    }
  }

  /**
   * Enhanced command parsing with better error handling
   */
  private parseCommands(): ParsedCommand[] {
    const commands: ParsedCommand[] = [];
    let currentFrame = 0;
    let safetyCounter = 0;
    const maxCommands = 10000; // Safety limit

    console.log('[DirectReplayParser] Starting command parsing from position:', this.position);

    while (this.position < this.data.byteLength - 1 && safetyCounter < maxCommands) {
      try {
        const cmdId = this.data.getUint8(this.position);
        const length = this.getCommandLength(cmdId, this.position);

        if (length <= 0 || this.position + length > this.data.byteLength) {
          console.warn('[DirectReplayParser] Invalid command length, stopping parsing');
          break;
        }

        // Parse frame sync commands to track game time
        if (cmdId === 0x00 || cmdId === 0x01) {
          if (length >= 2) {
            currentFrame += this.data.getUint8(this.position + 1);
          } else {
            currentFrame++;
          }
          this.totalFrames = Math.max(this.totalFrames, currentFrame);
        }

        // Extract player ID (usually in second byte for player commands)
        let playerId = 0;
        if (length > 1 && cmdId !== 0x00 && cmdId !== 0x01 && cmdId !== 0x02) {
          playerId = this.data.getUint8(this.position + 1);
          // Validate player ID (should be 0-7)
          if (playerId > 7) {
            playerId = 0;
          }
        }

        // Create command object
        const command: ParsedCommand = {
          frame: currentFrame,
          timestamp: currentFrame / 24,
          timestampString: this.frameToTimestamp(currentFrame),
          cmdId,
          playerId,
          type: cmdId,
          typeString: this.getCommandType(cmdId),
          data: new Uint8Array(this.extractCommandData(cmdId, this.position, length)),
          category: this.getCommandCategory(cmdId),
          unitName: this.extractUnitName(cmdId, this.position)
        };

        commands.push(command);
        this.position += length;
        safetyCounter++;

      } catch (error) {
        console.warn('[DirectReplayParser] Error parsing command at position', this.position, ':', error);
        this.position++;
        safetyCounter++;
      }
    }

    console.log('[DirectReplayParser] Command parsing complete. Total commands:', commands.length);
    console.log('[DirectReplayParser] Total frames detected:', this.totalFrames);
    
    return commands;
  }

  /**
   * Get command length using enhanced table and dynamic detection
   */
  private getCommandLength(cmdId: number, position: number): number {
    // Use table lookup first
    if (DirectReplayParser.COMMAND_LENGTHS[cmdId]) {
      return DirectReplayParser.COMMAND_LENGTHS[cmdId];
    }

    // Dynamic detection for unknown commands
    try {
      // Most commands are between 1-30 bytes
      for (let len = 1; len <= 30; len++) {
        if (position + len >= this.data.byteLength) {
          return len - 1;
        }
        
        // Check if next byte could be a valid command ID
        const nextByte = this.data.getUint8(position + len);
        if (this.isLikelyCommandId(nextByte)) {
          return len;
        }
      }
    } catch (e) {
      // Fallback
    }

    return 1; // Minimum safe length
  }

  /**
   * Check if a byte is likely a command ID
   */
  private isLikelyCommandId(byte: number): boolean {
    // Common command IDs
    const commonCommands = [0x00, 0x01, 0x02, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x5A];
    return commonCommands.includes(byte);
  }

  /**
   * Extract unit name from build/train commands
   */
  private extractUnitName(cmdId: number, position: number): string | undefined {
    try {
      // Build/Train commands typically have unit ID
      if (cmdId === 0x0C || cmdId === 0x1D || cmdId === 0x23) { // Build, Train, etc.
        if (position + 4 < this.data.byteLength) {
          const unitId = this.data.getUint16(position + 2, true); // Little endian
          return DirectReplayParser.UNIT_NAMES[unitId] || `Unit_${unitId}`;
        }
      }
    } catch (e) {
      // Return undefined if extraction fails
    }
    return undefined;
  }

  /**
   * Get human-readable command type
   */
  private getCommandType(cmdId: number): string {
    const types: Record<number, string> = {
      0x00: 'Sync',
      0x01: 'Sync',
      0x02: 'Sync',
      0x0C: 'Build',
      0x1D: 'Train',
      0x06: 'Select',
      0x12: 'Select',
      0x14: 'Attack',
      0x15: 'Move',
      0x5A: 'Leave Game'
    };
    return types[cmdId] || `Command_0x${cmdId.toString(16).padStart(2, '0')}`;
  }

  /**
   * Get command category for analysis
   */
  private getCommandCategory(cmdId: number): 'macro' | 'micro' | 'other' {
    const macroCommands = [0x0C, 0x1D, 0x23]; // Build, Train, etc.
    const microCommands = [0x14, 0x15, 0x16, 0x17]; // Attack, Move, etc.
    
    if (macroCommands.includes(cmdId)) return 'macro';
    if (microCommands.includes(cmdId)) return 'micro';
    return 'other';
  }

  /**
   * Extract raw command data for debugging
   */
  private extractCommandData(cmdId: number, position: number, length: number): number[] {
    const data: number[] = [];
    for (let i = 0; i < Math.min(length, 10); i++) {
      if (position + i < this.data.byteLength) {
        data.push(this.data.getUint8(position + i));
      }
    }
    return data;
  }

  /**
   * Organize commands by player with enhanced filtering
   */
  private organizeCommandsByPlayer(commands: ParsedCommand[]): Record<number, ParsedCommand[]> {
    const playerActions: Record<number, ParsedCommand[]> = {};
    
    // Initialize for players 0-7
    for (let i = 0; i < 8; i++) {
      playerActions[i] = [];
    }

    for (const cmd of commands) {
      // Only count meaningful actions (exclude sync commands)
      if (cmd.cmdId !== 0x00 && cmd.cmdId !== 0x01 && cmd.cmdId !== 0x02) {
        playerActions[cmd.playerId].push(cmd);
      }
    }

    return playerActions;
  }

  /**
   * Calculate realistic APM and EAPM based on actual actions
   */
  private calculatePlayerMetrics(playerActions: Record<number, ParsedCommand[]>): { apm: number[], eapm: number[] } {
    const apm: number[] = [];
    const eapm: number[] = [];
    const gameTimeMinutes = this.totalFrames / (24 * 60); // 24 FPS

    for (let playerId = 0; playerId < 8; playerId++) {
      const actions = playerActions[playerId] || [];
      
      // APM: All actions per minute
      const playerAPM = gameTimeMinutes > 0 ? Math.round(actions.length / gameTimeMinutes) : 0;
      
      // EAPM: Exclude selection and sync actions
      const effectiveActions = actions.filter(cmd => 
        ![0x06, 0x07, 0x12, 0x00, 0x01, 0x02].includes(cmd.cmdId)
      );
      const playerEAPM = gameTimeMinutes > 0 ? Math.round(effectiveActions.length / gameTimeMinutes) : 0;
      
      apm.push(playerAPM);
      eapm.push(playerEAPM);
    }

    return { apm, eapm };
  }

  /**
   * Extract build orders with readable unit names
   */
  private extractBuildOrders(playerActions: Record<number, ParsedCommand[]>): BuildOrderItem[][] {
    const buildOrders: BuildOrderItem[][] = [];

    for (let playerId = 0; playerId < 8; playerId++) {
      const actions = playerActions[playerId] || [];
      const buildOrder: BuildOrderItem[] = [];

      for (const action of actions) {
        // Include build, train, and other production commands
        if ([0x0C, 0x1D, 0x23].includes(action.cmdId) && action.unitName) {
          buildOrder.push({
            frame: action.frame,
            timestamp: action.timestampString,
            action: `Build ${action.unitName}`,
            supply: 0 // TODO: Extract supply if available
          });
        }
      }

      buildOrders.push(buildOrder);
    }

    return buildOrders;
  }

  /**
   * Convert frame to timestamp string
   */
  private frameToTimestamp(frame: number): string {
    const seconds = Math.floor(frame / 24);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Create failure result
   */
  private createFailureResult(error: string): DirectParserResult {
    return {
      success: false,
      commands: [],
      playerActions: {},
      apm: [],
      eapm: [],
      buildOrders: [],
      totalFrames: 0,
      error
    };
  }
}

export type { DirectParserResult };
