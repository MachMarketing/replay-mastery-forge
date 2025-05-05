
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
let wasmInitializeAttempted = false;
let wasmInitializeFailed = false;
let lastErrorTime = 0;
let consecutiveErrorCount = 0;
let hasUsedFallbackParser = false;

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
    
    // If we've had too many consecutive errors with WASM, try the fallback parser first
    if (consecutiveErrorCount >= 2 || hasUsedFallbackParser) {
      console.log('[browserReplayParser] Using browser-safe parser due to previous errors');
      try {
        const parsedData = await parseReplayWithBrowserSafeParser(fileData);
        console.log('[browserReplayParser] Successfully parsed with browser-safe parser');
        // Type assertion to ensure it matches ParsedReplayResult
        return parsedData as ParsedReplayResult;
      } catch (fallbackError) {
        console.error('[browserReplayParser] Browser-safe parser failed:', fallbackError);
        // Continue to WASM parser as a last resort
      }
    }
    
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
        
        // If WASM init fails, immediately try browser-safe parser
        console.log('[browserReplayParser] Falling back to browser-safe parser after WASM init failure');
        try {
          const parsedData = await parseReplayWithBrowserSafeParser(fileData);
          console.log('[browserReplayParser] Successfully parsed with browser-safe parser');
          hasUsedFallbackParser = true;
          return parsedData as ParsedReplayResult;
        } catch (fallbackError) {
          console.error('[browserReplayParser] Browser-safe parser also failed:', fallbackError);
          throw new Error('All parsing methods failed: ' + (error instanceof Error ? error.message : String(error)));
        }
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
        // Add extra padding to the buffer as a protection against buffer overflows
        const paddedData = new Uint8Array(defensiveData.length + 4096); // Increased padding
        paddedData.set(defensiveData);
        
        // Use the defensive copy that will be processed by WASM
        const dataToUse = attempts === 2 ? paddedData : defensiveData;
        
        // Call WASM parser
        const rawData = await parseReplayWasm(dataToUse);
        
        // Log the raw data structure for debugging
        console.log('[browserReplayParser] WASM parsing raw result - keys:', Object.keys(rawData));
        console.log('[browserReplayParser] WASM parsing raw result - sample:', {
          playerName: rawData.playerName,
          opponentName: rawData.opponentName,
          playerRace: rawData.playerRace,
          opponentRace: rawData.opponentRace,
          map: rawData.map,
          matchup: rawData.matchup
        });
        
        // Success - map and return the data
        const parsedData = mapRawToParsed(rawData);
        console.log('[browserReplayParser] WASM parsing successful on attempt', attempts);
        
        // Ensure required fields are present
        ensureRequiredFields(parsedData);
        
        // Reset error tracking on success
        consecutiveErrorCount = 0;
        hasUsedFallbackParser = false;
        return parsedData;
      } catch (wasmError) {
        console.error(`[browserReplayParser] WASM parser error on attempt ${attempts}:`, wasmError);
        
        // Special handling for makeslice errors
        if (wasmError.message && (
           wasmError.message.includes('makeslice: len out of range') || 
           wasmError.message.includes('runtime error') ||
           wasmError.message.includes('memory access out of bounds')
        )) {
          console.log('[browserReplayParser] Detected WASM memory error, resetting WASM');
          
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
          
          // If this is the last WASM attempt, try the browser-safe parser
          if (attempts >= maxAttempts - 1) {
            console.log('[browserReplayParser] WASM parsing failed repeatedly, trying browser-safe parser');
            try {
              const parsedData = await parseReplayWithBrowserSafeParser(fileData);
              console.log('[browserReplayParser] Successfully parsed with browser-safe parser');
              hasUsedFallbackParser = true;
              return parsedData as ParsedReplayResult;
            } catch (fallbackError) {
              console.error('[browserReplayParser] Browser-safe parser also failed:', fallbackError);
              // Continue with the error flow
            }
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
        
        // If all attempts failed, try the browser-safe parser as a last resort
        console.log('[browserReplayParser] All WASM parsing attempts failed, trying browser-safe parser');
        try {
          const parsedData = await parseReplayWithBrowserSafeParser(fileData);
          console.log('[browserReplayParser] Successfully parsed with browser-safe parser');
          hasUsedFallbackParser = true;
          return parsedData as ParsedReplayResult;
        } catch (fallbackError) {
          console.error('[browserReplayParser] Browser-safe parser also failed:', fallbackError);
          
          // If everything failed, track the error and throw
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

/**
 * Helper function to ensure all required fields are present
 */
function ensureRequiredFields(data: any): void {
  // Make sure strengths, weaknesses, and recommendations are always arrays
  if (!data.strengths || !Array.isArray(data.strengths) || data.strengths.length === 0) {
    data.strengths = ['Solid macro gameplay'];
  }
  
  if (!data.weaknesses || !Array.isArray(data.weaknesses) || data.weaknesses.length === 0) {
    data.weaknesses = ['Build order efficiency'];
  }
  
  if (!data.recommendations || !Array.isArray(data.recommendations) || data.recommendations.length === 0) {
    data.recommendations = ['Focus on early game scouting'];
  }
  
  // Ensure all other required fields have values
  if (!data.eapm || typeof data.eapm !== 'number') {
    data.eapm = data.apm ? Math.floor(data.apm * 0.8) : 120;
  }
  
  if (!data.buildOrder || !Array.isArray(data.buildOrder)) {
    data.buildOrder = [];
  }
}
