
/**
 * EINFACHE LÖSUNG: Direkte Nutzung der funktionierenden screp-js Daten
 */

import { ParsedReplayData } from '../replayParser/types';
import { ScrepJsWrapper } from './screpJsWrapper';
import { ensureBufferPolyfills } from './bufferUtils';

export class NativeReplayParser {
  /**
   * VEREINFACHTE Parsing-Strategie: Direkt screp-js verwenden
   */
  static async parseReplay(file: File): Promise<ParsedReplayData> {
    console.log('[NativeReplayParser] === EINFACHE LÖSUNG: Direkte screp-js Nutzung ===');
    console.log('[NativeReplayParser] File:', file.name, 'Size:', file.size);
    
    // Buffer polyfills sicherstellen
    ensureBufferPolyfills();
    
    try {
      // Direkt ScrepJsWrapper verwenden - der funktioniert bereits perfekt!
      const wrapper = ScrepJsWrapper.getInstance();
      await wrapper.initialize();
      
      const screpResult = await wrapper.parseReplay(file);
      
      console.log('[NativeReplayParser] === SCREP-JS DATEN ERFOLGREICH ===');
      console.log('[NativeReplayParser] Map:', screpResult.header.mapName);
      console.log('[NativeReplayParser] Spieler:', screpResult.players.map(p => `${p.name} (${p.race})`));
      console.log('[NativeReplayParser] APM:', screpResult.computed.playerAPM);
      console.log('[NativeReplayParser] EAPM:', screpResult.computed.playerEAPM);
      
      // Direkte Konvertierung zu ParsedReplayData
      const result: ParsedReplayData = {
        map: screpResult.header.mapName,
        matchup: this.determineMatchup(screpResult.players.map(p => p.race)),
        duration: screpResult.header.duration,
        durationMS: screpResult.header.frames * (1000 / 24),
        date: new Date().toISOString().split('T')[0],
        result: 'unknown',
        
        // Korrekte Spielerdaten direkt von screp-js
        primaryPlayer: {
          name: screpResult.players[0]?.name || 'Player 1',
          race: screpResult.players[0]?.race || 'Terran',
          apm: screpResult.computed.playerAPM[0] || 0,
          eapm: screpResult.computed.playerEAPM[0] || 0,
          buildOrder: this.convertBuildOrder(screpResult.computed.buildOrders[0] || []),
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        secondaryPlayer: {
          name: screpResult.players[1]?.name || 'Player 2',
          race: screpResult.players[1]?.race || 'Protoss',
          apm: screpResult.computed.playerAPM[1] || 0,
          eapm: screpResult.computed.playerEAPM[1] || 0,
          buildOrder: this.convertBuildOrder(screpResult.computed.buildOrders[1] || []),
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        
        // Legacy Felder für Kompatibilität
        playerName: screpResult.players[0]?.name || 'Player 1',
        opponentName: screpResult.players[1]?.name || 'Player 2',
        playerRace: screpResult.players[0]?.race || 'Terran',
        opponentRace: screpResult.players[1]?.race || 'Protoss',
        apm: screpResult.computed.playerAPM[0] || 0,
        eapm: screpResult.computed.playerEAPM[0] || 0,
        opponentApm: screpResult.computed.playerAPM[1] || 0,
        opponentEapm: screpResult.computed.playerEAPM[1] || 0,
        buildOrder: this.convertBuildOrder(screpResult.computed.buildOrders[0] || []),
        strengths: [],
        weaknesses: [],
        recommendations: [],
        trainingPlan: []
      };

      console.log('[NativeReplayParser] === FINALE KORREKTE DATEN ===');
      console.log('[NativeReplayParser] Spieler 1:', result.primaryPlayer.name, 'APM:', result.primaryPlayer.apm);
      console.log('[NativeReplayParser] Spieler 2:', result.secondaryPlayer.name, 'APM:', result.secondaryPlayer.apm);
      
      return result;
      
    } catch (error) {
      console.error('[NativeReplayParser] Screp-js parsing failed:', error);
      throw new Error(`Replay parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static convertBuildOrder(buildOrder: Array<{frame: number; timestamp: string; action: string; supply?: number}>) {
    return buildOrder.map(item => ({
      time: item.timestamp,
      supply: item.supply || 0,
      action: item.action
    }));
  }

  private static determineMatchup(races: string[]): string {
    if (races.length >= 2) {
      const race1 = races[0]?.charAt(0).toUpperCase() || 'T';
      const race2 = races[1]?.charAt(0).toUpperCase() || 'P';
      return `${race1}v${race2}`;
    }
    return 'TvP';
  }
}

// Export der Haupt-Parsing-Funktion - EINFACH und DIREKT
export async function parseReplayNative(file: File): Promise<ParsedReplayData> {
  console.log('[parseReplayNative] === DIREKTE screp-js PARSING ===');
  
  // Sofort und direkt NativeReplayParser verwenden
  return await NativeReplayParser.parseReplay(file);
}

// Re-export types
export * from './types';
