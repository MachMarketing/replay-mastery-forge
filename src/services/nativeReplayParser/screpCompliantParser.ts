
/**
 * Complete screp-compliant parser for StarCraft: Remastered
 * Implements the full screp specification with seRS decompression
 */

import { SeRSParser } from './seRSParser';
import { ScrepHeaderParser } from './screpHeaderParser';
import { ScrepActionsParser } from './screpActionsParser';

export interface ScrepCompliantAction {
  frame: number;
  playerId: number;
  actionId: number;
  actionName: string;
  isGameAction: boolean;
  data: Uint8Array;
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

export class ScrepCompliantParser {
  private originalBuffer: ArrayBuffer;

  constructor(arrayBuffer: ArrayBuffer) {
    this.originalBuffer = arrayBuffer;
  }

  async parseReplay(): Promise<ScrepParseResult> {
    console.log('[ScrepCompliantParser] === STARTING SCREP-COMPLIANT PARSING ===');
    console.log('[ScrepCompliantParser] Original file size:', this.originalBuffer.byteLength, 'bytes');

    // Step 1: Check for seRS format and decompress
    const seRSParser = new SeRSParser(this.originalBuffer);
    let replayData: Uint8Array;

    try {
      const { header: seRSHeader, decompressedData } = seRSParser.parse();
      console.log('[ScrepCompliantParser] seRS decompression successful');
      console.log('[ScrepCompliantParser] Decompressed size:', decompressedData.length);
      replayData = decompressedData;
    } catch (error) {
      console.log('[ScrepCompliantParser] Not seRS format, using original data');
      replayData = new Uint8Array(this.originalBuffer);
    }

    // Step 2: Parse header from decompressed data
    const headerParser = new ScrepHeaderParser(replayData);
    const parsedHeader = headerParser.parseHeader();
    
    console.log('[ScrepCompliantParser] Header parsed successfully');
    console.log('[ScrepCompliantParser] Players:', parsedHeader.playerSlots.map(p => `${p.name} (${p.raceString})`));
    console.log('[ScrepCompliantParser] Map:', parsedHeader.mapName);
    console.log('[ScrepCompliantParser] Frames:', parsedHeader.frameCount);

    // Step 3: Parse actions
    const actionsParser = new ScrepActionsParser(replayData);
    const commandsStart = actionsParser.findCommandsStart();
    const actions = actionsParser.parseActions(commandsStart, parsedHeader.frameCount);

    console.log('[ScrepCompliantParser] Actions parsed:', actions.length);

    // Step 4: Calculate metrics
    const metrics = this.calculateMetrics(actions, parsedHeader.playerSlots.length, parsedHeader.frameCount);
    console.log('[ScrepCompliantParser] APM calculated:', metrics.apm);
    console.log('[ScrepCompliantParser] EAPM calculated:', metrics.eapm);

    // Step 5: Extract build orders
    const buildOrders = this.extractBuildOrders(actions, parsedHeader.playerSlots.length);

    // Calculate duration
    const durationSeconds = parsedHeader.frameCount / 24; // 24 FPS
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const result: ScrepParseResult = {
      header: {
        mapName: parsedHeader.mapName,
        playerNames: parsedHeader.playerSlots.map(p => p.name),
        playerRaces: parsedHeader.playerSlots.map(p => p.raceString),
        frameCount: parsedHeader.frameCount,
        duration
      },
      actions,
      metrics,
      buildOrders
    };

    console.log('[ScrepCompliantParser] === PARSING COMPLETE ===');
    console.log('[ScrepCompliantParser] Final result:', {
      map: result.header.mapName,
      players: result.header.playerNames,
      apm: result.metrics.apm,
      buildOrderLengths: result.buildOrders.map(bo => bo.length)
    });

    return result;
  }

  private calculateMetrics(actions: ScrepCompliantAction[], playerCount: number, totalFrames: number): { apm: number[], eapm: number[] } {
    const gameMinutes = totalFrames / (24 * 60);
    const apm: number[] = [];
    const eapm: number[] = [];

    for (let i = 0; i < playerCount; i++) {
      const playerActions = actions.filter(a => a.playerId === i);
      const gameActions = playerActions.filter(a => a.isGameAction);
      const economicActions = gameActions.filter(a => 
        [0x0C, 0x1D, 0x2F, 0x31].includes(a.actionId) // Build, Train, Research, Upgrade
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
    // Unit names mapping
    const unitNames: Record<number, string> = {
      0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 4: 'Siege Tank',
      5: 'SCV', 7: 'Wraith', 8: 'Science Vessel', 11: 'Battlecruiser',
      106: 'Command Center', 111: 'Barracks', 112: 'Academy', 113: 'Factory',
      114: 'Starport', 115: 'Control Tower', 116: 'Science Facility',
      60: 'Zealot', 61: 'Dragoon', 62: 'High Templar', 63: 'Archon',
      64: 'Shuttle', 65: 'Scout', 66: 'Arbiter', 67: 'Carrier', 69: 'Probe',
      154: 'Nexus', 155: 'Robotics Facility', 157: 'Pylon', 159: 'Gateway',
      37: 'Zergling', 38: 'Hydralisk', 39: 'Ultralisk', 41: 'Drone',
      42: 'Overlord', 43: 'Mutalisk', 44: 'Guardian',
      131: 'Hatchery', 132: 'Lair', 133: 'Hive', 142: 'Spawning Pool'
    };

    const buildOrders: Array<Array<any>> = [];

    for (let i = 0; i < playerCount; i++) {
      const buildActions = actions
        .filter(a => a.playerId === i && (a.actionId === 0x0C || a.actionId === 0x1D)) // Build or Train
        .filter(a => a.data.length >= 4) // Ensure we have unit type data
        .sort((a, b) => a.frame - b.frame);

      const buildOrder = buildActions.map(action => {
        // Extract unit type from action data
        const unitType = action.data.length >= 4 ? 
          (action.data[2] | (action.data[3] << 8)) : 0;
        
        const unitName = unitNames[unitType] || `Unit_${unitType}`;
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
}
