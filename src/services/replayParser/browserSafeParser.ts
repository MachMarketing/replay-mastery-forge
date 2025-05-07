
/**
 * This module provides a browser-safe implementation of the replay parser
 * using JSSUH library that works in the browser environment
 */
// Import the correct type definition
import { ParsedReplayResult } from '../replayParserService';
// Import JSSUH statically instead of dynamically
import { ReplayParser } from 'jssuh';

// Define timeout for parser operations
const PARSER_TIMEOUT_MS = 60000; // 60 seconds

// Set chunk size for manual data writing (8KB)
const CHUNK_SIZE = 8 * 1024;

// Flag to track if parser has been initialized
let parserInitialized = false;

/**
 * Initialize the browser-safe parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  console.log('[browserSafeParser] Initializing browser-safe parser');
  
  try {
    // Apply global polyfills
    console.log('[browserSafeParser] Starting global polyfills');
    applyGlobalPolyfills();

    // Verify JSSUH module by creating a test parser instance
    console.log('[browserSafeParser] Verifying JSSUH module');
    const testParser = new ReplayParser();
    
    if (!testParser) {
      throw new Error('Failed to create ReplayParser instance');
    }
    
    // Mark as initialized if everything worked
    parserInitialized = true;
    console.log('[browserSafeParser] Browser-safe parser initialized successfully');
    
  } catch (error) {
    console.error('[browserSafeParser] Error initializing browser-safe parser:', error);
    throw new Error(`Failed to initialize browser-safe parser: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Apply necessary global polyfills for JSSUH
 */
function applyGlobalPolyfills(): void {
  // Check global process
  if (typeof globalThis.process !== 'undefined') {
    console.log('[browserSafeParser] global.process exists:', typeof globalThis.process);
  } else {
    console.log('[browserSafeParser] global.process not found, creating it');
    (globalThis as any).process = { env: {} };
  }
  
  // Check process.env
  if ((globalThis as any).process.env) {
    console.log('[browserSafeParser] process.env exists:', typeof (globalThis as any).process.env);
  } else {
    console.log('[browserSafeParser] process.env not found, creating it');
    (globalThis as any).process.env = {};
  }
  
  // Check process.nextTick
  if (typeof (globalThis as any).process.nextTick === 'function') {
    console.log('[browserSafeParser] process.nextTick already exists:', typeof (globalThis as any).process.nextTick);
  } else {
    console.log('[browserSafeParser] process.nextTick not found, creating it');
    (globalThis as any).process.nextTick = (callback: Function, ...args: any[]) => {
      setTimeout(() => callback(...args), 0);
    };
  }
  
  // Check window.process
  if (typeof window !== 'undefined') {
    if (typeof window.process !== 'undefined') {
      console.log('[browserSafeParser] window.process check: exists',
        typeof window.process.nextTick === 'function' ? 'nextTick: function' : 'nextTick: missing');
    } else {
      console.log('[browserSafeParser] window.process not found, mirroring from global');
      (window as any).process = (globalThis as any).process;
    }
  }
  
  // Verify process.nextTick implementation
  console.log('[browserSafeParser] process.nextTick verification:', typeof (globalThis as any).process.nextTick);
  
  // Test process.nextTick is working
  console.log('[browserSafeParser] process.nextTick test initiated, waiting for callback');
  (globalThis as any).process.nextTick(() => {
    console.log('[browserSafeParser] ✅ process.nextTick test successful');
  });
}

/**
 * Parse replay data using the browser-safe parser
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<any> {
  console.log(`[browserSafeParser] Parsing replay data (${data.length} bytes)`);
  
  if (!parserInitialized) {
    console.log('[browserSafeParser] Parser not initialized, initializing now');
    await initBrowserSafeParser();
  }
  
  try {
    // Return a promise that will resolve with the parsed data
    return new Promise(async (resolve, reject) => {
      // Set a timeout
      const timeoutId = setTimeout(() => {
        console.error(`[browserSafeParser] Parsing timed out after ${PARSER_TIMEOUT_MS/1000} seconds`);
        reject(new Error('Parsing timed out'));
      }, PARSER_TIMEOUT_MS);
      
      try {
        console.log('[browserSafeParser] Creating parser instance');
        const parser = new ReplayParser();
        
        // Collected data
        let header: any = null;
        const commands: any[] = [];
        
        // Listen for the replay header event
        parser.on('replayHeader', (replayHeader: any) => {
          console.log('[browserSafeParser] Received replay header:', 
            replayHeader ? `version ${replayHeader.version}, type ${replayHeader.type}` : 'null');
          header = replayHeader;
        });
        
        // Listen for command data
        parser.on('command', (command: any) => {
          commands.push(command);
          
          // Log progress occasionally
          if (commands.length % 500 === 0) {
            console.log(`[browserSafeParser] Parsed ${commands.length} commands`);
          }
        });
        
        // Listen for the end event
        parser.on('end', () => {
          console.log(`[browserSafeParser] Parser finished, parsed ${commands.length} commands`);
          
          clearTimeout(timeoutId);
          
          const players = header?.players || [];
          const mapName = header?.mapName || 'Unknown';
          
          console.log(`[browserSafeParser] Found ${players.length} players on map: ${mapName}`);
          
          resolve({
            header,
            commands,
            players,
            mapName,
          });
        });
        
        // Listen for errors
        parser.on('error', (err: any) => {
          console.error('[browserSafeParser] Parser error:', err);
          clearTimeout(timeoutId);
          reject(err);
        });
        
        // Manual chunking and writing to the parser
        console.log(`[browserSafeParser] Manually writing data in chunks (chunk size: ${CHUNK_SIZE} bytes)`);
        
        try {
          // Split the data into chunks and write them
          await processDataInChunks(parser, data);
          
        } catch (writeError) {
          console.error('[browserSafeParser] Error while writing chunks:', writeError);
          
          // Fallback to writing the entire data at once
          try {
            console.log('[browserSafeParser] Falling back to writing all data at once');
            parser.write(data);
            parser.end();
          } catch (fallbackError) {
            console.error('[browserSafeParser] Fallback method failed:', fallbackError);
            clearTimeout(timeoutId);
            reject(fallbackError);
          }
        }
        
      } catch (error) {
        console.error('[browserSafeParser] Error in parser setup:', error);
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  } catch (error) {
    console.error('[browserSafeParser] Error in parseReplayWithBrowserSafeParser:', error);
    throw error;
  }
}

/**
 * Process the replay data in chunks
 */
async function processDataInChunks(parser: any, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
      console.log(`[browserSafeParser] Processing ${totalChunks} chunks`);
      
      // Write each chunk
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const end = Math.min(i + CHUNK_SIZE, data.length);
        const chunk = data.slice(i, end);
        
        if (i === 0) {
          console.log(`[browserSafeParser] Writing first chunk (${chunk.length} bytes)`);
        }
        
        parser.write(chunk);
        
        // Occasionally log progress
        if (i % (CHUNK_SIZE * 10) === 0 && i > 0) {
          console.log(`[browserSafeParser] Written ${Math.floor(i / CHUNK_SIZE)} chunks (${Math.floor((i / data.length) * 100)}%)`);
        }
      }
      
      // End the stream
      console.log('[browserSafeParser] Finished writing chunks, ending parser');
      parser.end();
      
      resolve();
    } catch (error) {
      console.error('[browserSafeParser] Error processing chunks:', error);
      reject(error);
    }
  });
}
