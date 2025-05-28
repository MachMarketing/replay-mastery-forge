
/**
 * Enhanced StarCraft: Brood War Remastered replay parser
 * Now uses real screp-js integration with robust fallbacks
 */

import { ParsedReplayData } from '../replayParser/types';
import { parseBWRemasteredReplay } from './bwRemastered';
import { ensureBufferPolyfills } from './bufferUtils';

export class NativeReplayParser {
  /**
   * Parse a StarCraft: Brood War Remastered replay file
   */
  static async parseReplay(file: File): Promise<ParsedReplayData> {
    console.log('[NativeReplayParser] Starting enhanced parse with real screp-js integration');
    
    // Ensure buffer polyfills are available for screp-js
    const hasPolyfills = ensureBufferPolyfills();
    console.log('[NativeReplayParser] Buffer polyfills available:', hasPolyfills);
    
    try {
      // Use the enhanced BW Remastered parser with real screp-js integration
      const result = await parseBWRemasteredReplay(file);
      console.log('[NativeReplayParser] Enhanced parsing successful');
      return result;
      
    } catch (error) {
      console.error('[NativeReplayParser] All parsing methods failed:', error);
      throw new Error(this.getHelpfulErrorMessage(error));
    }
  }

  /**
   * Generate helpful error messages based on the type of error
   */
  private static getHelpfulErrorMessage(error: unknown): string {
    const baseMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    if (baseMessage.includes('screp')) {
      return 'Die Replay-Datei konnte nicht mit screp-js geparst werden. Stelle sicher, dass es sich um eine gültige StarCraft: Brood War .rep-Datei handelt.';
    }
    
    if (baseMessage.includes('Buffer')) {
      return 'Browser-Kompatibilitätsproblem beim Parsing. Versuche es mit einer anderen .rep-Datei oder einem anderen Browser.';
    }
    
    if (baseMessage.includes('magic')) {
      return 'Die Replay-Datei hat ein unbekanntes Format. Stelle sicher, dass es sich um eine gültige StarCraft: Brood War .rep-Datei handelt.';
    }
    
    if (baseMessage.includes('Decompression')) {
      return 'Die Replay-Datei konnte nicht dekomprimiert werden. Möglicherweise ist die Datei beschädigt oder verwendet ein nicht unterstütztes Komprimierungsformat.';
    }
    
    if (baseMessage.includes('parsing failed')) {
      return 'Replay-Parsing fehlgeschlagen. Die Datei könnte beschädigt sein oder ein nicht unterstütztes Format haben.';
    }
    
    return `Replay-Parsing fehlgeschlagen: ${baseMessage}. Versuche es mit einer anderen .rep-Datei.`;
  }
}

// Export the main parsing function
export async function parseReplayNative(file: File): Promise<ParsedReplayData> {
  return NativeReplayParser.parseReplay(file);
}

// Re-export types
export * from './types';
