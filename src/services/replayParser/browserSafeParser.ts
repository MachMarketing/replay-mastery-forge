
/**
 * Browser-safe wrapper for screparsed replay parser
 */

// Import the specific types
import { ParsedReplayData } from './types';
import { ReplayParser } from 'screparsed';

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
 * Using a direct approach with the documented API
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
    
    // Try multiple approaches to parse the replay data
    let result = null;
    const replayError = new Error('Failed to parse replay using any available method');
    
    // Approach 1: Try using direct documented API with ReplayParser if available
    if (parserModule.ReplayParser) {
      try {
        console.log('[browserSafeParser] Trying ReplayParser with documented API');
        const ReplayParserClass = parserModule.ReplayParser;
        
        if (typeof ReplayParserClass.fromUint8Array === 'function') {
          console.log('[browserSafeParser] Using ReplayParser.fromUint8Array method');
          const parser = ReplayParserClass.fromUint8Array(data);
          if (parser && typeof parser.parse === 'function') {
            result = await parser.parse();
            console.log('[browserSafeParser] Successfully parsed using ReplayParser.fromUint8Array');
          }
        } else if (typeof ReplayParserClass.fromArrayBuffer === 'function') {
          console.log('[browserSafeParser] Using ReplayParser.fromArrayBuffer method');
          // Create an ArrayBuffer from the Uint8Array
          const parser = ReplayParserClass.fromArrayBuffer(data.buffer);
          if (parser && typeof parser.parse === 'function') {
            result = await parser.parse();
            console.log('[browserSafeParser] Successfully parsed using ReplayParser.fromArrayBuffer');
          }
        }
      } catch (err) {
        console.error('[browserSafeParser] Error using ReplayParser direct API:', err);
      }
    }
    
    // Approach 2: Try using ReplayParser with constructor patterns if Approach 1 failed
    if (!result && parserModule.ReplayParser) {
      try {
        console.log('[browserSafeParser] Trying alternative ReplayParser constructor patterns');
        const ReplayParserClass = parserModule.ReplayParser;
        
        // Try with direct constructor
        try {
          const parser = new ReplayParserClass(data);
          if (parser && typeof parser.parse === 'function') {
            result = await parser.parse();
            console.log('[browserSafeParser] Successfully parsed using new ReplayParser(data)');
          }
        } catch (err) {
          console.warn('[browserSafeParser] Error with direct constructor:', err);
          
          // Try with ArrayBuffer
          try {
            const parser = new ReplayParserClass(data.buffer);
            if (parser && typeof parser.parse === 'function') {
              result = await parser.parse();
              console.log('[browserSafeParser] Successfully parsed using new ReplayParser(data.buffer)');
            }
          } catch (err2) {
            console.warn('[browserSafeParser] Error with ArrayBuffer constructor:', err2);
          }
        }
      } catch (err) {
        console.error('[browserSafeParser] Error using ReplayParser constructor patterns:', err);
      }
    }
    
    // Approach 3: Try using ParsedReplay if it exists and Approach 1 & 2 failed
    if (!result && parserModule.ParsedReplay) {
      try {
        console.log('[browserSafeParser] Trying ParsedReplay class');
        const ParsedReplayClass = parserModule.ParsedReplay;
        
        // Create mock GameInfo to satisfy type requirements
        const mockGameInfo = {
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
        
        let parsedReplay;
        try {
          // Try to instantiate with data and mockGameInfo
          parsedReplay = new ParsedReplayClass(data, mockGameInfo);
          result = parsedReplay;
          console.log('[browserSafeParser] Successfully created ParsedReplay instance');
        } catch (err) {
          console.warn('[browserSafeParser] Error instantiating ParsedReplay:', err);
          
          try {
            // Try alternative constructor patterns
            parsedReplay = new ParsedReplayClass(mockGameInfo);
            if (parsedReplay && typeof parsedReplay.parseReplay === 'function') {
              // Use Function.prototype.call.call to ensure it's callable
              try {
                result = Function.prototype.call.call(
                  parsedReplay.parseReplay, 
                  parsedReplay, 
                  data
                );
                console.log('[browserSafeParser] Successfully parsed using ParsedReplay.parseReplay');
              } catch (callError) {
                console.error('[browserSafeParser] Error calling parseReplay method:', callError);
              }
            }
          } catch (err2) {
            console.warn('[browserSafeParser] Error using alternative ParsedReplay patterns:', err2);
          }
        }
      } catch (err) {
        console.error('[browserSafeParser] Error using ParsedReplay:', err);
      }
    }
    
    // Approach 4: Try using any parse function directly
    if (!result) {
      try {
        const directMethods = [
          'parseReplay',
          'parseReplayData',
          'parse'
        ];
        
        for (const methodName of directMethods) {
          if (typeof parserModule[methodName] === 'function') {
            console.log(`[browserSafeParser] Trying direct ${methodName} function`);
            try {
              result = await parserModule[methodName](data);
              if (result) {
                console.log(`[browserSafeParser] Successfully parsed using ${methodName} function`);
                break;
              }
            } catch (err) {
              console.warn(`[browserSafeParser] Error using ${methodName}:`, err);
            }
          }
        }
      } catch (err) {
        console.error('[browserSafeParser] Error using direct methods:', err);
      }
    }
    
    // Restore original error handler
    window.onerror = originalOnError;
    
    if (wasmError) {
      throw wasmError;
    }
    
    if (!result) {
      throw replayError;
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
