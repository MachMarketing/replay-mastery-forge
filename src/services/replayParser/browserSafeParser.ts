
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
      
      // Try all possible API combinations to find a working parser
      
      // 1. Try using ReplayParser class
      if (screparsed.ReplayParser) {
        console.log('[browserSafeParser] Found ReplayParser class/object');
        // Check if it's a constructor function we can instantiate
        if (typeof screparsed.ReplayParser === 'function') {
          try {
            // Try instantiating and check for parse method
            const parser = new screparsed.ReplayParser();
            if (typeof parser.parse === 'function') {
              console.log('[browserSafeParser] Using ReplayParser instance.parse method');
              parserInstance = {
                parse: (data: Uint8Array) => new screparsed.ReplayParser().parse(data)
              };
              isInitialized = true;
              console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using ReplayParser instance)');
              return;
            }
            
            // Try parse method on prototype
            if (screparsed.ReplayParser.prototype && typeof screparsed.ReplayParser.prototype.parse === 'function') {
              console.log('[browserSafeParser] Using ReplayParser.prototype.parse method');
              parserInstance = {
                parse: (data: Uint8Array) => new screparsed.ReplayParser().parse(data)
              };
              isInitialized = true;
              console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using prototype.parse)');
              return;
            }
          } catch (err) {
            console.log('[browserSafeParser] Could not instantiate ReplayParser:', err);
          }
          
          // Try static methods on constructor
          try {
            // Use type assertion to avoid TypeScript error
            const parserClass = screparsed.ReplayParser as any;
            if (typeof parserClass.parse === 'function') {
              console.log('[browserSafeParser] Using ReplayParser.parse static method');
              parserInstance = {
                parse: (data: Uint8Array) => parserClass.parse(data)
              };
              isInitialized = true;
              console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using static parse)');
              return;
            }
          } catch (staticErr) {
            console.log('[browserSafeParser] Static method access error:', staticErr);
          }
        }
      }
      
      // 2. Try using the default export
      if (screparsed.default) {
        console.log('[browserSafeParser] Checking default export');
        
        // Type cast default export to any to avoid TypeScript errors
        const defaultExport = screparsed.default as any;
        
        // Try default.parse function
        if (typeof defaultExport.parse === 'function') {
          console.log('[browserSafeParser] Using default.parse function');
          parserInstance = {
            parse: (data: Uint8Array) => defaultExport.parse(data)
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using default.parse)');
          return;
        }
        
        // Try default.Parse function (case matters)
        if (typeof defaultExport.Parse === 'function') {
          console.log('[browserSafeParser] Using default.Parse function');
          parserInstance = {
            parse: (data: Uint8Array) => defaultExport.Parse(data)
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using default.Parse)');
          return;
        }
        
        // Try default as a function itself
        if (typeof screparsed.default === 'function') {
          console.log('[browserSafeParser] Using default as a function');
          parserInstance = {
            parse: (data: Uint8Array) => (screparsed.default as any)(data)
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using default as function)');
          return;
        }
      }
      
      // 3. Try module.parse direct function
      // Use type assertion to avoid TypeScript error
      const moduleAsAny = screparsed as any;
      if (typeof moduleAsAny.parse === 'function') {
        console.log('[browserSafeParser] Using direct module.parse function');
        parserInstance = {
          parse: (data: Uint8Array) => moduleAsAny.parse(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using module.parse)');
        return;
      }
      
      // 4. Try ParsedReplay class or utility
      if (screparsed.ParsedReplay) {
        console.log('[browserSafeParser] Found ParsedReplay');
        
        // Try static parse method with various case options
        // Use type assertion to avoid TypeScript errors
        const parsedReplayAsAny = screparsed.ParsedReplay as any;
        
        if (typeof parsedReplayAsAny.parse === 'function') {
          console.log('[browserSafeParser] Using ParsedReplay.parse');
          parserInstance = {
            parse: (data: Uint8Array) => parsedReplayAsAny.parse(data)
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using ParsedReplay.parse)');
          return;
        }
        
        if (typeof parsedReplayAsAny.Parse === 'function') {
          console.log('[browserSafeParser] Using ParsedReplay.Parse');
          parserInstance = {
            parse: (data: Uint8Array) => parsedReplayAsAny.Parse(data)
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using ParsedReplay.Parse)');
          return;
        }
      }
      
      // Log available methods to help debug
      console.log('[browserSafeParser] All available properties on module:', Object.keys(screparsed));
      if (screparsed.ReplayParser) {
        console.log('[browserSafeParser] Available on ReplayParser:',
          typeof screparsed.ReplayParser === 'function' 
            ? Object.getOwnPropertyNames(screparsed.ReplayParser) 
            : Object.keys(screparsed.ReplayParser));
      }
      if (screparsed.ParsedReplay) {
        console.log('[browserSafeParser] Available on ParsedReplay:',
          typeof screparsed.ParsedReplay === 'function'
            ? Object.getOwnPropertyNames(screparsed.ParsedReplay)
            : Object.keys(screparsed.ParsedReplay));
      }
      
      throw new Error('Could not find a compatible parsing method in screparsed module');
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
