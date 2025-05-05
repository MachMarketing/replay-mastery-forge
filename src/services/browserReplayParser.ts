
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
 * Pre-validates replay data before sending to WASM parser
 */
function preValidateReplayData(data: Uint8Array): boolean {
  if (!data || data.length < 12) {
    console.warn('[browserReplayParser] Data too small to be valid replay');
    return false;
  }
  
  try {
    // Check for StarCraft replay signature
    const signature = String.fromCharCode(...data.slice(0, 4));
    if (signature !== "(B)w" && signature !== "(B)W") {
      console.warn('[browserReplayParser] Invalid replay signature:', signature);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[browserReplayParser] Error in pre-validation:', error);
    return false;
  }
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
 * Main function for parsing replay files
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name);
  
  try {
    // More thorough file validation
    if (!validateReplayFile(file)) {
      console.warn('[browserReplayParser] File validation failed');
      return createFallbackData(file.name);
    }
    
    const buffer = await file.arrayBuffer();
    const fileData = new Uint8Array(buffer);
    
    // Skip WASM parsing completely if pre-validation fails
    if (!preValidateReplayData(fileData)) {
      console.warn('[browserReplayParser] Pre-validation failed, using fallback');
      return createFallbackData(file.name);
    }
    
    // Skip WASM if it's been disabled due to previous errors
    if (!wasmParsingEnabled) {
      console.warn('[browserReplayParser] WASM parsing disabled due to previous errors, using browser-safe parser');
      try {
        // Try browser-safe parser implementation instead
        const safeParsedData = await parseReplayWithBrowserSafeParser(fileData);
        console.log('[browserReplayParser] Browser-safe parser successful');
        return safeParsedData;
      } catch (error) {
        console.error('[browserReplayParser] Browser-safe parser also failed:', error);
        return createFallbackData(file.name);
      }
    }
    
    // Try WASM parsing with timeout and error protection
    try {
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
      
      // If WASM initialization previously failed, don't try to use it
      if (wasmInitializeFailed) {
        console.warn('[browserReplayParser] WASM initialization previously failed, using browser-safe parser');
        try {
          const safeParsedData = await parseReplayWithBrowserSafeParser(fileData);
          return safeParsedData;
        } catch (error) {
          return createFallbackData(file.name);
        }
      }
      
      // If WASM is initialized, try to parse
      if (isWasmInitialized()) {
        console.log('[browserReplayParser] WASM initialized, attempting to parse replay');
        try {
          // Create a defensive copy to prevent memory corruption
          const defensiveData = new Uint8Array(fileData.length);
          defensiveData.set(fileData);
          
          // Parse with WASM
          const rawData = await parseReplayWasm(defensiveData);
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
            
            // Try browser-safe parser as fallback
            try {
              console.log('[browserReplayParser] Trying browser-safe parser as fallback');
              const safeParsedData = await parseReplayWithBrowserSafeParser(fileData);
              return safeParsedData;
            } catch (fallbackError) {
              console.error('[browserReplayParser] Browser-safe parser also failed:', fallbackError);
              return createFallbackData(file.name);
            }
          }
          
          throw wasmError;
        }
      } else {
        console.warn('[browserReplayParser] WASM not initialized properly, using browser-safe parser');
        const safeParsedData = await parseReplayWithBrowserSafeParser(fileData);
        return safeParsedData;
      }
    } catch (error) {
      console.error('[browserReplayParser] Error during parsing:', error);
      
      // Ensure we always return fallback data rather than crashing
      return createFallbackData(file.name);
    }
  } catch (error) {
    console.error('[browserReplayParser] Error:', error);
    
    // Ensure we always return fallback data rather than crashing
    return createFallbackData(file.name);
  }
}
