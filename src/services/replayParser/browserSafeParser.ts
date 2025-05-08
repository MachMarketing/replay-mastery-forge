
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
      const screparsedImport = await import('screparsed');
      console.log('[browserSafeParser] Screparsed import successful:', screparsedImport);
      
      // Based on the TypeScript error, we can see the structure of the imported module
      // It has ReplayParser and ParsedReplay classes but not a direct parse function
      
      // Check for ReplayParser class (this is what the error suggests exists)
      if (typeof screparsedImport.ReplayParser === 'function') {
        console.log('[browserSafeParser] Found ReplayParser class in module');
        try {
          // Try to create an instance using default constructor
          const parser = new screparsedImport.ReplayParser();
          
          if (typeof parser.parse === 'function') {
            parserModule = {
              parse: (data: Uint8Array) => parser.parse(data)
            };
            isInitialized = true;
            console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully (using ReplayParser)');
            return;
          }
        } catch (e) {
          console.error('[browserSafeParser] Error creating ReplayParser instance:', e);
        }
      }
      
      // Check for ParsedReplay class (also exists according to the error)
      if (typeof screparsedImport.ParsedReplay === 'function') {
        console.log('[browserSafeParser] Found ParsedReplay class in module');
        
        // Check for static parse method
        if (typeof screparsedImport.ParsedReplay.parse === 'function') {
          parserModule = {
            parse: (data: Uint8Array) => screparsedImport.ParsedReplay.parse(data)
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully (using ParsedReplay.parse)');
          return;
        }
        
        try {
          // Try instantiating ParsedReplay
          const parsedReplay = new screparsedImport.ParsedReplay();
          if (typeof parsedReplay.parse === 'function') {
            parserModule = {
              parse: (data: Uint8Array) => parsedReplay.parse(data)
            };
            isInitialized = true;
            console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully (using ParsedReplay instance)');
            return;
          }
        } catch (e) {
          console.error('[browserSafeParser] Error creating ParsedReplay instance:', e);
        }
      }
      
      // Check if the default export has the classes we need
      if (screparsedImport.default) {
        console.log('[browserSafeParser] Checking default export for parser implementation');
        
        // Try ReplayParser from default export
        if (typeof screparsedImport.default.ReplayParser === 'function') {
          try {
            const parser = new screparsedImport.default.ReplayParser();
            if (typeof parser.parse === 'function') {
              parserModule = {
                parse: (data: Uint8Array) => parser.parse(data)
              };
              isInitialized = true;
              console.log('[browserSafeParser] ✅ Parser initialized successfully (using default.ReplayParser)');
              return;
            }
          } catch (e) {
            console.error('[browserSafeParser] Error creating default.ReplayParser instance:', e);
          }
        }
        
        // Try ParsedReplay from default export
        if (typeof screparsedImport.default.ParsedReplay === 'function') {
          // Check for static parse method
          if (typeof screparsedImport.default.ParsedReplay.parse === 'function') {
            parserModule = {
              parse: (data: Uint8Array) => screparsedImport.default.ParsedReplay.parse(data)
            };
            isInitialized = true;
            console.log('[browserSafeParser] ✅ Parser initialized (using default.ParsedReplay.parse)');
            return;
          }
          
          try {
            const parsedReplay = new screparsedImport.default.ParsedReplay();
            if (typeof parsedReplay.parse === 'function') {
              parserModule = {
                parse: (data: Uint8Array) => parsedReplay.parse(data)
              };
              isInitialized = true;
              console.log('[browserSafeParser] ✅ Parser initialized (using default.ParsedReplay instance)');
              return;
            }
          } catch (e) {
            console.error('[browserSafeParser] Error creating default.ParsedReplay instance:', e);
          }
        }
      }
      
      // Explore the module structure to find any parse function
      console.log('[browserSafeParser] Exploring module structure to find parse method:', Object.keys(screparsedImport));
      
      const parseFn = findParseFunction(screparsedImport);
      if (parseFn) {
        console.log('[browserSafeParser] Found parse function through exploration');
        parserModule = { 
          parse: parseFn 
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully (custom parser)');
        return;
      }
      
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
 * Helper function to find a parse function in the module
 */
function findParseFunction(module: any): ((data: Uint8Array) => any) | null {
  console.log('[browserSafeParser] Searching for parse function in module structure');
  
  // Try to find a parse method on ReplayParser
  if (module.ReplayParser && typeof module.ReplayParser === 'function') {
    console.log('[browserSafeParser] Found ReplayParser class');
    try {
      // Create an instance of ReplayParser
      const parser = new module.ReplayParser();
      console.log('[browserSafeParser] Created ReplayParser instance, checking for parse method:', 
        typeof parser.parse === 'function' ? 'Found' : 'Not found');
      
      // If the instance has a parse method, return a wrapper function
      if (typeof parser.parse === 'function') {
        return (data: Uint8Array) => parser.parse(data);
      }
    } catch (e) {
      console.error('[browserSafeParser] Error creating ReplayParser instance:', e);
    }
  }
  
  // Check if ParsedReplay has a parse method
  if (module.ParsedReplay) {
    console.log('[browserSafeParser] Found ParsedReplay, checking for parse method');
    if (typeof module.ParsedReplay.parse === 'function') {
      console.log('[browserSafeParser] Found static parse method on ParsedReplay');
      return (data: Uint8Array) => module.ParsedReplay.parse(data);
    }
    
    try {
      // Try instantiating ParsedReplay
      const parsedReplay = new module.ParsedReplay();
      if (typeof parsedReplay.parse === 'function') {
        console.log('[browserSafeParser] Found instance parse method on ParsedReplay');
        return (data: Uint8Array) => parsedReplay.parse(data);
      }
    } catch (e) {
      console.error('[browserSafeParser] Error creating ParsedReplay instance:', e);
    }
  }
  
  // If module is an object, check all its properties for parse functions
  if (typeof module === 'object' && module !== null) {
    for (const key in module) {
      const prop = module[key];
      
      // Skip null/undefined properties and already checked ones
      if (!prop) continue;
      
      // Check if the property is an object with a parse function
      if (typeof prop === 'object' && prop !== null && typeof prop.parse === 'function') {
        console.log(`[browserSafeParser] Found parse function in ${key} object`);
        return (data: Uint8Array) => prop.parse(data);
      }
      
      // Check if the property is a function that looks like a parser
      if (typeof prop === 'function') {
        const funcName = key.toLowerCase();
        if (funcName.includes('parse') || funcName.includes('replay')) {
          console.log(`[browserSafeParser] Found function named ${key} that might be a parser`);
          
          // Try the function directly
          try {
            return (data: Uint8Array) => prop(data);
          } catch (e) {
            console.error(`[browserSafeParser] Error using ${key} as parser:`, e);
          }
        }
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
  
  if (!parserModule) {
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
      
      // Use our parser module with the parse function
      let result;
      
      console.log('[browserSafeParser] Calling parse function from parserModule');
      result = parserModule.parse(data);
      
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
