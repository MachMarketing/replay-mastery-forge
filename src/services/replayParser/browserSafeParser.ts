
/**
 * This module provides a browser-safe implementation of the replay parser
 * using JSSUH library that works in the browser environment
 */
// Import the correct type definition and our JSSUH loader
import { ParsedReplayResult } from '../replayParserService';
// Import JSSUH using our dedicated loader
import JSSUH, { getReplayParserConstructor } from './jssuhLoader';
// Import Readable for stream-based parsing
import { Readable } from 'stream-browserify';
import { Buffer } from 'buffer';

// Define timeout for parser operations
const PARSER_TIMEOUT_MS = 60000; // 60 seconds

// Flag to track if parser has been initialized
let parserInitialized = false;
let ReplayParserClass: any = null;

/**
 * Initialize the browser-safe parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  console.log('[browserSafeParser] Initializing browser-safe parser');
  
  try {
    // Apply global polyfills
    console.log('[browserSafeParser] Starting global polyfills');
    applyGlobalPolyfills();

    // Get the ReplayParser constructor from our loader
    console.log('[browserSafeParser] Getting ReplayParser constructor');
    ReplayParserClass = await getReplayParserConstructor();
    
    if (!ReplayParserClass) {
      console.error('[browserSafeParser] Failed to get ReplayParser constructor');
      throw new Error('Failed to get ReplayParser constructor');
    }
    
    console.log('[browserSafeParser] Successfully obtained ReplayParser constructor');
    
    // Test creating an instance with proper encoding option
    const testParser = new ReplayParserClass({ encoding: 'cp1252' });
    
    if (!testParser) {
      throw new Error('Failed to create ReplayParser instance');
    }
    
    console.log('[browserSafeParser] Test parser has these methods:', 
      Object.keys(testParser).filter(k => typeof (testParser as any)[k] === 'function'));
    
    // Specifically check if pipeChk exists
    if (typeof testParser.pipeChk !== 'function') {
      console.warn('[browserSafeParser] Warning: pipeChk method not found on parser');
    } else {
      console.log('[browserSafeParser] ✅ pipeChk method found on parser');
    }
    
    // Mark as initialized if everything worked
    parserInitialized = true;
    console.log('[browserSafeParser] Browser-safe parser initialized successfully');
    
    // Store the constructor globally for reuse
    (window as any).__JSSUH_ReplayParser = ReplayParserClass;
    
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
  
  // Check process.nextTick - use queueMicrotask for proper microtask semantics
  if (typeof (globalThis as any).process.nextTick === 'function') {
    console.log('[browserSafeParser] process.nextTick already exists, updating to use queueMicrotask');
  }
  
  // Always replace nextTick with queueMicrotask implementation for true microtask semantics
  (globalThis as any).process.nextTick = (callback: Function, ...args: any[]) => {
    // queueMicrotask is a true microtask
    queueMicrotask(() => callback(...args));
  };
  
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
      
      // Declare fallbackTimeout at this scope level so it's available to all handlers
      let fallbackTimeout: number | null = null;
      
      try {
        console.log('[browserSafeParser] Creating parser instance');
        
        // Use the cached ReplayParser class
        if (!ReplayParserClass) {
          ReplayParserClass = (window as any).__JSSUH_ReplayParser;
          
          if (!ReplayParserClass) {
            console.error('[browserSafeParser] ReplayParser class not available');
            reject(new Error('ReplayParser class not available'));
            return;
          }
        }
        
        // Create parser with proper encoding option from jssuh docs
        const parser = new ReplayParserClass({ encoding: 'cp1252' });
        console.log('[browserSafeParser] Created ReplayParser instance with options: { encoding: "cp1252" }');
        
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
          if (fallbackTimeout !== null) {
            clearTimeout(fallbackTimeout);
          }
          
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
          if (fallbackTimeout !== null) {
            clearTimeout(fallbackTimeout);
          }
          reject(err);
        });

        // IMPROVED APPROACH: Use Readable.from() helper for simpler stream creation
        try {
          console.log('[browserSafeParser] Creating Readable.from([data]) and piping via pipeChk()');
          
          const buffer = Buffer.from(data);
          const readable = Readable.from([buffer]);
          
          // Give JSSUH the uniform stream API it expects
          parser.pipeChk(readable);
          console.log('[browserSafeParser] Successfully called pipeChk, waiting for events');
          
          // Also: if we still haven't seen a header in 2s, fall back to raw writes
          fallbackTimeout = setTimeout(() => {
            console.warn('[browserSafeParser] ⚠️ No events after pipeChk—falling back to write/end');
            try {
              parser.write(buffer);
              parser.end();
              console.log('[browserSafeParser] Fallback write/end executed');
            } catch (e) {
              console.error('[browserSafeParser] Fallback write/end failed:', e);
              reject(e);
            }
          }, 2000);
          
        } catch (pipeError) {
          console.error('[browserSafeParser] Error using pipeChk approach:', pipeError);
          
          // Immediate fallback to manual chunk writing if pipeChk fails
          console.log('[browserSafeParser] Immediately falling back to direct write+end approach');
          try {
            parser.write(data);
            console.log('[browserSafeParser] Successfully wrote data, calling end()');
            parser.end();
            console.log('[browserSafeParser] Called end(), waiting for events');
          } catch (writeError) {
            console.error('[browserSafeParser] Error in direct write approach:', writeError);
            clearTimeout(timeoutId);
            reject(writeError);
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
