
/**
 * Enhanced Direct Replay Parser with BWAPI-compliant command parsing
 * Optimized for StarCraft: Brood War Remastered replays with multi-zlib support
 */

import { ParsedCommand, BuildOrderItem, DirectParserResult } from './types';
import * as pako from 'pako';

export class DirectReplayParser {
  private data: DataView;
  private position: number = 0;
  private totalFrames: number = 0;
  private decompressedBlocks: Uint8Array[] = [];

  // Enhanced BWAPI-compliant command length table
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
    0x14: 8,   // Move/RightClick (BWAPI spec)
    0x15: 9,   // Attack/Patrol (BWAPI spec)
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

  // Commands that count toward APM calculation
  private static readonly APM_COMMANDS = [0x0C, 0x1D, 0x1B, 0x14];

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new DataView(arrayBuffer);
    console.log('[DirectReplayParser] Initialized with buffer size:', arrayBuffer.byteLength);
  }

  parseReplay(): DirectParserResult {
    console.log('[DirectReplayParser] === STARTING ENHANCED REMASTERED PARSING ===');
    
    try {
      // Phase 1: Multi-Zlib Block Detection & Decompression
      const decompressedData = this.detectAndDecompressZlibBlocks();
      if (!decompressedData) {
        console.error('[DirectReplayParser] Could not decompress any zlib blocks');
        return this.createFailureResult('Failed to decompress zlib blocks');
      }

      console.log('[DirectReplayParser] Successfully decompressed data, size:', decompressedData.length);

      // Phase 2: Command Stream Localization via FrameSync Pattern
      const commandStreamStart = this.findCommandStreamByFrameSyncPattern(decompressedData);
      if (commandStreamStart === -1) {
        console.error('[DirectReplayParser] Could not find command stream using FrameSync pattern');
        return this.createFailureResult('Command stream not found via FrameSync pattern detection');
      }

      console.log('[DirectReplayParser] Command stream found at offset:', commandStreamStart);

      // Phase 3: Parse commands with enhanced BWAPI parsing
      this.data = new DataView(decompressedData.buffer);
      this.position = commandStreamStart;
      const commands = this.parseCommandsWithEnhancedFrameSync();
      
      console.log('[DirectReplayParser] Commands parsed:', commands.length);
      console.log('[DirectReplayParser] Total frames detected:', this.totalFrames);

      // Phase 4: Organize and calculate enhanced metrics
      const playerActions = this.organizeCommandsByPlayer(commands);
      const { apm, eapm } = this.calculateEnhancedPlayerMetrics(playerActions);
      const buildOrders = this.extractEnhancedBuildOrders(playerActions);

      // Phase 5: Generate debug information
      const debugInfo = this.generateDebugInfo(playerActions, commands);

      console.log('[DirectReplayParser] Player actions organized:');
      Object.keys(playerActions).forEach(playerId => {
        const playerCommands = playerActions[parseInt(playerId)];
        console.log(`  Player ${playerId}: ${playerCommands.length} actions, APM: ${apm[parseInt(playerId)]}`);
      });

      console.log('[DirectReplayParser] Debug Info Generated:', debugInfo);

      return {
        success: true,
        commands,
        playerActions,
        apm,
        eapm,
        buildOrders,
        totalFrames: this.totalFrames,
        debugInfo,
        error: undefined
      };

    } catch (error) {
      console.error('[DirectReplayParser] Enhanced parsing failed:', error);
      return this.createFailureResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Multi-Zlib Block Detection & Decompression for Remastered replays
   */
  private detectAndDecompressZlibBlocks(): Uint8Array | null {
    console.log('[DirectReplayParser] Starting multi-zlib block detection...');
    
    const buffer = new Uint8Array(this.data.buffer);
    const zlibHeaders = [
      [0x78, 0x9C], // Default compression
      [0x78, 0xDA], // Best compression
      [0x78, 0x01], // No compression
      [0x78, 0x5E], // Fast compression
      [0x78, 0x2C]  // Alternative compression
    ];

    const decompressedBlocks: Uint8Array[] = [];
    let largestBlock: Uint8Array | null = null;
    let largestSize = 0;

    // Search for all possible zlib blocks
    for (let i = 0; i < buffer.length - 1; i++) {
      for (const header of zlibHeaders) {
        if (buffer[i] === header[0] && buffer[i + 1] === header[1]) {
          console.log(`[DirectReplayParser] Found zlib header at offset ${i}: 0x${header[0].toString(16)} 0x${header[1].toString(16)}`);
          
          // Try different block sizes
          const maxBlockSize = Math.min(buffer.length - i, 100000);
          for (let blockSize = 1000; blockSize <= maxBlockSize; blockSize += 1000) {
            try {
              const blockData = buffer.slice(i, i + blockSize);
              
              // Try different decompression methods
              const decompMethods = [
                () => pako.inflate(blockData),
                () => pako.inflateRaw(blockData),
                () => {
                  // Skip potential wrapper bytes
                  const actualStart = this.findActualZlibStart(blockData);
                  return pako.inflate(blockData.slice(actualStart));
                }
              ];

              for (let methodIdx = 0; methodIdx < decompMethods.length; methodIdx++) {
                try {
                  const decompressed = decompMethods[methodIdx]();
                  
                  // Validate decompressed data
                  if (this.validateDecompressedData(decompressed)) {
                    console.log(`[DirectReplayParser] Successfully decompressed block at ${i}, method ${methodIdx}, size: ${decompressed.length}`);
                    decompressedBlocks.push(decompressed);
                    
                    if (decompressed.length > largestSize) {
                      largestSize = decompressed.length;
                      largestBlock = decompressed;
                    }
                    
                    break; // Found valid decompression, move to next block
                  }
                } catch (e) {
                  // Try next method
                }
              }
              
              if (decompressedBlocks.length > 0) break; // Found valid block
            } catch (e) {
              // Try next block size
            }
          }
        }
      }
    }

    console.log(`[DirectReplayParser] Found ${decompressedBlocks.length} valid zlib blocks`);
    
    if (largestBlock) {
      console.log(`[DirectReplayParser] Using largest block with size: ${largestBlock.length}`);
      return largestBlock;
    }

    // Fallback: concatenate all blocks
    if (decompressedBlocks.length > 0) {
      const totalSize = decompressedBlocks.reduce((sum, block) => sum + block.length, 0);
      const combined = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const block of decompressedBlocks) {
        combined.set(block, offset);
        offset += block.length;
      }
      
      console.log(`[DirectReplayParser] Using concatenated blocks with total size: ${combined.length}`);
      return combined;
    }

    return null;
  }

  /**
   * Find actual zlib start within data block
   */
  private findActualZlibStart(data: Uint8Array): number {
    for (let i = 0; i < Math.min(50, data.length - 1); i++) {
      if (data[i] === 0x78 && [0x9C, 0xDA, 0x01, 0x5E, 0x2C].includes(data[i + 1])) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Validate decompressed data quality
   */
  private validateDecompressedData(data: Uint8Array): boolean {
    if (data.length < 500) return false;
    
    // Count null bytes - reject if >90% are null
    let nullCount = 0;
    const sampleSize = Math.min(1000, data.length);
    
    for (let i = 0; i < sampleSize; i++) {
      if (data[i] === 0) nullCount++;
    }
    
    const nullPercentage = (nullCount / sampleSize) * 100;
    if (nullPercentage > 90) {
      console.log(`[DirectReplayParser] Rejected block with ${nullPercentage.toFixed(1)}% null bytes`);
      return false;
    }
    
    // Look for StarCraft-specific patterns
    const textContent = new TextDecoder('latin1', { fatal: false }).decode(data.slice(0, Math.min(500, data.length)));
    const patterns = ['StarCraft', 'Brood War', 'scenario.chk', 'Protoss', 'Terran', 'Zerg'];
    
    for (const pattern of patterns) {
      if (textContent.includes(pattern)) {
        console.log(`[DirectReplayParser] Found StarCraft pattern: ${pattern}`);
        return true;
      }
    }
    
    // Look for command patterns in binary data
    let commandCount = 0;
    for (let i = 0; i < Math.min(200, data.length); i++) {
      if (DirectReplayParser.COMMAND_LENGTHS[data[i]]) {
        commandCount++;
      }
    }
    
    const hasCommands = commandCount >= 5;
    console.log(`[DirectReplayParser] Validation: ${nullPercentage.toFixed(1)}% nulls, ${commandCount} commands, valid: ${hasCommands}`);
    return hasCommands;
  }

  /**
   * Find command stream using FrameSync pattern detection
   */
  private findCommandStreamByFrameSyncPattern(data: Uint8Array): number {
    console.log('[DirectReplayParser] Searching for FrameSync pattern in decompressed data...');
    
    const frameSyncCommands = [0x00, 0x01, 0x02];
    
    // Look for 3-5 consecutive FrameSync commands
    for (let i = 0; i < data.length - 20; i++) {
      let frameSyncCount = 0;
      let pos = i;
      
      // Count consecutive FrameSync commands within 30 bytes
      while (pos < Math.min(i + 30, data.length) && frameSyncCommands.includes(data[pos])) {
        frameSyncCount++;
        pos += 3; // FrameSync commands are 3 bytes each
        
        if (frameSyncCount >= 3) {
          // Verify that player commands follow
          if (this.validatePlayerCommandsFollow(data, pos)) {
            console.log(`[DirectReplayParser] Found FrameSync pattern at offset ${i} (${frameSyncCount} syncs)`);
            return i;
          }
          break;
        }
      }
    }

    // Fallback: look for any command-like patterns
    console.log('[DirectReplayParser] FrameSync pattern not found, searching for command patterns...');
    for (let i = 0; i < data.length - 50; i++) {
      let commandCount = 0;
      for (let j = 0; j < 20 && i + j < data.length; j++) {
        if (DirectReplayParser.COMMAND_LENGTHS[data[i + j]]) {
          commandCount++;
        }
      }
      
      if (commandCount >= 5) {
        console.log(`[DirectReplayParser] Found command pattern at offset ${i} (${commandCount} commands)`);
        return i;
      }
    }

    return -1;
  }

  /**
   * Validate that player commands follow FrameSync pattern
   */
  private validatePlayerCommandsFollow(data: Uint8Array, offset: number): boolean {
    const playerCommands = [0x0C, 0x1D, 0x1B, 0x14, 0x15];
    let playerCommandCount = 0;
    
    // Check next 20 bytes for player commands
    for (let i = 0; i < 20 && offset + i < data.length; i++) {
      if (playerCommands.includes(data[offset + i])) {
        playerCommandCount++;
      }
    }
    
    return playerCommandCount >= 2;
  }

  /**
   * Parse commands with enhanced FrameSync handling
   */
  private parseCommandsWithEnhancedFrameSync(): ParsedCommand[] {
    const commands: ParsedCommand[] = [];
    let currentFrame = 0;
    let safetyCounter = 0;
    const maxCommands = 10000;

    console.log('[DirectReplayParser] Starting enhanced BWAPI-compliant command parsing...');

    while (this.position < this.data.byteLength - 3 && safetyCounter < maxCommands) {
      try {
        const cmdId = this.data.getUint8(this.position);
        const length = DirectReplayParser.COMMAND_LENGTHS[cmdId] || 1;

        if (length <= 0 || this.position + length > this.data.byteLength) {
          console.warn('[DirectReplayParser] Invalid command length, stopping');
          break;
        }

        // Handle FrameSync commands with proper frame reading
        if ([0x00, 0x01, 0x02].includes(cmdId)) {
          if (length >= 3) {
            const frameNumber = this.data.getUint16(this.position + 1, true); // Little endian
            if (frameNumber >= currentFrame && frameNumber < currentFrame + 10000) {
              currentFrame = frameNumber;
              this.totalFrames = Math.max(this.totalFrames, currentFrame);
            }
            
            if (safetyCounter % 200 === 0) {
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
        const unitName = this.extractUnitNameEnhanced(cmdId, this.position);

        // Create enhanced command object
        const command: ParsedCommand = {
          frame: currentFrame,
          timestamp: currentFrame / 24,
          timestampString: this.frameToTimestamp(currentFrame),
          cmdId,
          playerId,
          type: cmdId,
          typeString: this.getCommandTypeEnhanced(cmdId),
          data: new Uint8Array(this.extractCommandData(cmdId, this.position, length)),
          category: this.getCommandCategoryEnhanced(cmdId),
          unitName
        };

        commands.push(command);
        this.position += length;
        safetyCounter++;

        // Log first few commands for debugging
        if (safetyCounter <= 15) {
          console.log(`[DirectReplayParser] Command ${safetyCounter}:`, {
            frame: command.frame,
            type: `0x${command.cmdId.toString(16)}`,
            typeString: command.typeString,
            playerId: command.playerId,
            unitName: command.unitName,
            category: command.category
          });
        }

      } catch (error) {
        console.warn('[DirectReplayParser] Command parsing error:', error);
        this.position++;
        safetyCounter++;
      }
    }

    console.log('[DirectReplayParser] Enhanced command parsing complete:', {
      totalCommands: commands.length,
      totalFrames: this.totalFrames,
      gameTimeMinutes: Math.round((this.totalFrames / 24 / 60) * 100) / 100
    });
    
    return commands;
  }

  /**
   * Extract unit name using enhanced BWAPI-compliant unit IDs
   */
  private extractUnitNameEnhanced(cmdId: number, position: number): string | undefined {
    try {
      // Build and Train commands have unit IDs
      if ([0x0C, 0x1D].includes(cmdId)) {
        if (position + 4 < this.data.byteLength) {
          // Try multiple positions for unit ID
          const positions = [2, 3, 4, 5];
          
          for (const offset of positions) {
            if (position + offset < this.data.byteLength) {
              const unitId = this.data.getUint8(position + offset);
              const unitName = DirectReplayParser.UNIT_NAMES[unitId];
              
              if (unitName) {
                return unitName;
              }
            }
          }
          
          // Try as 16-bit value
          if (position + 4 < this.data.byteLength) {
            const unitId16 = this.data.getUint16(position + 2, true);
            const unitName = DirectReplayParser.UNIT_NAMES[unitId16];
            if (unitName) {
              return unitName;
            }
            
            // Fallback for unknown units
            if (unitId16 > 0 && unitId16 < 500) {
              return `Unit_${unitId16}`;
            }
          }
        }
      }
    } catch (e) {
      // Return undefined if extraction fails
    }
    return undefined;
  }

  /**
   * Get enhanced BWAPI command type name
   */
  private getCommandTypeEnhanced(cmdId: number): string {
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
      0x14: 'RightClick',
      0x15: 'Patrol',
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
   * Categorize commands using enhanced BWAPI classification
   */
  private getCommandCategoryEnhanced(cmdId: number): 'macro' | 'micro' | 'other' {
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
   * Calculate enhanced APM based on actual game actions
   */
  private calculateEnhancedPlayerMetrics(playerActions: Record<number, ParsedCommand[]>): { apm: number[], eapm: number[] } {
    const apm: number[] = [];
    const eapm: number[] = [];
    const gameTimeMinutes = this.totalFrames / (24 * 60);

    for (let playerId = 0; playerId < 8; playerId++) {
      const actions = playerActions[playerId] || [];
      
      // APM: Count only APM-relevant commands as per BWAPI
      const apmActions = actions.filter(cmd => 
        DirectReplayParser.APM_COMMANDS.includes(cmd.cmdId)
      );
      const playerAPM = gameTimeMinutes > 0 ? Math.round(apmActions.length / gameTimeMinutes) : 0;
      
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
   * Extract enhanced build orders with unit detection
   */
  private extractEnhancedBuildOrders(playerActions: Record<number, ParsedCommand[]>): BuildOrderItem[][] {
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

      // Sort build order by frame
      buildOrder.sort((a, b) => a.frame - b.frame);
      buildOrders.push(buildOrder);
    }

    return buildOrders;
  }

  /**
   * Generate enhanced debug information
   */
  private generateDebugInfo(playerActions: Record<number, ParsedCommand[]>, allCommands: ParsedCommand[]): any {
    const debugInfo: any = {
      commandsExtracted: allCommands.length,
      firstCommands: {} as Record<number, string[]>,
      firstUnits: {} as Record<number, string[]>,
      playerActionCounts: {} as Record<number, number>,
      apmBreakdown: {} as Record<number, { build: number, train: number, select: number, move: number }>
    };

    // Generate debug info for each player
    for (let playerId = 0; playerId < 8; playerId++) {
      const actions = playerActions[playerId] || [];
      
      if (actions.length > 0) {
        // First 5 command IDs
        debugInfo.firstCommands[playerId] = actions
          .slice(0, 5)
          .map(cmd => `0x${cmd.cmdId.toString(16).padStart(2, '0')}`);
        
        // First 3 unique units
        const units = actions
          .filter(cmd => cmd.unitName)
          .map(cmd => cmd.unitName!)
          .filter((unit, index, arr) => arr.indexOf(unit) === index)
          .slice(0, 3);
        debugInfo.firstUnits[playerId] = units;
        
        // Action count
        debugInfo.playerActionCounts[playerId] = actions.length;
        
        // APM breakdown
        debugInfo.apmBreakdown[playerId] = {
          build: actions.filter(cmd => cmd.cmdId === 0x0C).length,
          train: actions.filter(cmd => cmd.cmdId === 0x1D).length,
          select: actions.filter(cmd => cmd.cmdId === 0x1B).length,
          move: actions.filter(cmd => cmd.cmdId === 0x14).length
        };
      }
    }

    return debugInfo;
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
      debugInfo: { commandsExtracted: 0, firstCommands: {}, firstUnits: {}, playerActionCounts: {}, apmBreakdown: {} },
      error
    };
  }
}

export type { DirectParserResult };
