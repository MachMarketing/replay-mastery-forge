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
    
    // Approach 1: Try the module as a function directly
    if (typeof screparsed === 'function') {
      console.log('[browserSafeParser] Module itself is a function');
      
      parserInstance = {
        parse: (data: Uint8Array) => {
          try {
            return (screparsed as Function)(data);
          } catch (err) {
            console.error('[browserSafeParser] Error using module as function:', err);
            throw err;
          }
        }
      };
      
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Parser initialized using module as function');
      return;
    }
    
    // Approach 2: Check for ReplayParser class
    if (screparsed.ReplayParser) {
      console.log('[browserSafeParser] Found ReplayParser class');
      
      // Try known static methods (avoiding TypeScript errors by using bracket notation)
      const staticMethods = ['parse', 'parseReplay', 'fromBuffer', 'fromArrayBuffer'];
      
      for (const methodName of staticMethods) {
        // Use type assertion to avoid TypeScript errors
        if (typeof (screparsed.ReplayParser as any)[methodName] === 'function') {
          console.log(`[browserSafeParser] Found static ${methodName} method on ReplayParser`);
          
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                return (screparsed.ReplayParser as any)[methodName](data);
              } catch (err) {
                console.error(`[browserSafeParser] Error using ReplayParser.${methodName}:`, err);
                throw err;
              }
            }
          };
          
          isInitialized = true;
          console.log(`[browserSafeParser] ✅ Parser initialized using ReplayParser.${methodName}`);
          return;
        }
      }
      
      // Try to instantiate ReplayParser
      try {
        console.log('[browserSafeParser] Trying to instantiate ReplayParser');
        
        // First check if the constructor takes data
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // Try constructor with data parameter
              const parser = new (screparsed.ReplayParser as any)(data);
              
              // If the instance has a parse method, use that
              if (typeof parser.parse === 'function') {
                console.log('[browserSafeParser] ReplayParser instance has parse method');
                return parser.parse();
              }
              
              // Otherwise return the instance itself which might be the parsed result
              console.log('[browserSafeParser] Returning ReplayParser instance directly');
              return parser;
            } catch (constructorErr) {
              console.warn('[browserSafeParser] Error instantiating with data:', constructorErr);
              
              try {
                // Try constructor without parameters and then call parse with data
                const parser = new (screparsed.ReplayParser as any)();
                
                console.log('[browserSafeParser] Created ReplayParser instance without parameters');
                
                if (typeof parser.parse === 'function') {
                  return parser.parse(data);
                } else if (typeof parser.parseReplay === 'function') {
                  return parser.parseReplay(data);
                } else {
                  throw new Error('ReplayParser instance has no parse or parseReplay method');
                }
              } catch (err) {
                console.error('[browserSafeParser] Error using ReplayParser instance:', err);
                throw err;
              }
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
    
    // Approach 3: Check for ParsedReplay class
    if (screparsed.ParsedReplay) {
      console.log('[browserSafeParser] Found ParsedReplay class');
      
      // Try known static methods using bracket notation to avoid TypeScript errors
      const staticMethods = ['fromBuffer', 'fromArrayBuffer', 'fromUint8Array', 'parse', 'parseReplay'];
      
      for (const methodName of staticMethods) {
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
      
      // Try to parse directly from constructor
      try {
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              return new (screparsed.ParsedReplay as any)(data);
            } catch (err) {
              console.error('[browserSafeParser] Error instantiating ParsedReplay:', err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized with ParsedReplay constructor');
        return;
      } catch (err) {
        console.warn('[browserSafeParser] Could not use ParsedReplay constructor:', err);
      }
    }
    
    // Approach 4: Check default export
    if (screparsed.default) {
      console.log('[browserSafeParser] Checking default export');
      
      if (typeof screparsed.default === 'function') {
        console.log('[browserSafeParser] Default export is a function');
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              return screparsed.default(data);
            } catch (err) {
              console.error('[browserSafeParser] Error using default export as function:', err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using default export as function');
        return;
      }
      
      // Check if default export has any methods we can use
      if (typeof screparsed.default === 'object' || typeof screparsed.default === 'function') {
        // Try known methods on the default export
        const methodNames = ['parse', 'parseReplay', 'fromBuffer', 'fromArrayBuffer', 'fromUint8Array'];
        
        for (const methodName of methodNames) {
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
    
    // Approach 5: Final fallback - scan for any function that might work
    console.log('[browserSafeParser] Trying fallback approach - scanning for functions');
    for (const key of Object.keys(screparsed)) {
      if (typeof (screparsed as any)[key] === 'function' && 
          key !== 'ReplayParser' && 
          key !== 'ParsedReplay') {
        console.log(`[browserSafeParser] Found function ${key}`);
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              return (screparsed as any)[key](data);
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
    
    throw new Error('Could not find any suitable parsing method in screparsed module');
    
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
