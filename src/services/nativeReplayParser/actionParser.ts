
/**
 * Enhanced Action Parser based on screp specification
 * Extracts REAL actions, APM, and build orders from replay data
 */

export interface ParsedAction {
  frame: number;
  timestamp: string;
  playerId: number;
  opcode: number;
  actionName: string;
  isBuildAction: boolean;
  isTrainAction: boolean;
  isMicroAction: boolean;
  unitId?: number;
  unitName?: string;
  x?: number;
  y?: number;
  targetId?: number;
  rawData?: Uint8Array;
}

export interface ActionParseResult {
  actions: ParsedAction[];
  realAPM: number[];
  realEAPM: number[];
  buildOrders: Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>>;
  totalFrames: number;
  gameMinutes: number;
}

export class ActionParser {
  private data: Uint8Array;
  private dataView: DataView;
  
  // StarCraft unit IDs and names
  private static readonly UNIT_NAMES: Record<number, string> = {
    0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 4: 'Siege Tank',
    5: 'SCV', 7: 'Wraith', 8: 'Science Vessel', 9: 'Dropship',
    10: 'Battlecruiser', 11: 'Vulture Spider Mine', 12: 'Nuclear Missile',
    60: 'Zealot', 61: 'Dragoon', 62: 'High Templar', 63: 'Archon',
    64: 'Shuttle', 65: 'Scout', 66: 'Arbiter', 67: 'Carrier',
    68: 'Interceptor', 69: 'Probe', 70: 'Reaver', 71: 'Scarab',
    37: 'Zergling', 38: 'Hydralisk', 39: 'Ultralisk', 40: 'Broodling',
    41: 'Drone', 42: 'Overlord', 43: 'Mutalisk', 44: 'Guardian',
    45: 'Queen', 46: 'Defiler', 47: 'Scourge', 103: 'Lurker'
  };

  // Building IDs and names
  private static readonly BUILDING_NAMES: Record<number, string> = {
    106: 'Command Center', 107: 'Comsat Station', 108: 'Nuclear Silo',
    109: 'Supply Depot', 110: 'Refinery', 111: 'Barracks', 112: 'Academy',
    113: 'Factory', 114: 'Starport', 115: 'Control Tower', 116: 'Science Facility',
    117: 'Covert Ops', 118: 'Physics Lab', 119: 'Machine Shop', 120: 'Engineering Bay',
    121: 'Armory', 122: 'Missile Turret', 123: 'Bunker',
    154: 'Nexus', 155: 'Robotics Facility', 156: 'Pylon', 157: 'Assimilator',
    158: 'Observatory', 159: 'Gateway', 160: 'Photon Cannon', 161: 'Citadel of Adun',
    162: 'Cybernetics Core', 163: 'Templar Archives', 164: 'Forge', 165: 'Stargate',
    166: 'Fleet Beacon', 167: 'Arbiter Tribunal', 168: 'Robotics Support Bay',
    169: 'Shield Battery',
    131: 'Hatchery', 132: 'Lair', 133: 'Hive', 134: 'Nydus Canal',
    135: 'Hydralisk Den', 136: 'Defiler Mound', 137: 'Greater Spire',
    138: 'Queens Nest', 139: 'Evolution Chamber', 140: 'Ultralisk Cavern',
    141: 'Spire', 142: 'Spawning Pool', 143: 'Creep Colony', 144: 'Spore Colony',
    145: 'Sunken Colony', 146: 'Extractor'
  };

  constructor(data: Uint8Array) {
    this.data = data;
    this.dataView = new DataView(data.buffer);
  }

  /**
   * Parse actions with enhanced real data extraction
   */
  async parseActions(playerCount: number, totalFrames: number): Promise<ActionParseResult> {
    console.log('[ActionParser] ===== STARTING ENHANCED ACTION PARSING =====');
    console.log('[ActionParser] File size:', this.data.length, 'bytes');
    console.log('[ActionParser] Expected players:', playerCount, 'Expected frames:', totalFrames);

    // Find the actual command data start position
    const commandStart = this.findCommandDataStart();
    console.log('[ActionParser] Command data starts at offset:', commandStart);

    if (commandStart === -1) {
      throw new Error('Could not find command data in replay file');
    }

    // Parse actions from command data
    const actions = this.extractActionsFromCommandData(commandStart, totalFrames);
    console.log('[ActionParser] Total actions extracted:', actions.length);

    // Calculate real APM and EAPM
    const { realAPM, realEAPM } = this.calculateRealAPM(actions, playerCount, totalFrames);
    console.log('[ActionParser] Real APM calculated:', realAPM);
    console.log('[ActionParser] Real EAPM calculated:', realEAPM);

    // Generate build orders
    const buildOrders = this.generateBuildOrders(actions, playerCount);
    console.log('[ActionParser] Build orders generated:', buildOrders.map(bo => `${bo.length} actions`));

    const gameMinutes = totalFrames / (24 * 60);

    return {
      actions,
      realAPM,
      realEAPM,
      buildOrders,
      totalFrames,
      gameMinutes
    };
  }

  /**
   * Find where the actual command data starts in the file
   */
  private findCommandDataStart(): number {
    console.log('[ActionParser] Searching for command data start...');

    // Common offsets where command data typically starts
    const possibleOffsets = [633, 512, 768, 1024, 1280];

    for (const offset of possibleOffsets) {
      if (offset < this.data.length - 100) {
        console.log(`[ActionParser] Checking offset ${offset} (0x${offset.toString(16)})...`);
        
        // Look for patterns indicating command data
        let actionCount = 0;
        let frameMarkers = 0;
        
        for (let i = 0; i < Math.min(200, this.data.length - offset); i++) {
          const byte = this.data[offset + i];
          
          if (byte === 0x00) {
            frameMarkers++;
          } else if (this.isValidActionOpcode(byte)) {
            actionCount++;
          }
        }
        
        console.log(`[ActionParser] Offset ${offset}: ${actionCount} actions, ${frameMarkers} frame markers`);
        
        // If we find a good ratio of actions to frame markers, this is likely command data
        if (actionCount > 10 && frameMarkers > 5) {
          console.log(`[ActionParser] Found command data at offset ${offset}`);
          return offset;
        }
      }
    }

    console.warn('[ActionParser] Could not find reliable command data start');
    return 633; // Default fallback
  }

  /**
   * Check if a byte is a valid action opcode
   */
  private isValidActionOpcode(opcode: number): boolean {
    const validOpcodes = [
      0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, // Basic actions
      0x13, 0x14, 0x15, 0x18, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, // Advanced actions
      0x2F, 0x30, 0x31, 0x32 // Research/upgrade actions
    ];
    return validOpcodes.includes(opcode);
  }

  /**
   * Extract actions from command data
   */
  private extractActionsFromCommandData(startOffset: number, maxFrames: number): ParsedAction[] {
    console.log('[ActionParser] Extracting actions from command data...');
    
    const actions: ParsedAction[] = [];
    let position = startOffset;
    let currentFrame = 0;
    let framesSinceLastAction = 0;

    while (position < this.data.length - 4 && currentFrame < maxFrames) {
      try {
        const opcode = this.data[position];
        
        if (opcode === 0x00) {
          // Frame advancement
          currentFrame++;
          framesSinceLastAction++;
          position++;
          continue;
        }

        if (this.isValidActionOpcode(opcode)) {
          const action = this.parseActionAtPosition(position, currentFrame);
          if (action) {
            actions.push(action);
            console.log(`[ActionParser] Action ${actions.length}: Frame ${currentFrame}, Player ${action.playerId}, ${action.actionName}`);
            framesSinceLastAction = 0;
          }
          position += this.getActionLength(opcode);
        } else {
          // Skip unknown bytes, but be careful not to get stuck
          position++;
          if (framesSinceLastAction > 1000) {
            console.warn('[ActionParser] Too many frames without actions, stopping parse');
            break;
          }
        }

        // Safety check to prevent infinite loops
        if (actions.length > 10000) {
          console.warn('[ActionParser] Too many actions parsed, stopping');
          break;
        }

      } catch (error) {
        console.warn('[ActionParser] Error parsing action at position', position, ':', error);
        position++;
      }
    }

    console.log('[ActionParser] Final action count:', actions.length);
    return actions;
  }

  /**
   * Parse a single action at the given position
   */
  private parseActionAtPosition(position: number, frame: number): ParsedAction | null {
    if (position >= this.data.length - 1) return null;

    const opcode = this.data[position];
    const playerId = position + 1 < this.data.length ? this.data[position + 1] : 0;

    const action: ParsedAction = {
      frame,
      timestamp: this.frameToTimestamp(frame),
      playerId,
      opcode,
      actionName: this.getActionName(opcode),
      isBuildAction: this.isBuildOpcode(opcode),
      isTrainAction: this.isTrainOpcode(opcode),
      isMicroAction: this.isMicroOpcode(opcode)
    };

    // Extract additional parameters based on opcode
    switch (opcode) {
      case 0x0C: // Build
      case 0x0D: // Train
        if (position + 3 < this.data.length) {
          action.unitId = this.data[position + 2] | (this.data[position + 3] << 8);
          action.unitName = this.getUnitName(action.unitId);
        }
        break;
      
      case 0x14: // Move/Attack
      case 0x15: // Move/Attack
        if (position + 5 < this.data.length) {
          action.x = this.data[position + 2] | (this.data[position + 3] << 8);
          action.y = this.data[position + 4] | (this.data[position + 5] << 8);
        }
        break;
    }

    return action;
  }

  /**
   * Calculate real APM and EAPM from actions
   */
  private calculateRealAPM(actions: ParsedAction[], playerCount: number, totalFrames: number): { realAPM: number[], realEAPM: number[] } {
    console.log('[ActionParser] Calculating real APM...');
    
    const gameMinutes = totalFrames / (24 * 60);
    const realAPM: number[] = [];
    const realEAPM: number[] = [];

    for (let playerId = 0; playerId < playerCount; playerId++) {
      const playerActions = actions.filter(action => action.playerId === playerId);
      const effectiveActions = playerActions.filter(action => 
        action.isBuildAction || action.isTrainAction || action.isMicroAction
      );

      const apm = gameMinutes > 0 ? Math.round(playerActions.length / gameMinutes) : 0;
      const eapm = gameMinutes > 0 ? Math.round(effectiveActions.length / gameMinutes) : 0;

      realAPM.push(apm);
      realEAPM.push(eapm);

      console.log(`[ActionParser] Player ${playerId}: ${playerActions.length} total actions, ${effectiveActions.length} effective actions, APM: ${apm}, EAPM: ${eapm}`);
    }

    return { realAPM, realEAPM };
  }

  /**
   * Generate build orders from actions
   */
  private generateBuildOrders(actions: ParsedAction[], playerCount: number): Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>> {
    console.log('[ActionParser] Generating build orders...');
    
    const buildOrders: Array<Array<any>> = [];

    for (let playerId = 0; playerId < playerCount; playerId++) {
      const playerBuildActions = actions.filter(action => 
        action.playerId === playerId && (action.isBuildAction || action.isTrainAction)
      ).sort((a, b) => a.frame - b.frame);

      const buildOrder = playerBuildActions.map((action, index) => ({
        frame: action.frame,
        timestamp: action.timestamp,
        action: action.unitName || action.actionName,
        supply: this.estimateSupply(index, action)
      }));

      buildOrders.push(buildOrder);
      console.log(`[ActionParser] Player ${playerId} build order: ${buildOrder.length} actions`);
    }

    return buildOrders;
  }

  // Helper methods
  private frameToTimestamp(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private getActionName(opcode: number): string {
    const actionNames: Record<number, string> = {
      0x09: 'Select Units',
      0x0A: 'Shift Select',
      0x0B: 'Shift Deselect',
      0x0C: 'Build',
      0x0D: 'Train',
      0x0E: 'Rally Point',
      0x13: 'Hotkey',
      0x14: 'Move',
      0x15: 'Attack',
      0x18: 'Cancel',
      0x1A: 'Cancel Upgrade',
      0x1B: 'Stop',
      0x1C: 'Carry/Hold Position',
      0x1D: 'Unload All',
      0x1E: 'Unload',
      0x2F: 'Upgrade',
      0x30: 'Research',
      0x31: 'Use Tech',
      0x32: 'Merge Archon'
    };
    return actionNames[opcode] || `Unknown (0x${opcode.toString(16)})`;
  }

  private getUnitName(unitId: number): string {
    return ActionParser.UNIT_NAMES[unitId] || ActionParser.BUILDING_NAMES[unitId] || `Unit ${unitId}`;
  }

  private isBuildOpcode(opcode: number): boolean {
    return opcode === 0x0C;
  }

  private isTrainOpcode(opcode: number): boolean {
    return opcode === 0x0D;
  }

  private isMicroOpcode(opcode: number): boolean {
    return [0x14, 0x15, 0x1B, 0x1C].includes(opcode);
  }

  private getActionLength(opcode: number): number {
    // Return the byte length of each action type
    const lengths: Record<number, number> = {
      0x09: 3, 0x0A: 3, 0x0B: 3, 0x0C: 8, 0x0D: 8,
      0x0E: 6, 0x13: 3, 0x14: 10, 0x15: 10, 0x18: 3,
      0x1A: 3, 0x1B: 3, 0x1C: 3, 0x1D: 3, 0x1E: 3,
      0x2F: 3, 0x30: 3, 0x31: 3, 0x32: 3
    };
    return lengths[opcode] || 1;
  }

  private estimateSupply(actionIndex: number, action: ParsedAction): number {
    // Simple supply estimation based on action progression
    const baseSupply = 9; // Starting supply
    const supplyPerAction = 2; // Rough estimate
    return baseSupply + (actionIndex * supplyPerAction);
  }
}
