
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
      const CHUNK_SIZE = 8192; // 8KB chunks
      let offset = 0;
      
      function writeNextChunk() {
        if (offset >= data.length) {
          // All chunks written successfully
          console.log('[browserSafeParser] All data written, signaling end of stream');
          
          // End the stream when all data has been written, handle missing end method
          if (typeof parser.end === 'function') {
            console.log('[browserSafeParser] Calling parser.end()');
            parser.end();
          } else if (typeof parser.emit === 'function') {
            console.log('[browserSafeParser] Parser.end not available, emitting end event manually');
            parser.emit('end');
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
          const writeResult = parser.write(chunk);
          console.log(`[browserSafeParser] Chunk ${offset}:${end} written (${chunk.length} bytes), write result:`, writeResult);
          
          offset = end;
          
          // Continue writing chunks asynchronously to avoid blocking the main thread
          // Use requestAnimationFrame if available for better browser performance
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(writeNextChunk);
          } else {
            setTimeout(writeNextChunk, 0);
          }
        } catch (err) {
          console.error('[browserSafeParser] Error writing chunk to parser:', err);
          clearTimeout(timeoutId);
          reject(new Error(`Error writing data: ${err instanceof Error ? err.message : 'Unknown error'}`));
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
