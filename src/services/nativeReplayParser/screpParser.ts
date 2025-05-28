
/**
 * Enhanced screp parser with REAL data extraction guarantee
 */

import { ScrepJsWrapper, ReplayParseResult } from './screpJsWrapper';
import { DebugAnalyzer } from './debugAnalyzer';

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
    console.log('[ScrepParser] ===== STARTING COMPREHENSIVE REPLAY ANALYSIS =====');
    console.log('[ScrepParser] File:', file.name, 'Size:', (file.size / 1024).toFixed(2), 'KB');
    
    // Datei in Buffer laden für umfassende Analyse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // UMFASSENDE DEBUG-ANALYSE
    console.log('[ScrepParser] ===== STARTING COMPREHENSIVE DEBUG ANALYSIS =====');
    const debugAnalyzer = new DebugAnalyzer(buffer);
    debugAnalyzer.analyzeReplay();
    
    const wrapper = ScrepJsWrapper.getInstance();
    await wrapper.initialize();
    
    console.log('[ScrepParser] ===== ATTEMPTING SCREP-JS PARSING =====');
    
    try {
      const result = await wrapper.parseReplay(file);
      
      console.log('[ScrepParser] ===== SCREP-JS RESULT ANALYSIS =====');
      console.log('[ScrepParser] Header:', result.header);
      console.log('[ScrepParser] Players:', result.players);
      console.log('[ScrepParser] Commands count:', result.commands.length);
      console.log('[ScrepParser] APM Data:', result.computed.playerAPM);
      console.log('[ScrepParser] EAPM Data:', result.computed.playerEAPM);
      console.log('[ScrepParser] Build Orders lengths:', result.computed.buildOrders.map(bo => bo.length));
      console.log('[ScrepParser] Data Source:', result.computed.dataSource);
      
      // KRITISCHE VALIDIERUNG
      const hasRealAPM = result.computed.playerAPM && 
                        result.computed.playerAPM.length >= 2 && 
                        result.computed.playerAPM.some(apm => apm > 0);
      
      const hasRealBuildOrders = result.computed.buildOrders && 
                                result.computed.buildOrders.length >= 2 &&
                                result.computed.buildOrders.some(bo => bo.length > 0);
      
      console.log('[ScrepParser] ===== VALIDATION RESULTS =====');
      console.log('[ScrepParser] Has real APM:', hasRealAPM);
      console.log('[ScrepParser] Has real build orders:', hasRealBuildOrders);
      
      if (!hasRealAPM) {
        console.error('[ScrepParser] CRITICAL: No real APM data found!');
        console.log('[ScrepParser] Raw APM values:', result.computed.playerAPM);
        throw new Error('REAL APM data not available - parser failed to extract actions');
      }
      
      if (!hasRealBuildOrders) {
        console.warn('[ScrepParser] WARNING: No real build orders found!');
        console.log('[ScrepParser] Build order lengths:', result.computed.buildOrders.map(bo => bo.length));
      }
      
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
          apm: result.computed.playerAPM,
          eapm: result.computed.playerEAPM,
          buildOrders: result.computed.buildOrders,
          dataSource: result.computed.dataSource
        }
      };
      
      console.log('[ScrepParser] ===== FINAL RESULT VALIDATION =====');
      console.log('[ScrepParser] Final APM:', screpData.computed.apm);
      console.log('[ScrepParser] Final EAPM:', screpData.computed.eapm);
      console.log('[ScrepParser] Final Build Orders:', screpData.computed.buildOrders.map(bo => `${bo.length} actions`));
      console.log('[ScrepParser] Data source:', screpData.computed.dataSource);
      
      return screpData;
      
    } catch (error) {
      console.error('[ScrepParser] COMPLETE PARSING FAILED:', error);
      throw new Error(`Replay parsing completely failed: ${error.message}`);
    }
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
