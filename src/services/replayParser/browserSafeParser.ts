
/**
 * Browser-safe wrapper for screparsed replay parser
 */

// Import the specific types
import { ParsedReplayData } from './types';
import { ReplayParser } from 'screparsed';

// Track initialization state
let isInitialized = false;
let parserModule: any = null;

/**
 * Initialize the browser-safe parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  if (isInitialized) {
    console.log('[browserSafeParser] Parser already initialized');
    return;
  }
  
  try {
    console.log('[browserSafeParser] Initializing screparsed parser');
    
    // Import the screparsed module
    const screparsed = await import('screparsed');
    console.log('[browserSafeParser] Screparsed import successful:', Object.keys(screparsed));
    
    // Store the module for later use
    parserModule = screparsed;
    isInitialized = true;
    console.log('[browserSafeParser] ✅ Parser initialized successfully');
  } catch (err) {
    console.error('[browserSafeParser] Failed to initialize parser:', err);
    throw new Error(`Failed to initialize replay parser: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parse a replay file using the browser-safe screparsed parser
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<any> {
  if (!isInitialized || !parserModule) {
    await initBrowserSafeParser();
  }
  
  if (!parserModule) {
    throw new Error('screparsed parser module not available');
  }
  
  console.log('[browserSafeParser] Parsing replay data:', data.length, 'bytes');
  
  try {
    // Set up error handler for WASM errors
    const originalOnError = window.onerror;
    let wasmError: Error | null = null;
    
    // Temporary error handler to catch WASM errors
    window.onerror = function(message, source, lineno, colno, error) {
      const errorMsg = String(message);
      console.error('[browserSafeParser] WASM error caught:', errorMsg);
      wasmError = new Error(`WASM execution error: ${errorMsg}`);
      return true; // Prevents default error handling
    };
    
    let result = null;
    console.log('[browserSafeParser] Using ReplayParser from screparsed');
    
    try {
      // Create a new instance of ReplayParser and parse the data
      const parser = new ReplayParser();
      console.log('[browserSafeParser] Created parser instance successfully');
      
      // Parse the replay
      result = await parser.parse(data);
      console.log('[browserSafeParser] Successfully parsed using ReplayParser');
    } catch (err) {
      console.error('[browserSafeParser] Error using primary ReplayParser approach:', err);
      
      // Fallback: Try using ArrayBuffer if available
      try {
        console.log('[browserSafeParser] Trying ArrayBuffer fallback');
        const parser = new ReplayParser();
        result = await parser.parse(new Uint8Array(data.buffer));
        console.log('[browserSafeParser] Successfully parsed using ArrayBuffer fallback');
      } catch (err2) {
        console.error('[browserSafeParser] Fallback parsing error:', err2);
        throw err2; // Re-throw the error if all methods fail
      }
    }
    
    // Restore original error handler
    window.onerror = originalOnError;
    
    if (wasmError) {
      throw wasmError;
    }
    
    if (!result) {
      throw new Error('Failed to parse replay using screparsed');
    }
    
    console.log('[browserSafeParser] Parsing completed successfully');
    return result;
  } catch (parseError) {
    console.error('[browserSafeParser] Error parsing replay:', parseError);
    
    // Check if the error is a DOM event (which sometimes happens with WASM errors)
    if (parseError && typeof parseError === 'object' && 'isTrusted' in parseError) {
      throw new Error('WASM execution error occurred during parsing');
    } else {
      throw parseError;
    }
  }
}
