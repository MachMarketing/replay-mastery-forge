
/**
 * Browser-Safe Parser implementation
 * 
 * This module provides a browser-compatible wrapper around the JSSUH parser
 * with appropriate error handling and timeouts.
 */
import type { ParsedReplayResult } from '../replayParserService';

// Polyfill globals that might be needed
const polyfillGlobals = () => {
  console.log('[browserSafeParser] Starting global polyfills');
  
  // Ensure global process exists
  if (typeof globalThis.process === 'undefined') {
    console.log('[browserSafeParser] Creating global.process object');
    (globalThis as any).process = {
      env: {},
      browser: true,
    };
  } else {
    console.log('[browserSafeParser] global.process exists:', typeof globalThis.process);
  }

  // Ensure process.env exists
  if (!(globalThis as any).process.env) {
    console.log('[browserSafeParser] Creating process.env object');
    (globalThis as any).process.env = {};
  } else {
    console.log('[browserSafeParser] process.env exists:', typeof (globalThis as any).process.env);
  }
  
  // CRITICAL: Explicitly ensure process.nextTick is available
  if (typeof (globalThis as any).process.nextTick !== 'function') {
    console.log('[browserSafeParser] Adding nextTick implementation to process');
    (globalThis as any).process.nextTick = function(callback: Function, ...args: any[]) {
      return setTimeout(() => callback(...args), 0);
    };
    console.log('[browserSafeParser] ✅ process.nextTick polyfilled successfully');
  } else {
    console.log('[browserSafeParser] process.nextTick already exists:', 
                typeof (globalThis as any).process.nextTick);
  }
  
  // Mirror to window object for libraries that directly access it
  if (typeof window !== 'undefined') {
    if (!window.process) {
      console.log('[browserSafeParser] Mirroring process to window.process');
      (window as any).process = (globalThis as any).process;
    }
    console.log('[browserSafeParser] window.process check:', 
                window.process ? 'exists' : 'missing',
                'nextTick:', typeof (window as any).process?.nextTick);
  }

  // setTimeout and clearTimeout
  if (typeof globalThis.setTimeout === 'undefined' && typeof setTimeout === 'function') {
    (globalThis as any).setTimeout = setTimeout;
    console.log('[browserSafeParser] Polyfilled global.setTimeout');
  }

  if (typeof globalThis.clearTimeout === 'undefined' && typeof clearTimeout === 'function') {
    (globalThis as any).clearTimeout = clearTimeout;
    console.log('[browserSafeParser] Polyfilled global.clearTimeout');
  }
};

// Flag to track parser initialization
let parserInitialized = false;

// Store the parser instance once initialized
let JSSUHModule: any = null;

// Define the timeout duration for parser operations - 60 seconds as standard
const PARSER_TIMEOUT_MS = 60000; // 60 seconds timeout

/**
 * Initialize the browser-safe parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  if (parserInitialized) {
    console.log('[browserSafeParser] Parser already initialized');
    return;
  }
  
  console.log('[browserSafeParser] Initializing browser-safe parser');
  
  try {
    // Apply all global polyfills - CRITICAL for stream functionality
    polyfillGlobals();
    
    // Additional safety check for process.nextTick
    if (typeof (globalThis as any).process.nextTick !== 'function') {
      console.error('[browserSafeParser] ⚠️ process.nextTick still not available after polyfill!');
      throw new Error('Critical polyfill failure: process.nextTick unavailable');
    } else {
      console.log('[browserSafeParser] process.nextTick verification:', typeof (globalThis as any).process.nextTick);
      
      // Test the nextTick function
      let nextTickWorked = false;
      (globalThis as any).process.nextTick(() => {
        nextTickWorked = true;
        console.log('[browserSafeParser] ✅ process.nextTick test successful');
      });
      
      // If nextTick is properly polyfilled but not actually working, we'll see this message
      console.log('[browserSafeParser] process.nextTick test initiated, waiting for callback');
    }
    
    // Dynamically import jssuh
    console.log('[browserSafeParser] Attempting to import JSSUH module');
    const jssuhModule = await import('jssuh');
    
    // Check the module structure
    if (jssuhModule && typeof jssuhModule === 'object') {
      console.log('[browserSafeParser] JSSUH import successful, module structure:', 
                  Object.keys(jssuhModule).length > 0 ? 'named exports' : 'default export');
      console.log('[browserSafeParser] Available exports:', Object.keys(jssuhModule));
      
      // Store the JSSUH module for later use
      JSSUHModule = jssuhModule;
      parserInitialized = true;
      console.log('[browserSafeParser] JSSUH parser initialized successfully');
    } else {
      console.error('[browserSafeParser] Invalid JSSUH module structure');
      throw new Error('Invalid JSSUH module structure');
    }
  } catch (error) {
    console.error('[browserSafeParser] Error initializing browser-safe parser:', error);
    throw new Error(`Failed to initialize browser-safe parser: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse replay data with the browser-safe parser using direct data processing
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<any> {
  console.log('[browserSafeParser] Starting to parse with browser-safe parser');
  
  if (!parserInitialized || !JSSUHModule) {
    console.error('[browserSafeParser] Parser not initialized');
    throw new Error('Browser-safe parser not initialized. Call initBrowserSafeParser() first.');
  }
  
  console.log('[browserSafeParser] File data length:', data.length);
  
  try {
    // Import stream module only in this function, to avoid early errors
    console.log('[browserSafeParser] Setting up stream-based parsing');
    
    // Create a readable stream from the data
    let Readable: any;
    
    try {
      // Try to import the stream module with explicit error handling
      console.log('[browserSafeParser] Attempting to import stream-browserify');
      const stream = await import('stream-browserify');
      
      if (!stream || !stream.Readable) {
        throw new Error('stream-browserify import succeeded but Readable is not available');
      }
      
      Readable = stream.Readable;
      console.log('[browserSafeParser] Successfully imported stream-browserify, Readable available:', !!Readable);
    } catch (err) {
      console.error('[browserSafeParser] Failed to import stream-browserify:', err);
      throw new Error('Failed to import stream module. Make sure stream-browserify is installed.');
    }

    if (!Readable || typeof Readable !== 'function') {
      console.error('[browserSafeParser] Readable stream constructor not available');
      throw new Error('Readable stream constructor not available');
    }

    // Creating the readable stream with explicit error handling
    console.log('[browserSafeParser] Creating readable stream from data');
    const readableStream = new Readable();
    
    if (!readableStream) {
      throw new Error('Failed to create readableStream instance');
    }
    
    // Push the data to the stream
    readableStream.push(data);
    readableStream.push(null); // Signal the end of the stream
    
    console.log('[browserSafeParser] Created readable stream from data');
    
    // Return a promise that will resolve with the parsed data
    return new Promise((resolve, reject) => {
      // Set a timeout
      const timeoutId = setTimeout(() => {
        console.error(`[browserSafeParser] Parsing timed out after ${PARSER_TIMEOUT_MS/1000} seconds`);
        reject(new Error(`Parsing timed out after ${PARSER_TIMEOUT_MS/1000} seconds`));
      }, PARSER_TIMEOUT_MS);
      
      // Extract the ReplayParser constructor from JSSUH module
      let ReplayParser;
      
      // Check for various export patterns
      if (JSSUHModule.default && typeof JSSUHModule.default === 'function') {
        ReplayParser = JSSUHModule.default;
        console.log('[browserSafeParser] Using default export constructor for ReplayParser');
      } else if (JSSUHModule.ReplayParser && typeof JSSUHModule.ReplayParser === 'function') {
        ReplayParser = JSSUHModule.ReplayParser;
        console.log('[browserSafeParser] Using named export constructor for ReplayParser');
      } else {
        console.log('[browserSafeParser] Available exports:', Object.keys(JSSUHModule));
        // Try to find a constructor in the exports
        for (const key of Object.keys(JSSUHModule)) {
          if (typeof JSSUHModule[key] === 'function') {
            ReplayParser = JSSUHModule[key];
            console.log(`[browserSafeParser] Using export '${key}' as constructor for ReplayParser`);
            break;
          }
        }
      }
      
      if (!ReplayParser) {
        console.error('[browserSafeParser] Could not find ReplayParser constructor in module');
        clearTimeout(timeoutId);
        reject(new Error('ReplayParser constructor not found in JSSUH module'));
        return;
      }
      
      try {
        // Create a parser instance
        const parserInstance = new ReplayParser();
        console.log('[browserSafeParser] Created parser instance');
        
        // Verify that parserInstance is an EventEmitter with write method
        if (!parserInstance || typeof parserInstance.write !== 'function') {
          throw new Error('Parser instance is not a valid writable stream');
        }
        
        // Collected data
        const result: any = {
          header: null,
          commands: [],
          players: [],
          chat: []
        };
        
        // Set up event listeners
        parserInstance.on('error', (err: any) => {
          console.error('[browserSafeParser] Parser error:', err);
          clearTimeout(timeoutId);
          reject(new Error(`Parser error: ${err instanceof Error ? err.message : err?.toString() || 'Unknown error'}`));
        });
        
        parserInstance.on('replayHeader', (header: any) => {
          console.log('[browserSafeParser] Received replay header:', header);
          result.header = header;
        });
        
        // Listen for commands (core gameplay actions)
        parserInstance.on('command', (command: any) => {
          if (result.commands.length < 5) {
            console.log('[browserSafeParser] Received command:', command);
          } else if (result.commands.length === 5) {
            console.log('[browserSafeParser] More commands received...');
          }
          result.commands.push(command);
        });
        
        // Alternative event name for commands in some versions
        parserInstance.on('action', (action: any) => {
          if (result.commands.length < 5) {
            console.log('[browserSafeParser] Received action:', action);
          }
          result.commands.push(action);
        });
        
        // Generic data event
        parserInstance.on('data', (data: any) => {
          console.log('[browserSafeParser] Received generic data event:', typeof data);
          // Try to categorize the data
          if (data && typeof data === 'object') {
            if (data.type === 'command' || data.type === 'action') {
              result.commands.push(data);
            } else if (data.type === 'player') {
              result.players.push(data);
            } else if (data.type === 'chat') {
              result.chat.push(data);
            } else if (data.header) {
              result.header = data.header;
            }
          }
        });
        
        parserInstance.on('player', (player: any) => {
          console.log('[browserSafeParser] Received player info:', player);
          result.players.push(player);
        });
        
        parserInstance.on('chat', (message: any) => {
          console.log('[browserSafeParser] Received chat message:', message);
          result.chat.push(message);
        });
        
        parserInstance.on('end', () => {
          console.log('[browserSafeParser] Parsing completed, end event received');
          clearTimeout(timeoutId);
          console.log('[browserSafeParser] Total commands:', result.commands.length);
          console.log('[browserSafeParser] Player count:', result.players.length);
          
          // Add additional information to help debugging
          if (!result.header) {
            console.warn('[browserSafeParser] No header data collected');
          }
          
          if (result.commands.length === 0) {
            console.warn('[browserSafeParser] No commands/actions collected');
          }
          
          if (result.players.length === 0) {
            console.warn('[browserSafeParser] No player information collected');
          }
          
          // Extract map name from header if available
          if (result.header && result.header.mapName) {
            console.log('[browserSafeParser] Map name from header:', result.header.mapName);
          }
          
          // Add map name if we can find it
          if (!result.mapName && result.header && result.header.mapName) {
            result.mapName = result.header.mapName;
          }
          
          // Calculate duration if possible
          if (result.commands.length > 0) {
            const lastCommand = result.commands[result.commands.length - 1];
            if (lastCommand && lastCommand.frame) {
              // In StarCraft, 24 frames = 1 second
              const durationInFrames = lastCommand.frame;
              const durationMS = Math.floor(durationInFrames / 24 * 1000);
              result.durationMS = durationMS;
              console.log('[browserSafeParser] Estimated duration:', Math.floor(durationMS/1000), 'seconds');
            }
          }
          
          resolve(result);
        });
        
        // Log the state of both objects before calling pipe
        console.log('💡 Debugging pipe setup:', { 
          readableStreamExists: !!readableStream, 
          parserInstanceExists: !!parserInstance,
          readableStreamIsReadable: readableStream && typeof readableStream.pipe === 'function',
          parserInstanceHasPipeTarget: parserInstance && typeof parserInstance.write === 'function',
          processNextTickExists: typeof (globalThis as any).process?.nextTick === 'function'
        });
        
        // Double check process.nextTick right before pipe
        if (typeof (globalThis as any).process?.nextTick !== 'function') {
          console.error('[browserSafeParser] ⚠️ process.nextTick missing before pipe operation!');
          console.log('[browserSafeParser] Re-applying nextTick polyfill');
          if (typeof (globalThis as any).process === 'undefined') {
            (globalThis as any).process = {};
          }
          (globalThis as any).process.nextTick = function(callback: Function, ...args: any[]) {
            return setTimeout(() => callback(...args), 0);
          };
        }
        
        // Perform the pipe operation
        if (!readableStream || typeof readableStream.pipe !== 'function') {
          throw new Error('readableStream is not a valid Readable stream');
        }
        
        if (!parserInstance || typeof parserInstance.write !== 'function') {
          throw new Error('parserInstance is not a valid writable stream target');
        }
        
        // Try-catch specifically around the pipe operation
        try {
          readableStream.pipe(parserInstance);
          console.log('[browserSafeParser] Successfully piped stream to parser');
        } catch (pipeError) {
          console.error('[browserSafeParser] Error in pipe operation:', pipeError);
          
          // Manual alternative to pipe
          if (readableStream && parserInstance) {
            console.log('[browserSafeParser] Attempting manual data pushing as fallback');
            
            try {
              // Manual data pushing instead of pipe
              const dataChunks = [data]; // Use the original data
              
              // Process data chunks one by one
              for (const chunk of dataChunks) {
                if (parserInstance.write && typeof parserInstance.write === 'function') {
                  parserInstance.write(chunk);
                  console.log('[browserSafeParser] Manually wrote chunk to parser');
                } else {
                  console.error('[browserSafeParser] Parser write method unavailable for manual pushing');
                }
              }
              
              // End the parser
              if (parserInstance.end && typeof parserInstance.end === 'function') {
                parserInstance.end();
                console.log('[browserSafeParser] Manually ended parser stream');
              } else {
                console.error('[browserSafeParser] Parser end method unavailable');
              }
              
            } catch (manualError) {
              console.error('[browserSafeParser] Error in manual data pushing:', manualError);
              throw manualError;
            }
          } else {
            throw pipeError;
          }
        }
      } catch (error) {
        console.error('[browserSafeParser] Error in parser setup:', error);
        clearTimeout(timeoutId);
        reject(new Error(`Error in parser setup: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  } catch (error) {
    console.error('[browserSafeParser] Error during parsing:', error);
    throw new Error(`Error during parsing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
