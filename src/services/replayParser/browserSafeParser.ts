
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
    
    // If ReplayParser exists, check what methods it has
    if (screparsed.ReplayParser) {
      console.log('[browserSafeParser] ReplayParser found, methods:', 
        Object.getOwnPropertyNames(screparsed.ReplayParser).join(', '));
      
      // Check for static methods on ReplayParser
      const replayParserStatic = Object.getOwnPropertyNames(screparsed.ReplayParser)
        .filter(name => typeof (screparsed.ReplayParser as any)[name] === 'function' && name !== 'constructor');
      
      console.log('[browserSafeParser] Static methods available on ReplayParser:', replayParserStatic);
      
      // Try to find a static parse method
      if (replayParserStatic.includes('parse')) {
        console.log('[browserSafeParser] Found static parse method on ReplayParser');
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              return (screparsed.ReplayParser as any).parse(data);
            } catch (err) {
              console.error('[browserSafeParser] Error using static parse method:', err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using ReplayParser.parse');
        return;
      }
      
      // Try to find any other static method that might work
      const potentialMethods = ['parseReplay', 'fromBuffer', 'fromArrayBuffer', 'fromUint8Array'];
      const foundMethod = potentialMethods.find(method => replayParserStatic.includes(method));
      
      if (foundMethod) {
        console.log(`[browserSafeParser] Found potential parse method: ReplayParser.${foundMethod}`);
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              return (screparsed.ReplayParser as any)[foundMethod](data);
            } catch (err) {
              console.error(`[browserSafeParser] Error using ${foundMethod}:`, err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log(`[browserSafeParser] ✅ Parser initialized using ReplayParser.${foundMethod}`);
        return;
      }
    }
    
    // If ParsedReplay exists, try to figure out how to use it
    if (screparsed.ParsedReplay) {
      console.log('[browserSafeParser] ParsedReplay found, examining constructor');
      
      // Print the constructor parameters expected for ParsedReplay
      try {
        console.log('[browserSafeParser] ParsedReplay constructor:', 
                   Function.prototype.toString.call(screparsed.ParsedReplay));
      } catch (e) {
        console.log('[browserSafeParser] Could not print constructor details:', e);
      }
      
      try {
        // Try creating a parser that uses ParsedReplay appropriately
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // Based on the error, ParsedReplay expects 3 arguments, try using nulls
              // This is just a "best effort" approach
              const result = new screparsed.ParsedReplay(null, null, data);
              console.log('[browserSafeParser] Created ParsedReplay with nulls and data');
              return result;
            } catch (err1) {
              console.error('[browserSafeParser] Error creating ParsedReplay with nulls:', err1);
              
              try {
                // Another attempt: try with just the data
                console.log('[browserSafeParser] Trying direct construction of ParsedReplay');
                const result = new (screparsed.ParsedReplay as any)(data);
                console.log('[browserSafeParser] Direct ParsedReplay creation succeeded');
                return result;
              } catch (err2) {
                console.error('[browserSafeParser] Error with direct construction:', err2);
                
                throw new Error('Could not initialize ParsedReplay with available parameters');
              }
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using ParsedReplay constructor');
        return;
      } catch (err) {
        console.warn('[browserSafeParser] Error setting up ParsedReplay parser:', err);
      }
    }
    
    // Check for a default export that might be a function (not a direct call)
    if (screparsed.default) {
      console.log('[browserSafeParser] Checking default export:', typeof screparsed.default);
      
      if (typeof screparsed.default === 'function') {
        console.log('[browserSafeParser] Default export is a function');
        
        parserInstance = {
          parse: (data: Uint8Array) => {
            try {
              // Default export is a function but not callable directly with data
              // It might return an object with methods
              const parser = (screparsed.default as Function)();
              console.log('[browserSafeParser] Called default export as function:', parser);
              
              if (parser && typeof parser === 'object') {
                // Check if the returned object has a parse method
                if (typeof parser.parse === 'function') {
                  const result = parser.parse(data);
                  console.log('[browserSafeParser] Called parse on returned object');
                  return result;
                }
              }
              
              throw new Error('Default export function did not return a usable parser');
            } catch (err) {
              console.error('[browserSafeParser] Error using default export:', err);
              throw err;
            }
          }
        };
        
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Parser initialized using default export');
        return;
      }
      
      // Default export might be an object with methods
      if (typeof screparsed.default === 'object' && screparsed.default !== null) {
        console.log('[browserSafeParser] Default export is an object, checking methods');
        
        const methods = Object.getOwnPropertyNames(screparsed.default)
          .filter(name => typeof (screparsed.default as any)[name] === 'function');
        
        console.log('[browserSafeParser] Methods on default export:', methods);
        
        const parseMethods = ['parse', 'parseReplay', 'fromBuffer'];
        const foundMethod = parseMethods.find(method => methods.includes(method));
        
        if (foundMethod) {
          console.log(`[browserSafeParser] Found potential method on default export: ${foundMethod}`);
          
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                return (screparsed.default as any)[foundMethod](data);
              } catch (err) {
                console.error(`[browserSafeParser] Error using default.${foundMethod}:`, err);
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
    
    // Last attempt: search for any function that might work as a parser
    console.log('[browserSafeParser] Looking for any function that could work');
    
    const topLevelFunctions = Object.keys(screparsed)
      .filter(key => typeof (screparsed as any)[key] === 'function' && key !== 'ReplayParser' && key !== 'ParsedReplay');
    
    if (topLevelFunctions.length > 0) {
      console.log('[browserSafeParser] Found potential parsing functions:', topLevelFunctions);
      
      for (const funcName of topLevelFunctions) {
        try {
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                return (screparsed as any)[funcName](data);
              } catch (parseErr) {
                console.error(`[browserSafeParser] Error using ${funcName}:`, parseErr);
                throw parseErr;
              }
            }
          };
          
          isInitialized = true;
          console.log(`[browserSafeParser] ✅ Parser initialized using ${funcName} function`);
          return;
        } catch (e) {
          console.warn(`[browserSafeParser] Failed to use ${funcName}:`, e);
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

