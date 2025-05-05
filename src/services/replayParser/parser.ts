/**
 * This file serves as a compatibility layer for older references to the parser.
 * The actual parsing is now handled by the browser-based JSSUH parser.
 */
import type { ParsedReplayData } from './types';
import { transformJSSUHData } from './transformer';

// We're keeping these exports for backward compatibility
export { transformJSSUHData };
export type { ParsedReplayData };

// Export constants for backwards compatibility
export const DEFAULT_SCREP_API_URL = 'https://api.replayanalyzer.com/parse';

// This function is kept for backwards compatibility
// but now we use JSSUH directly in replayParserService.ts
export async function parseReplayFile(file: File): Promise<ParsedReplayData | null> {
  console.warn('Using the browser-based JSSUH parser instead of SCREP. This function is deprecated.');
  return null;
}
