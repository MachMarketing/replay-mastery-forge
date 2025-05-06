
/**
 * Browser-Safe Parser implementation
 * 
 * This module provides a browser-compatible wrapper around the JSSUH parser
 * with appropriate error handling and timeouts.
 */
import { RawParsedReplayData } from '../replayParserService';

// Import type definitions but not actual implementations
type ReplayParserType = any;

// Flag to track parser initialization
let parserInitialized = false;

// Store the parser instance once initialized
let replayParserInstance: any = null;

// Define the timeout duration for parser operations
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
    
    // Check the module structure to determine how to access the ReplayParser
    if (jssuhModule && typeof jssuhModule === 'object') {
      console.log('[browserSafeParser] JSSUH import successful, module structure:', 
                  Object.keys(jssuhModule).length > 0 ? 'named exports' : 'default export');
      
      // Try to get the ReplayParser from either the default export or named exports
      const ReplayParser = jssuhModule.default || jssuhModule.ReplayParser;
      
      if (ReplayParser) {
        console.log('[browserSafeParser] Found ReplayParser as default export (function)');
        try {
          // Create an instance of the ReplayParser
          replayParserInstance = new ReplayParser();
          console.log('[browserSafeParser] Successfully created ReplayParser instance');
          parserInitialized = true;
          console.log('[browserSafeParser] JSSUH parser initialized successfully');
        } catch (instanceError) {
          console.error('[browserSafeParser] Error creating ReplayParser instance:', instanceError);
          throw new Error('Failed to create ReplayParser instance');
        }
      } else {
        console.error('[browserSafeParser] ReplayParser not found in JSSUH module');
        throw new Error('ReplayParser not found in JSSUH module');
      }
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
 * Parse replay data with the browser-safe parser
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<RawParsedReplayData> {
  console.log('[browserSafeParser] Starting to parse with browser-safe parser');
  
  if (!parserInitialized || !replayParserInstance) {
    console.error('[browserSafeParser] Parser not initialized');
    throw new Error('Browser-safe parser not initialized. Call initBrowserSafeParser() first.');
  }
  
  console.log('[browserSafeParser] File data length:', data.length);
  
  // Parse with a timeout to prevent infinite blocking
  return await parseWithTimeout(data, PARSER_TIMEOUT_MS);
}

/**
 * Parse with a timeout wrapper
 */
async function parseWithTimeout(data: Uint8Array, timeoutMs: number): Promise<RawParsedReplayData> {
  console.log('[browserSafeParser] Using JSSUH ReplayParser...');
  console.log('[browserSafeParser] Creating new ReplayParser instance');
  
  return new Promise((resolve, reject) => {
    // Set a timeout
    const timeoutId = setTimeout(() => {
      console.error(`[browserSafeParser] Parsing timed out after ${timeoutMs/1000} seconds`);
      reject(new Error(`Parsing timed out after ${timeoutMs/1000} seconds`));
    }, timeoutMs);
    
    try {
      console.log('[browserSafeParser] Trying stream-based approach...');
      
      // Parse the replay data
      const result = replayParserInstance.parse(data);
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      console.log('[browserSafeParser] Successfully parsed replay data');
      resolve(result);
    } catch (error) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      console.error('[browserSafeParser] Error parsing replay:', error);
      reject(new Error(`Error parsing replay: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}
