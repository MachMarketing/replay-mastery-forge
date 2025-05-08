
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
    
    // Print available classes/methods for debugging
    console.log('[browserSafeParser] Available exports:', 
      Object.keys(screparsed).map(key => `${key}: ${typeof (screparsed as any)[key]}`).join(', '));
    
    // Check if ReplayParser class exists and what methods it has
    if (screparsed.ReplayParser) {
      console.log('[browserSafeParser] ReplayParser found, methods:', 
        Object.getOwnPropertyNames(screparsed.ReplayParser).join(', '));
        
      // Try to create a parsing function using ReplayParser
      try {
        // Check if there's any static method we can use to parse data
        const staticMethods = Object.getOwnPropertyNames(screparsed.ReplayParser)
          .filter(name => typeof (screparsed.ReplayParser as any)[name] === 'function');
        
        console.log('[browserSafeParser] Available static methods on ReplayParser:', staticMethods);
        
        // Look for common method names that might parse a replay
        const potentialParseMethods = ['parse', 'parseReplay', 'fromBuffer', 'fromArrayBuffer', 'fromUint8Array'];
        const foundMethod = potentialParseMethods.find(method => staticMethods.includes(method));
        
        if (foundMethod) {
          console.log(`[browserSafeParser] Found potential parse method: ReplayParser.${foundMethod}`);
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                const result = (screparsed.ReplayParser as any)[foundMethod](data);
                console.log('[browserSafeParser] Parsing with static method succeeded');
                return result;
              } catch (err) {
                console.error('[browserSafeParser] Error using static method:', err);
                throw err;
              }
            }
          };
          isInitialized = true;
          console.log(`[browserSafeParser] ✅ Parser initialized using ReplayParser.${foundMethod}`);
          return;
        }
      } catch (err) {
        console.warn('[browserSafeParser] Error exploring ReplayParser methods:', err);
      }
    }
    
    // Check if ParsedReplay exists and can be used
    if (screparsed.ParsedReplay) {
      console.log('[browserSafeParser] ParsedReplay found, checking constructor');
      
      try {
        // Try to figure out how to use ParsedReplay
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // First check if we need to create a GameInfo object
              if (screparsed.GameInfo) {
                try {
                  console.log('[browserSafeParser] Attempting to create GameInfo from Uint8Array');
                  // Try to create a GameInfo from the binary data
                  const gameInfo = new (screparsed.GameInfo as any)(data);
                  // Then create a ParsedReplay from GameInfo
                  const result = new screparsed.ParsedReplay(gameInfo);
                  console.log('[browserSafeParser] Successfully created ParsedReplay from GameInfo');
                  return result;
                } catch (err) {
                  console.error('[browserSafeParser] Error creating GameInfo:', err);
                }
              }
              
              // Direct attempt - might work depending on overloads
              console.log('[browserSafeParser] Trying direct ParsedReplay construction with data');
              const result = new screparsed.ParsedReplay(data);
              console.log('[browserSafeParser] Direct ParsedReplay creation succeeded');
              return result;
            } catch (err) {
              console.error('[browserSafeParser] Error creating ParsedReplay:', err);
              throw err;
            }
          }
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using ParsedReplay constructor');
        return;
      } catch (err) {
        console.warn('[browserSafeParser] Error exploring ParsedReplay constructor:', err);
      }
    }
    
    // Check default export if it exists
    if (screparsed.default) {
      console.log('[browserSafeParser] Checking default export:', typeof screparsed.default);
      
      // If default export is a function, try using it directly
      if (typeof screparsed.default === 'function') {
        console.log('[browserSafeParser] Default export is a function, trying to use it as parser');
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              const result = screparsed.default(data);
              console.log('[browserSafeParser] Default export function succeeded');
              return result;
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
      
      // If default is an object, look for methods on it
      if (typeof screparsed.default === 'object' && screparsed.default !== null) {
        console.log('[browserSafeParser] Default export is an object, checking for methods');
        
        const defaultExportMethods = Object.getOwnPropertyNames(screparsed.default)
          .filter(name => typeof (screparsed.default as any)[name] === 'function');
        
        console.log('[browserSafeParser] Methods on default export:', defaultExportMethods);
        
        // Look for common method names that might parse a replay
        const potentialParseMethods = ['parse', 'parseReplay', 'fromBuffer', 'fromArrayBuffer', 'fromUint8Array'];
        const foundMethod = potentialParseMethods.find(method => defaultExportMethods.includes(method));
        
        if (foundMethod) {
          console.log(`[browserSafeParser] Found potential parse method on default export: ${foundMethod}`);
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                const result = (screparsed.default as any)[foundMethod](data);
                console.log('[browserSafeParser] Parsing with default export method succeeded');
                return result;
              } catch (err) {
                console.error('[browserSafeParser] Error using default export method:', err);
                throw err;
              }
            }
          };
          isInitialized = true;
          console.log(`[browserSafeParser] ✅ Parser initialized using default.${foundMethod}`);
          return;
        }
      }
    }
    
    // Last resort: try to find any function that might work
    console.log('[browserSafeParser] Exploring available functions in screparsed');
    
    const allPotentialParsers = Object.keys(screparsed)
      .filter(key => {
        const value = (screparsed as any)[key];
        return typeof value === 'function';
      });
    
    console.log('[browserSafeParser] Found potential parser functions:', allPotentialParsers);
    
    if (allPotentialParsers.length > 0) {
      const firstFunction = allPotentialParsers[0];
      console.log(`[browserSafeParser] Trying first available function as parser: ${firstFunction}`);
      
      parserInstance = {
        parse: (data: Uint8Array) => {
          try {
            const result = (screparsed as any)[firstFunction](data);
            console.log(`[browserSafeParser] Using ${firstFunction} succeeded`);
            return result;
          } catch (err) {
            console.error(`[browserSafeParser] Error using ${firstFunction}:`, err);
            throw err;
          }
        }
      };
      isInitialized = true;
      console.log(`[browserSafeParser] ✅ Parser initialized using ${firstFunction} function`);
      return;
    }
    
    throw new Error('No suitable parsing method found in screparsed module');
    
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
