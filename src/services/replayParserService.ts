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
  
  try {
    // Additional validation before parsing
    if (!file || file.size === 0) {
      throw new Error('Ungültige oder leere Datei');
    }
    
    if (file.size < 1024) {
      throw new Error('Die Datei ist zu klein, um eine gültige Replay-Datei zu sein');
    }
    
    if (file.size > 5000000) {
      throw new Error('Die Datei ist zu groß. Die maximale Größe beträgt 5MB');
    }
    
    // Set a timeout for the entire parsing operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Zeitüberschreitung beim Parsen')), 15000);
    });
    
    // Parse using the browser WASM parser with timeout
    const parsePromise = parseReplayInBrowser(file);
    const result = await Promise.race([parsePromise, timeoutPromise]);
    
    return result;
  } catch (error) {
    console.error('[replayParserService] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('len out of range') || 
        errorMessage.includes('makeslice') ||
        errorMessage.includes('runtime error')) {
      console.warn('[replayParserService] WASM error detected, using fallback');
      
      // Return minimal fallback data
      const filename = file.name.replace('.rep', '').replace(/_/g, ' ');
      return {
        playerName: filename || 'Player',
        opponentName: 'Opponent',
        playerRace: 'Terran',
        opponentRace: 'Protoss',
        map: 'Error: Corrupted Replay File',
        matchup: 'TvP',
        duration: '10:00',
        durationMS: 600000,
        date: new Date().toISOString().split('T')[0],
        result: 'win',
        apm: 120,
        eapm: 90,
        buildOrder: [],
        resourcesGraph: [],
        strengths: ['Konnte die Datei nicht analysieren'],
        weaknesses: ['Die Datei scheint beschädigt zu sein'],
        recommendations: ['Bitte lade eine andere Replay-Datei hoch']
      };
    }
    
    throw error;
  }
}
