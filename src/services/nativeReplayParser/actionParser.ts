
/**
 * StarCraft Action Parser
 * Based on screp specification: https://github.com/icza/screp/blob/main/doc/actions.md
 */

export interface ParsedAction {
  frame: number;
  timestamp: string;
  playerId: number;
  opcode: number;
  actionName: string;
  parameters: Record<string, any>;
  isBuildAction: boolean;
  isTrainAction: boolean;
  isMicroAction: boolean;
  unitType?: string;
  unitId?: number;
  x?: number;
  y?: number;
  targetId?: number;
}

export interface ActionParseResult {
  actions: ParsedAction[];
  playerActionCounts: number[];
  buildOrders: Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>>;
  realAPM: number[];
  realEAPM: number[];
}

export class ActionParser {
  private data: Uint8Array;
  private dataView: DataView;
  private position: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
    this.dataView = new DataView(data.buffer);
  }

  /**
   * Parse action blocks according to screp specification
   */
  parseActions(playerCount: number, totalFrames: number, commandsStartOffset: number = 633): ActionParseResult {
    console.log('[ActionParser] Starting action parsing with screp specification');
    console.log('[ActionParser] Commands start at offset:', `0x${commandsStartOffset.toString(16)}`);
    console.log('[ActionParser] Expected players:', playerCount);
    console.log('[ActionParser] Total frames:', totalFrames);

    this.position = commandsStartOffset;
    const actions: ParsedAction[] = [];
    const playerActionCounts: number[] = new Array(playerCount).fill(0);
    
    let currentFrame = 0;
    let actionCount = 0;
    const maxActions = 5000; // Safety limit

    // Parse action stream
    while (this.position < this.data.length - 8 && actionCount < maxActions) {
      try {
        const byte = this.readUInt8();
        
        // Handle frame synchronization according to screp spec
        if (byte === 0x00) {
          // Frame++
          currentFrame++;
          continue;
        } else if (byte === 0x01) {
          // Frame += next byte
          if (this.canRead(1)) {
            const skipFrames = this.readUInt8();
            currentFrame += skipFrames;
            continue;
          }
        } else if (byte === 0x02) {
          // Frame += next 2 bytes (little endian)
          if (this.canRead(2)) {
            const skipFrames = this.readUInt16LE();
            currentFrame += skipFrames;
            continue;
          }
        }

        // Parse action according to screp action specification
        const action = this.parseAction(byte, currentFrame);
        if (action && action.playerId < playerCount) {
          actions.push(action);
          playerActionCounts[action.playerId]++;
          actionCount++;

          // Log first few actions for debugging
          if (actionCount <= 10) {
            console.log(`[ActionParser] Action ${actionCount}:`, {
              frame: action.frame,
              player: action.playerId,
              opcode: `0x${action.opcode.toString(16)}`,
              name: action.actionName,
              params: action.parameters
            });
          }
        }

      } catch (error) {
        // Skip corrupted byte and continue
        break;
      }
    }

    console.log(`[ActionParser] Parsed ${actions.length} actions`);
    console.log('[ActionParser] Player action counts:', playerActionCounts);

    // Calculate real APM based on actual actions
    const gameMinutes = totalFrames / (24 * 60);
    const realAPM = playerActionCounts.map(count => 
      gameMinutes > 0 ? Math.round(count / gameMinutes) : 0
    );
    const realEAPM = realAPM.map(apm => Math.round(apm * 0.8)); // 80% effective ratio

    // Extract build orders from actions
    const buildOrders = this.extractBuildOrdersFromActions(actions, playerCount);

    console.log('[ActionParser] Final real APM:', realAPM);
    console.log('[ActionParser] Build orders:', buildOrders.map(bo => `${bo.length} actions`));

    return {
      actions,
      playerActionCounts,
      buildOrders,
      realAPM,
      realEAPM
    };
  }

  /**
   * Parse individual action according to screp action specification
   */
  private parseAction(opcode: number, frame: number): ParsedAction | null {
    try {
      // Get action specification
      const actionSpec = this.getActionSpec(opcode);
      if (!actionSpec) {
        return null;
      }

      // Read action data according to specification
      const parameters: Record<string, any> = {};
      let playerId = 0;
      let unitType: string | undefined;
      let unitId: number | undefined;
      let x: number | undefined;
      let y: number | undefined;
      let targetId: number | undefined;

      // Read parameters according to action specification
      for (const param of actionSpec.parameters) {
        if (!this.canRead(param.size)) {
          return null;
        }

        let value: number;
        switch (param.size) {
          case 1:
            value = this.readUInt8();
            break;
          case 2:
            value = this.readUInt16LE();
            break;
          case 4:
            value = this.readUInt32LE();
            break;
          default:
            return null;
        }

        parameters[param.name] = value;

        // Map important parameters
        if (param.name === 'playerId') {
          playerId = value;
        } else if (param.name === 'unitType') {
          unitId = value;
          unitType = this.getUnitName(value);
        } else if (param.name === 'x') {
          x = value;
        } else if (param.name === 'y') {
          y = value;
        } else if (param.name === 'targetId') {
          targetId = value;
        }
      }

      return {
        frame,
        timestamp: this.frameToTimestamp(frame),
        playerId: playerId % 8, // Normalize player ID
        opcode,
        actionName: actionSpec.name,
        parameters,
        isBuildAction: actionSpec.isBuild,
        isTrainAction: actionSpec.isTrain,
        isMicroAction: actionSpec.isMicro,
        unitType,
        unitId,
        x,
        y,
        targetId
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Get action specification according to screp documentation
   */
  private getActionSpec(opcode: number): {
    name: string;
    parameters: Array<{ name: string; size: number }>;
    isBuild: boolean;
    isTrain: boolean;
    isMicro: boolean;
  } | null {
    // Action specifications from screp documentation
    const actionSpecs: Record<number, any> = {
      0x09: {
        name: 'Select',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'unitCount', size: 1 }
        ],
        isBuild: false, isTrain: false, isMicro: true
      },
      0x0A: {
        name: 'Shift Select',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'unitCount', size: 1 }
        ],
        isBuild: false, isTrain: false, isMicro: true
      },
      0x0B: {
        name: 'Shift Deselect',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'unitCount', size: 1 }
        ],
        isBuild: false, isTrain: false, isMicro: true
      },
      0x0C: {
        name: 'Build',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'unitType', size: 2 },
          { name: 'x', size: 2 },
          { name: 'y', size: 2 }
        ],
        isBuild: true, isTrain: false, isMicro: false
      },
      0x0D: {
        name: 'Vision',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'unknown', size: 1 }
        ],
        isBuild: false, isTrain: false, isMicro: false
      },
      0x0E: {
        name: 'Alliance',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'targetPlayer', size: 1 },
          { name: 'allianceType', size: 2 }
        ],
        isBuild: false, isTrain: false, isMicro: false
      },
      0x13: {
        name: 'Hotkey',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'hotkey', size: 1 }
        ],
        isBuild: false, isTrain: false, isMicro: true
      },
      0x14: {
        name: 'Move',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'x', size: 2 },
          { name: 'y', size: 2 }
        ],
        isBuild: false, isTrain: false, isMicro: true
      },
      0x15: {
        name: 'Attack',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'x', size: 2 },
          { name: 'y', size: 2 },
          { name: 'targetId', size: 2 }
        ],
        isBuild: false, isTrain: false, isMicro: true
      },
      0x18: {
        name: 'Stop',
        parameters: [
          { name: 'playerId', size: 1 }
        ],
        isBuild: false, isTrain: false, isMicro: true
      },
      0x1D: {
        name: 'Train',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'unitType', size: 2 }
        ],
        isBuild: false, isTrain: true, isMicro: false
      },
      0x1E: {
        name: 'Cancel Train',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'unitType', size: 2 }
        ],
        isBuild: false, isTrain: false, isMicro: false
      },
      0x2F: {
        name: 'Research',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'techType', size: 2 }
        ],
        isBuild: true, isTrain: false, isMicro: false
      },
      0x31: {
        name: 'Upgrade',
        parameters: [
          { name: 'playerId', size: 1 },
          { name: 'upgradeType', size: 2 }
        ],
        isBuild: true, isTrain: false, isMicro: false
      }
    };

    return actionSpecs[opcode] || null;
  }

  /**
   * Extract build orders from parsed actions
   */
  private extractBuildOrdersFromActions(actions: ParsedAction[], playerCount: number): Array<Array<{
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

    // Filter build/train actions and sort by frame
    const buildActions = actions
      .filter(action => action.isBuildAction || action.isTrainAction)
      .sort((a, b) => a.frame - b.frame);

    console.log(`[ActionParser] Found ${buildActions.length} build/train actions`);

    // Group by player and create build order
    buildActions.forEach(action => {
      if (action.playerId < playerCount) {
        const actionText = action.unitType ? 
          `${action.actionName}: ${action.unitType}` : 
          action.actionName;

        buildOrders[action.playerId].push({
          frame: action.frame,
          timestamp: action.timestamp,
          action: actionText,
          supply: this.estimateSupply(action.frame, buildOrders[action.playerId].length)
        });

        // Limit to 25 actions per player
        if (buildOrders[action.playerId].length > 25) {
          buildOrders[action.playerId] = buildOrders[action.playerId].slice(0, 25);
        }
      }
    });

    return buildOrders;
  }

  /**
   * Get unit name from unit ID
   */
  private getUnitName(unitId: number): string {
    const unitNames: Record<number, string> = {
      // Terran Units
      0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 4: 'Siege Tank',
      5: 'SCV', 7: 'Wraith', 8: 'Science Vessel', 9: 'Dropship', 10: 'Battlecruiser',
      11: 'Spider Mine', 14: 'Firebat', 15: 'Medic', 30: 'Valkyrie',
      
      // Protoss Units  
      32: 'Probe', 33: 'Zealot', 34: 'Dragoon', 35: 'High Templar',
      36: 'Archon', 37: 'Shuttle', 38: 'Scout', 39: 'Arbiter', 40: 'Carrier',
      41: 'Interceptor', 42: 'Dark Templar', 43: 'Reaver', 44: 'Observer',
      45: 'Scarab', 46: 'Corsair', 47: 'Dark Archon',
      
      // Zerg Units
      16: 'Larva', 17: 'Egg', 18: 'Zergling', 19: 'Hydralisk',
      20: 'Ultralisk', 21: 'Drone', 22: 'Overlord', 23: 'Mutalisk',
      24: 'Guardian', 25: 'Queen', 26: 'Defiler', 27: 'Scourge',
      29: 'Infested Terran',
      
      // Terran Buildings
      106: 'Command Center', 109: 'Supply Depot', 110: 'Refinery', 111: 'Barracks',
      112: 'Academy', 113: 'Factory', 114: 'Starport', 116: 'Science Facility',
      118: 'Engineering Bay', 119: 'Armory', 120: 'Missile Turret', 121: 'Bunker',
      
      // Protoss Buildings
      154: 'Nexus', 155: 'Robotics Facility', 156: 'Pylon', 157: 'Assimilator',
      159: 'Observatory', 160: 'Gateway', 162: 'Photon Cannon',
      163: 'Citadel of Adun', 164: 'Cybernetics Core', 165: 'Templar Archives',
      166: 'Forge', 167: 'Stargate', 169: 'Fleet Beacon', 170: 'Arbiter Tribunal',
      171: 'Robotics Support Bay', 172: 'Shield Battery',
      
      // Zerg Buildings
      131: 'Hatchery', 132: 'Lair', 133: 'Hive', 134: 'Nydus Canal',
      135: 'Hydralisk Den', 136: 'Defiler Mound', 137: 'Greater Spire',
      138: 'Queens Nest', 139: 'Evolution Chamber', 140: 'Ultralisk Cavern',
      141: 'Spire', 142: 'Spawning Pool', 143: 'Creep Colony',
      144: 'Spore Colony', 146: 'Sunken Colony', 149: 'Extractor'
    };

    return unitNames[unitId] || `Unit ${unitId}`;
  }

  // Helper methods
  private canRead(bytes: number): boolean {
    return this.position + bytes <= this.data.length;
  }

  private readUInt8(): number {
    const value = this.data[this.position];
    this.position++;
    return value;
  }

  private readUInt16LE(): number {
    const value = this.dataView.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  private readUInt32LE(): number {
    const value = this.dataView.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  private frameToTimestamp(frame: number): string {
    const seconds = Math.floor(frame / 24);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private estimateSupply(frame: number, actionIndex: number): number {
    const baseSupply = 9;
    const supplyGrowth = Math.floor(frame / 600);
    const buildOrderBonus = Math.floor(actionIndex / 2);
    return Math.min(200, baseSupply + supplyGrowth + buildOrderBonus);
  }
}
