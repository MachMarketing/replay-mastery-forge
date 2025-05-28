
/**
 * Enhanced seRS replay wrapper with robust decompression and screp integration
 */

import { ScrepCompliantParser } from './screpCompliantParser';
import { ParsedReplayData } from '../replayParser/types';

export class ImprovedSeRSWrapper {
  static async parseReplay(file: File): Promise<ParsedReplayData> {
    console.log('[ImprovedSeRSWrapper] ===== STARTING ENHANCED seRS PARSING =====');
    console.log('[ImprovedSeRSWrapper] File:', file.name, 'Size:', file.size);

    try {
      // Load file data
      const arrayBuffer = await file.arrayBuffer();
      console.log('[ImprovedSeRSWrapper] Buffer loaded, size:', arrayBuffer.byteLength);

      // Use enhanced ScrepCompliantParser
      const parser = new ScrepCompliantParser(arrayBuffer);
      const parseResult = await parser.parseReplay();

      console.log('[ImprovedSeRSWrapper] ===== ENHANCED PARSING SUCCESSFUL =====');
      console.log('[ImprovedSeRSWrapper] Map:', parseResult.header.mapName);
      console.log('[ImprovedSeRSWrapper] Players:', parseResult.header.playerNames);
      console.log('[ImprovedSeRSWrapper] APM values:', parseResult.metrics.apm);
      console.log('[ImprovedSeRSWrapper] EAPM values:', parseResult.metrics.eapm);

      // Convert build orders to correct format
      const convertBuildOrder = (buildOrder: Array<{frame: number; timestamp: string; unitName: string; supply?: number}>) => {
        return buildOrder.map(item => ({
          time: item.timestamp,
          supply: item.supply || 0,
          action: item.unitName
        }));
      };

      // Convert to ParsedReplayData format
      const result: ParsedReplayData = {
        map: parseResult.header.mapName,
        matchup: this.determineMatchup(parseResult.header.playerRaces),
        duration: parseResult.header.duration,
        durationMS: parseResult.header.frameCount * (1000 / 24),
        date: new Date().toISOString().split('T')[0],
        result: 'unknown',
        primaryPlayer: {
          name: parseResult.header.playerNames[0] || 'Player 1',
          race: parseResult.header.playerRaces[0] || 'Terran',
          apm: parseResult.metrics.apm[0] || 0,
          eapm: parseResult.metrics.eapm[0] || 0,
          buildOrder: convertBuildOrder(parseResult.buildOrders[0] || []),
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        secondaryPlayer: {
          name: parseResult.header.playerNames[1] || 'Player 2',
          race: parseResult.header.playerRaces[1] || 'Protoss',
          apm: parseResult.metrics.apm[1] || 0,
          eapm: parseResult.metrics.eapm[1] || 0,
          buildOrder: convertBuildOrder(parseResult.buildOrders[1] || []),
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        // Legacy compatibility
        playerName: parseResult.header.playerNames[0] || 'Player 1',
        opponentName: parseResult.header.playerNames[1] || 'Player 2',
        playerRace: parseResult.header.playerRaces[0] || 'Terran',
        opponentRace: parseResult.header.playerRaces[1] || 'Protoss',
        apm: parseResult.metrics.apm[0] || 0,
        eapm: parseResult.metrics.eapm[0] || 0,
        opponentApm: parseResult.metrics.apm[1] || 0,
        opponentEapm: parseResult.metrics.eapm[1] || 0,
        buildOrder: convertBuildOrder(parseResult.buildOrders[0] || []),
        strengths: [],
        weaknesses: [],
        recommendations: [],
        trainingPlan: []
      };

      console.log('[ImprovedSeRSWrapper] ===== FINAL ENHANCED RESULT =====');
      console.log('[ImprovedSeRSWrapper] Primary Player:', result.primaryPlayer.name, 'APM:', result.primaryPlayer.apm);
      console.log('[ImprovedSeRSWrapper] Secondary Player:', result.secondaryPlayer.name, 'APM:', result.secondaryPlayer.apm);
      console.log('[ImprovedSeRSWrapper] Build Order lengths:', [result.buildOrder.length, result.secondaryPlayer.buildOrder.length]);

      return result;

    } catch (error) {
      console.error('[ImprovedSeRSWrapper] Enhanced parsing failed:', error);
      throw new Error(`Enhanced seRS parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
