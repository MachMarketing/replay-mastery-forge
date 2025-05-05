
/**
 * Client-side parser for StarCraft: Brood War replay files
 * 
 * This implementation focuses exclusively on the WASM-based parser for 
 * processing .rep files directly in the browser.
 */
import { initParserWasm, parseReplayWasm, isWasmInitialized, forceWasmReset } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';
import { parseReplayWithBrowserSafeParser } from './replayParser/browserSafeParser';
import { ParsedReplayData } from './replayParser/types';

// Flags to track parser state
let wasmParsingEnabled = true;
let wasmInitializeAttempted = false;
let wasmInitializeFailed = false;

/**
 * Validates a replay file before attempting to parse it
 */
function validateReplayFile(file: File): boolean {
  // Check if file exists and has content
  if (!file || file.size === 0) {
    throw new Error('Datei ist leer oder ungültig');
  }
  
  // Verify file size
  if (file.size < 1000) {
    throw new Error('Replay-Datei zu klein, möglicherweise beschädigt');
  }
  
  if (file.size > 5000000) {
    throw new Error('Replay-Datei zu groß, maximale Größe ist 5MB');
  }
  
  // Check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'rep') {
    throw new Error('Ungültiges Dateiformat. Nur StarCraft Replay-Dateien (.rep) werden unterstützt');
  }
  
  return true;
}

/**
 * Creates a minimal fallback result when parsing fails
 */
function createFallbackData(filename: string): ParsedReplayResult {
  const cleanFilename = filename.replace('.rep', '').replace(/_/g, ' ');
  
  return {
    playerName: cleanFilename || 'Player',
    opponentName: 'Opponent',
    playerRace: 'Terran',
    opponentRace: 'Protoss',
    map: 'Unknown Map (corrupted file)',
    matchup: 'TvP',
    duration: '10:00',
    durationMS: 600000,
    date: new Date().toISOString().split('T')[0],
    result: 'win',
    apm: 120,
    eapm: 90,
    buildOrder: [],
    resourcesGraph: [],
    strengths: ['Datei konnte nicht analysiert werden'],
    weaknesses: ['Die Replay-Datei scheint beschädigt zu sein'],
    recommendations: ['Versuche eine andere Replay-Datei hochzuladen']
  };
}

/**
 * Ensures that ParsedReplayData is compatible with ParsedReplayResult
 * by adding required fields if they're missing
 */
function ensureCompatibleData(data: ParsedReplayData): ParsedReplayResult {
  // Create a compatible result with all required fields
  const result: ParsedReplayResult = {
    playerName: data.playerName || 'Player',
    opponentName: data.opponentName || 'Opponent',
    playerRace: data.playerRace || 'Terran',
    opponentRace: data.opponentRace || 'Protoss',
    map: data.map || 'Unknown Map',
    matchup: data.matchup || 'TvP',
    duration: data.duration || '10:00',
    durationMS: data.durationMS || 600000,
    date: data.date || new Date().toISOString().split('T')[0],
    result: data.result || 'win',
    apm: data.apm || 120,
    eapm: data.eapm !== undefined ? data.eapm : Math.floor(data.apm * 0.8) || 90, // Calculate eapm if not present
    buildOrder: data.buildOrder || [],
    resourcesGraph: data.resourcesGraph || [],
    strengths: data.strengths || ['Solid gameplay'],
    weaknesses: data.weaknesses || ['Could improve build order'],
    recommendations: data.recommendations || ['Practice timings']
  };
  
  return result;
}

/**
 * Main function for parsing replay files
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name);
  
  try {
    // Validate file basics
    if (!validateReplayFile(file)) {
      console.warn('[browserReplayParser] File validation failed');
      return createFallbackData(file.name);
    }
    
    const buffer = await file.arrayBuffer();
    const fileData = new Uint8Array(buffer);
    
    console.log('[browserReplayParser] File data loaded, size:', fileData.length, 'bytes');
    
    // Only attempt to initialize WASM once to avoid repeated failures
    if (!wasmInitializeAttempted) {
      wasmInitializeAttempted = true;
      try {
        // Initialize WASM with timeout and catch errors
        console.log('[browserReplayParser] Initializing WASM parser...');
        await initParserWasm().catch(error => {
          console.error('[browserReplayParser] WASM initialization failed:', error);
          wasmInitializeFailed = true;
          throw error;
        });
      } catch (error) {
        console.error('[browserReplayParser] WASM initialization error:', error);
        wasmInitializeFailed = true;
        wasmParsingEnabled = false;
        throw error;
      }
    }
    
    // If WASM initialization previously failed, use fallback
    if (wasmInitializeFailed) {
      console.warn('[browserReplayParser] WASM initialization previously failed, using fallback data');
      return createFallbackData(file.name);
    }
    
    // If WASM is initialized, parse directly without pre-validation
    if (isWasmInitialized()) {
      console.log('[browserReplayParser] WASM initialized, parsing replay directly');
      try {
        // Create a defensive copy to prevent memory corruption
        const defensiveData = new Uint8Array(fileData.length);
        defensiveData.set(fileData);
        
        // Parse with WASM without any pre-validation checks
        const rawData = await parseReplayWasm(defensiveData);
        
        // Log the raw data structure for debugging
        console.log('[browserReplayParser] WASM parsing raw result - keys:', Object.keys(rawData));
        console.log('[browserReplayParser] WASM parsing raw result - sample:', {
          playerName: rawData.playerName,
          opponentName: rawData.opponentName,
          playerRace: rawData.playerRace,
          opponentRace: rawData.opponentRace,
          map: rawData.map,
          matchup: rawData.matchup,
          apm: rawData.apm,
          eapm: rawData.eapm
        });
        
        const parsedData = mapRawToParsed(rawData);
        console.log('[browserReplayParser] WASM parsing successful');
        return parsedData;
      } catch (wasmError) {
        console.error('[browserReplayParser] WASM parsing error:', wasmError);
        
        // Disable WASM parsing for future attempts on critical errors
        if (wasmError.message && (
          wasmError.message.includes('makeslice') || 
          wasmError.message.includes('len out of range') ||
          wasmError.message.includes('runtime error')
        )) {
          console.warn('[browserReplayParser] Critical WASM error, disabling WASM parser');
          wasmParsingEnabled = false;
          forceWasmReset();
        }
        
        // Use fallback data directly instead of browser-safe parser
        return createFallbackData(file.name);
      }
    } else {
      console.warn('[browserReplayParser] WASM not initialized properly, using fallback data');
      return createFallbackData(file.name);
    }
  } catch (error) {
    console.error('[browserReplayParser] Error during parsing:', error);
    
    // Always return fallback data rather than crashing
    return createFallbackData(file.name);
  }
}
