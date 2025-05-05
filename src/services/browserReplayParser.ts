
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

/**
 * Main function for parsing replay files
 * Directly uses WASM parser without validation or fallbacks
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name);
  
  try {
    const buffer = await file.arrayBuffer();
    const fileData = new Uint8Array(buffer);
    
    console.log('[browserReplayParser] File data loaded, size:', fileData.length, 'bytes');
    console.log('[browserReplayParser] First 20 bytes:', Array.from(fileData.slice(0, 20)));
    
    // Only attempt to initialize WASM once to avoid repeated failures
    if (!wasmInitializeAttempted) {
      wasmInitializeAttempted = true;
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
        throw new Error('WASM parser initialization failed');
      }
    }
    
    console.log('[browserReplayParser] Calling WASM parser directly without pre-validation');
    
    // Create a defensive copy to prevent memory corruption
    const defensiveData = new Uint8Array(fileData.length);
    defensiveData.set(fileData);
    
    // Direct call to WASM parser without any validation
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
  } catch (error) {
    console.error('[browserReplayParser] Error during parsing:', error);
    // No fallback anymore, just pass the error up
    throw error;
  }
}
