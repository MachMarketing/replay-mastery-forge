
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
    
    // Try to find a parse function since ReplayParser has a private constructor
    if (typeof screparsed.parse === 'function') {
      console.log('[browserSafeParser] Found parse function');
      parserInstance = {
        parse: (data: Uint8Array) => {
          // Use the parse function
          const result = screparsed.parse(data);
          console.log('[browserSafeParser] Replay parsed:', result ? 'success' : 'failed');
          
          if (!result) {
            throw new Error('Failed to parse replay data');
          }
          
          return result;
        }
      };
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Parser initialized using parse function');
      return;
    }
    
    // Try static method on ReplayParser if available
    if (screparsed.ReplayParser && typeof screparsed.ReplayParser.parse === 'function') {
      console.log('[browserSafeParser] Found ReplayParser.parse static method');
      parserInstance = {
        parse: (data: Uint8Array) => {
          // Use the static parse method
          const result = screparsed.ReplayParser.parse(data);
          console.log('[browserSafeParser] Replay parsed with static method:', result ? 'success' : 'failed');
          
          if (!result) {
            throw new Error('Failed to parse replay data');
          }
          
          return result;
        }
      };
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Parser initialized using ReplayParser.parse static method');
      return;
    }
    
    // Fallback to default export if it exists
    if (screparsed.default) {
      if (typeof screparsed.default.parse === 'function') {
        console.log('[browserSafeParser] Found default.parse function');
        parserInstance = {
          parse: (data: Uint8Array) => {
            // Use the default export's parse function
            const result = screparsed.default.parse(data);
            console.log('[browserSafeParser] Replay parsed with default.parse:', result ? 'success' : 'failed');
            
            if (!result) {
              throw new Error('Failed to parse replay data');
            }
            
            return result;
          }
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using default.parse');
        return;
      }
      
      // Try static method on default.ReplayParser if available
      if (screparsed.default.ReplayParser && typeof screparsed.default.ReplayParser.parse === 'function') {
        console.log('[browserSafeParser] Found default.ReplayParser.parse static method');
        parserInstance = {
          parse: (data: Uint8Array) => {
            // Use the static parse method from default export
            const result = screparsed.default.ReplayParser.parse(data);
            console.log('[browserSafeParser] Replay parsed with default static method:', result ? 'success' : 'failed');
            
            if (!result) {
              throw new Error('Failed to parse replay data');
            }
            
            return result;
          }
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using default.ReplayParser.parse static method');
        return;
      }
    }
    
    // If all else fails, try to use available module exports creatively
    console.log('[browserSafeParser] Trying alternative parsing approaches');
    
    // Try to see if the module exports any function that might accept binary data
    const potentialParserFunctions = Object.keys(screparsed)
      .filter(key => typeof (screparsed as any)[key] === 'function');
    
    if (potentialParserFunctions.length > 0) {
      console.log('[browserSafeParser] Found potential parser functions:', potentialParserFunctions);
      
      // Try the first function that might work
      const firstFunctionKey = potentialParserFunctions[0];
      parserInstance = {
        parse: (data: Uint8Array) => {
          try {
            const result = (screparsed as any)[firstFunctionKey](data);
            console.log('[browserSafeParser] Tried parsing with', firstFunctionKey, ':', result ? 'success' : 'failed');
            return result;
          } catch (error) {
            console.error('[browserSafeParser] Error using alternative parser function:', error);
            throw new Error(`Failed to parse replay data: ${(error as Error).message}`);
          }
        }
      };
      isInitialized = true;
      console.log(`[browserSafeParser] ✅ Parser initialized using ${firstFunctionKey}`);
      return;
    }
    
    console.error('[browserSafeParser] Could not find compatible parser function in screparsed module');
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
