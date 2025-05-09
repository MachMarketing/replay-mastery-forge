
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
          try {
            // Type assertion to ensure TypeScript knows this is callable
            const parseFunction = parseMethod as Function;
            result = await parseFunction(data);
          } catch (e) {
            // Fix: Check if error is about needing the "new" keyword
            console.log('[browserSafeParser] Error with parse method, might need "new":', e);
            if (e instanceof TypeError && e.message.includes('cannot be invoked without \'new\'')) {
              console.log('[browserSafeParser] Trying with "new" operator');
              try {
                // Use the previously defined parseFunction variable
                result = await new parseFunction(data);
              } catch (newError) {
                console.error('[browserSafeParser] Error with new operator too:', newError);
                throw newError;
              }
            } else {
              throw e;
            }
          }
        } else if (parserModule.default && typeof parserModule.default === 'function') {
          console.log('[browserSafeParser] Using default export as function');
          const defaultFunction = parserModule.default as Function;
          try {
            result = await defaultFunction(data);
          } catch (e) {
            console.log('[browserSafeParser] Error with default function, might need "new":', e);
            // Try using "new" if it's a constructor
            if (e instanceof TypeError && e.message.includes('cannot be invoked without \'new\'')) {
              console.log('[browserSafeParser] Trying default with "new" operator');
              result = await new defaultFunction(data);
            } else {
              throw e;
            }
          }
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
              // Store the method in a variable before using it
              const methodFunction = parserModule.ParsedReplay[methodName] as Function;
              result = await methodFunction(data.buffer || data);
              if (result) break;
            } catch (e) {
              console.log(`[browserSafeParser] Method ${methodName} failed:`, e);
              
              // Try using as constructor if applicable
              if (e instanceof TypeError && e.message.includes('cannot be invoked without \'new\'')) {
                try {
                  console.log(`[browserSafeParser] Trying ParsedReplay.${methodName} with "new" operator`);
                  // Store the method in a variable before using it with new
                  const constructorFunction = parserModule.ParsedReplay[methodName] as Function;
                  result = await new constructorFunction(data.buffer || data);
                  if (result) break;
                } catch (ne) {
                  console.log(`[browserSafeParser] Constructor ${methodName} failed:`, ne);
                }
              }
              // Continue to next method
            }
          }
        }
        
        // Try instantiating ParsedReplay directly as a last resort
        if (!result) {
          try {
            console.log('[browserSafeParser] Trying to instantiate ParsedReplay directly');
            result = new parserModule.ParsedReplay(data);
          } catch (e) {
            console.log('[browserSafeParser] Direct instantiation failed:', e);
          }
        }
      }
      
      // Last fallback - try default export directly
      if (!result && parserModule.default) {
        console.log('[browserSafeParser] Trying default export');
        if (typeof parserModule.default === 'function') {
          try {
            const defaultFunction = parserModule.default as Function;
            result = await defaultFunction(data);
          } catch (e) {
            // Try using "new" if it's a constructor
            if (e instanceof TypeError && e.message.includes('cannot be invoked without \'new\'')) {
              console.log('[browserSafeParser] Trying default with "new" operator');
              const defaultConstructor = parserModule.default as Function;
              result = await new defaultConstructor(data);
            } else {
              throw e;
            }
          }
        } else if (parserModule.default.parse && typeof parserModule.default.parse === 'function') {
          try {
            const parseFunction = parserModule.default.parse as Function;
            result = await parseFunction(data);
          } catch (e) {
            // Try using "new" if it's a constructor
            if (e instanceof TypeError && e.message.includes('cannot be invoked without \'new\'')) {
              console.log('[browserSafeParser] Trying default.parse with "new" operator');
              const parseConstructor = parserModule.default.parse as Function;
              result = await new parseConstructor(data);
            } else {
              throw e;
            }
          }
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
              // Store the method in a variable before using it
              const keyFunction = parserModule[key] as Function;
              result = await keyFunction(data);
              if (result) {
                console.log(`[browserSafeParser] Successfully parsed using ${key}`);
                break;
              }
            } catch (e) {
              // Try using "new" if it's a constructor
              if (e instanceof TypeError && e.message.includes('cannot be invoked without \'new\'')) {
                console.log(`[browserSafeParser] Trying ${key} with "new" operator`);
                try {
                  // Store the method in a variable before using it with new
                  const keyConstructor = parserModule[key] as Function;
                  result = await new keyConstructor(data);
                  if (result) {
                    console.log(`[browserSafeParser] Successfully parsed using new ${key}`);
                    break;
                  }
                } catch (ne) {
                  // Continue to next function
                }
              }
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
