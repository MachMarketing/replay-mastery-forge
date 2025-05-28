/**
 * Enhanced Direct Replay Parser with BWAPI-compliant command parsing
 * Optimized for StarCraft: Brood War Remastered replays
 */

import { ParsedCommand, BuildOrderItem, DirectParserResult } from './types';

export class DirectReplayParser {
  private data: DataView;
  private position: number = 0;
  private totalFrames: number = 0;

  // BWAPI-compliant command length table
  private static readonly COMMAND_LENGTHS: Record<number, number> = {
    // Frame synchronization
    0x00: 3,   // Frame advance (cmd + 2 byte frame number)
    0x01: 3,   // Frame skip (cmd + 2 byte frame number) 
    0x02: 3,   // Large frame skip (cmd + 2 byte frame number)
    
    // Selection commands (important for APM)
    0x09: 2,   // Select
    0x0A: 2,   // Shift Select
    0x0B: 2,   // Shift Deselect
    0x1B: 7,   // Select Units (wichtig für APM)
    
    // Macro commands
    0x0C: 10,  // Build (BWAPI spec)
    0x1D: 6,   // Train (BWAPI spec)
    0x1E: 2,   // Cancel Train
    0x2F: 6,   // Research (AbilityCast)
    0x30: 2,   // Cancel Research
    0x31: 2,   // Upgrade
    0x32: 2,   // Cancel Upgrade
    0x34: 2,   // Building Morph
    
    // Micro commands
    0x14: 8,   // Move (BWAPI spec)
    0x15: 9,   // Attack (BWAPI spec)
    0x16: 1,   // Cancel
    0x17: 1,   // Cancel Hatch
    0x18: 1,   // Stop
    0x19: 1,   // Carrier Stop
    0x1A: 1,   // Reaver Stop
    
    // Other commands
    0x0D: 2,   // Vision
    0x0E: 4,   // Alliance
    0x13: 2,   // Hotkey
    0x1F: 1,   // Cloak
    0x20: 1,   // Decloak
    0x21: 2,   // Unit Morph
    0x23: 1,   // Unsiege
    0x24: 1,   // Siege
    0x25: 2,   // Train Fighter
    0x27: 1,   // Unload All
    0x28: 2,   // Unload
    0x2A: 1,   // Hold Position
    0x2B: 1,   // Burrow
    0x2C: 1,   // Unburrow
    0x2E: 1,   // Lift
    0x35: 1,   // Stim
    0x5A: 1,   // Leave Game
  };

  // Enhanced unit ID to name mapping based on BWAPI
  private static readonly UNIT_NAMES: Record<number, string> = {
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
    34: 'Medic',
    58: 'Valkyrie',
    
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
    61: 'Dark Templar',
    63: 'Dark Archon',
    77: 'Corsair',
    83: 'Reaver',
    
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
    50: 'Infested Terran',
    
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
    119: 'Machine Shop',
    120: 'Repair Bay',
    121: 'Engineering Bay',
    122: 'Armory',
    123: 'Missile Turret',
    124: 'Bunker',
    
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
    146: 'Extractor',
  };

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new DataView(arrayBuffer);
    console.log('[DirectReplayParser] Initialized with buffer size:', arrayBuffer.byteLength);
  }

  parseReplay(): DirectParserResult {
    console.log('[DirectReplayParser] === STARTING BWAPI-COMPLIANT PARSING ===');
    
    try {
      // Phase 1: Find command stream using FrameSync flood detection
      const commandStreamStart = this.findCommandStreamWithFrameSyncFlood();
      if (commandStreamStart === -1) {
        console.error('[DirectReplayParser] Could not find command stream using FrameSync flood');
        return this.createFailureResult('Command stream not found via FrameSync flood detection');
      }

      console.log('[DirectReplayParser] Command stream found at offset:', `0x${commandStreamStart.toString(16)}`);
      this.position = commandStreamStart;

      // Phase 2: Parse commands with improved BWAPI-compliant parsing
      const commands = this.parseCommandsWithFrameSync();
      console.log('[DirectReplayParser] Commands parsed:', commands.length);
      console.log('[DirectReplayParser] Total frames detected:', this.totalFrames);

      // Phase 3: Organize and calculate metrics
      const playerActions = this.organizeCommandsByPlayer(commands);
      const { apm, eapm } = this.calculateRealisticPlayerMetrics(playerActions);
      const buildOrders = this.extractBuildOrders(playerActions);

      console.log('[DirectReplayParser] Player actions organized:');
      Object.keys(playerActions).forEach(playerId => {
        const playerCommands = playerActions[parseInt(playerId)];
        console.log(`  Player ${playerId}: ${playerCommands.length} actions, APM: ${apm[parseInt(playerId)]}`);
      });

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
      console.error('[DirectReplayParser] BWAPI parsing failed:', error);
      return this.createFailureResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Enhanced FrameSync flood detection based on the technical guide
   */
  private findCommandStreamWithFrameSyncFlood(): number {
    console.log('[DirectReplayParser] Searching for FrameSync flood pattern...');
    
    const frameSyncCommands = [0x00, 0x01, 0x02];
    
    // Start searching after typical header (skip first 1KB)
    for (let offset = 1024; offset < this.data.byteLength - 100; offset++) {
      try {
        // Look for 5+ FrameSync commands within 30 bytes
        let frameSyncCount = 0;
        let searchEnd = Math.min(offset + 30, this.data.byteLength);
        
        for (let pos = offset; pos < searchEnd; pos += 3) {
          if (pos >= this.data.byteLength) break;
          
          const byte = this.data.getUint8(pos);
          if (frameSyncCommands.includes(byte)) {
            frameSyncCount++;
            if (frameSyncCount >= 5) {
              console.log(`[DirectReplayParser] Found FrameSync flood at offset 0x${offset.toString(16)} (${frameSyncCount} syncs)`);
              
              // Validate by trying to parse a few commands
              if (this.validateCommandStreamBWAPI(offset)) {
                return offset;
              }
              break;
            }
          } else {
            // Reset count if we hit a non-FrameSync command
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback to common offsets if flood detection fails
    const fallbackOffsets = [0x279, 0x300, 0x400, 0x500, 0x600, 0x800, 0x1000];
    for (const offset of fallbackOffsets) {
      if (offset < this.data.byteLength && this.validateCommandStreamBWAPI(offset)) {
        console.log('[DirectReplayParser] Using fallback offset:', `0x${offset.toString(16)}`);
        return offset;
      }
    }

    return -1;
  }

  /**
   * Validate command stream using BWAPI command structure
   */
  private validateCommandStreamBWAPI(offset: number): boolean {
    try {
      let pos = offset;
      let validCommands = 0;
      let currentFrame = 0;
      
      for (let i = 0; i < 20 && pos < this.data.byteLength - 10; i++) {
        const cmdId = this.data.getUint8(pos);
        const length = DirectReplayParser.COMMAND_LENGTHS[cmdId] || 1;
        
        if (length > 0 && length < 50 && pos + length <= this.data.byteLength) {
          // Special handling for FrameSync commands
          if ([0x00, 0x01, 0x02].includes(cmdId)) {
            if (length >= 3) {
              const frameNumber = this.data.getUint16(pos + 1, true); // Little endian
              if (frameNumber >= currentFrame && frameNumber < currentFrame + 1000) {
                currentFrame = frameNumber;
                validCommands++;
              }
            }
          } else {
            validCommands++;
          }
          pos += length;
        } else {
          break;
        }
      }
      
      const isValid = validCommands >= 8;
      console.log(`[DirectReplayParser] Validation at 0x${offset.toString(16)}: ${validCommands} valid commands, ${isValid ? 'PASSED' : 'FAILED'}`);
      return isValid;
    } catch (e) {
      return false;
    }
  }

  /**
   * Parse commands with proper FrameSync handling
   */
  private parseCommandsWithFrameSync(): ParsedCommand[] {
    const commands: ParsedCommand[] = [];
    let currentFrame = 0;
    let safetyCounter = 0;
    const maxCommands = 5000;

    console.log('[DirectReplayParser] Starting BWAPI-compliant command parsing...');

    while (this.position < this.data.byteLength - 3 && safetyCounter < maxCommands) {
      try {
        const cmdId = this.data.getUint8(this.position);
        const length = DirectReplayParser.COMMAND_LENGTHS[cmdId] || 1;

        if (length <= 0 || this.position + length > this.data.byteLength) {
          console.warn('[DirectReplayParser] Invalid command length, stopping');
          break;
        }

        // Handle FrameSync commands properly
        if ([0x00, 0x01, 0x02].includes(cmdId)) {
          if (length >= 3) {
            const frameNumber = this.data.getUint16(this.position + 1, true); // Little endian
            currentFrame = frameNumber;
            this.totalFrames = Math.max(this.totalFrames, currentFrame);
            
            if (safetyCounter % 100 === 0) {
              console.log(`[DirectReplayParser] FrameSync: Frame ${currentFrame}`);
            }
          }
          this.position += length;
          safetyCounter++;
          continue;
        }

        // Parse player commands
        let playerId = 0;
        if (length > 1) {
          playerId = this.data.getUint8(this.position + 1);
          // Validate player ID (should be 0-7)
          if (playerId > 7) {
            playerId = 0;
          }
        }

        // Extract unit information for build commands
        const unitName = this.extractUnitNameBWAPI(cmdId, this.position);

        // Create command object
        const command: ParsedCommand = {
          frame: currentFrame,
          timestamp: currentFrame / 24,
          timestampString: this.frameToTimestamp(currentFrame),
          cmdId,
          playerId,
          type: cmdId,
          typeString: this.getCommandTypeBWAPI(cmdId),
          data: new Uint8Array(this.extractCommandData(cmdId, this.position, length)),
          category: this.getCommandCategoryBWAPI(cmdId),
          unitName
        };

        commands.push(command);
        this.position += length;
        safetyCounter++;

        // Log first few commands for debugging
        if (safetyCounter <= 10) {
          console.log(`[DirectReplayParser] Command ${safetyCounter}:`, {
            frame: command.frame,
            type: `0x${command.cmdId.toString(16)}`,
            typeString: command.typeString,
            playerId: command.playerId,
            unitName: command.unitName
          });
        }

      } catch (error) {
        console.warn('[DirectReplayParser] Command parsing error:', error);
        this.position++;
        safetyCounter++;
      }
    }

    console.log('[DirectReplayParser] Command parsing complete:', {
      totalCommands: commands.length,
      totalFrames: this.totalFrames,
      gameTimeMinutes: Math.round((this.totalFrames / 24 / 60) * 100) / 100
    });
    
    return commands;
  }

  /**
   * Extract unit name using BWAPI-compliant unit IDs
   */
  private extractUnitNameBWAPI(cmdId: number, position: number): string | undefined {
    try {
      // Build and Train commands have unit IDs
      if ([0x0C, 0x1D].includes(cmdId)) {
        if (position + 4 < this.data.byteLength) {
          // For build commands, unit ID is typically at offset +2 or +3
          let unitId = this.data.getUint8(position + 2);
          if (unitId === 0 && position + 3 < this.data.byteLength) {
            unitId = this.data.getUint8(position + 3);
          }
          
          const unitName = DirectReplayParser.UNIT_NAMES[unitId];
          if (unitName) {
            return unitName;
          }
          
          // Fallback: try as 16-bit value
          if (position + 4 < this.data.byteLength) {
            const unitId16 = this.data.getUint16(position + 2, true);
            return DirectReplayParser.UNIT_NAMES[unitId16] || `Unit_${unitId16}`;
          }
        }
      }
    } catch (e) {
      // Return undefined if extraction fails
    }
    return undefined;
  }

  /**
   * Get BWAPI command type name
   */
  private getCommandTypeBWAPI(cmdId: number): string {
    const types: Record<number, string> = {
      0x00: 'FrameSync',
      0x01: 'FrameSync',
      0x02: 'FrameSync',
      0x09: 'Select',
      0x0A: 'Shift Select',
      0x0B: 'Shift Deselect',
      0x0C: 'Build',
      0x0D: 'Vision',
      0x0E: 'Alliance',
      0x13: 'Hotkey',
      0x14: 'Move',
      0x15: 'Attack',
      0x16: 'Cancel',
      0x17: 'Cancel Hatch',
      0x18: 'Stop',
      0x1B: 'Select Units',
      0x1D: 'Train',
      0x1E: 'Cancel Train',
      0x1F: 'Cloak',
      0x20: 'Decloak',
      0x21: 'Unit Morph',
      0x2F: 'Research',
      0x30: 'Cancel Research',
      0x31: 'Upgrade',
      0x32: 'Cancel Upgrade',
      0x34: 'Building Morph',
      0x35: 'Stim',
      0x5A: 'Leave Game'
    };
    return types[cmdId] || `Command_0x${cmdId.toString(16).padStart(2, '0')}`;
  }

  /**
   * Categorize commands using BWAPI classification
   */
  private getCommandCategoryBWAPI(cmdId: number): 'macro' | 'micro' | 'other' {
    const macroCommands = [0x0C, 0x1D, 0x1E, 0x2F, 0x30, 0x31, 0x32, 0x34]; // Build, Train, Research, Upgrade
    const microCommands = [0x14, 0x15, 0x18, 0x2A, 0x2B, 0x2C, 0x35]; // Move, Attack, Stop, etc.
    
    if (macroCommands.includes(cmdId)) return 'macro';
    if (microCommands.includes(cmdId)) return 'micro';
    return 'other';
  }

  /**
   * Extract raw command data for debugging
   */
  private extractCommandData(cmdId: number, position: number, length: number): number[] {
    const data: number[] = [];
    for (let i = 0; i < Math.min(length, 16); i++) {
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
      // Only count meaningful player actions (exclude FrameSync)
      if (![0x00, 0x01, 0x02].includes(cmd.cmdId)) {
        playerActions[cmd.playerId].push(cmd);
      }
    }

    return playerActions;
  }

  /**
   * Calculate realistic APM based on actual game actions
   */
  private calculateRealisticPlayerMetrics(playerActions: Record<number, ParsedCommand[]>): { apm: number[], eapm: number[] } {
    const apm: number[] = [];
    const eapm: number[] = [];
    const gameTimeMinutes = this.totalFrames / (24 * 60);

    for (let playerId = 0; playerId < 8; playerId++) {
      const actions = playerActions[playerId] || [];
      
      // APM: Count all meaningful actions (exclude FrameSync)
      const meaningfulActions = actions.filter(cmd => 
        ![0x00, 0x01, 0x02].includes(cmd.cmdId)
      );
      const playerAPM = gameTimeMinutes > 0 ? Math.round(meaningfulActions.length / gameTimeMinutes) : 0;
      
      // EAPM: Only macro/micro actions (exclude selections and other noise)
      const effectiveActions = actions.filter(cmd => 
        cmd.category === 'macro' || cmd.category === 'micro'
      );
      const playerEAPM = gameTimeMinutes > 0 ? Math.round(effectiveActions.length / gameTimeMinutes) : 0;
      
      apm.push(playerAPM);
      eapm.push(playerEAPM);
    }

    return { apm, eapm };
  }

  /**
   * Extract build orders with enhanced unit detection
   */
  private extractBuildOrders(playerActions: Record<number, ParsedCommand[]>): BuildOrderItem[][] {
    const buildOrders: BuildOrderItem[][] = [];

    for (let playerId = 0; playerId < 8; playerId++) {
      const actions = playerActions[playerId] || [];
      const buildOrder: BuildOrderItem[] = [];

      for (const action of actions) {
        // Include build and train commands with detected unit names
        if ([0x0C, 0x1D].includes(action.cmdId) && action.unitName) {
          const actionType = action.cmdId === 0x0C ? 'Build' : 'Train';
          buildOrder.push({
            frame: action.frame,
            timestamp: action.timestampString,
            action: `${actionType} ${action.unitName}`,
            supply: 0 // TODO: Extract supply if available in command data
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
