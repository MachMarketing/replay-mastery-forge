
/**
 * Screp-compliant parser for StarCraft: Remastered
 * Based on https://github.com/icza/screp/blob/main/doc/actions.md
 * and https://github.com/icza/screp/blob/main/doc/structure.md
 */

import { CompressionDetector } from './compressionDetector';
import { ReplayDecompressor } from './decompressor';

export interface ScrepCompliantAction {
  frame: number;
  playerId: number;
  actionId: number;
  actionName: string;
  isGameAction: boolean;
  data: Uint8Array;
  params?: {
    unitType?: number;
    x?: number;
    y?: number;
    targetUnit?: number;
  };
}

export interface ScrepParseResult {
  header: {
    mapName: string;
    playerNames: string[];
    playerRaces: string[];
    frameCount: number;
    duration: string;
  };
  actions: ScrepCompliantAction[];
  metrics: {
    apm: number[];
    eapm: number[];
  };
  buildOrders: Array<Array<{
    frame: number;
    timestamp: string;
    unitName: string;
    supply?: number;
  }>>;
}

/**
 * Action definitions based on screp specification
 */
const SCREP_ACTIONS = {
  // Game actions that count towards APM
  0x09: { name: 'Select', gameAction: true, length: 2 },
  0x0A: { name: 'Shift Select', gameAction: false, length: 2 },
  0x0B: { name: 'Shift Deselect', gameAction: false, length: 2 },
  0x0C: { name: 'Build', gameAction: true, length: 7 },
  0x0D: { name: 'Vision', gameAction: false, length: 2 },
  0x0E: { name: 'Alliance', gameAction: true, length: 4 },
  0x13: { name: 'Hotkey', gameAction: false, length: 2 },
  0x14: { name: 'Move', gameAction: true, length: 4 },
  0x15: { name: 'Attack', gameAction: true, length: 6 },
  0x18: { name: 'Stop', gameAction: true, length: 1 },
  0x1A: { name: 'Return Cargo', gameAction: true, length: 1 },
  0x1D: { name: 'Train', gameAction: true, length: 2 },
  0x1E: { name: 'Cancel Train', gameAction: true, length: 2 },
  0x23: { name: 'Unsiege', gameAction: true, length: 1 },
  0x24: { name: 'Siege', gameAction: true, length: 1 },
  0x2A: { name: 'Hold Position', gameAction: true, length: 1 },
  0x2B: { name: 'Burrow', gameAction: true, length: 1 },
  0x2C: { name: 'Unburrow', gameAction: true, length: 1 },
  0x2F: { name: 'Research', gameAction: true, length: 2 },
  0x30: { name: 'Cancel Research', gameAction: true, length: 2 },
  0x31: { name: 'Upgrade', gameAction: true, length: 2 },
  0x32: { name: 'Cancel Upgrade', gameAction: true, length: 2 },
} as const;

/**
 * Unit IDs for build order tracking
 */
const UNIT_NAMES: Record<number, string> = {
  // Terran units
  0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 4: 'Siege Tank',
  5: 'SCV', 7: 'Wraith', 8: 'Science Vessel', 11: 'Battlecruiser',
  
  // Terran buildings
  106: 'Command Center', 111: 'Barracks', 112: 'Academy', 113: 'Factory',
  114: 'Starport', 115: 'Control Tower', 116: 'Science Facility',
  
  // Protoss units
  60: 'Zealot', 61: 'Dragoon', 62: 'High Templar', 63: 'Archon',
  64: 'Shuttle', 65: 'Scout', 66: 'Arbiter', 67: 'Carrier', 69: 'Probe',
  
  // Protoss buildings
  154: 'Nexus', 155: 'Robotics Facility', 157: 'Pylon', 159: 'Gateway',
  160: 'Photon Cannon', 162: 'Citadel of Adun', 163: 'Cybernetics Core',
  
  // Zerg units
  37: 'Zergling', 38: 'Hydralisk', 39: 'Ultralisk', 40: 'Broodling',
  41: 'Drone', 42: 'Overlord', 43: 'Mutalisk', 44: 'Guardian',
  
  // Zerg buildings
  131: 'Hatchery', 132: 'Lair', 133: 'Hive', 134: 'Nydus Canal',
  135: 'Hydralisk Den', 136: 'Defiler Mound', 137: 'Greater Spire',
  142: 'Spawning Pool', 143: 'Evolution Chamber'
};

export class ScrepCompliantParser {
  private data: Uint8Array;
  private position: number = 0;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new Uint8Array(arrayBuffer);
  }

  async parseReplay(): Promise<ScrepParseResult> {
    console.log('[ScrepCompliantParser] === STARTING SCREP-COMPLIANT PARSING ===');
    console.log('[ScrepCompliantParser] File size:', this.data.length, 'bytes');

    // Step 1: Handle compression if needed
    await this.handleCompression();

    // Step 2: Parse header according to screp structure
    const header = this.parseScrepHeader();
    console.log('[ScrepCompliantParser] Header parsed:', header);

    // Step 3: Find command data section
    const commandsOffset = this.findCommandsSection();
    console.log('[ScrepCompliantParser] Commands start at offset:', commandsOffset);

    // Step 4: Parse actions according to screp specification
    const actions = this.parseScrepActions(commandsOffset, header.frameCount);
    console.log('[ScrepCompliantParser] Actions parsed:', actions.length);

    // Step 5: Calculate real APM/EAPM
    const metrics = this.calculateScrepMetrics(actions, header.playerNames.length, header.frameCount);
    console.log('[ScrepCompliantParser] APM calculated:', metrics.apm);
    console.log('[ScrepCompliantParser] EAPM calculated:', metrics.eapm);

    // Step 6: Extract build orders
    const buildOrders = this.extractBuildOrders(actions, header.playerNames.length);
    console.log('[ScrepCompliantParser] Build orders:', buildOrders.map(bo => `${bo.length} items`));

    return {
      header,
      actions,
      metrics,
      buildOrders
    };
  }

  private async handleCompression(): Promise<void> {
    const format = CompressionDetector.detectFormat(this.data.buffer);
    
    if (format.needsDecompression) {
      console.log('[ScrepCompliantParser] Decompressing file...');
      const decompressed = await ReplayDecompressor.decompress(this.data.buffer, format);
      this.data = new Uint8Array(decompressed);
      console.log('[ScrepCompliantParser] Decompressed size:', this.data.length);
    }
  }

  private parseScrepHeader(): ScrepParseResult['header'] {
    // Parse header according to screp structure documentation
    this.position = 0;

    // Skip initial bytes to player section (offset 0x161 = 353)
    this.position = 353;

    const playerNames: string[] = [];
    const playerRaces: string[] = [];

    // Parse 12 player slots (each 36 bytes)
    for (let i = 0; i < 12; i++) {
      const slotStart = this.position;
      
      // Player name is at offset +0 (25 bytes, null-terminated)
      const nameBytes = this.data.slice(this.position, this.position + 25);
      const nameEnd = nameBytes.indexOf(0);
      const name = new TextDecoder().decode(nameBytes.slice(0, nameEnd > 0 ? nameEnd : 25)).trim();
      
      // Race is at offset +32 (1 byte)
      const race = this.data[this.position + 32];
      
      if (name && name !== 'Computer') {
        playerNames.push(name);
        const raceMap = { 0: 'Zerg', 1: 'Terran', 2: 'Protoss', 6: 'Random' };
        playerRaces.push(raceMap[race as keyof typeof raceMap] || 'Unknown');
      }
      
      this.position = slotStart + 36; // Move to next slot
    }

    // Parse map name from offset 0x1CD (25 bytes)
    this.position = 0x1CD;
    const mapBytes = this.data.slice(this.position, this.position + 25);
    const mapEnd = mapBytes.indexOf(0);
    const mapName = new TextDecoder().decode(mapBytes.slice(0, mapEnd > 0 ? mapEnd : 25)).trim();

    // Frame count is typically stored before commands section
    // For now, estimate from file size
    const frameCount = Math.floor(this.data.length / 15);
    const durationSeconds = frameCount / 24; // 24 FPS
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return {
      mapName: mapName || 'Unknown Map',
      playerNames,
      playerRaces,
      frameCount,
      duration
    };
  }

  private findCommandsSection(): number {
    // Commands typically start at offset 633 (0x279) for Remastered
    const commonOffsets = [633, 637, 641, 645];
    
    for (const offset of commonOffsets) {
      if (this.isValidCommandStart(offset)) {
        return offset;
      }
    }
    
    return 633; // Default fallback
  }

  private isValidCommandStart(offset: number): boolean {
    if (offset >= this.data.length - 50) return false;
    
    let validActions = 0;
    let frameMarkers = 0;
    
    for (let i = 0; i < 50 && offset + i < this.data.length; i++) {
      const byte = this.data[offset + i];
      
      if (byte === 0x00) frameMarkers++;
      if (byte in SCREP_ACTIONS) validActions++;
    }
    
    return validActions >= 3 && frameMarkers >= 5;
  }

  private parseScrepActions(startOffset: number, maxFrames: number): ScrepCompliantAction[] {
    console.log('[ScrepCompliantParser] Parsing actions from offset:', startOffset);
    
    const actions: ScrepCompliantAction[] = [];
    this.position = startOffset;
    let currentFrame = 0;

    while (this.position < this.data.length - 1 && currentFrame < maxFrames) {
      const actionId = this.data[this.position];

      // Handle frame advancement
      if (actionId === 0x00) {
        currentFrame++;
        this.position++;
        continue;
      }

      // Handle frame skips
      if (actionId === 0x01) {
        currentFrame += this.data[this.position + 1] || 1;
        this.position += 2;
        continue;
      }

      if (actionId === 0x02) {
        const skip = this.readUint16LE(this.position + 1);
        currentFrame += skip;
        this.position += 3;
        continue;
      }

      // Parse known action
      if (actionId in SCREP_ACTIONS) {
        const action = this.parseAction(actionId, currentFrame);
        if (action) {
          actions.push(action);
        }
      } else {
        // Skip unknown byte
        this.position++;
      }

      // Safety break
      if (actions.length > 10000) break;
    }

    return actions;
  }

  private parseAction(actionId: number, frame: number): ScrepCompliantAction | null {
    const actionDef = SCREP_ACTIONS[actionId as keyof typeof SCREP_ACTIONS];
    if (!actionDef) return null;

    const startPos = this.position;
    this.position++; // Skip action ID

    // Read player ID (typically next byte)
    const playerId = this.position < this.data.length ? this.data[this.position] : 0;

    // Read action data based on length
    const dataLength = actionDef.length;
    const actionData = this.data.slice(startPos, Math.min(startPos + dataLength, this.data.length));

    // Parse specific parameters for important actions
    const params: any = {};
    
    if (actionId === 0x0C && dataLength >= 7) { // Build
      params.unitType = this.readUint16LE(startPos + 2);
      params.x = this.readUint16LE(startPos + 4);
      params.y = this.readUint16LE(startPos + 6);
    } else if (actionId === 0x1D && dataLength >= 2) { // Train
      params.unitType = this.readUint16LE(startPos + 2);
    } else if ((actionId === 0x14 || actionId === 0x15) && dataLength >= 4) { // Move/Attack
      params.x = this.readUint16LE(startPos + 2);
      params.y = this.readUint16LE(startPos + 4);
    }

    // Advance position by action length
    this.position = startPos + dataLength;

    return {
      frame,
      playerId,
      actionId,
      actionName: actionDef.name,
      isGameAction: actionDef.gameAction,
      data: actionData,
      params
    };
  }

  private calculateScrepMetrics(actions: ScrepCompliantAction[], playerCount: number, totalFrames: number): { apm: number[], eapm: number[] } {
    const gameMinutes = totalFrames / (24 * 60);
    const apm: number[] = [];
    const eapm: number[] = [];

    for (let i = 0; i < playerCount; i++) {
      const playerActions = actions.filter(a => a.playerId === i);
      const gameActions = playerActions.filter(a => a.isGameAction);
      const economicActions = gameActions.filter(a => 
        a.actionId === 0x0C || // Build
        a.actionId === 0x1D || // Train
        a.actionId === 0x2F || // Research
        a.actionId === 0x31    // Upgrade
      );

      apm.push(gameMinutes > 0 ? Math.round(gameActions.length / gameMinutes) : 0);
      eapm.push(gameMinutes > 0 ? Math.round(economicActions.length / gameMinutes) : 0);
    }

    return { apm, eapm };
  }

  private extractBuildOrders(actions: ScrepCompliantAction[], playerCount: number): Array<Array<{
    frame: number;
    timestamp: string;
    unitName: string;
    supply?: number;
  }>> {
    const buildOrders: Array<Array<any>> = [];

    for (let i = 0; i < playerCount; i++) {
      const buildActions = actions
        .filter(a => a.playerId === i && (a.actionId === 0x0C || a.actionId === 0x1D))
        .filter(a => a.params?.unitType !== undefined)
        .sort((a, b) => a.frame - b.frame);

      const buildOrder = buildActions.map(action => {
        const unitName = UNIT_NAMES[action.params!.unitType!] || `Unit_${action.params!.unitType}`;
        const minutes = Math.floor(action.frame / (24 * 60));
        const seconds = Math.floor((action.frame / 24) % 60);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        return {
          frame: action.frame,
          timestamp,
          unitName
        };
      });

      buildOrders.push(buildOrder);
    }

    return buildOrders;
  }

  private readUint16LE(offset: number): number {
    if (offset + 1 >= this.data.length) return 0;
    return this.data[offset] | (this.data[offset + 1] << 8);
  }
}
