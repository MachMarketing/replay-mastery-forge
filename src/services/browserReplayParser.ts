
/**
 * Client-side parser for StarCraft: Brood War replay files
 * 
 * This implementation focuses exclusively on the WASM-based parser for 
 * processing .rep files directly in the browser.
 */
import { initParserWasm, parseReplayWasm, isWasmInitialized, forceWasmReset } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';

// Flags to track parser state
let wasmInitializeAttempted = false;
let wasmInitializeFailed = false;
let lastErrorTime = 0;
let consecutiveErrorCount = 0;

/**
 * Main function for parsing replay files
 * Uses WASM parser with robust error handling and recovery
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name);
  
  // Reset error count if it's been more than 30 seconds since the last error
  const now = Date.now();
  if (now - lastErrorTime > 30000) {
    consecutiveErrorCount = 0;
  }
  
  try {
    // Validate the input file
    if (!file || file.size === 0) {
      throw new Error('Invalid or empty replay file');
    }
    
    if (file.size < 1000) {
      throw new Error('File too small to be a valid replay');
    }
    
    if (file.size > 5000000) {
      throw new Error('File too large, maximum size is 5MB');
    }
    
    // Load file data
    const buffer = await file.arrayBuffer().catch(error => {
      console.error('[browserReplayParser] Error reading file data:', error);
      throw new Error('Failed to read replay file data');
    });
    
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Failed to read file data');
    }
    
    const fileData = new Uint8Array(buffer);
    
    console.log('[browserReplayParser] File data loaded, size:', fileData.length, 'bytes');
    console.log('[browserReplayParser] First 20 bytes:', Array.from(fileData.slice(0, 20)));
    
    // Initialize WASM parser if needed
    if (!wasmInitializeAttempted || wasmInitializeFailed) {
      wasmInitializeAttempted = true;
      wasmInitializeFailed = false;
      
      try {
        console.log('[browserReplayParser] Initializing WASM parser...');
        await initParserWasm().catch(error => {
          console.error('[browserReplayParser] WASM initialization failed:', error);
          wasmInitializeFailed = true;
          throw error;
        });
      } catch (error) {
        console.error('[browserReplayParser] WASM initialization error:', error);
        wasmInitializeFailed = true;
        throw new Error('WASM parser initialization failed: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
    
    // Multiple attempts for parsing with different strategies
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[browserReplayParser] Parsing attempt ${attempts}/${maxAttempts}`);
      
      // Create a defensive copy for each attempt
      const defensiveData = new Uint8Array(fileData.length);
      defensiveData.set(fileData);
      
      try {
        // Call WASM parser
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
        
        // Success - map and return the data
        const parsedData = mapRawToParsed(rawData);
        console.log('[browserReplayParser] WASM parsing successful on attempt', attempts);
        
        // Reset error tracking on success
        consecutiveErrorCount = 0;
        return parsedData;
      } catch (wasmError) {
        console.error(`[browserReplayParser] WASM parser error on attempt ${attempts}:`, wasmError);
        
        // Special handling for makeslice errors
        if (wasmError.message && wasmError.message.includes('makeslice: len out of range')) {
          console.log('[browserReplayParser] Detected makeslice error, resetting WASM');
          
          // Force reset between attempts
          forceWasmReset();
          wasmInitializeAttempted = false;
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before retry
          
          // Reinitialize WASM parser
          try {
            await initParserWasm();
          } catch (initError) {
            console.error('[browserReplayParser] WASM reinitialization failed:', initError);
            // Continue to next attempt even with initialization failure
          }
          
          // Continue to next attempt
          continue;
        }
        
        // For other errors, if we still have attempts left, try again
        if (attempts < maxAttempts) {
          console.log(`[browserReplayParser] Retrying after error (attempt ${attempts}/${maxAttempts})`);
          // Add a small delay between attempts
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // If all attempts failed, track the error and throw
        lastErrorTime = Date.now();
        consecutiveErrorCount++;
        
        // If we've had too many errors in a row, force a complete reset
        if (consecutiveErrorCount >= 3) {
          console.log('[browserReplayParser] Multiple consecutive errors, forcing complete reset');
          forceWasmReset();
          wasmInitializeAttempted = false;
          wasmInitializeFailed = false;
        }
        
        throw wasmError;
      }
    }
    
    // If we get here, all attempts failed
    throw new Error(`Failed to parse replay after ${maxAttempts} attempts`);
  } catch (error) {
    console.error('[browserReplayParser] Error during parsing:', error);
    // Track error and pass it up for handling by caller
    lastErrorTime = Date.now();
    consecutiveErrorCount++;
    throw error;
  }
}
