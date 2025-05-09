
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

// Interface for expected constructor signatures
interface ParsedReplay {
  parseReplay?: (data: Uint8Array) => any;
  parse?: (data: Uint8Array) => any;
}

// Complete GameInfo interface to satisfy TypeScript
interface GameInfo {
  engine: string;
  frames: number;
  startTime: number;
  title: string;
  map: string;
  type: string;
  isReplayOwner: boolean;
  playerStructs: Record<string, any>;
  gameType: string;
  replayPath: string;
  saveTime: number;
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
              // Try to instantiate the class with different argument patterns
              let parsedReplay;
              
              try {
                // Create mock GameInfo to satisfy type requirements
                const mockGameInfo: GameInfo = {
                  engine: "broodwar",
                  frames: 0,
                  startTime: Date.now(),
                  title: "Replay",
                  map: "Unknown",
                  type: "replay",
                  isReplayOwner: true,
                  playerStructs: {},
                  gameType: "melee",
                  replayPath: "",
                  saveTime: Date.now()
                };
                
                // Use type assertion to bypass type checking for constructor
                // This is necessary because the actual API may differ from TypeScript definitions
                try {
                  parsedReplay = new (ParsedReplayClass as any)(data, mockGameInfo, {});
                  console.log('[browserSafeParser] Created ParsedReplay with three arguments');
                } catch (constructorError) {
                  console.warn('[browserSafeParser] Three args constructor call failed:', constructorError);
                  // Try an alternative construction approach
                  parsedReplay = new (ParsedReplayClass as any)(mockGameInfo, data, {});
                  console.log('[browserSafeParser] Created ParsedReplay with reordered three arguments');
                }
              } catch (threeArgError) {
                console.warn('[browserSafeParser] Three args constructor failed:', threeArgError);
                
                try {
                  // Try with single argument as fallback with mock GameInfo
                  const mockGameInfo: GameInfo = {
                    engine: "broodwar",
                    frames: 0,
                    startTime: Date.now(),
                    title: "Replay",
                    map: "Unknown",
                    type: "replay",
                    isReplayOwner: true,
                    playerStructs: {},
                    gameType: "melee",
                    replayPath: "",
                    saveTime: Date.now()
                  };
                  
                  // Use type assertion to bypass strict typing
                  parsedReplay = new (ParsedReplayClass as any)(mockGameInfo);
                  console.log('[browserSafeParser] Created ParsedReplay with single GameInfo argument');
                  
                  // If successful, try to use parseReplay method with our data
                  if (parsedReplay && typeof (parsedReplay as any).parseReplay === 'function') {
                    return (parsedReplay as any).parseReplay(data);
                  }
                } catch (singleArgError) {
                  console.warn('[browserSafeParser] Single arg constructor failed:', singleArgError);
                  
                  try {
                    // Try with no arguments (some WASM bindings expect this pattern)
                    parsedReplay = new (ParsedReplayClass as any)();
                    console.log('[browserSafeParser] Created ParsedReplay with no arguments');
                    
                    // Try to find a method to parse the data
                    if (parsedReplay && typeof (parsedReplay as any).parseReplay === 'function') {
                      return (parsedReplay as any).parseReplay(data);
                    } else if (parsedReplay && typeof (parsedReplay as any).parse === 'function') {
                      return (parsedReplay as any).parse(data);
                    } else {
                      console.warn('[browserSafeParser] No parse methods found on instance');
                      // Just return the instance as a fallback
                      return parsedReplay;
                    }
                  } catch (noArgsError) {
                    console.error('[browserSafeParser] All constructor attempts failed:', noArgsError);
                    throw new Error('Could not instantiate ParsedReplay class');
                  }
                }
              }
              
              // If we got here, we have a parsedReplay instance
              // Check if it's already a parsed result or if we need to process it further
              if (parsedReplay && typeof parsedReplay === 'object' && 
                  ((parsedReplay as any).players || (parsedReplay as any).header || (parsedReplay as any).commands)) {
                return parsedReplay;
              }
              
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
        // Don't try to instantiate directly - access via static methods or properties
        const ReplayParserClass = screparsed.ReplayParser;
        
        // Create a parser instance that uses ReplayParser - handle possible constructor access issues
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // Different approach to avoid constructor access issues
              console.log('[browserSafeParser] Trying methods on ReplayParser');
              
              // Use type assertion for flexibility
              const classAny = ReplayParserClass as any;
              
              // Try static methods first if they exist
              if (typeof classAny.parse === 'function') {
                console.log('[browserSafeParser] Using static parse method');
                return classAny.parse(data);
              }
              
              if (typeof classAny.fromArrayBuffer === 'function') {
                console.log('[browserSafeParser] Using static fromArrayBuffer method');
                const result = classAny.fromArrayBuffer(data.buffer);
                if (result && typeof result.parse === 'function') {
                  return result.parse();
                }
                return result;
              }
              
              if (typeof classAny.fromUint8Array === 'function') {
                console.log('[browserSafeParser] Using static fromUint8Array method');
                const result = classAny.fromUint8Array(data);
                if (result && typeof result.parse === 'function') {
                  return result.parse();
                }
                return result;
              }
              
              // If we can't use static methods, try an approach that doesn't rely on constructors
              console.log('[browserSafeParser] Trying alternative approaches');
              
              // Check if the module itself has parser functions
              if (typeof (screparsed as any).createParser === 'function') {
                console.log('[browserSafeParser] Using createParser factory function');
                const parser = (screparsed as any).createParser(data);
                if (parser && typeof parser.parse === 'function') {
                  return parser.parse();
                }
                return parser;
              }
              
              // Last resort - try direct function call
              if (typeof (screparsed as any).parseReplay === 'function') {
                console.log('[browserSafeParser] Using direct parseReplay function');
                return (screparsed as any).parseReplay(data);
              }
              
              // Try direct function call with mock GameInfo
              // Create mock GameInfo to satisfy type requirements
              const mockGameInfo: GameInfo = {
                engine: "broodwar",
                frames: 0,
                startTime: Date.now(),
                title: "Replay",
                map: "Unknown",
                type: "replay",
                isReplayOwner: true,
                playerStructs: {},
                gameType: "melee",
                replayPath: "",
                saveTime: Date.now()
              };
              
              if (typeof (screparsed as any).parseReplayData === 'function') {
                console.log('[browserSafeParser] Using parseReplayData function');
                return (screparsed as any).parseReplayData(data, mockGameInfo);
              }
              
              // Try instantiating the parser using alternate methods
              // This is the problematic part - we need to handle the "not callable" error
              let parser;
              try {
                // Try to access any constructor-like functionality
                if (typeof classAny.create === 'function') {
                  parser = classAny.create();
                } else if (typeof classAny.getInstance === 'function') {
                  parser = classAny.getInstance();
                } else {
                  // Instead of directly trying to instantiate with 'new', 
                  // check if we can safely instantiate first
                  const descriptor = Object.getOwnPropertyDescriptor(classAny, 'prototype');
                  if (descriptor && !descriptor.writable && !descriptor.configurable) {
                    console.log('[browserSafeParser] ReplayParser has a non-instantiable prototype');
                    // We can't instantiate it directly, try to use it as a factory or function
                    if (typeof classAny === 'function') {
                      // Try calling it as a function without 'new'
                      parser = classAny(data);
                    } else {
                      throw new Error('ReplayParser cannot be instantiated or called');
                    }
                  } else {
                    // We can try instantiation
                    parser = new classAny();
                  }
                }
                
                // If we got a parser, try to use it
                if (parser && typeof parser.parse === 'function') {
                  return parser.parse(data);
                } else if (parser) {
                  // If no parse method but we got something, return it
                  return parser;
                }
              } catch (instantiationError) {
                console.error('[browserSafeParser] Error instantiating ReplayParser:', instantiationError);
                // Continue to next approach
              }
              
              throw new Error('No suitable parsing method found in ReplayParser');
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
                // Create mock GameInfo to satisfy type requirements
                const mockGameInfo: GameInfo = {
                  engine: "broodwar",
                  frames: 0,
                  startTime: Date.now(),
                  title: "Replay",
                  map: "Unknown",
                  type: "replay",
                  isReplayOwner: true,
                  playerStructs: {},
                  gameType: "melee",
                  replayPath: "",
                  saveTime: Date.now()
                };
                
                // Use type assertion to bypass type checking
                const parsedReplay = new (ParsedReplayClass as any)(data, mockGameInfo, {});
                return parsedReplay;
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
          
          // For safety, we wrap it in a try/catch
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
