
/**
 * Browser-safe wrapper for screparsed replay parser
 */

// Import the specific types
import { ParsedReplayData } from './types';

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
    console.log('[browserSafeParser] Initializing screparsed parser');
    
    // Import the screparsed module
    const screparsed = await import('screparsed');
    console.log('[browserSafeParser] Screparsed import successful:', Object.keys(screparsed));
    
    // Store the module for later use
    parserModule = screparsed;
    isInitialized = true;
    console.log('[browserSafeParser] ✅ Parser initialized successfully');
  } catch (err) {
    console.error('[browserSafeParser] Failed to initialize parser:', err);
    throw new Error(`Failed to initialize replay parser: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Type for constructable functions
interface Constructor {
  new (...args: any[]): any;
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
    
    let result = null;
    console.log('[browserSafeParser] Using parser from screparsed');
    
    try {
      // According to documentation, the main API is parseReplay
      if (parserModule.parseReplay && typeof parserModule.parseReplay === 'function') {
        console.log('[browserSafeParser] Using documented parseReplay function');
        try {
          result = await parserModule.parseReplay(data);
        } catch (e) {
          console.error('[browserSafeParser] Error with parseReplay:', e);
          throw e;
        }
      }
      // Try the ParsedReplay constructor if available
      else if (parserModule.ParsedReplay) {
        console.log('[browserSafeParser] Trying with ParsedReplay');
        try {
          const ParsedReplayConstructor = parserModule.ParsedReplay as unknown as Constructor;
          result = new ParsedReplayConstructor(data);
        } catch (e) {
          console.error('[browserSafeParser] Error with ParsedReplay constructor:', e);
          
          // Check for static methods on ParsedReplay
          const methods = Object.getOwnPropertyNames(parserModule.ParsedReplay);
          console.log('[browserSafeParser] Available ParsedReplay methods:', methods);
          
          // Try with static methods that might work for parsing
          for (const methodName of ['fromBuffer', 'fromUint8Array', 'parse', 'fromArray', 'fromData']) {
            if (typeof parserModule.ParsedReplay[methodName] === 'function') {
              try {
                console.log(`[browserSafeParser] Trying ParsedReplay.${methodName}`);
                result = await parserModule.ParsedReplay[methodName](data);
                if (result) {
                  console.log(`[browserSafeParser] Successfully parsed with ParsedReplay.${methodName}`);
                  break;
                }
              } catch (err) {
                console.log(`[browserSafeParser] ParsedReplay.${methodName} failed:`, err);
              }
            }
          }
        }
      }
      // Check if module.default is available
      else if (parserModule.default) {
        console.log('[browserSafeParser] Using default export');
        // Check if default is a function
        if (typeof parserModule.default === 'function') {
          try {
            result = await parserModule.default(data);
          } catch (e) {
            console.log('[browserSafeParser] Error with default function:', e);
          }
        }
        // Check if default.parseReplay exists
        else if (parserModule.default.parseReplay && typeof parserModule.default.parseReplay === 'function') {
          try {
            result = await parserModule.default.parseReplay(data);
          } catch (e) {
            console.log('[browserSafeParser] Error with default.parseReplay:', e);
          }
        }
        // Check if default.parse exists
        else if (parserModule.default.parse && typeof parserModule.default.parse === 'function') {
          try {
            result = await parserModule.default.parse(data);
          } catch (e) {
            console.log('[browserSafeParser] Error with default.parse:', e);
          }
        }
      }
      
      // If nothing worked so far, try to find any function that might work
      if (!result) {
        console.log('[browserSafeParser] Trying to find any parse function in the module');
        
        // Log all keys to help with debugging
        Object.keys(parserModule).forEach(key => {
          console.log(`[browserSafeParser] Module key: ${key}, type: ${typeof parserModule[key]}`);
          
          // For objects, log their properties too
          if (typeof parserModule[key] === 'object' && parserModule[key] !== null) {
            console.log(`[browserSafeParser] Properties of ${key}:`, Object.keys(parserModule[key]));
          }
        });
        
        // Try any function that looks like a parser
        const parseFunction = Object.values(parserModule).find((value: any) => 
          typeof value === 'function' && 
          (String(value).includes('parse') || 
           (typeof value === 'function' && 
            value.name && 
            String(value.name).toLowerCase().includes('parse')))
        );
        
        if (parseFunction) {
          console.log('[browserSafeParser] Found potential parse function');
          result = await (parseFunction as Function)(data);
        }
      }
      
      // If still no result, throw error
      if (!result) {
        throw new Error('Could not find a working parse function in screparsed module');
      }
    } catch (err) {
      console.error('[browserSafeParser] Error during parsing:', err);
      throw err;
    }
    
    // Restore original error handler
    window.onerror = originalOnError;
    
    if (wasmError) {
      throw wasmError;
    }
    
    if (!result) {
      throw new Error('Failed to parse replay using screparsed');
    }
    
    console.log('[browserSafeParser] Parsing completed successfully, result type:', typeof result);
    if (typeof result === 'object') {
      console.log('[browserSafeParser] Result keys:', Object.keys(result));
    }
    
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
