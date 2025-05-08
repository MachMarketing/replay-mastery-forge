
import { ParsedReplayData } from './replayParser/types';
import { parseReplayInBrowser } from './browserReplayParser';
import { markBrowserAsHavingWasmIssues } from '@/utils/browserDetection';

export interface PlayerData {
  name: string;
  race: string;
  apm: number;
  eapm: number;
}

export interface ParsedReplayResult {
  // Primary player is the "local player" - the one being analyzed
  primaryPlayer: PlayerData;
  // Secondary player is the "opponent" - the one being compared against
  secondaryPlayer: PlayerData;
  map: string;
  matchup: string;
  duration: string;
  durationMS: number;
  date: string;
  result: 'win' | 'loss';
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
  // Nothing to initialize, as browserReplayParser handles this internally
}

/**
 * Creates fallback data when parsing completely fails
 */
function createEmergencyFallbackData(file: File): AnalyzedReplayResult {
  const filename = file.name.replace('.rep', '').replace(/_/g, ' ');
  
  return {
    primaryPlayer: {
      name: filename || 'Player',
      race: 'Terran',
      apm: 120,
      eapm: 90
    },
    secondaryPlayer: {
      name: 'Opponent',
      race: 'Protoss',
      apm: 110,
      eapm: 85
    },
    map: 'Error: Corrupted Replay File',
    matchup: 'TvP',
    duration: '10:00',
    durationMS: 600000,
    date: new Date().toISOString().split('T')[0],
    result: 'win',
    buildOrder: [],
    resourcesGraph: [],
    strengths: ['Konnte die Datei nicht analysieren'],
    weaknesses: ['Die Datei scheint beschädigt zu sein'],
    recommendations: ['Bitte lade eine andere Replay-Datei hoch']
  };
}

/**
 * Validates a replay file before processing
 */
function validateReplayFile(file: File): boolean {
  if (!file || file.size === 0) {
    throw new Error('Ungültige oder leere Datei');
  }
  
  if (file.size < 1024) {
    throw new Error('Die Datei ist zu klein, um eine gültige Replay-Datei zu sein');
  }
  
  if (file.size > 5000000) {
    throw new Error('Die Datei ist zu groß. Die maximale Größe beträgt 5MB');
  }
  
  // Check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'rep') {
    throw new Error('Ungültiges Dateiformat. Nur StarCraft Replay-Dateien (.rep) werden unterstützt');
  }
  
  return true;
}

/**
 * Parse a replay file and return the parsed data
 * Now uses our unified browser parsing approach
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('[replayParserService] Starting to parse replay file');
  
  try {
    // Additional validation before parsing
    if (!validateReplayFile(file)) {
      throw new Error('Ungültige oder fehlerhafte Datei');
    }
    
    // Create abort controller for this parsing operation
    activeParsingAbortController = new AbortController();
    
    // Set a timeout for the entire parsing operation - erhöht auf 60 Sekunden
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Zeitüberschreitung beim Parsen'));
        activeParsingAbortController = null;
      }, 60000); // Erhöht von 15000 auf 60000 ms
      
      // Clean up timeout if aborted
      activeParsingAbortController?.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
      });
    });
    
    // Parse using our unified browser parsing approach
    const parsePromise = parseReplayInBrowser(file);
    
    let result: AnalyzedReplayResult;
    try {
      result = await Promise.race([parsePromise, timeoutPromise]);
    } catch (error) {
      console.error('[replayParserService] Parsing error:', error);
      
      // Check for known WASM errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('makeslice') || 
          errorMessage.includes('runtime error')) {
        console.warn('[replayParserService] WASM error detected, marking browser as having issues');
        markBrowserAsHavingWasmIssues();
        return createEmergencyFallbackData(file);
      }
      
      throw error;
    } finally {
      activeParsingAbortController = null;
    }
    
    // Validate the parsed result
    if (!result || !result.primaryPlayer || !result.primaryPlayer.name) {
      console.warn('[replayParserService] Invalid result from parser, using fallback');
      return createEmergencyFallbackData(file);
    }
    
    return result;
  } catch (error) {
    console.error('[replayParserService] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // For specific WASM errors, mark as having issues
    if (errorMessage.includes('makeslice') || 
        errorMessage.includes('runtime error')) {
      console.warn('[replayParserService] WASM error detected, marking browser as having issues');
      markBrowserAsHavingWasmIssues();
      
      // Return minimal fallback data
      return createEmergencyFallbackData(file);
    }
    
    throw error;
  }
}
