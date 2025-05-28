/**
 * Enhanced StarCraft: Brood War Remastered replay parser
 * Now uses real screp-js integration with robust fallbacks
 */

import { ParsedReplayData } from '../replayParser/types';
import { parseBWRemasteredReplay } from './bwRemastered';
import { ensureBufferPolyfills } from './bufferUtils';
import { ImprovedSeRSWrapper } from './improvedSeRSWrapper';

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
  console.log('[nativeReplayParser] Starting enhanced native parsing...');
  console.log('[nativeReplayParser] File:', file.name, 'Size:', file.size);
  
  try {
    // Check if it's a seRS file first
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    // Check for seRS magic at offset 12
    if (data.length >= 16) {
      const magic = String.fromCharCode(...data.slice(12, 16));
      if (magic === 'seRS') {
        console.log('[nativeReplayParser] seRS format detected, using improved parser');
        
        // Create a new File object from the buffer for the improved parser
        const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
        const seRSFile = new File([blob], file.name, { type: file.type });
        
        return await ImprovedSeRSWrapper.parseReplay(seRSFile);
      }
    }
    
    console.log('[nativeReplayParser] Not seRS format, falling back to legacy parser');
    
    // Fallback to existing parsers
    try {
      return await parseBWRemasteredReplay(file);
    } catch (error) {
      console.error('[nativeReplayParser] All parsers failed:', error);
      throw new Error(`Replay parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('[nativeReplayParser] Native parsing failed:', error);
    throw new Error(`Native parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Re-export types
export * from './types';
