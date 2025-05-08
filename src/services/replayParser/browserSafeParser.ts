
/**
 * Browser-safe wrapper for screparsed replay parser
 */

// Track initialization state
let isInitialized = false;
let parserInstance: any = null;

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
    
    // According to documentation, we need to use the parse method first
    if (typeof screparsed.parse === 'function') {
      parserInstance = {
        parse: (data: Uint8Array) => {
          // First parse the binary data
          const gameInfo = screparsed.parse(data);
          console.log('[browserSafeParser] Game info parsed:', gameInfo ? 'success' : 'failed');
          
          // Then use the parsed gameInfo with ParsedReplay
          if (gameInfo) {
            return new screparsed.ParsedReplay(gameInfo, {}, {});
          }
          
          throw new Error('Failed to parse replay data');
        }
      };
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Parser initialized using parse and ParsedReplay');
      return;
    }
    
    // Fallback to default export if it exists
    if (screparsed.default && typeof screparsed.default.parse === 'function') {
      parserInstance = {
        parse: (data: Uint8Array) => {
          // First parse the binary data
          const gameInfo = screparsed.default.parse(data);
          console.log('[browserSafeParser] Game info parsed (default):', gameInfo ? 'success' : 'failed');
          
          // Then use the parsed gameInfo with ParsedReplay
          if (gameInfo) {
            return new screparsed.default.ParsedReplay(gameInfo, {}, {});
          }
          
          throw new Error('Failed to parse replay data');
        }
      };
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Parser initialized using default.parse and default.ParsedReplay');
      return;
    }
    
    console.error('[browserSafeParser] Could not find parse method in screparsed module');
    throw new Error('Compatible parser not found in screparsed module');
    
  } catch (err) {
    console.error('[browserSafeParser] Failed to initialize parser:', err);
    throw new Error(`Failed to initialize replay parser: ${err}`);
  }
}

/**
 * Parse a replay file using the browser-safe screparsed parser
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<any> {
  if (!isInitialized || !parserInstance) {
    await initBrowserSafeParser();
  }
  
  if (!parserInstance) {
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
    
    // Parse the replay data
    const result = parserInstance.parse(data);
    
    // Restore original error handler
    window.onerror = originalOnError;
    
    if (wasmError) {
      throw wasmError;
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
