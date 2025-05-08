import { ParsedReplayData, PlayerData, ReplayAnalysis } from './replayParser/types';
import { parseReplayInBrowser } from './browserReplayParser';
import { markBrowserAsHavingWasmIssues } from '@/utils/browserDetection';

// Re-export PlayerData interface properly
export type { PlayerData, ParsedReplayData, ReplayAnalysis };

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

export interface AnalyzedReplayResult extends ParsedReplayResult, ReplayAnalysis {
  // All properties are now inherited from ParsedReplayResult and ReplayAnalysis
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
      
      console.log('[replayParserService] Got parsed result:', {
        primaryPlayer: result.primaryPlayer ? 
          `${result.primaryPlayer.name} (${result.primaryPlayer.race})` : 'Missing',
        secondaryPlayer: result.secondaryPlayer ? 
          `${result.secondaryPlayer.name} (${result.secondaryPlayer.race})` : 'Missing',
        primaryBuildOrderItems: result.primaryPlayer?.buildOrder?.length || 0,
        secondaryBuildOrderItems: result.secondaryPlayer?.buildOrder?.length || 0,
        matchup: result.matchup || 'Unknown matchup'
      });
      
      // Fix matchup if needed based on actual player races
      if (result.primaryPlayer && result.secondaryPlayer && 
          result.primaryPlayer.race && result.secondaryPlayer.race) {
        // Create matchup from first letter of each race
        const p1Race = result.primaryPlayer.race.charAt(0).toUpperCase();
        const p2Race = result.secondaryPlayer.race.charAt(0).toUpperCase();
        result.matchup = `${p1Race}v${p2Race}`;
        console.log('[replayParserService] Fixed matchup to:', result.matchup);
      }
      
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
