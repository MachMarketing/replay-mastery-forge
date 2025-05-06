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
      const ReplayParser = JSSUHModule.default || JSSUHModule.ReplayParser;
      if (!ReplayParser) {
        clearTimeout(timeoutId);
        reject(new Error('ReplayParser not found in JSSUH module'));
        return;
      }
      
      const parser = new ReplayParser();
      
      // Create a browser-compatible stream implementation
      // Instead of using Readable.from which is Node-specific,
      // we'll create our own stream-like implementation
      
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
      
      // Instead of using Node.js streams, use the write method directly
      // JSSUH parser expects a stream but also accepts direct writes
      console.log('[browserSafeParser] Writing data directly to parser');
      
      // Write the data chunk by chunk to avoid memory issues
      const CHUNK_SIZE = 8192; // 8KB chunks
      let offset = 0;
      
      function writeNextChunk() {
        if (offset >= data.length) {
          // End the stream when all data has been written
          console.log('[browserSafeParser] All data written, ending parser stream');
          parser.end();
          return;
        }
        
        const end = Math.min(offset + CHUNK_SIZE, data.length);
        const chunk = data.slice(offset, end);
        
        try {
          parser.write(chunk);
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
