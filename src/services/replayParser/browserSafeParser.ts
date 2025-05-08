
/**
 * Browser-safe wrapper for screparsed replay parser
 */

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
    console.log('[browserSafeParser] Attempting to initialize screparsed parser');
    
    try {
      // According to the screparsed npm docs, we need to import it properly
      const { parse } = await import('screparsed');
      console.log('[browserSafeParser] Screparsed import successful:', { parse });
      
      // Store the parse function directly
      parserModule = { parse };
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully');
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
  if (!isInitialized || !parserModule) {
    await initBrowserSafeParser();
  }
  
  return new Promise((resolve, reject) => {
    try {
      console.log('[browserSafeParser] Preparing to parse replay data');
      
      if (!parserModule || !parserModule.parse) {
        throw new Error('screparsed parse function not available');
      }
      
      console.log('[browserSafeParser] Parsing replay data:', data.length, 'bytes');
      
      try {
        // Set up an error handler for WASM errors
        const originalOnError = window.onerror;
        let wasmError: Error | null = null;
        
        // Temporary error handler to catch WASM errors
        window.onerror = function(message, source, lineno, colno, error) {
          console.error('[browserSafeParser] WASM error caught by window.onerror:', { 
            message: String(message),
            error: error ? String(error) : 'No error object' 
          });
          wasmError = new Error(`WASM execution error: ${String(message)}`);
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
        
        // Use the parse function directly, as documented in screparsed npm
        const result = parserModule.parse(data);
        
        // Clear timeout since parsing completed
        clearTimeout(timeoutId);
        
        // Restore original error handler
        window.onerror = originalOnError;
        
        if (wasmError) {
          reject(wasmError);
          return;
        }
        
        console.log('[browserSafeParser] Parsing completed, result:', result);
        resolve(result);
      } catch (parseError) {
        console.error('[browserSafeParser] Error in parse function:', 
          typeof parseError === 'object' ? 
            (parseError ? JSON.stringify(parseError) : 'null') : 
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
    } catch (error) {
      console.error('[browserSafeParser] Parsing error:', 
        typeof error === 'object' ? 
          (error ? JSON.stringify(error) : 'null') : 
          String(error)
      );
      reject(error);
    }
  });
}
