
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
    
    try {
      // According to the screparsed documentation, the main API is parseReplay
      // which is available on the default export
      console.log('[browserSafeParser] Looking for parse function in module:', Object.keys(parserModule));
      
      // Check if parseReplay is available directly on the module
      if (typeof parserModule.parseReplay === 'function') {
        console.log('[browserSafeParser] Using parserModule.parseReplay function');
        result = await parserModule.parseReplay(data);
      }
      // Check if the default export is the parse function
      else if (typeof parserModule.default === 'function') {
        console.log('[browserSafeParser] Using parserModule.default function');
        result = await parserModule.default(data);
      }
      // Check if default.parseReplay exists
      else if (parserModule.default && typeof parserModule.default.parseReplay === 'function') {
        console.log('[browserSafeParser] Using parserModule.default.parseReplay function');
        result = await parserModule.default.parseReplay(data);
      }
      // Check if there's a parse method on default
      else if (parserModule.default && typeof parserModule.default.parse === 'function') {
        console.log('[browserSafeParser] Using parserModule.default.parse function');
        result = await parserModule.default.parse(data);
      }
      // Try with ParsedReplay (if it's a class constructor)
      else if (parserModule.ParsedReplay) {
        console.log('[browserSafeParser] Trying with ParsedReplay constructor');
        try {
          result = new parserModule.ParsedReplay(data);
        } catch (e) {
          console.log('[browserSafeParser] ParsedReplay constructor failed:', e);
          
          // Look for static methods
          const methods = Object.getOwnPropertyNames(parserModule.ParsedReplay);
          console.log('[browserSafeParser] Available ParsedReplay methods:', methods);
          
          // Try with fromBuffer, fromUint8Array, or other likely method names
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
           (value.name && value.name.toLowerCase().includes('parse')))
        );
        
        if (parseFunction) {
          console.log('[browserSafeParser] Found potential parse function:', parseFunction.name || 'anonymous');
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
