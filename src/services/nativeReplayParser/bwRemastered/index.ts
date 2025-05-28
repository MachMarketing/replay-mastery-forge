
/**
 * Enhanced StarCraft: Brood War Remastered parser with native parsing
 */

import { ParsedReplayData } from '../../replayParser/types';
import { NativeParserWrapper } from '../nativeParserWrapper';

/**
 * Parse a StarCraft: Brood War Remastered replay file using native JavaScript parser
 */
export async function parseBWRemasteredReplay(file: File): Promise<ParsedReplayData> {
  console.log('[BWRemastered] Starting enhanced native parsing...');
  console.log('[BWRemastered] File:', file.name, 'Size:', (file.size / 1024).toFixed(2), 'KB');
  
  try {
    // Use the native parser wrapper
    const result = await NativeParserWrapper.parseReplay(file);
    
    console.log('[BWRemastered] Native parsing successful!');
    console.log('[BWRemastered] Map:', result.mapName);
    console.log('[BWRemastered] Players:', result.players.map(p => p.name));
    console.log('[BWRemastered] APM values:', result.players.map(p => p.apm));
    console.log('[BWRemastered] EAPM values:', result.players.map(p => p.eapm));
    console.log('[BWRemastered] Total actions:', result.gameEvents.length);
    console.log('[BWRemastered] Duration:', result.gameDuration);
    
    return result;
    
  } catch (error) {
    console.error('[BWRemastered] Native parsing failed:', error);
    throw new Error(`Enhanced native parsing failed: ${(error as Error).message}`);
  }
}
