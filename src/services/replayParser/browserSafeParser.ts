
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
      // Import the screparsed module
      const screparsed = await import('screparsed');
      console.log('[browserSafeParser] Screparsed import successful:', screparsed);
      
      // Check if we have a ReplayParser class as shown in the documentation
      if (screparsed.ReplayParser) {
        console.log('[browserSafeParser] Found ReplayParser in module');
        // Store the module for later use
        parserModule = screparsed;
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully');
      } else if (screparsed.default && typeof screparsed.default.parse === 'function') {
        // Try alternative structure where parse might be in default export
        console.log('[browserSafeParser] Using default export with parse function');
        parserModule = screparsed.default;
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully (default export)');
      } else {
        // Last resort - check if there's any parse function anywhere
        const parseFn = findParseFunction(screparsed);
        if (parseFn) {
          console.log('[browserSafeParser] Found parse function through exploration');
          parserModule = { parse: parseFn };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully (custom parser)');
        } else {
          throw new Error('Could not find parse function in screparsed module');
        }
      }
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
 * Helper function to find a parse function in the module
 */
function findParseFunction(module: any): Function | null {
  console.log('[browserSafeParser] Searching for parse function in module structure');
  
  // Try to find a parse method on ReplayParser
  if (module.ReplayParser && module.ReplayParser.prototype && typeof module.ReplayParser.prototype.parse === 'function') {
    console.log('[browserSafeParser] Found parse method on ReplayParser.prototype');
    // Create an instance of ReplayParser
    const parser = new module.ReplayParser();
    // Return a wrapper function that calls parse on the instance
    return (data: Uint8Array) => parser.parse(data);
  }
  
  // Check if ParsedReplay has a static parse method
  if (module.ParsedReplay && typeof module.ParsedReplay.parse === 'function') {
    console.log('[browserSafeParser] Found static parse method on ParsedReplay');
    return module.ParsedReplay.parse;
  }
  
  // If we still don't have a parse function, check all properties for any function called parse
  for (const key in module) {
    if (key === 'parse' && typeof module[key] === 'function') {
      console.log(`[browserSafeParser] Found parse function at root level`);
      return module[key];
    } else if (typeof module[key] === 'object' && module[key] !== null) {
      if (typeof module[key].parse === 'function') {
        console.log(`[browserSafeParser] Found parse function in ${key} object`);
        return module[key].parse;
      }
    }
  }
  
  console.log('[browserSafeParser] No parse function found in module');
  return null;
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
      
      if (!parserModule) {
        throw new Error('screparsed parser module not available');
      }
      
      console.log('[browserSafeParser] Parsing replay data:', data.length, 'bytes');
      
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
        
        // Determine how to call the parser based on what we found
        let result;
        if (parserModule.ReplayParser && typeof parserModule.ReplayParser === 'function') {
          // If we have a ReplayParser class, create an instance and call parse
          const parser = new parserModule.ReplayParser();
          result = parser.parse(data);
        } else if (typeof parserModule.parse === 'function') {
          // If we found a parse function, call it directly
          result = parserModule.parse(data);
        } else if (parserModule.ParsedReplay && typeof parserModule.ParsedReplay.parse === 'function') {
          // Try the ParsedReplay.parse static method
          result = parserModule.ParsedReplay.parse(data);
        } else {
          throw new Error('No valid parse function found in the screparsed module');
        }
        
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
    } catch (error) {
      console.error('[browserSafeParser] Parsing error:', 
        typeof error === 'object' ? 
          (error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'null') : 
          String(error)
      );
      reject(error);
    }
  });
}
