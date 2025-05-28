
/**
 * SIMPLIFIED screp-js parser - ONLY screp-js, no fallbacks
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
  };
}

export class ScrepParser {
  private static wrapper = ScrepJsWrapper.getInstance();

  /**
   * Parse replay using ONLY screp-js - no custom parser fallback
   */
  static async parseReplay(file: File): Promise<ScrepReplayData> {
    console.log('[ScrepParser] Using ONLY screp-js - no custom parser');
    
    // Initialize wrapper
    const available = await this.wrapper.initialize();
    
    if (!available) {
      throw new Error('screp-js ist nicht verfügbar im Browser - Custom Parser wurde entfernt');
    }
    
    console.log('[ScrepParser] screp-js verfügbar - parsing...');
    const result = await this.wrapper.parseReplay(file);
    
    console.log('[ScrepParser] screp-js erfolgreich - konvertiere Daten');
    return this.convertToScrepFormat(result);
  }

  private static convertToScrepFormat(result: ReplayParseResult): ScrepReplayData {
    console.log('[ScrepParser] Converting screp-js result to format');
    console.log('[ScrepParser] Raw screp result players:', result.players.map(p => p.name));
    
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

    // Use real APM data from screp-js
    const apm = result.computed.playerAPM;
    const eapm = result.computed.playerEAPM;
    const buildOrders = result.computed.buildOrders;
    
    console.log('[ScrepParser] Final player data:', players.map(p => `${p.name} (${p.race})`));
    console.log('[ScrepParser] Final APM data:', apm);
    console.log('[ScrepParser] Final EAPM data:', eapm);

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
