
import { ParsedReplayData } from './replayParser/types';
import { parseReplayInBrowser } from './browserReplayParser';

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

// Track active parsing process for potential abort
let activeParsingAbortController: AbortController | null = null;

/**
 * Aborts any active parsing process
 */
export function abortActiveProcess(): void {
  if (activeParsingAbortController) {
    console.log('[replayParserService] Aborting active parsing process');
    activeParsingAbortController.abort();
    activeParsingAbortController = null;
  }
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
 * Uses the WASM-based parser via parseReplayInBrowser
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('[replayParserService] Starting to parse replay file using WASM parser');
  
  // Create a new abort controller for this parsing operation
  activeParsingAbortController = new AbortController();
  const signal = activeParsingAbortController.signal;
  
  try {
    // Check if the parsing was aborted
    if (signal.aborted) {
      throw new Error('Parsing was aborted');
    }
    
    // Parse using the browser WASM parser
    const parsedData = await parseReplayInBrowser(file);
    
    if (!parsedData) {
      throw new Error('Failed to parse replay file');
    }
    
    console.log('[replayParserService] Raw parsed data:', parsedData);
    
    // Clear the abort controller since we're done
    activeParsingAbortController = null;
    
    // Return the analyzed data directly
    return parsedData;
  } catch (error) {
    console.error('[replayParserService] Error parsing replay:', error);
    
    // Clear the abort controller in case of error
    activeParsingAbortController = null;
    
    // Provide a more user-friendly error message for the specific WASM slice error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
      throw new Error('Replay-Datei scheint beschädigt zu sein. Der Parser kann die Dateistruktur nicht korrekt lesen.');
    }
    
    throw error;
  }
}
