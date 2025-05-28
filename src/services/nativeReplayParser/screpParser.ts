/**
 * ENHANCED screp-js parser with native action parsing
 */

import { EnhancedScrepWrapper, EnhancedReplayData } from './enhancedScrepWrapper';

export interface ScrepPlayer {
  name: string;
  race: string;
  raceId: number;
  team: number;
  color: number;
  slotId: number;
}

export interface ScrepReplayData {
  header: {
    engine: string;
    version: string;
    frames: number;
    startTime: Date;
    title: string;
    mapName: string;
    mapWidth: number;
    mapHeight: number;
    gameType: string;
    gameSubType: number;
    host: string;
    duration: string;
    durationMs: number;
  };
  players: ScrepPlayer[];
  computed: {
    playerDescs: string[];
    matchup: string;
    league: string;
    winnerTeam: number;
    apm: number[];
    eapm: number[];
    buildOrders: Array<Array<{
      frame: number;
      timestamp: string;
      action: string;
      supply?: number;
    }>>;
  };
}

export class ScrepParser {
  /**
   * Parse replay using enhanced screp-js with native action parser
   */
  static async parseReplay(file: File): Promise<ScrepReplayData> {
    console.log('[ScrepParser] Using ENHANCED screp-js with native action parser');
    
    console.log('[ScrepParser] Starting enhanced parsing...');
    const result = await EnhancedScrepWrapper.parseReplayEnhanced(file);
    
    console.log('[ScrepParser] Enhanced parsing successful - converting data');
    return this.convertToScrepFormat(result);
  }

  private static convertToScrepFormat(result: EnhancedReplayData): ScrepReplayData {
    console.log('[ScrepParser] Converting enhanced result to format');
    console.log('[ScrepParser] Enhancement info:', {
      hasDetailedActions: result.enhanced.hasDetailedActions,
      extractionMethod: result.enhanced.extractionMethod,
      extractionTime: result.enhanced.extractionTime
    });
    
    // Strict validation - only accept real data
    if (!result.players || result.players.length < 2) {
      throw new Error('screp-js: Nicht genügend Spieler gefunden');
    }
    
    if (!result.header.mapName || result.header.mapName === 'Unknown Map') {
      throw new Error('screp-js: Map-Name nicht verfügbar');
    }
    
    if (!result.header.duration || result.header.duration === '0:00') {
      throw new Error('screp-js: Spiel-Dauer nicht verfügbar');
    }
    
    if (result.header.frames <= 0) {
      throw new Error('screp-js: Ungültige Frame-Anzahl');
    }
    
    const players: ScrepPlayer[] = result.players.map((player, index) => {
      if (!player.name || player.name.trim() === '') {
        throw new Error(`screp-js: Spieler ${index} hat keinen Namen`);
      }
      
      return {
        name: player.name,
        race: player.race,
        raceId: this.getRaceId(player.race),
        team: player.team,
        color: player.color,
        slotId: index
      };
    });

    // Use enhanced APM/EAPM data if available
    const apm = result.computed.apm || [];
    const eapm = result.computed.eapm || [];
    const buildOrders = result.computed.buildOrders || [];
    
    console.log('[ScrepParser] Final enhanced data:', {
      players: players.map(p => `${p.name} (${p.race})`),
      apm: apm,
      eapm: eapm,
      buildOrdersAvailable: buildOrders.length > 0,
      detailedActions: result.enhanced.hasDetailedActions
    });

    return {
      header: {
        engine: result.header.engine,
        version: result.header.version,
        frames: result.header.frames,
        startTime: result.header.startTime,
        title: '',
        mapName: result.header.mapName,
        mapWidth: 0,
        mapHeight: 0,
        gameType: result.header.gameType,
        gameSubType: 0,
        host: '',
        duration: result.header.duration,
        durationMs: Math.floor(result.header.frames * 1000 / 24)
      },
      players,
      computed: {
        playerDescs: players.map(p => `${p.name} (${p.race})`),
        matchup: players.length >= 2 ? `${players[0].race.charAt(0)}v${players[1].race.charAt(0)}` : '',
        league: '',
        winnerTeam: -1,
        apm,
        eapm,
        buildOrders
      }
    };
  }

  private static getRaceId(race: string): number {
    const raceMap: Record<string, number> = {
      'Zerg': 0,
      'Terran': 1,
      'Protoss': 2,
      'Random': 6
    };
    return raceMap[race] || 6;
  }
}
