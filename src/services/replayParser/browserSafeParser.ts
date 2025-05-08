
/**
 * Browser-safe wrapper for screparsed replay parser
 */

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
    
    // Import screparsed dynamically - this is the key part that's failing
    try {
      // Import the module
      const module = await import('screparsed');
      console.log('[browserSafeParser] Screparsed import successful:', module);
      
      // Check if the module has a default export (the parser constructor)
      if (!module || typeof module.default !== 'function') {
        console.error('[browserSafeParser] Invalid screparsed module structure:', module);
        throw new Error('Invalid screparsed module structure - missing default export');
      }
      
      // Store the module for future use
      parserModule = module;
      isInitialized = true;
      console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully');
    } catch (importError) {
      console.error('[browserSafeParser] Failed to import screparsed module:', importError);
      throw new Error(`Failed to import screparsed module: ${importError}`);
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
      
      if (!parserModule || !parserModule.default) {
        throw new Error('screparsed module not available');
      }
      
      // Create a parser instance using the default export
      const ParserClass = parserModule.default;
      const parser = new ParserClass();
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
