
// Service for parsing StarCraft: Brood War replay files using browser-based parsing

import { parseReplayInBrowser } from './browserReplayParser';

export interface ParsedReplayResult {
  playerName: string;
  opponentName: string;
  playerRace: 'Terran' | 'Protoss' | 'Zerg';
  opponentRace: 'Terran' | 'Protoss' | 'Zerg';
  map: string;
  duration: string;
  date: string;
  result: 'win' | 'loss';
  apm: number;
  eapm?: number;
  matchup: string;
  buildOrder: { time: string; supply: number; action: string }[];
  resourcesGraph?: { time: string; minerals: number; gas: number }[];
}

/**
 * Parse a StarCraft: Brood War replay file using browser-based parsing
 * @param file The replay file to parse
 * @returns The parsed replay data
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
  console.log('Parsing replay file in browser:', file.name);
  
  try {
    // Use the browser-based parser instead of the Go server
    const parsedData = await parseReplayInBrowser(file);
    console.log('Parsed replay data:', parsedData);
    return parsedData;
    
  } catch (error) {
    console.error('Error during replay parsing:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}
