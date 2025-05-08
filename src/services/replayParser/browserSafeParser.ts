
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
    
    // First, check if there's a parse function directly exposed
    if (typeof screparsed.parse === 'function') {
      console.log('[browserSafeParser] Found top-level parse function');
      parserInstance = {
        parse: (data: Uint8Array) => {
          try {
            return screparsed.parse(data);
          } catch (err) {
            console.error('[browserSafeParser] Error using parse function:', err);
            throw err;
          }
        }
      };
      
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Parser initialized using top-level parse function');
      return;
    }
    
    // Next, check for ReplayParser class
    if (screparsed.ReplayParser) {
      console.log('[browserSafeParser] Found ReplayParser class');
      
      // Check for static parse method on ReplayParser
      if (typeof screparsed.ReplayParser.parse === 'function') {
        console.log('[browserSafeParser] Found static parse method on ReplayParser');
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              return screparsed.ReplayParser.parse(data);
            } catch (err) {
              console.error('[browserSafeParser] Error using ReplayParser.parse:', err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using ReplayParser.parse');
        return;
      }
      
      // Check for parseReplay static method
      if (typeof screparsed.ReplayParser.parseReplay === 'function') {
        console.log('[browserSafeParser] Found static parseReplay method on ReplayParser');
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              return screparsed.ReplayParser.parseReplay(data);
            } catch (err) {
              console.error('[browserSafeParser] Error using ReplayParser.parseReplay:', err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using ReplayParser.parseReplay');
        return;
      }
      
      // Try to create an instance of ReplayParser with file data
      try {
        console.log('[browserSafeParser] Trying to instantiate ReplayParser');
        
        // Use a function that captures the ReplayParser constructor to handle potentially private constructor
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // Based on documentation, we might need to use new ReplayParser(data)
              // This is a workaround to try different approaches
              const parser = new (screparsed.ReplayParser as any)(data);
              console.log('[browserSafeParser] Successfully created ReplayParser instance');
              return parser;
            } catch (err) {
              console.error('[browserSafeParser] Error instantiating ReplayParser:', err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized with ReplayParser constructor');
        return;
      } catch (err) {
        console.warn('[browserSafeParser] Could not instantiate ReplayParser:', err);
      }
    }
    
    // Check for ParsedReplay class and create method
    if (screparsed.ParsedReplay) {
      console.log('[browserSafeParser] Found ParsedReplay class');
      
      // Check for static method to create/parse a replay
      if (typeof screparsed.ParsedReplay.fromBuffer === 'function') {
        console.log('[browserSafeParser] Found ParsedReplay.fromBuffer static method');
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              return screparsed.ParsedReplay.fromBuffer(data);
            } catch (err) {
              console.error('[browserSafeParser] Error using ParsedReplay.fromBuffer:', err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using ParsedReplay.fromBuffer');
        return;
      }
      
      // Try other potential static methods on ParsedReplay
      const potentialMethods = ['fromArrayBuffer', 'fromUint8Array', 'parse', 'parseReplay'];
      for (const methodName of potentialMethods) {
        if (typeof (screparsed.ParsedReplay as any)[methodName] === 'function') {
          console.log(`[browserSafeParser] Found ParsedReplay.${methodName} static method`);
          
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                return (screparsed.ParsedReplay as any)[methodName](data);
              } catch (err) {
                console.error(`[browserSafeParser] Error using ParsedReplay.${methodName}:`, err);
                throw err;
              }
            }
          };
          
          isInitialized = true;
          console.log(`[browserSafeParser] ✅ Parser initialized using ParsedReplay.${methodName}`);
          return;
        }
      }
    }
    
    // Check if there's a default export that might work
    if (screparsed.default) {
      console.log('[browserSafeParser] Checking default export');
      
      if (typeof screparsed.default === 'function') {
        console.log('[browserSafeParser] Default export is a function');
        
        try {
          // Try using default export directly as a parser
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                return (screparsed.default as any)(data);
              } catch (e) {
                console.error('[browserSafeParser] Error using default as parser function:', e);
                throw e;
              }
            }
          };
          
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Parser initialized using default export as function');
          return;
        } catch (err) {
          console.warn('[browserSafeParser] Default export cannot be used directly:', err);
        }
      }
      
      // Check if default export is a class with static parse methods
      if (typeof screparsed.default === 'object' || typeof screparsed.default === 'function') {
        for (const methodName of ['parse', 'parseReplay', 'fromBuffer', 'fromArrayBuffer']) {
          if (typeof (screparsed.default as any)[methodName] === 'function') {
            console.log(`[browserSafeParser] Found default.${methodName} method`);
            
            parserInstance = {
              parse: (data: Uint8Array) => {
                try {
                  return (screparsed.default as any)[methodName](data);
                } catch (err) {
                  console.error(`[browserSafeParser] Error using default.${methodName}:`, err);
                  throw err;
                }
              }
            };
            
            isInitialized = true;
            console.log(`[browserSafeParser] ✅ Parser initialized using default.${methodName}`);
            return;
          }
        }
      }
    }
    
    // Final fallback - look for any function that takes a Uint8Array and might work
    for (const key of Object.keys(screparsed)) {
      if (typeof (screparsed as any)[key] === 'function' && 
          key !== 'ReplayParser' && 
          key !== 'ParsedReplay') {
        console.log(`[browserSafeParser] Trying function ${key} as parser`);
        
        try {
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                return (screparsed as any)[key](data);
              } catch (e) {
                console.error(`[browserSafeParser] Error using ${key}:`, e);
                throw e;
              }
            }
          };
          
          isInitialized = true;
          console.log(`[browserSafeParser] ✅ Parser initialized using ${key} function`);
          return;
        } catch (err) {
          console.warn(`[browserSafeParser] Function ${key} failed:`, err);
        }
      }
    }
    
    throw new Error('Could not find any suitable parsing method in screparsed module');
    
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
