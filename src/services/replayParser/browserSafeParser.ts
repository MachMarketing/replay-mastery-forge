
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
    console.log('[browserSafeParser] Attempting to initialize screparsed parser');
    
    try {
      // Import the screparsed module
      const screparsed = await import('screparsed');
      console.log('[browserSafeParser] Screparsed import successful:', Object.keys(screparsed));
      
      // According to the documentation, we need to use the static Parse method
      // of the ReplayParser class
      if (screparsed.ReplayParser && typeof screparsed.ReplayParser.Parse === 'function') {
        console.log('[browserSafeParser] Found ReplayParser.Parse static method');
        parserInstance = {
          parse: (data: Uint8Array) => screparsed.ReplayParser.Parse(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully (using ReplayParser.Parse)');
        return;
      }
      
      // Fallbacks in case the API has changed
      
      // Try parse function on the default export
      if (screparsed.default && typeof screparsed.default.Parse === 'function') {
        console.log('[browserSafeParser] Found default.Parse static method');
        parserInstance = {
          parse: (data: Uint8Array) => screparsed.default.Parse(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using default.Parse)');
        return;
      }
      
      // Try conventional module.parse function
      if (typeof screparsed.parse === 'function') {
        console.log('[browserSafeParser] Found direct parse function');
        parserInstance = {
          parse: (data: Uint8Array) => screparsed.parse(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using direct parse function)');
        return;
      }
      
      // Try to find ParsedReplay.Parse static method
      if (screparsed.ParsedReplay && typeof screparsed.ParsedReplay.Parse === 'function') {
        console.log('[browserSafeParser] Found ParsedReplay.Parse static method');
        parserInstance = {
          parse: (data: Uint8Array) => screparsed.ParsedReplay.Parse(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using ParsedReplay.Parse)');
        return;
      }
      
      // Log available methods to help debug
      console.log('[browserSafeParser] Available methods on ReplayParser:', 
        screparsed.ReplayParser ? Object.getOwnPropertyNames(screparsed.ReplayParser) : 'Not available');
      console.log('[browserSafeParser] Available methods on ParsedReplay:', 
        screparsed.ParsedReplay ? Object.getOwnPropertyNames(screparsed.ParsedReplay) : 'Not available');

      throw new Error('Could not find parse function in screparsed module');
    } catch (importError) {
      console.error('[browserSafeParser] Failed to import screparsed module:', importError);
      throw new Error(`Failed to import screparsed module: ${importError}`);
    }
  } catch (err) {
    console.error('[browserSafeParser] Failed to initialize browser-safe parser:', err);
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
  
  console.log('[browserSafeParser] Preparing to parse replay data');
  console.log('[browserSafeParser] Parsing replay data:', data.length, 'bytes');
  
  return new Promise((resolve, reject) => {
    try {
      // Set up an error handler for WASM errors
      const originalOnError = window.onerror;
      let wasmError: Error | null = null;
      
      // Temporary error handler to catch WASM errors
      window.onerror = function(message, source, lineno, colno, error) {
        const errorMsg = String(message);
        console.error('[browserSafeParser] WASM error caught by window.onerror:', { 
          message: errorMsg,
          error: error ? String(error) : 'No error object' 
        });
        wasmError = new Error(`WASM execution error: ${errorMsg}`);
        return true; // Prevents default error handling
      };
      
      // Try to parse with a timeout to catch hangs
      const timeoutId = setTimeout(() => {
        if (wasmError === null) {
          wasmError = new Error('WASM parsing timeout');
          // Restore original handler
          window.onerror = originalOnError;
          reject(wasmError);
        }
      }, 5000); // 5 second timeout
      
      // Use our parser instance with the parse function
      let result;
      
      console.log('[browserSafeParser] Calling parse function from parserInstance');
      result = parserInstance.parse(data);
      
      // Clear timeout since parsing completed
      clearTimeout(timeoutId);
      
      // Restore original error handler
      window.onerror = originalOnError;
      
      if (wasmError) {
        reject(wasmError);
        return;
      }
      
      console.log('[browserSafeParser] Parsing completed, result:', 
        typeof result === 'object' ? 'Object returned' : typeof result);
      resolve(result);
    } catch (parseError) {
      console.error('[browserSafeParser] Error in parse function:', 
        typeof parseError === 'object' ? 
          (parseError ? JSON.stringify(parseError, Object.getOwnPropertyNames(parseError)) : 'null') : 
          String(parseError)
      );
      
      // Check if the error is a DOM event (which sometimes happens with WASM errors)
      if (parseError && typeof parseError === 'object' && 'isTrusted' in parseError) {
        console.error('[browserSafeParser] Received DOM event instead of error details. This might be a WASM error.');
        reject(new Error('WASM execution error occurred during parsing. The replay might be incompatible or corrupted.'));
      } else {
        reject(parseError);
      }
    }
  });
}
