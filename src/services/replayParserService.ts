import { ParsedReplayData, PlayerData } from './replayParser/types';
import { parseReplayInBrowser } from './browserReplayParser';
import { markBrowserAsHavingWasmIssues } from '@/utils/browserDetection';

// Re-export PlayerData interface properly
export type { PlayerData, ParsedReplayData };

// This interface ensures backward compatibility with existing code
// by making optional fields in ParsedReplayData required here
export interface ParsedReplayResult extends ParsedReplayData {
  // Ensure all legacy fields have proper typing and are required (not optional)
  playerName: string;  // Aliased from primaryPlayer.name
  opponentName: string; // Aliased from secondaryPlayer.name
  playerRace: string;  // Aliased from primaryPlayer.race
  opponentRace: string; // Aliased from secondaryPlayer.race
  apm: number;         // Aliased from primaryPlayer.apm
  eapm: number;        // Aliased from primaryPlayer.eapm
  opponentApm: number; // Aliased from secondaryPlayer.apm
  opponentEapm: number; // Aliased from secondaryPlayer.eapm
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
 * Initialize the replay parser - now just initializes the browser parser
 */
export async function initParser(): Promise<void> {
  console.log('[replayParserService] Initializing screparsed parser');
  // Nothing to initialize, as browserReplayParser handles this internally
}

/**
 * Creates fallback data when parsing completely fails
 */
function createEmergencyFallbackData(file: File): AnalyzedReplayResult {
  const filename = file.name.replace('.rep', '').replace(/_/g, ' ');
  
  // Create primary player data
  const primaryPlayer: PlayerData = {
    name: filename || 'Player',
    race: 'Terran',
    apm: 120,
    eapm: 90
  };
  
  // Create secondary player data
  const secondaryPlayer: PlayerData = {
    name: 'Opponent',
    race: 'Protoss',
    apm: 110,
    eapm: 85
  };
  
  return {
    primaryPlayer,
    secondaryPlayer,
    // Legacy fields for backwards compatibility
    playerName: primaryPlayer.name,
    opponentName: secondaryPlayer.name,
    playerRace: primaryPlayer.race,
    opponentRace: secondaryPlayer.race,
    apm: primaryPlayer.apm,
    eapm: primaryPlayer.eapm,
    opponentApm: secondaryPlayer.apm,
    opponentEapm: secondaryPlayer.eapm,
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
 * Now exclusively uses screparsed through our browserReplayParser
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('[replayParserService] Starting to parse replay file with screparsed');
  
  try {
    // Additional validation before parsing
    if (!validateReplayFile(file)) {
      throw new Error('Ungültige oder fehlerhafte Datei');
    }
    
    // Create abort controller for this parsing operation
    activeParsingAbortController = new AbortController();
    
    // Set a timeout for the entire parsing operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Zeitüberschreitung beim Parsen'));
        activeParsingAbortController = null;
      }, 60000); // 60 seconds timeout
      
      // Clean up timeout if aborted
      activeParsingAbortController?.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
      });
    });
    
    // Parse using our screparsed-based browser parser
    const parsePromise = parseReplayInBrowser(file);
    
    let result: ParsedReplayData;
    try {
      result = await Promise.race([parsePromise, timeoutPromise]);
      
      // Ensure backward compatibility by creating legacy field mappings
      const enhancedResult: AnalyzedReplayResult = {
        ...result,
        playerName: result.primaryPlayer?.name || 'Player',
        opponentName: result.secondaryPlayer?.name || 'Opponent',
        playerRace: result.primaryPlayer?.race || 'Terran',
        opponentRace: result.secondaryPlayer?.race || 'Terran',
        apm: result.primaryPlayer?.apm || 0,
        eapm: result.primaryPlayer?.eapm || 0,
        opponentApm: result.secondaryPlayer?.apm || 0,
        opponentEapm: result.secondaryPlayer?.eapm || 0,
      };
      
      return enhancedResult;
    } catch (error) {
      console.error('[replayParserService] Parsing error:', error);
      
      // Check for known WASM errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Only mark browser as having issues if it's actually a WASM error
      if (errorMessage.includes('makeslice') || 
          errorMessage.includes('runtime error')) {
        console.warn('[replayParserService] WASM error detected, marking browser as having issues');
        markBrowserAsHavingWasmIssues();
      }
      
      throw error;
    } finally {
      activeParsingAbortController = null;
    }
  } catch (error) {
    console.error('[replayParserService] Error:', error);
    throw error;
  }
}
