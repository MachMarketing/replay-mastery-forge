
import type { ParsedReplayData } from './types';
import { transformJSSUHData } from './transformer';

/**
 * Parse a StarCraft: Brood War replay file using jssuh
 * @param file The replay file to parse
 * @returns The parsed replay data
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayData | null> {
  // This function is kept for backwards compatibility
  // but now we use jssuh directly in replayParserService.ts
  console.warn('This parser function is deprecated. Use parseReplayFile from replayParserService.ts instead.');
  return null;
}

// Export constants for backwards compatibility
export const DEFAULT_SCREP_API_URL = 'https://api.replayanalyzer.com/parse';
