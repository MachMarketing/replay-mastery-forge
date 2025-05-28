
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
    console.log('[BWRemastered] Map:', result.map);
    console.log('[BWRemastered] Player names:', result.primaryPlayer.name, 'vs', result.secondaryPlayer.name);
    console.log('[BWRemastered] APM values:', result.primaryPlayer.apm, result.secondaryPlayer.apm);
    console.log('[BWRemastered] EAPM values:', result.primaryPlayer.eapm, result.secondaryPlayer.eapm);
    console.log('[BWRemastered] Build order length:', result.buildOrder.length);
    console.log('[BWRemastered] Duration:', result.duration);
    
    return result;
    
  } catch (error) {
    console.error('[BWRemastered] Native parsing failed:', error);
    throw new Error(`Enhanced native parsing failed: ${(error as Error).message}`);
  }
}
