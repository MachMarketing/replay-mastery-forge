
import { ParsedReplayData } from './replayParser/types';
import { parseReplayInBrowser } from './browserReplayParser';
import { mapRawToParsed } from './replayMapper';

export interface ParsedReplayResult {
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
  map: string;
  matchup: string;
  duration: string;
  durationMS: number; // This field is required
  date: string;
  result: 'win' | 'loss';
  apm: number;
  eapm: number;
  buildOrder: Array<{ time: string; supply: number; action: string }>;
  resourcesGraph?: Array<{ time: string; minerals: number; gas: number }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan?: Array<{ day: number; focus: string; drill: string }>;
}

export interface AnalyzedReplayResult extends ParsedReplayResult {
  // All properties are now inherited from ParsedReplayResult
}

/**
 * Initialize the replay parser
 */
export async function initParser(): Promise<void> {
  console.log('[replayParserService] Initializing parser');
  try {
    // browserReplayParser initializes itself when needed
    console.log('[replayParserService] Parser initialized successfully');
  } catch (error) {
    console.error('[replayParserService] Failed to initialize parser:', error);
    throw new Error('Failed to initialize parser');
  }
}

/**
 * Parse a replay file and return the parsed data
 * Now uses parseReplayInBrowser consistently across the application
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('[replayParserService] Starting to parse replay file using unified browser parser');
  
  try {
    // Parse using the browser parser
    const parsedRaw = await parseReplayInBrowser(file);
    
    if (!parsedRaw) {
      throw new Error('Failed to parse replay file');
    }
    
    console.log('[replayParserService] Raw parsed data:', parsedRaw);
    
    // No need to map again as browserReplayParser already uses mapRawToParsed
    // Just return the analyzed data
    const analyzedData: AnalyzedReplayResult = {
      ...parsedRaw
    };
    
    return analyzedData;
  } catch (error) {
    console.error('[replayParserService] Error parsing replay:', error);
    throw error;
  }
}
