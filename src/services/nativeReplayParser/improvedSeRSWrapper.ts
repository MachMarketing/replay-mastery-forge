
/**
 * Improved seRS replay wrapper with robust decompression
 */

import { SeRSDecompressor } from './seRSDecompressor';
import { FocusedReplayParser } from './focusedReplayParser';
import { ParsedReplayData } from '../replayParser/types';

export class ImprovedSeRSWrapper {
  static async parseReplay(file: File): Promise<ParsedReplayData> {
    console.log('[ImprovedSeRSWrapper] ===== STARTING IMPROVED seRS PARSING =====');
    console.log('[ImprovedSeRSWrapper] File:', file.name, 'Size:', file.size);

    try {
      // Load file data
      const arrayBuffer = await file.arrayBuffer();
      console.log('[ImprovedSeRSWrapper] Buffer loaded, size:', arrayBuffer.byteLength);

      // Step 1: Decompress seRS data
      const decompressor = new SeRSDecompressor(arrayBuffer);
      const decompressionResult = decompressor.decompress();

      if (!decompressionResult.success) {
        throw new Error(`seRS decompression failed: ${decompressionResult.error}`);
      }

      console.log('[ImprovedSeRSWrapper] ===== DECOMPRESSION SUCCESSFUL =====');
      console.log('[ImprovedSeRSWrapper] Method used:', decompressionResult.method);
      console.log('[ImprovedSeRSWrapper] Decompressed size:', decompressionResult.data!.length);

      // Step 2: Parse decompressed data
      const parser = new FocusedReplayParser(decompressionResult.data!);
      const parseResult = parser.parse();

      console.log('[ImprovedSeRSWrapper] ===== PARSING SUCCESSFUL =====');
      console.log('[ImprovedSeRSWrapper] Map:', parseResult.map);
      console.log('[ImprovedSeRSWrapper] Players:', parseResult.players.map(p => p.name));
      console.log('[ImprovedSeRSWrapper] Commands:', parseResult.commands);
      console.log('[ImprovedSeRSWrapper] APM:', parseResult.apm.slice(0, parseResult.players.length));

      // Step 3: Convert to ParsedReplayData format
      const result: ParsedReplayData = {
        map: parseResult.map,
        matchup: this.determineMatchup(parseResult.players),
        duration: parseResult.duration,
        durationMS: parseResult.frameCount * (1000 / 24),
        date: new Date().toISOString().split('T')[0],
        result: 'unknown',
        primaryPlayer: {
          name: parseResult.players[0]?.name || 'Player 1',
          race: parseResult.players[0]?.race || 'Terran',
          apm: parseResult.apm[0] || 0,
          eapm: parseResult.eapm[0] || 0,
          buildOrder: parseResult.buildOrders[0] || []
        },
        secondaryPlayer: {
          name: parseResult.players[1]?.name || 'Player 2',
          race: parseResult.players[1]?.race || 'Protoss',
          apm: parseResult.apm[1] || 0,
          eapm: parseResult.eapm[1] || 0,
          buildOrder: parseResult.buildOrders[1] || []
        }
      };

      console.log('[ImprovedSeRSWrapper] ===== FINAL RESULT =====');
      console.log('[ImprovedSeRSWrapper] Primary APM:', result.primaryPlayer.apm);
      console.log('[ImprovedSeRSWrapper] Secondary APM:', result.secondaryPlayer.apm);
      console.log('[ImprovedSeRSWrapper] Build order lengths:', [
        result.primaryPlayer.buildOrder.length,
        result.secondaryPlayer.buildOrder.length
      ]);

      return result;

    } catch (error) {
      console.error('[ImprovedSeRSWrapper] Parsing failed:', error);
      throw new Error(`Improved seRS parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static determineMatchup(players: Array<{ race: string }>): string {
    if (players.length >= 2) {
      const race1 = players[0].race.charAt(0).toUpperCase();
      const race2 = players[1].race.charAt(0).toUpperCase();
      return `${race1}v${race2}`;
    }
    return 'Unknown';
  }
}
