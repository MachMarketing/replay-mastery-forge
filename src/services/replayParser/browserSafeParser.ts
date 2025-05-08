/**
 * Browser-safe wrapper for screparsed replay parser
 */

// Track initialization state
let isInitialized = false;
let parserInstance: any = null;

// TypeScript interfaces based on the documentation
interface IReplayParser {
  parse: (data: Uint8Array) => any;
}

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
    
    // Based on screparsed documentation, it exports a function that takes a Uint8Array
    // and returns the parsed replay data
    
    // Approach 1: Try to use the package as a direct function (common pattern in WASM modules)
    if (typeof screparsed.parse === 'function') {
      console.log('[browserSafeParser] Found parse function directly on module');
      
      parserInstance = {
        parse: (data: Uint8Array) => {
          try {
            return screparsed.parse(data);
          } catch (err) {
            console.error('[browserSafeParser] Error using screparsed.parse:', err);
            throw err;
          }
        }
      };
      
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Parser initialized using screparsed.parse');
      return;
    }
    
    // Approach 2: Check if the default export is a function
    if (typeof screparsed.default === 'function') {
      console.log('[browserSafeParser] Using default export as parsing function');
      
      parserInstance = {
        parse: (data: Uint8Array) => {
          try {
            return screparsed.default(data);
          } catch (err) {
            console.error('[browserSafeParser] Error using default export function:', err);
            throw err;
          }
        }
      };
      
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Parser initialized using default export');
      return;
    }
    
    // Approach 3: Check for ParsedReplay or ReplayParser class (based on screp-ts structure)
    const parserClasses = ['ParsedReplay', 'ReplayParser'];
    for (const className of parserClasses) {
      if (screparsed[className]) {
        console.log(`[browserSafeParser] Found ${className} class`);
        
        // Check for static parse methods
        const staticMethods = ['parse', 'parseReplay', 'fromBuffer', 'fromArrayBuffer', 'fromUint8Array'];
        
        for (const methodName of staticMethods) {
          const staticMethod = screparsed[className][methodName];
          if (typeof staticMethod === 'function') {
            console.log(`[browserSafeParser] Found static ${className}.${methodName} method`);
            
            parserInstance = {
              parse: (data: Uint8Array) => {
                try {
                  return staticMethod(data);
                } catch (err) {
                  console.error(`[browserSafeParser] Error using ${className}.${methodName}:`, err);
                  throw err;
                }
              }
            };
            
            isInitialized = true;
            console.log(`[browserSafeParser] ✅ Parser initialized using ${className}.${methodName}`);
            return;
          }
        }
        
        // Try to instantiate the class
        try {
          console.log(`[browserSafeParser] Trying to instantiate ${className}`);
          
          // First try with data parameter
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                const parser = new screparsed[className](data);
                
                // If instance has a parse method, use it
                if (typeof parser.parse === 'function') {
                  return parser.parse();
                }
                
                // Otherwise return the instance itself as it may be the parsed result
                return parser;
              } catch (constructorErr) {
                console.warn(`[browserSafeParser] Error instantiating ${className} with data:`, constructorErr);
                
                try {
                  // Try without parameters
                  const parser = new screparsed[className]();
                  
                  if (typeof parser.parse === 'function') {
                    return parser.parse(data);
                  } else if (typeof parser.parseReplay === 'function') {
                    return parser.parseReplay(data);
                  } else {
                    throw new Error(`${className} instance has no parse or parseReplay method`);
                  }
                } catch (err) {
                  console.error(`[browserSafeParser] Error using ${className} instance:`, err);
                  throw err;
                }
              }
            }
          };
          
          isInitialized = true;
          console.log(`[browserSafeParser] ✅ Parser initialized with ${className} constructor`);
          return;
        } catch (err) {
          console.warn(`[browserSafeParser] Could not instantiate ${className}:`, err);
        }
      }
    }
    
    // Approach 4: Look for any function that might work as a parser
    for (const key of Object.keys(screparsed)) {
      // Skip already checked classes
      if (parserClasses.includes(key)) continue;
      
      const exportedItem = screparsed[key];
      if (typeof exportedItem === 'function') {
        console.log(`[browserSafeParser] Found function ${key}, trying as parser`);
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              return exportedItem(data);
            } catch (err) {
              console.error(`[browserSafeParser] Error using ${key}:`, err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log(`[browserSafeParser] ✅ Parser initialized using ${key} function`);
        return;
      }
    }
    
    // Final attempt - use the whole module as a function (avoiding direct call that causes build error)
    console.log('[browserSafeParser] Attempting to use module itself as a function');
    const moduleAsFunction = screparsed as unknown as (data: Uint8Array) => any;
    
    parserInstance = {
      parse: (data: Uint8Array) => {
        try {
          // Use apply to avoid direct function call syntax that causes build error
          return Function.prototype.apply.call(moduleAsFunction, null, [data]);
        } catch (err) {
          console.error('[browserSafeParser] Error using module as function:', err);
          throw err;
        }
      }
    };
    
    isInitialized = true;
    console.log('[browserSafeParser] ✅ Parser initialized using module as function');
    
  } catch (err) {
    console.error('[browserSafeParser] Failed to initialize parser:', err);
    throw new Error(`Failed to initialize replay parser: ${err instanceof Error ? err.message : String(err)}`);
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
