
/**
 * Enhanced screp-compliant parser with robust seRS integration
 */

import { SeRSDecompressor } from './seRSDecompressor';
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
    console.log('[ScrepCompliantParser] === STARTING ENHANCED SCREP PARSING ===');
    console.log('[ScrepCompliantParser] Original file size:', this.originalBuffer.byteLength, 'bytes');

    // Step 1: Enhanced seRS detection and decompression
    let replayData: Uint8Array;
    
    try {
      const decompressor = new SeRSDecompressor(this.originalBuffer);
      const decompressionResult = decompressor.decompress();
      
      if (decompressionResult.success && decompressionResult.data) {
        console.log('[ScrepCompliantParser] ===== seRS DECOMPRESSION SUCCESS =====');
        console.log('[ScrepCompliantParser] Method:', decompressionResult.method);
        console.log('[ScrepCompliantParser] Decompressed size:', decompressionResult.data.length);
        replayData = decompressionResult.data;
      } else {
        console.log('[ScrepCompliantParser] seRS decompression failed, using original data');
        replayData = new Uint8Array(this.originalBuffer);
      }
    } catch (error) {
      console.log('[ScrepCompliantParser] seRS processing error, using original data:', error);
      replayData = new Uint8Array(this.originalBuffer);
    }

    // Step 2: Enhanced header parsing
    const headerParser = new ScrepHeaderParser(replayData);
    const parsedHeader = headerParser.parseHeader();
    
    console.log('[ScrepCompliantParser] ===== HEADER PARSING RESULTS =====');
    console.log('[ScrepCompliantParser] Map:', parsedHeader.mapName);
    console.log('[ScrepCompliantParser] Player count:', parsedHeader.playerSlots.length);
    console.log('[ScrepCompliantParser] Players:', parsedHeader.playerSlots.map((p, i) => `${i}: ${p.name} (${p.raceString})`));
    console.log('[ScrepCompliantParser] Frames:', parsedHeader.frameCount);

    // Step 3: Enhanced actions parsing
    const actionsParser = new ScrepActionsParser(replayData);
    const commandsStart = actionsParser.findCommandsStart();
    const actions = actionsParser.parseActions(commandsStart, parsedHeader.frameCount);

    console.log('[ScrepCompliantParser] ===== ACTIONS PARSING RESULTS =====');
    console.log('[ScrepCompliantParser] Commands start offset:', commandsStart);
    console.log('[ScrepCompliantParser] Total actions parsed:', actions.length);
    
    // Log action distribution by player
    const actionsByPlayer: Record<number, number> = {};
    actions.forEach(action => {
      actionsByPlayer[action.playerId] = (actionsByPlayer[action.playerId] || 0) + 1;
    });
    console.log('[ScrepCompliantParser] Actions by player:', actionsByPlayer);

    // Step 4: Enhanced metrics calculation
    const metrics = this.calculateEnhancedMetrics(actions, parsedHeader.playerSlots.length, parsedHeader.frameCount);
    console.log('[ScrepCompliantParser] ===== METRICS CALCULATION =====');
    console.log('[ScrepCompliantParser] APM:', metrics.apm);
    console.log('[ScrepCompliantParser] EAPM:', metrics.eapm);

    // Step 5: Enhanced build orders extraction
    const buildOrders = this.extractEnhancedBuildOrders(actions, parsedHeader.playerSlots.length);
    console.log('[ScrepCompliantParser] ===== BUILD ORDERS =====');
    buildOrders.forEach((bo, i) => {
      console.log(`[ScrepCompliantParser] Player ${i} build order length:`, bo.length);
      if (bo.length > 0) {
        console.log(`[ScrepCompliantParser] Player ${i} first 3 builds:`, bo.slice(0, 3).map(b => b.unitName));
      }
    });

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

    console.log('[ScrepCompliantParser] ===== FINAL ENHANCED RESULTS =====');
    console.log('[ScrepCompliantParser] Map:', result.header.mapName);
    console.log('[ScrepCompliantParser] Players:', result.header.playerNames);
    console.log('[ScrepCompliantParser] APM values:', result.metrics.apm);
    console.log('[ScrepCompliantParser] Duration:', duration);
    console.log('[ScrepCompliantParser] === PARSING COMPLETE ===');

    return result;
  }

  private calculateEnhancedMetrics(actions: ScrepCompliantAction[], playerCount: number, totalFrames: number): { apm: number[], eapm: number[] } {
    const gameMinutes = totalFrames / (24 * 60);
    const apm: number[] = [];
    const eapm: number[] = [];

    console.log('[ScrepCompliantParser] Calculating metrics for', playerCount, 'players over', gameMinutes.toFixed(2), 'minutes');

    for (let i = 0; i < playerCount; i++) {
      const playerActions = actions.filter(a => a.playerId === i && a.isGameAction);
      const economicActions = playerActions.filter(a => 
        [0x0C, 0x1D, 0x2F, 0x31, 0x27, 0x35].includes(a.actionId) // Build, Train, Research, Upgrade, etc.
      );

      const playerAPM = gameMinutes > 0 ? Math.round(playerActions.length / gameMinutes) : 0;
      const playerEAPM = gameMinutes > 0 ? Math.round(economicActions.length / gameMinutes) : 0;

      console.log(`[ScrepCompliantParser] Player ${i}: ${playerActions.length} actions, ${economicActions.length} economic -> APM: ${playerAPM}, EAPM: ${playerEAPM}`);

      apm.push(playerAPM);
      eapm.push(playerEAPM);
    }

    return { apm, eapm };
  }

  private extractEnhancedBuildOrders(actions: ScrepCompliantAction[], playerCount: number): Array<Array<{
    frame: number;
    timestamp: string;
    unitName: string;
    supply?: number;
  }>> {
    // Enhanced unit names mapping with more units
    const unitNames: Record<number, string> = {
      // Terran
      0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 4: 'Siege Tank',
      5: 'SCV', 7: 'Wraith', 8: 'Science Vessel', 11: 'Battlecruiser',
      106: 'Command Center', 107: 'Comsat Station', 108: 'Nuclear Silo',
      109: 'Supply Depot', 110: 'Refinery', 111: 'Barracks', 112: 'Academy',
      113: 'Factory', 114: 'Starport', 115: 'Control Tower', 116: 'Science Facility',
      117: 'Covert Ops', 118: 'Physics Lab', 119: 'Machine Shop', 120: 'Engineering Bay',
      121: 'Armory', 122: 'Missile Turret', 123: 'Bunker',
      
      // Protoss
      60: 'Zealot', 61: 'Dragoon', 62: 'High Templar', 63: 'Archon',
      64: 'Shuttle', 65: 'Scout', 66: 'Arbiter', 67: 'Carrier', 69: 'Probe',
      70: 'Interceptor', 71: 'Reaver', 72: 'Observer', 73: 'Scarab',
      154: 'Nexus', 155: 'Robotics Facility', 156: 'Pylon', 157: 'Assimilator',
      158: 'Observatory', 159: 'Gateway', 160: 'Photon Cannon', 161: 'Citadel of Adun',
      162: 'Cybernetics Core', 163: 'Templar Archives', 164: 'Forge', 165: 'Stargate',
      166: 'Fleet Beacon', 167: 'Arbiter Tribunal', 168: 'Robotics Support Bay',
      169: 'Shield Battery',
      
      // Zerg
      37: 'Zergling', 38: 'Hydralisk', 39: 'Ultralisk', 40: 'Broodling',
      41: 'Drone', 42: 'Overlord', 43: 'Mutalisk', 44: 'Guardian',
      45: 'Queen', 46: 'Defiler', 47: 'Scourge', 50: 'Infested Terran',
      103: 'Larva', 104: 'Egg', 105: 'Lurker',
      131: 'Hatchery', 132: 'Lair', 133: 'Hive', 134: 'Nydus Canal',
      135: 'Hydralisk Den', 136: 'Defiler Mound', 137: 'Greater Spire',
      138: 'Queens Nest', 139: 'Evolution Chamber', 140: 'Ultralisk Cavern',
      141: 'Spire', 142: 'Spawning Pool', 143: 'Creep Colony',
      144: 'Spore Colony', 145: 'Sunken Colony', 146: 'Extractor'
    };

    const buildOrders: Array<Array<any>> = [];

    for (let i = 0; i < playerCount; i++) {
      const buildActions = actions
        .filter(a => a.playerId === i && (a.actionId === 0x0C || a.actionId === 0x1D)) // Build or Train
        .filter(a => a.data.length >= 4) // Ensure we have unit type data
        .sort((a, b) => a.frame - b.frame);

      console.log(`[ScrepCompliantParser] Player ${i} build actions:`, buildActions.length);

      const buildOrder = buildActions.slice(0, 25).map(action => {
        // Extract unit type from action data
        let unitType = 0;
        if (action.data.length >= 4) {
          unitType = action.data[2] | (action.data[3] << 8);
        }
        
        const unitName = unitNames[unitType] || `Unknown_Unit_${unitType}`;
        const minutes = Math.floor(action.frame / (24 * 60));
        const seconds = Math.floor((action.frame / 24) % 60);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        console.log(`[ScrepCompliantParser] Player ${i} build: ${timestamp} - ${unitName} (type: ${unitType})`);

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
