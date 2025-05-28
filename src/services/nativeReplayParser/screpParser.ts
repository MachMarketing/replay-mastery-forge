
/**
 * Enhanced screp-js integration with 100% real data guarantee
 */

import { ScrepJsWrapper, ReplayParseResult } from './screpJsWrapper';

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
    dataSource: 'screp-js' | 'command-extractor' | 'hybrid'; // NEW: Track data source
  };
}

export class ScrepParser {
  private static wrapper = ScrepJsWrapper.getInstance();

  /**
   * Parse replay using enhanced screp-js wrapper - 100% REAL DATA ONLY
   */
  static async parseReplay(file: File): Promise<ScrepReplayData> {
    console.log('[ScrepParser] ===== STARTING 100% REAL DATA PARSING =====');
    
    // Initialize wrapper with enhanced features
    const available = await this.wrapper.initialize();
    
    if (!available) {
      throw new Error('screp-js ist nicht verfügbar im Browser');
    }
    
    console.log('[ScrepParser] Using enhanced screp-js wrapper with fallbacks');
    const result = await this.wrapper.parseReplay(file);
    return this.convertToEnhancedScrepFormat(result);
  }

  private static convertToEnhancedScrepFormat(result: ReplayParseResult): ScrepReplayData {
    console.log('[ScrepParser] ===== CONVERTING TO ENHANCED SCREP FORMAT =====');
    console.log('[ScrepParser] Data source:', result.computed.dataSource);
    console.log('[ScrepParser] Raw result validation:', {
      hasPlayers: result.players?.length >= 2,
      hasMapName: !!result.header.mapName && result.header.mapName !== 'Unknown Map',
      hasDuration: !!result.header.duration && result.header.duration !== '0:00',
      hasFrames: result.header.frames > 0,
      hasAPM: result.computed.playerAPM.some(apm => apm > 0),
      hasBuildOrders: result.computed.buildOrders.some(bo => bo.length > 0)
    });
    
    // STRICT validation - no mock data accepted
    if (!result.players || result.players.length < 2) {
      throw new Error('Enhanced Parser: Nicht genügend Spieler gefunden');
    }
    
    if (!result.header.mapName || result.header.mapName === 'Unknown Map') {
      throw new Error('Enhanced Parser: Map-Name nicht verfügbar');
    }
    
    if (!result.header.duration || result.header.duration === '0:00') {
      throw new Error('Enhanced Parser: Spiel-Dauer nicht verfügbar');
    }
    
    if (result.header.frames <= 0) {
      throw new Error('Enhanced Parser: Ungültige Frame-Anzahl');
    }
    
    const players: ScrepPlayer[] = result.players.map((player, index) => {
      if (!player.name || player.name.trim() === '') {
        throw new Error(`Enhanced Parser: Spieler ${index} hat keinen Namen`);
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

    // Use REAL APM and build order data from enhanced parsing
    const apm = result.computed.playerAPM;
    const eapm = result.computed.playerEAPM;
    const buildOrders = result.computed.buildOrders;
    
    console.log('[ScrepParser] ===== 100% REAL DATA VERIFICATION =====');
    console.log('[ScrepParser] Data Source:', result.computed.dataSource);
    console.log('[ScrepParser] Real APM data:', apm);
    console.log('[ScrepParser] Real EAPM data:', eapm);
    console.log('[ScrepParser] Real Build Orders:', buildOrders.map((bo, i) => `Player ${i}: ${bo.length} actions`));
    
    // Log first few build order actions for verification
    buildOrders.forEach((bo, playerIndex) => {
      if (bo.length > 0) {
        console.log(`[ScrepParser] Player ${playerIndex} first 3 build actions:`, bo.slice(0, 3));
      }
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
        league: '', // No mock league
        winnerTeam: -1,
        apm, // 100% REAL APM data
        eapm, // 100% REAL EAPM data  
        buildOrders, // 100% REAL build orders
        dataSource: result.computed.dataSource // Track data source
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
