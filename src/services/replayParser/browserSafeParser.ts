
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
    
    // Import screparsed dynamically
    try {
      // Import the module
      const module = await import('screparsed');
      console.log('[browserSafeParser] Screparsed import successful:', module);
      
      // According to the npm docs, screparsed might export a Parser class directly
      // or it might have a named export 'Parser', or it might be a default export
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
      
      if (!parserModule) {
        throw new Error('screparsed module not available');
      }
      
      // Try different ways to get the Parser class based on how screparsed is exported
      let ParserClass;
      
      if (typeof parserModule.Parser === 'function') {
        // Named export: { Parser: [Function] }
        console.log('[browserSafeParser] Using named Parser export');
        ParserClass = parserModule.Parser;
      } else if (typeof parserModule.default === 'function') {
        // Default export: { default: [Function] }
        console.log('[browserSafeParser] Using default export');
        ParserClass = parserModule.default;
      } else if (typeof parserModule === 'function') {
        // Direct export: [Function]
        console.log('[browserSafeParser] Using direct function export');
        ParserClass = parserModule;
      } else {
        console.error('[browserSafeParser] Could not find valid Parser constructor in module:', parserModule);
        throw new Error('Invalid screparsed module structure - no usable Parser constructor found');
      }
      
      // Create a parser instance
      const parser = new ParserClass();
      console.log('[browserSafeParser] Created screparsed Parser instance successfully');
      
      // Parse the replay data
      console.log('[browserSafeParser] Parsing replay data:', data.length, 'bytes');
      
      try {
        const result = parser.parseReplay(data);
        console.log('[browserSafeParser] Parsing completed, result:', result);
        resolve(result);
      } catch (parseError) {
        console.error('[browserSafeParser] Error in parser.parseReplay():', parseError);
        // Check if the error is a DOM event (which sometimes happens with WASM errors)
        if (parseError && typeof parseError === 'object' && 'isTrusted' in parseError) {
          console.error('[browserSafeParser] Received DOM event instead of error details. This might be a WASM error.');
          reject(new Error('WASM execution error occurred during parsing. The replay might be incompatible.'));
        } else {
          reject(parseError);
        }
      }
    } catch (error) {
      console.error('[browserSafeParser] Parsing error:', error);
      reject(error);
    }
  });
}
