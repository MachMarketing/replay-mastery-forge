
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
    
    // First try with ParsedReplay class - most likely to work based on the package
    if (screparsed.ParsedReplay) {
      console.log('[browserSafeParser] Found ParsedReplay class');
      
      try {
        const ParsedReplayClass = screparsed.ParsedReplay;
        
        // Create a parser instance that uses ParsedReplay
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // Try to construct it directly with the replay data
              // Inspect the constructor to determine parameter count
              const constructor = ParsedReplayClass.toString();
              
              // Create an instance - different packages might have different constructor patterns
              let parsedReplay;
              
              try {
                // Try with just the data parameter first (most common)
                parsedReplay = new ParsedReplayClass(data);
              } catch (constructorErr) {
                console.warn('[browserSafeParser] Error creating ParsedReplay with single arg:', constructorErr);
                
                try {
                  // Try with default parameters (some WASM bindings expect this)
                  parsedReplay = new ParsedReplayClass();
                  
                  // If we got here, we need to call a method on the instance to parse the data
                  // Check for common method names
                  if (typeof parsedReplay.parseReplay === 'function') {
                    return parsedReplay.parseReplay(data);
                  } else if (typeof parsedReplay.parse === 'function') {
                    return parsedReplay.parse(data);
                  } else {
                    // Just return the instance, maybe it's self-parsing on construction
                    return parsedReplay;
                  }
                } catch (err) {
                  console.error('[browserSafeParser] Failed to create ParsedReplay instance:', err);
                  throw err;
                }
              }
              
              // If we got here, the constructor with data worked, return the instance
              return parsedReplay;
            } catch (err) {
              console.error('[browserSafeParser] Error using ParsedReplay:', err);
              throw err;
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
    
    // Next, try with ReplayParser class
    if (screparsed.ReplayParser) {
      console.log('[browserSafeParser] Found ReplayParser class');
      
      try {
        const ReplayParserClass = screparsed.ReplayParser;
        
        // Create a parser instance that uses ReplayParser
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // Check if there's a static parse method on the class
              if (typeof ReplayParserClass.parse === 'function') {
                try {
                  // Try to call the static parse method with the data
                  return ReplayParserClass.parse(data);
                } catch (staticError) {
                  console.warn('[browserSafeParser] Static parse failed:', staticError);
                  // Fall through to instance method approach
                }
              }
              
              // Try to create an instance
              let parser;
              
              try {
                // Try without arguments first (safer)
                parser = Object.create(ReplayParserClass.prototype);
                ReplayParserClass.apply(parser, []);
              } catch (noArgsError) {
                console.warn('[browserSafeParser] Creating ReplayParser with no args failed:', noArgsError);
                
                try {
                  // Some implementations expect configuration options
                  parser = Object.create(ReplayParserClass.prototype);
                  ReplayParserClass.apply(parser, [{ encoding: 'cp1252' }]);
                } catch (withOptsError) {
                  console.error('[browserSafeParser] Failed to create ReplayParser instance:', withOptsError);
                  throw withOptsError;
                }
              }
              
              // Now try to use the parser instance
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
        console.log('[browserSafeParser] ✅ Parser initialized with ReplayParser');
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
                const ParsedReplayClass = defaultExport.ParsedReplay;
                return new ParsedReplayClass(data);
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
    
    // If we got here, try one last approach - scan for any function that might work
    console.log('[browserSafeParser] Trying to find any usable parsing function in the module');
    
    for (const key of Object.keys(screparsed)) {
      const exportedItem = (screparsed as any)[key];
      if (typeof exportedItem === 'function') {
        try {
          console.log(`[browserSafeParser] Trying to use '${key}' export as parser`);
          
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                return exportedItem(data);
              } catch (callError) {
                console.error(`[browserSafeParser] Error calling '${key}':`, callError);
                throw callError;
              }
            }
          };
          
          isInitialized = true;
          console.log(`[browserSafeParser] ✅ Parser initialized with '${key}' export`);
          return;
        } catch (err) {
          console.log(`[browserSafeParser] Failed to use '${key}' as parser:`, err);
          // Continue to next item
        }
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
