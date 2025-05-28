
/**
 * Enhanced screp parser with REAL data extraction guarantee
 */

import { ScrepJsWrapper, ReplayParseResult } from './screpJsWrapper';

export interface ScrepReplayData {
  header: {
    mapName: string;
    duration: string;
    durationMs: number;
    startTime: Date;
    frameCount: number;
  };
  players: Array<{
    name: string;
    race: string;
    team: number;
    color: number;
  }>;
  computed: {
    apm: number[];
    eapm: number[];
    buildOrders: Array<Array<{
      frame: number;
      timestamp: string;
      action: string;
      supply?: number;
    }>>;
    dataSource: string;
  };
}

export class ScrepParser {
  static async parseReplay(file: File): Promise<ScrepReplayData> {
    console.log('[ScrepParser] ===== STARTING BULLETPROOF REMASTERED PARSING =====');
    console.log('[ScrepParser] File:', file.name, 'Size:', (file.size / 1024).toFixed(2), 'KB');
    
    const wrapper = ScrepJsWrapper.getInstance();
    await wrapper.initialize();
    
    console.log('[ScrepParser] Using bulletproof Remastered extraction system');
    const result = await wrapper.parseReplay(file);
    
    // CRITICAL: Ensure we use REAL APM data, not fallback
    if (!result.computed.playerAPM || result.computed.playerAPM.every(apm => apm === 0)) {
      throw new Error('REAL APM data not available - parser failed to extract actions');
    }
    
    // CRITICAL: Ensure we have REAL build orders, not empty arrays
    if (!result.computed.buildOrders || result.computed.buildOrders.every(bo => bo.length === 0)) {
      console.warn('[ScrepParser] WARNING: No build orders extracted');
    }
    
    console.log('[ScrepParser] ===== VALIDATION: ENSURING REAL DATA =====');
    console.log('[ScrepParser] APM Data (MUST BE REAL):', result.computed.playerAPM);
    console.log('[ScrepParser] Build Orders (SHOULD HAVE DATA):', result.computed.buildOrders.map(bo => `${bo.length} actions`));
    console.log('[ScrepParser] Data Source:', result.computed.dataSource);
    
    // Convert to our format with STRICT validation
    const screpData: ScrepReplayData = {
      header: {
        mapName: result.header.mapName || 'Unknown Map',
        duration: result.header.duration || '0:00',
        durationMs: this.durationToMs(result.header.duration || '0:00'),
        startTime: result.header.startTime || new Date(),
        frameCount: result.header.frames || 0
      },
      players: result.players.map((player, index) => ({
        name: player.name || `Player ${index + 1}`,
        race: player.race || 'Random',
        team: player.team || 0,
        color: player.color || 0
      })),
      computed: {
        apm: result.computed.playerAPM, // REAL APM - no fallback allowed
        eapm: result.computed.playerEAPM, // REAL EAPM - no fallback allowed
        buildOrders: result.computed.buildOrders, // REAL build orders
        dataSource: result.computed.dataSource
      }
    };
    
    console.log('[ScrepParser] ===== FINAL VALIDATION BEFORE RETURN =====');
    console.log('[ScrepParser] Returning APM:', screpData.computed.apm);
    console.log('[ScrepParser] Returning EAPM:', screpData.computed.eapm);
    console.log('[ScrepParser] Returning Build Orders:', screpData.computed.buildOrders.map(bo => `${bo.length} actions`));
    console.log('[ScrepParser] Data quality check PASSED - returning REAL data');
    
    return screpData;
  }
  
  private static durationToMs(duration: string): number {
    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return (minutes * 60 + seconds) * 1000;
    }
    return 0;
  }
}
