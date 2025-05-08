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
    
    // Based on the error messages and module structure:
    // - The module doesn't have a direct 'parse' function
    // - The module itself isn't callable
    // - We need to use the exported classes/constructors
    
    // First, check if ParsedReplay class exists (from the error message)
    if (screparsed.ParsedReplay) {
      console.log('[browserSafeParser] Found ParsedReplay class');
      
      try {
        const parseReplayClass = screparsed.ParsedReplay;
        
        // Create a parser instance that uses ParsedReplay
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // Try to construct with data directly (common pattern)
              const parsedReplay = new parseReplayClass(data);
              return parsedReplay;
            } catch (constructorErr) {
              console.warn('[browserSafeParser] Error instantiating ParsedReplay with data:', constructorErr);
              
              // Alternative: Try to instantiate without args and then parse
              try {
                const parser = new parseReplayClass();
                
                // Check if the instance has a parse method
                if (typeof parser.parse === 'function') {
                  return parser.parse(data);
                } else {
                  // If no direct parse method, the instance itself might be the result
                  return parser;
                }
              } catch (err) {
                console.error('[browserSafeParser] Error using ParsedReplay class:', err);
                throw err;
              }
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized with ParsedReplay constructor');
        return;
      } catch (err) {
        console.error('[browserSafeParser] Failed to initialize with ParsedReplay:', err);
      }
    }
    
    // Next, try using ReplayParser class
    if (screparsed.ReplayParser) {
      console.log('[browserSafeParser] Found ReplayParser class');
      
      try {
        const replayParserClass = screparsed.ReplayParser;
        
        // Create a parser instance that uses ReplayParser
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // Try with static parse method first
              if (typeof replayParserClass.parse === 'function') {
                return replayParserClass.parse(data);
              }
              
              // Otherwise instantiate and use instance methods
              const parser = new replayParserClass();
              
              if (typeof parser.parse === 'function') {
                return parser.parse(data);
              } else if (typeof parser.parseReplay === 'function') {
                return parser.parseReplay(data);
              } else {
                throw new Error('ReplayParser has no usable parse methods');
              }
            } catch (err) {
              console.error('[browserSafeParser] Error using ReplayParser:', err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized with ReplayParser constructor');
        return;
      } catch (err) {
        console.error('[browserSafeParser] Failed to initialize with ReplayParser:', err);
      }
    }
    
    // Try the default export as a last resort
    if (screparsed.default) {
      console.log('[browserSafeParser] Trying default export:', typeof screparsed.default);
      
      try {
        const defaultExport = screparsed.default;
        
        if (typeof defaultExport === 'function') {
          // Default export is a function we can call
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                return defaultExport(data);
              } catch (err) {
                console.error('[browserSafeParser] Error using default export as function:', err);
                throw err;
              }
            }
          };
          
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Parser initialized with default export function');
          return;
        } 
        
        // Check if default export has needed classes/methods
        if (defaultExport.ParsedReplay) {
          console.log('[browserSafeParser] Found ParsedReplay in default export');
          
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                const parser = new defaultExport.ParsedReplay(data);
                return parser;
              } catch (err) {
                console.error('[browserSafeParser] Error using default.ParsedReplay:', err);
                throw err;
              }
            }
          };
          
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Parser initialized with default.ParsedReplay');
          return;
        }
      } catch (err) {
        console.error('[browserSafeParser] Failed to use default export:', err);
      }
    }
    
    // If we got here, we couldn't initialize any parser
    throw new Error('Could not initialize replay parser with any available API');
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
