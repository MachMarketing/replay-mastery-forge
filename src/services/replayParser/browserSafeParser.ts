
/**
 * Browser-safe wrapper for screparsed replay parser
 */

// Import necessary types from screparsed
import { Parser } from 'screparsed';

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
    console.log('[browserSafeParser] Attempting to initialize screparsed parser');
    
    // Import screparsed dynamically
    const screparsed = await import('screparsed');
    console.log('[browserSafeParser] Screparsed import result:', screparsed);
    
    // Store the parser module for future use
    parserModule = screparsed;
    
    if (!parserModule || !parserModule.Parser) {
      throw new Error('screparsed Parser not found');
    }
    
    // Create a test parser to verify functionality
    try {
      console.log('[browserSafeParser] Creating test parser instance');
      const testParser = new parserModule.Parser();
      console.log('[browserSafeParser] Test parser created successfully:', testParser);
      
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully');
    } catch (innerError) {
      console.error('[browserSafeParser] Failed to create test parser instance:', innerError);
      throw new Error(`Failed to create parser instance: ${innerError}`);
    }
  } catch (err) {
    console.error('[browserSafeParser] Failed to initialize browser-safe parser:', err);
    throw new Error(`Failed to initialize replay parser: ${err}`);
  }
}

/**
 * Parse a replay file using the browser-safe screparsed parser
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<any> {
  if (!isInitialized || !parserModule) {
    await initBrowserSafeParser();
  }
  
  return new Promise((resolve, reject) => {
    try {
      console.log('[browserSafeParser] Creating parser instance');
      
      if (!parserModule || !parserModule.Parser) {
        throw new Error('screparsed Parser not available');
      }
      
      // Create a parser instance
      const parser = new parserModule.Parser();
      console.log('[browserSafeParser] Created screparsed Parser instance successfully');
      
      // Parse the replay data
      console.log('[browserSafeParser] Parsing replay data:', data.length, 'bytes');
      const result = parser.parseReplay(data);
      console.log('[browserSafeParser] Parsing completed, result:', result);
      
      resolve(result);
    } catch (error) {
      console.error('[browserSafeParser] Parsing error:', error);
      reject(error);
    }
  });
}
