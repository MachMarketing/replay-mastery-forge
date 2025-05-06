
/**
 * Browser-Safe Parser implementation
 * 
 * This module provides a browser-compatible wrapper around the JSSUH parser
 * with appropriate error handling and timeouts.
 */
import type { ParsedReplayResult } from '../replayParserService';

// Import type definitions but not actual implementations
type ReplayParserType = any;

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
    // Dynamically import jssuh
    console.log('[browserSafeParser] Attempting to import JSSUH module');
    const jssuhModule = await import('jssuh');
    
    // Check the module structure
    if (jssuhModule && typeof jssuhModule === 'object') {
      console.log('[browserSafeParser] JSSUH import successful, module structure:', 
                  Object.keys(jssuhModule).length > 0 ? 'named exports' : 'default export');
      
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
 * Parse replay data with the browser-safe parser using stream-based processing
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<any> {
  console.log('[browserSafeParser] Starting to parse with browser-safe parser');
  
  if (!parserInitialized || !JSSUHModule) {
    console.error('[browserSafeParser] Parser not initialized');
    throw new Error('Browser-safe parser not initialized. Call initBrowserSafeParser() first.');
  }
  
  console.log('[browserSafeParser] File data length:', data.length);
  
  // Parse with a timeout to prevent infinite blocking
  return await parseWithStreamAndTimeout(data, PARSER_TIMEOUT_MS);
}

/**
 * Parse with a stream-based approach and timeout wrapper
 */
async function parseWithStreamAndTimeout(data: Uint8Array, timeoutMs: number): Promise<any> {
  console.log('[browserSafeParser] Using JSSUH with stream-based approach...');
  
  return new Promise((resolve, reject) => {
    // Set a timeout
    const timeoutId = setTimeout(() => {
      console.error(`[browserSafeParser] Parsing timed out after ${timeoutMs/1000} seconds`);
      reject(new Error(`Parsing timed out after ${timeoutMs/1000} seconds`));
    }, timeoutMs);
    
    try {
      // Create a new ReplayParser instance from JSSUH
      // Check for both default export and named exports
      let ReplayParser;
      if (JSSUHModule.default) {
        ReplayParser = JSSUHModule.default;
        console.log('[browserSafeParser] Using default export for ReplayParser');
      } else if (JSSUHModule.ReplayParser) {
        ReplayParser = JSSUHModule.ReplayParser;
        console.log('[browserSafeParser] Using named export for ReplayParser');
      } else {
        console.log('[browserSafeParser] Available exports:', Object.keys(JSSUHModule));
        clearTimeout(timeoutId);
        reject(new Error('ReplayParser not found in JSSUH module'));
        return;
      }
      
      // Create a parser instance and verify it's valid
      const parser = new ReplayParser();
      
      if (!parser) {
        console.error('[browserSafeParser] Failed to create parser instance');
        clearTimeout(timeoutId);
        reject(new Error('Failed to create parser instance'));
        return;
      }
      
      console.log('[browserSafeParser] Parser instance created successfully');
      console.log('[browserSafeParser] Parser methods:', 
                 Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
      
      // Collected data
      const result: any = {
        header: null,
        commands: [],
        players: [],
        chat: []
      };
      
      // Set up event listeners for the parser
      parser.on('error', (err: any) => {
        console.error('[browserSafeParser] Parser stream error:', err);
        clearTimeout(timeoutId);
        reject(new Error(`Parser stream error: ${err.message || 'Unknown error'}`));
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
        console.log('[browserSafeParser] Parsing completed, stream ended');
        clearTimeout(timeoutId);
        console.log('[browserSafeParser] Total commands:', result.commands.length);
        console.log('[browserSafeParser] Player count:', result.players.length);
        resolve(result);
      });
      
      // Write data directly to parser in chunks instead of using pipe
      console.log('[browserSafeParser] Writing data directly to parser');
      
      // Write the data chunk by chunk to avoid memory issues
      const CHUNK_SIZE = 8192; // 8KB chunks
      let offset = 0;
      
      function writeNextChunk() {
        if (offset >= data.length) {
          // End the stream when all data has been written
          console.log('[browserSafeParser] All data written, ending parser stream');
          
          // Check if parser.end exists before calling it
          if (typeof parser.end === 'function') {
            parser.end();
          } else {
            console.warn('[browserSafeParser] parser.end is not a function, using alternate approach');
            // Try to signal end of data in an alternate way if end() doesn't exist
            try {
              parser.emit('end');
            } catch (err) {
              console.error('[browserSafeParser] Error emitting end event:', err);
            }
          }
          return;
        }
        
        const end = Math.min(offset + CHUNK_SIZE, data.length);
        const chunk = data.slice(offset, end);
        
        try {
          // Check if parser.write exists before calling it
          if (typeof parser.write === 'function') {
            parser.write(chunk);
            console.log(`[browserSafeParser] Chunk written: bytes ${offset} to ${end}`);
          } else {
            console.error('[browserSafeParser] parser.write is not a function');
            clearTimeout(timeoutId);
            reject(new Error('Parser does not support write method'));
            return;
          }
          
          offset = end;
          
          // Continue writing chunks asynchronously to avoid blocking the main thread
          setTimeout(writeNextChunk, 0);
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
      
      console.error('[browserSafeParser] Error in stream parsing setup:', error);
      reject(new Error(`Error in stream parsing setup: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}
