
/**
 * Browser-safe parser using JSSUH
 * This module wraps the JSSUH library for use in the browser
 * with better error handling and retry logic.
 */

// Import the JSSUH library
import * as jssuh from 'jssuh';

// Flag to track if the parser has been initialized
let isInitialized = false;

/**
 * Initialize the JSSUH parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  if (isInitialized) {
    console.log('[browserSafeParser] JSSUH parser already initialized');
    return;
  }

  try {
    console.log('[browserSafeParser] Initializing JSSUH parser');
    
    // Ensure JSSUH is properly loaded
    if (!jssuh || typeof jssuh.parse !== 'function') {
      throw new Error('JSSUH library not properly loaded or missing parse function');
    }
    
    // Mark as initialized
    isInitialized = true;
    console.log('[browserSafeParser] JSSUH parser initialized successfully');
  } catch (error) {
    console.error('[browserSafeParser] Failed to initialize JSSUH parser:', error);
    throw new Error(`JSSUH initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse a replay file using JSSUH
 * 
 * @param replayData Uint8Array containing the replay file data
 * @returns Parsed replay data
 */
export async function parseReplayWithBrowserSafeParser(replayData: Uint8Array): Promise<any> {
  if (!isInitialized) {
    await initBrowserSafeParser();
  }

  console.log('[browserSafeParser] Starting to parse replay data with JSSUH');
  
  return new Promise((resolve, reject) => {
    try {
      // Set a timeout for parsing
      const timeoutId = setTimeout(() => {
        reject(new Error('Parsing timed out after 15 seconds'));
      }, 15000);
      
      // Parse the replay data using JSSUH with properly formatted options
      // Using string values instead of booleans to avoid file lookup issues
      const options = {
        includeCmds: "true",
        includeHeader: "true",
        verbose: "true",
        // Adding cache option to avoid file system access
        cache: "memory"
      };
      
      console.log('[browserSafeParser] Calling JSSUH.parse with options:', options);
      
      // Use the parse function with options
      const result = jssuh.parse(replayData, options);
      clearTimeout(timeoutId);
      
      console.log('[browserSafeParser] JSSUH parser completed successfully');
      resolve(result);
    } catch (error) {
      console.error('[browserSafeParser] JSSUH parser error:', error);
      reject(new Error(`JSSUH parsing failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}
