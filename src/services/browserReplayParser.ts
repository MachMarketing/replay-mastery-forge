
import { ParsedReplayData } from './replayParser/types';
import { parseReplay } from './replayParser';

export async function parseReplayInBrowser(file: File): Promise<ParsedReplayData> {
  // Browser-specific implementation that uses the main parser
  console.log('[browserReplayParser] Starting browser-based parsing');
  
  try {
    const result = await parseReplay(file);
    console.log('[browserReplayParser] Parse complete');
    return result;
  } catch (error) {
    console.error('[browserReplayParser] Error:', error);
    throw error;
  }
}
