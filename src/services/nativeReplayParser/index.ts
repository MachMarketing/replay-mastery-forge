/**
 * Enhanced StarCraft: Brood War Remastered replay parser
 * Now uses screp-js as primary parsing method
 */

import { ParsedReplayData } from '../replayParser/types';
import { parseBWRemasteredReplay } from './bwRemastered';

export class NativeReplayParser {
  /**
   * Parse a StarCraft: Brood War Remastered replay file
   */
  static async parseReplay(file: File): Promise<ParsedReplayData> {
    console.log('[NativeReplayParser] Starting enhanced parse with screp-js integration');
    
    try {
      // Use the enhanced BW Remastered parser with screp-js integration
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
    
    if (baseMessage.includes('magic')) {
      return 'Die Replay-Datei hat ein unbekanntes Format. Stelle sicher, dass es sich um eine gültige StarCraft: Brood War .rep-Datei handelt.';
    }
    
    if (baseMessage.includes('Decompression')) {
      return 'Die Replay-Datei konnte nicht dekomprimiert werden. Möglicherweise ist die Datei beschädigt oder verwendet ein nicht unterstütztes Komprimierungsformat.';
    }
    
    return `Replay-Parsing fehlgeschlagen: ${baseMessage}. Versuche es mit einer anderen .rep-Datei.`;
  }

  /**
   * Format duration in seconds to MM:SS
   */
  private static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Export the main parsing function
export async function parseReplayNative(file: File): Promise<ParsedReplayData> {
  return NativeReplayParser.parseReplay(file);
}

// Re-export types
export * from './types';
