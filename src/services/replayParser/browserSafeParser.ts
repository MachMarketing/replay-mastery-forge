
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
    console.log('[browserSafeParser] Using parser from screparsed');
    
    try {
      // Check for different parsing approaches, starting with ReplayParser
      if (parserModule.ReplayParser) {
        console.log('[browserSafeParser] Found ReplayParser in module');
        
        // Check for parsing methods that might work
        const parseMethod = Object.values(parserModule).find(
          (exp: any) => typeof exp === 'function' && 
                        (exp.toString().includes('parse') || 
                         (typeof exp === 'function' && 
                          exp.name && 
                          String(exp.name).toString().toLowerCase().includes('parse')))
        );
        
        if (parseMethod) {
          console.log('[browserSafeParser] Using found parse method');
          result = await (parseMethod as Function)(data);
        } else if (parserModule.default && typeof parserModule.default === 'function') {
          console.log('[browserSafeParser] Using default export as function');
          result = await parserModule.default(data);
        }
      } else {
        console.log('[browserSafeParser] ReplayParser not available as expected');
      }
      
      // If we still don't have a result, try with ParsedReplay if available
      if (!result && parserModule.ParsedReplay) {
        console.log('[browserSafeParser] Trying with ParsedReplay');
        
        // Look for methods on ParsedReplay that might help
        const methods = Object.getOwnPropertyNames(parserModule.ParsedReplay);
        console.log('[browserSafeParser] Available ParsedReplay methods:', methods);
        
        // Try any method that sounds like it could create from binary data
        for (const methodName of methods) {
          if (/from|parse|load|create/i.test(methodName) && 
              typeof parserModule.ParsedReplay[methodName] === 'function') {
            try {
              console.log(`[browserSafeParser] Trying ParsedReplay.${methodName}`);
              result = await parserModule.ParsedReplay[methodName](data.buffer || data);
              if (result) break;
            } catch (e) {
              console.log(`[browserSafeParser] Method ${methodName} failed:`, e);
              // Continue to next method
            }
          }
        }
      }
      
      // Last fallback - try default export directly
      if (!result && parserModule.default) {
        console.log('[browserSafeParser] Trying default export');
        if (typeof parserModule.default === 'function') {
          result = await parserModule.default(data);
        } else if (parserModule.default.parse && typeof parserModule.default.parse === 'function') {
          result = await parserModule.default.parse(data);
        }
      }
    } catch (err) {
      console.error('[browserSafeParser] Error during primary parsing:', err);
      
      // Final fallback: try any function in the module that might be able to parse
      try {
        console.log('[browserSafeParser] Trying module-level fallbacks');
        const moduleKeys = Object.keys(parserModule);
        for (const key of moduleKeys) {
          // Skip keys we've already tried
          if (['ReplayParser', 'ParsedReplay', 'default'].includes(key)) {
            continue;
          }
          
          if (typeof parserModule[key] === 'function') {
            try {
              console.log(`[browserSafeParser] Trying ${key} function`);
              result = await parserModule[key](data);
              if (result) {
                console.log(`[browserSafeParser] Successfully parsed using ${key}`);
                break;
              }
            } catch (e) {
              // Continue to next function
            }
          }
        }
        
        if (!result) {
          throw new Error('No suitable parsing method found in the module');
        }
      } catch (err2) {
        console.error('[browserSafeParser] All parsing attempts failed:', err2);
        throw err2;
      }
    }
    
    // Restore original error handler
    window.onerror = originalOnError;
    
    if (wasmError) {
      throw wasmError;
    }
    
    if (!result) {
      throw new Error('Failed to parse replay using screparsed');
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
