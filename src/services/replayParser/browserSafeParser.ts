
/**
 * Browser-Safe Parser implementation
 * 
 * This module provides a browser-compatible wrapper around the JSSUH parser
 * with appropriate error handling and timeouts.
 */
import type { ParsedReplayResult } from '../replayParserService';

// Polyfill globals that might be needed
const polyfillGlobals = () => {
  // setTimeout and clearTimeout
  if (typeof globalThis.setTimeout === 'undefined' && typeof setTimeout === 'function') {
    (globalThis as any).setTimeout = setTimeout;
    console.log('[browserSafeParser] Polyfilled global.setTimeout');
  }

  if (typeof globalThis.clearTimeout === 'undefined' && typeof clearTimeout === 'function') {
    (globalThis as any).clearTimeout = clearTimeout;
    console.log('[browserSafeParser] Polyfilled global.clearTimeout');
  }
  
  // requestAnimationFrame
  if (typeof globalThis.requestAnimationFrame === 'undefined' && typeof requestAnimationFrame === 'function') {
    (globalThis as any).requestAnimationFrame = requestAnimationFrame;
    console.log('[browserSafeParser] Polyfilled global.requestAnimationFrame');
  }
  
  // Explicitly ensure process.nextTick is available
  if (typeof globalThis.process === 'undefined') {
    (globalThis as any).process = {
      env: {},
      browser: true,
      nextTick: (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0)
    };
    console.log('[browserSafeParser] Created global.process with nextTick');
  } else if (!(globalThis as any).process.nextTick) {
    (globalThis as any).process.nextTick = (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0);
    console.log('[browserSafeParser] Added nextTick to existing global.process');
  }
  
  // Also add it to window for libraries that directly access window.process
  if (typeof window !== 'undefined' && !window.process) {
    (window as any).process = (globalThis as any).process;
    console.log('[browserSafeParser] Mirrored process to window.process');
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
    // Apply all global polyfills
    polyfillGlobals();
    
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
  
  // Parse with a timeout to prevent infinite blocking
  return await parseWithDirectDataAndTimeout(data, PARSER_TIMEOUT_MS);
}

/**
 * Parse with direct data writing approach and timeout wrapper
 * This completely avoids using pipe() which is causing issues in the browser
 */
async function parseWithDirectDataAndTimeout(data: Uint8Array, timeoutMs: number): Promise<any> {
  console.log('[browserSafeParser] Using direct data writing approach (no pipe)...');
  
  return new Promise((resolve, reject) => {
    // Set a timeout
    const timeoutId = setTimeout(() => {
      console.error(`[browserSafeParser] Parsing timed out after ${timeoutMs/1000} seconds`);
      reject(new Error(`Parsing timed out after ${timeoutMs/1000} seconds`));
    }, timeoutMs);
    
    try {
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
      
      // Ensure process.nextTick is available before creating parser
      polyfillGlobals();
      
      // Create a parser instance
      let parser;
      try {
        parser = new ReplayParser();
        console.log('[browserSafeParser] Parser instance created successfully');
      } catch (err) {
        console.error('[browserSafeParser] Failed to create parser instance:', err);
        clearTimeout(timeoutId);
        reject(new Error(`Failed to create parser instance: ${err instanceof Error ? err.message : 'Unknown error'}`));
        return;
      }
      
      if (!parser) {
        console.error('[browserSafeParser] Parser instance is undefined after creation');
        clearTimeout(timeoutId);
        reject(new Error('Parser instance is undefined after creation'));
        return;
      }
      
      // Log available methods on the parser for debugging
      console.log('[browserSafeParser] Parser methods:', 
                 Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
      
      // Check that the parser has the necessary event methods
      if (typeof parser.on !== 'function') {
        console.error('[browserSafeParser] Parser does not have "on" method');
        clearTimeout(timeoutId);
        reject(new Error('Parser does not have "on" method'));
        return;
      }
      
      // Monkey patch the parser if it's using process.nextTick
      if (parser._transform && parser._transform.toString().includes('process.nextTick')) {
        console.log('[browserSafeParser] Monkey patching parser._transform to handle process.nextTick');
        const originalTransform = parser._transform;
        parser._transform = function(chunk: any, encoding: string, callback: Function) {
          try {
            return originalTransform.call(this, chunk, encoding, (err: any, data: any) => {
              setTimeout(() => callback(err, data), 0);
            });
          } catch (err) {
            console.error('[browserSafeParser] Error in patched _transform:', err);
            setTimeout(() => callback(err), 0);
          }
        };
      }
      
      // Patchen Sie auch die _write Methode
      if (parser._write && parser._write.toString().includes('process.nextTick')) {
        console.log('[browserSafeParser] Monkey patching parser._write to handle process.nextTick');
        const originalWrite = parser._write;
        parser._write = function(chunk: any, encoding: string, callback: Function) {
          try {
            const result = originalWrite.call(this, chunk, encoding, (err: any) => {
              setTimeout(() => callback(err), 0);
            });
            return result;
          } catch (err) {
            console.error('[browserSafeParser] Error in patched _write:', err);
            setTimeout(() => callback(err), 0);
          }
        };
      }
      
      // Collected data
      const result: any = {
        header: null,
        commands: [],
        players: [],
        chat: []
      };
      
      // Set up event listeners for the parser
      parser.on('error', (err: any) => {
        console.error('[browserSafeParser] Parser error:', err);
        clearTimeout(timeoutId);
        reject(new Error(`Parser error: ${err instanceof Error ? err.message : err?.toString() || 'Unknown error'}`));
      });
      
      parser.on('replayHeader', (header: any) => {
        console.log('[browserSafeParser] Received replay header:', header);
        result.header = header;
      });
      
      // Listen for different event types that JSSUH might emit
      
      // Commands
      parser.on('command', (command: any) => {
        // Don't log every command to keep the console clean
        if (result.commands.length < 5) {
          console.log('[browserSafeParser] Received command:', command);
        } else if (result.commands.length === 5) {
          console.log('[browserSafeParser] More commands received...');
        } else if (result.commands.length % 1000 === 0) {
          console.log(`[browserSafeParser] Processed ${result.commands.length} commands so far...`);
        }
        result.commands.push(command);
      });
      
      // Action - alternative name for commands in some versions
      parser.on('action', (action: any) => {
        if (result.commands.length < 5) {
          console.log('[browserSafeParser] Received action:', action);
        }
        result.commands.push(action);
      });
      
      // Data - generic event that might contain various data types
      parser.on('data', (data: any) => {
        console.log('[browserSafeParser] Received generic data event:', typeof data, data);
        if (data && typeof data === 'object') {
          // Try to categorize based on data structure
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
      
      parser.on('player', (player: any) => {
        console.log('[browserSafeParser] Received player info:', player);
        result.players.push(player);
      });
      
      parser.on('chat', (message: any) => {
        console.log('[browserSafeParser] Received chat message:', message);
        result.chat.push(message);
      });
      
      parser.on('end', () => {
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
      
      // Check write method exists
      if (typeof parser.write !== 'function') {
        console.error('[browserSafeParser] Parser does not have write method');
        clearTimeout(timeoutId);
        reject(new Error('Parser does not have write method'));
        return;
      }
      
      // Write the data chunk by chunk to avoid memory issues
      const CHUNK_SIZE = 4096; // Smaller chunks (4KB instead of 8KB)
      let offset = 0;
      
      function writeNextChunk() {
        if (offset >= data.length) {
          // All chunks written successfully
          console.log('[browserSafeParser] All data written, signaling end of stream');
          
          // End the stream when all data has been written, handle missing end method
          if (typeof parser.end === 'function') {
            console.log('[browserSafeParser] Calling parser.end()');
            try {
              parser.end();
            } catch (err) {
              console.error('[browserSafeParser] Error in parser.end():', err);
              // Still resolve since we've written all the data
              clearTimeout(timeoutId);
              resolve(result);
            }
          } else if (typeof parser.emit === 'function') {
            console.log('[browserSafeParser] Parser.end not available, emitting end event manually');
            try {
              parser.emit('end');
            } catch (err) {
              console.error('[browserSafeParser] Error emitting end event:', err);
              clearTimeout(timeoutId);
              resolve(result);
            }
          } else {
            console.warn('[browserSafeParser] No way to signal end of data to parser');
            // Resolve manually since we can't properly signal end
            setTimeout(() => {
              clearTimeout(timeoutId);
              resolve(result);
            }, 1000);
          }
          return;
        }
        
        const end = Math.min(offset + CHUNK_SIZE, data.length);
        const chunk = data.slice(offset, end);
        
        try {
          // Use a try-catch around each write operation
          const writeResult = parser.write(chunk);
          console.log(`[browserSafeParser] Chunk ${offset}:${end} written (${chunk.length} bytes), write result:`, writeResult);
          
          offset = end;
          
          // Use our own setTimeout instead of requestAnimationFrame for greater reliability
          setTimeout(writeNextChunk, 0);
        } catch (err) {
          console.error('[browserSafeParser] Error writing chunk to parser:', err);
          
          // If it's a nextTick error, try one more time with a fresh process.nextTick
          if (err instanceof Error && err.message.includes('nextTick')) {
            console.log('[browserSafeParser] nextTick error detected, reapplying polyfill and retrying');
            polyfillGlobals();
            
            // Try one more time after refreshing polyfills
            setTimeout(() => {
              try {
                const writeResult = parser.write(chunk);
                console.log(`[browserSafeParser] Retry successful: Chunk ${offset}:${end} written`);
                offset = end;
                setTimeout(writeNextChunk, 0);
              } catch (retryErr) {
                console.error('[browserSafeParser] Retry failed:', retryErr);
                clearTimeout(timeoutId);
                reject(new Error(`Error writing data after retry: ${retryErr instanceof Error ? retryErr.message : 'Unknown error'}`));
              }
            }, 0);
          } else {
            // For other errors, just fail
            clearTimeout(timeoutId);
            reject(new Error(`Error writing data: ${err instanceof Error ? err.message : 'Unknown error'}`));
          }
        }
      }
      
      // Start the writing process
      writeNextChunk();
      
    } catch (error) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      console.error('[browserSafeParser] Error in parser setup:', error);
      reject(new Error(`Error in parser setup: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

