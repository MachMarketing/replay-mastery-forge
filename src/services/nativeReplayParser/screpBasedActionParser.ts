
/**
 * screp-based Action Parser für StarCraft Remastered
 * Basiert auf https://github.com/icza/screp/blob/main/doc/actions.md
 */

export interface ScrepAction {
  frame: number;
  timestamp: string;
  playerId: number;
  opcode: number;
  actionName: string;
  isRealAction: boolean;
  isBuildAction: boolean;
  isTrainAction: boolean;
  isMicroAction: boolean;
  unitId?: number;
  unitName?: string;
  x?: number;
  y?: number;
  targetId?: number;
  rawBytes?: Uint8Array;
}

export interface ScrepParseResult {
  actions: ScrepAction[];
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
  parsingMethod: string;
}

/**
 * StarCraft Action Opcodes basierend auf screp-Spezifikation
 */
const SCREP_ACTION_OPCODES = {
  // Player actions (relevant for APM)
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
  0x19: 'Carrier Stop',
  0x1A: 'Reaver Stop',
  0x1B: 'Order Nothing',
  0x1C: 'Return Cargo',
  0x1D: 'Train',
  0x1E: 'Cancel Train',
  0x1F: 'Cloak',
  0x20: 'Decloak',
  0x21: 'Unit Morph',
  0x23: 'Unsiege',
  0x24: 'Siege',
  0x25: 'Train Fighter',
  0x27: 'Unload All',
  0x28: 'Unload',
  0x29: 'Merge Archon',
  0x2A: 'Hold Position',
  0x2B: 'Burrow',
  0x2C: 'Unburrow',
  0x2D: 'Cancel Nuke',
  0x2E: 'Lift',
  0x2F: 'Research',
  0x30: 'Cancel Research',
  0x31: 'Upgrade',
  0x32: 'Cancel Upgrade',
  0x33: 'Cancel Addon',
  0x34: 'Building Morph',
  0x35: 'Stim'
} as const;

/**
 * Action-Längen basierend auf screp-Spezifikation
 */
const SCREP_ACTION_LENGTHS = {
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
  0x35: 1    // Stim
} as const;

/**
 * Unit-IDs für Build-Orders (vereinfacht)
 */
const UNIT_NAMES: Record<number, string> = {
  // Terran Einheiten
  0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 4: 'Siege Tank',
  5: 'SCV', 7: 'Wraith', 8: 'Science Vessel', 9: 'Dropship', 10: 'Battlecruiser',
  
  // Protoss Einheiten
  60: 'Zealot', 61: 'Dragoon', 62: 'High Templar', 63: 'Archon',
  64: 'Shuttle', 65: 'Scout', 66: 'Arbiter', 67: 'Carrier', 69: 'Probe',
  
  // Zerg Einheiten
  37: 'Zergling', 38: 'Hydralisk', 39: 'Ultralisk', 41: 'Drone',
  42: 'Overlord', 43: 'Mutalisk', 44: 'Guardian', 45: 'Queen',
  
  // Gebäude (vereinfacht)
  106: 'Command Center', 111: 'Barracks', 113: 'Factory', 114: 'Starport',
  154: 'Nexus', 159: 'Gateway', 155: 'Robotics Facility', 165: 'Stargate',
  131: 'Hatchery', 142: 'Spawning Pool', 135: 'Hydralisk Den', 141: 'Spire'
};

export class ScrepBasedActionParser {
  private data: Uint8Array;
  private dataView: DataView;

  constructor(data: Uint8Array) {
    this.data = data;
    this.dataView = new DataView(data.buffer);
  }

  /**
   * Parse actions gemäß screp-Spezifikation
   */
  async parseActions(playerCount: number, expectedFrames: number): Promise<ScrepParseResult> {
    console.log('[ScrepBasedActionParser] === STARTING SCREP-BASED PARSING ===');
    console.log('[ScrepBasedActionParser] Expected players:', playerCount);
    console.log('[ScrepBasedActionParser] Expected frames:', expectedFrames);
    console.log('[ScrepBasedActionParser] Data size:', this.data.length, 'bytes');

    // Find command data start (usually at offset 633 for Remastered)
    const commandStart = this.findCommandDataStart();
    console.log('[ScrepBasedActionParser] Command data starts at:', commandStart);

    if (commandStart === -1) {
      throw new Error('Could not locate command data in replay file');
    }

    // Parse all actions from command stream
    const actions = this.parseCommandStream(commandStart, expectedFrames);
    console.log('[ScrepBasedActionParser] Total actions parsed:', actions.length);

    // Calculate real APM/EAPM based on screp logic
    const { realAPM, realEAPM } = this.calculateRealMetrics(actions, playerCount, expectedFrames);
    console.log('[ScrepBasedActionParser] Real APM calculated:', realAPM);
    console.log('[ScrepBasedActionParser] Real EAPM calculated:', realEAPM);

    // Extract build orders from build/train actions
    const buildOrders = this.extractBuildOrders(actions, playerCount);
    console.log('[ScrepBasedActionParser] Build orders extracted:', buildOrders.map(bo => `${bo.length} actions`));

    const gameMinutes = expectedFrames / (24 * 60);

    return {
      actions,
      realAPM,
      realEAPM,
      buildOrders,
      totalFrames: expectedFrames,
      gameMinutes,
      parsingMethod: 'screp-specification-based'
    };
  }

  /**
   * Find start of command data based on screp specification
   */
  private findCommandDataStart(): number {
    // Common command data offsets für verschiedene Replay-Versionen
    const possibleOffsets = [633, 637, 641, 645]; // Remastered typical offsets

    for (const offset of possibleOffsets) {
      if (offset < this.data.length - 100) {
        console.log(`[ScrepBasedActionParser] Testing offset ${offset} (0x${offset.toString(16)})`);
        
        if (this.validateCommandDataStart(offset)) {
          console.log(`[ScrepBasedActionParser] Valid command data found at offset ${offset}`);
          return offset;
        }
      }
    }

    console.warn('[ScrepBasedActionParser] Could not find valid command data start');
    return 633; // Default fallback
  }

  /**
   * Validate if offset contains valid command data
   */
  private validateCommandDataStart(offset: number): boolean {
    let validOpcodes = 0;
    let frameMarkers = 0;

    for (let i = 0; i < Math.min(100, this.data.length - offset); i++) {
      const byte = this.data[offset + i];
      
      if (byte === 0x00) {
        frameMarkers++; // Frame advancement
      } else if (byte in SCREP_ACTION_OPCODES) {
        validOpcodes++;
      }
    }

    // Good command data should have mix of opcodes and frame markers
    return validOpcodes >= 5 && frameMarkers >= 10;
  }

  /**
   * Parse the complete command stream
   */
  private parseCommandStream(startOffset: number, maxFrames: number): ScrepAction[] {
    console.log('[ScrepBasedActionParser] Parsing command stream...');
    
    const actions: ScrepAction[] = [];
    let position = startOffset;
    let currentFrame = 0;

    while (position < this.data.length - 1 && currentFrame < maxFrames) {
      try {
        const opcode = this.data[position];

        // Handle frame synchronization
        if (opcode === 0x00) {
          currentFrame++;
          position++;
          continue;
        }

        // Parse known action opcode
        if (opcode in SCREP_ACTION_OPCODES) {
          const action = this.parseActionAtPosition(position, currentFrame);
          if (action) {
            actions.push(action);
            
            // Log first few actions for debugging
            if (actions.length <= 10) {
              console.log(`[ScrepBasedActionParser] Action ${actions.length}: Frame ${currentFrame}, Player ${action.playerId}, ${action.actionName}`);
            }
          }
          
          const actionLength = SCREP_ACTION_LENGTHS[opcode as keyof typeof SCREP_ACTION_LENGTHS] || 1;
          position += actionLength;
        } else {
          // Skip unknown bytes
          position++;
        }

        // Safety break for very long games
        if (actions.length > 50000) {
          console.warn('[ScrepBasedActionParser] Too many actions, stopping parse');
          break;
        }

      } catch (error) {
        console.warn('[ScrepBasedActionParser] Parse error at position', position, ':', error);
        position++;
      }
    }

    console.log('[ScrepBasedActionParser] Command stream parsing complete:', actions.length, 'actions');
    return actions;
  }

  /**
   * Parse single action at position
   */
  private parseActionAtPosition(position: number, frame: number): ScrepAction | null {
    if (position >= this.data.length) return null;

    const opcode = this.data[position];
    const actionName = SCREP_ACTION_OPCODES[opcode as keyof typeof SCREP_ACTION_OPCODES] || `Unknown_0x${opcode.toString(16)}`;
    
    // Extract player ID (usually next byte)
    const playerId = position + 1 < this.data.length ? this.data[position + 1] : 0;

    const action: ScrepAction = {
      frame,
      timestamp: this.frameToTimestamp(frame),
      playerId,
      opcode,
      actionName,
      isRealAction: this.isRealAction(opcode),
      isBuildAction: this.isBuildAction(opcode),
      isTrainAction: this.isTrainAction(opcode),
      isMicroAction: this.isMicroAction(opcode)
    };

    // Extract specific data based on action type
    if (opcode === 0x0C && position + 6 < this.data.length) { // Build
      action.unitId = this.dataView.getUint16(position + 2, true);
      action.unitName = UNIT_NAMES[action.unitId] || `Unit_${action.unitId}`;
    } else if (opcode === 0x1D && position + 3 < this.data.length) { // Train
      action.unitId = this.dataView.getUint16(position + 2, true);
      action.unitName = UNIT_NAMES[action.unitId] || `Unit_${action.unitId}`;
    } else if ((opcode === 0x14 || opcode === 0x15) && position + 5 < this.data.length) { // Move/Attack
      action.x = this.dataView.getUint16(position + 2, true);
      action.y = this.dataView.getUint16(position + 4, true);
    }

    return action;
  }

  /**
   * Calculate real APM/EAPM based on screp logic
   */
  private calculateRealMetrics(actions: ScrepAction[], playerCount: number, totalFrames: number): { realAPM: number[], realEAPM: number[] } {
    console.log('[ScrepBasedActionParser] Calculating real metrics...');
    
    const gameMinutes = totalFrames / (24 * 60);
    const realAPM: number[] = [];
    const realEAPM: number[] = [];

    for (let playerId = 0; playerId < playerCount; playerId++) {
      const playerActions = actions.filter(action => action.playerId === playerId);
      const realPlayerActions = playerActions.filter(action => action.isRealAction);
      
      const apm = gameMinutes > 0 ? Math.round(realPlayerActions.length / gameMinutes) : 0;
      const eapm = gameMinutes > 0 ? Math.round(realPlayerActions.filter(a => a.isBuildAction || a.isTrainAction || a.isMicroAction).length / gameMinutes) : 0;

      realAPM.push(apm);
      realEAPM.push(eapm);

      console.log(`[ScrepBasedActionParser] Player ${playerId}: ${playerActions.length} total, ${realPlayerActions.length} real actions, APM: ${apm}, EAPM: ${eapm}`);
    }

    return { realAPM, realEAPM };
  }

  /**
   * Extract build orders from actions
   */
  private extractBuildOrders(actions: ScrepAction[], playerCount: number): Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>> {
    console.log('[ScrepBasedActionParser] Extracting build orders...');
    
    const buildOrders: Array<Array<any>> = [];

    for (let playerId = 0; playerId < playerCount; playerId++) {
      const buildActions = actions.filter(action => 
        action.playerId === playerId && 
        (action.isBuildAction || action.isTrainAction) &&
        action.unitName
      ).sort((a, b) => a.frame - b.frame);

      const buildOrder = buildActions.map(action => ({
        frame: action.frame,
        timestamp: action.timestamp,
        action: action.unitName || action.actionName,
        supply: undefined // Supply calculation would need additional logic
      }));

      buildOrders.push(buildOrder);
      console.log(`[ScrepBasedActionParser] Player ${playerId} build order: ${buildOrder.length} actions`);
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

  private isRealAction(opcode: number): boolean {
    // Exclude purely UI actions that don't affect game state
    const uiOnlyActions = [0x09, 0x0A, 0x0B]; // Select actions
    return opcode in SCREP_ACTION_OPCODES && !uiOnlyActions.includes(opcode);
  }

  private isBuildAction(opcode: number): boolean {
    return opcode === 0x0C; // Build
  }

  private isTrainAction(opcode: number): boolean {
    return opcode === 0x1D; // Train
  }

  private isMicroAction(opcode: number): boolean {
    return [0x14, 0x15, 0x18, 0x2A].includes(opcode); // Move, Attack, Stop, Hold Position
  }
}
