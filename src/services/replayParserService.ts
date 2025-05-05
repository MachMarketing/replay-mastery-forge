
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
    
    // Additional file validation
    if (!file || file.size === 0) {
      throw new Error('Ungültige oder leere Datei');
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'rep') {
      throw new Error('Ungültiges Dateiformat. Nur .rep Dateien werden unterstützt.');
    }
    
    // Check file size limits
    if (file.size < 1000) {
      throw new Error('Die Datei ist zu klein, um eine gültige Replay-Datei zu sein.');
    }
    
    if (file.size > 5000000) {
      throw new Error('Die Datei ist zu groß. Die maximale Größe beträgt 5MB.');
    }
    
    // Set a timeout to abort very long parsing operations
    const timeoutId = setTimeout(() => {
      if (activeParsingAbortController) {
        console.log('[replayParserService] Parsing timeout reached, aborting');
        activeParsingAbortController.abort();
      }
    }, 25000); // 25 second timeout
    
    try {
      // Check replay file signature (if possible)
      try {
        const buffer = await file.arrayBuffer();
        const signature = new Uint8Array(buffer, 0, 4);
        const signatureStr = String.fromCharCode(...signature);
        
        // StarCraft replays typically start with "(B)w" or "(B)W"
        if (signatureStr !== "(B)w" && signatureStr !== "(B)W") {
          console.warn("[replayParserService] Suspicious replay file signature:", signatureStr);
          // Continue anyway, but log the warning
        }
      } catch (signatureError) {
        console.warn("[replayParserService] Failed to check file signature:", signatureError);
        // Continue anyway
      }
      
      // Parse using the browser WASM parser
      const parsedData = await parseReplayInBrowser(file);
      
      // Clear the timeout since parsing completed
      clearTimeout(timeoutId);
      
      if (!parsedData) {
        throw new Error('Failed to parse replay file');
      }
      
      console.log('[replayParserService] Raw parsed data:', parsedData);
      
      // Clear the abort controller since we're done
      activeParsingAbortController = null;
      
      // Return the analyzed data directly
      return parsedData;
    } catch (error) {
      // Clear the timeout in case of error
      clearTimeout(timeoutId);
      
      // Handle specific WASM errors with fallback minimal data
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
        console.warn('[replayParserService] Providing fallback minimal data for corrupted file');
        
        // Generate a more meaningful fallback with the filename at least
        const filename = file.name.replace('.rep', '').replace(/_/g, ' ');
        
        // Return minimal fallback data instead of throwing
        return {
          playerName: filename || 'Player',
          opponentName: 'Opponent',
          playerRace: 'Terran',
          opponentRace: 'Zerg',
          map: 'Unknown Map (corrupted file)',
          matchup: 'TvZ',
          duration: '10:00',
          durationMS: 600000,
          date: new Date().toISOString().split('T')[0],
          result: 'win',
          apm: 120,
          eapm: 90,
          buildOrder: [],
          resourcesGraph: [],
          strengths: ['Datei konnte nicht analysiert werden'],
          weaknesses: ['Beschädigte Replay-Datei'],
          recommendations: ['Bitte lade eine andere Replay-Datei hoch, diese ist beschädigt oder in einem nicht unterstützten Format.']
        };
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[replayParserService] Error parsing replay:', error);
    
    // Clear the abort controller in case of error
    activeParsingAbortController = null;
    
    // Provide a more user-friendly error message for the specific WASM slice error
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
      console.error('[replayParserService] WASM makeslice error:', errorMessage);
      
      // Generate a more meaningful fallback with the filename at least
      const filename = file.name.replace('.rep', '').replace(/_/g, ' ');
      
      // Instead of throwing, return fallback data
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
    
    // For other errors, throw as normal
    throw new Error(`Fehler beim Parsen: ${errorMessage}`);
  }
}
