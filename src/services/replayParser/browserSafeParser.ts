
/**
 * Browser-safe wrapper for screparsed replay parser
 */

// Track initialization state
let isInitialized = false;
let parserInstance: any = null;

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
    
    try {
      // Import the screparsed module
      const screparsed = await import('screparsed');
      console.log('[browserSafeParser] Screparsed import successful:', Object.keys(screparsed));
      
      // Instead of trying many different ways, let's start with a simplified approach
      // that directly uses the module's exported functionality
      
      // Check if the module exports a parse function directly
      if (typeof (screparsed as any).parse === 'function') {
        console.log('[browserSafeParser] Using module.parse directly');
        parserInstance = {
          parse: (data: Uint8Array) => (screparsed as any).parse(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using module.parse)');
        return;
      }
      
      // Check if the module exports a Parse function (case-sensitive)
      if (typeof (screparsed as any).Parse === 'function') {
        console.log('[browserSafeParser] Using module.Parse directly');
        parserInstance = {
          parse: (data: Uint8Array) => (screparsed as any).Parse(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using module.Parse)');
        return;
      }
      
      // Check if the default export is a function
      if (typeof screparsed.default === 'function') {
        console.log('[browserSafeParser] Using default export as function');
        parserInstance = {
          parse: (data: Uint8Array) => (screparsed.default as any)(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using default export)');
        return;
      }
      
      // Check if the default export has a parse method
      if (screparsed.default && typeof (screparsed.default as any).parse === 'function') {
        console.log('[browserSafeParser] Using default.parse');
        parserInstance = {
          parse: (data: Uint8Array) => (screparsed.default as any).parse(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using default.parse)');
        return;
      }
      
      // SCREPARSED MODULE INSPECTION
      // Log available exports to help debug the module structure
      console.log('[browserSafeParser] Module exports:', Object.keys(screparsed));
      if (screparsed.default) {
        console.log('[browserSafeParser] Default export type:', typeof screparsed.default);
        if (typeof screparsed.default === 'object') {
          console.log('[browserSafeParser] Default export keys:', Object.keys(screparsed.default));
        }
      }
      
      // Try the parseReplay function if it exists (common name in other parsers)
      if (typeof (screparsed as any).parseReplay === 'function') {
        console.log('[browserSafeParser] Using module.parseReplay');
        parserInstance = {
          parse: (data: Uint8Array) => (screparsed as any).parseReplay(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using parseReplay)');
        return;
      }
      
      // Try direct configuration with special format
      // This is a common pattern for WASM modules - they might need a specific object format
      console.log('[browserSafeParser] Trying to create special parser with buffer reader');
      
      try {
        // Some WASM modules expect a reader object with specific methods
        const createBufferReader = (buffer: Uint8Array) => {
          let position = 0;
          return {
            read: (len: number) => {
              const result = buffer.slice(position, position + len);
              position += len;
              return result;
            },
            seek: (pos: number) => {
              position = pos;
              return position;
            },
            tell: () => position,
            size: () => buffer.length,
            slice: (start: number, end: number) => buffer.slice(start, end),
            getBuffer: () => buffer
          };
        };
        
        // Create a parser that uses our buffer reader
        const parseWithReader = (data: Uint8Array) => {
          // Create reader from buffer
          const reader = createBufferReader(data);
          
          // Try different module exports with our reader
          if (typeof (screparsed as any).parse === 'function') {
            return (screparsed as any).parse(reader);
          }
          if (screparsed.default && typeof (screparsed.default as any).parse === 'function') {
            return (screparsed.default as any).parse(reader);
          }
          if (typeof (screparsed as any).Parse === 'function') {
            return (screparsed as any).Parse(reader);
          }
          if (typeof screparsed.default === 'function') {
            return (screparsed.default as any)(reader);
          }
          
          throw new Error('No compatible parsing method found for reader object');
        };
        
        parserInstance = { parse: parseWithReader };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using buffer reader)');
        return;
      } catch (readerErr) {
        console.error('[browserSafeParser] Failed to initialize with buffer reader:', readerErr);
      }
      
      throw new Error('Could not initialize parser: No compatible parsing method found');
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
  if (!isInitialized || !parserInstance) {
    await initBrowserSafeParser();
  }
  
  if (!parserInstance) {
    throw new Error('screparsed parser module not available');
  }
  
  console.log('[browserSafeParser] Preparing to parse replay data');
  console.log('[browserSafeParser] Parsing replay data:', data.length, 'bytes');
  
  return new Promise((resolve, reject) => {
    try {
      // Set up an error handler for WASM errors
      const originalOnError = window.onerror;
      let wasmError: Error | null = null;
      
      // Temporary error handler to catch WASM errors
      window.onerror = function(message, source, lineno, colno, error) {
        const errorMsg = String(message);
        console.error('[browserSafeParser] WASM error caught by window.onerror:', { 
          message: errorMsg,
          error: error ? String(error) : 'No error object' 
        });
        wasmError = new Error(`WASM execution error: ${errorMsg}`);
        return true; // Prevents default error handling
      };
      
      // Try to parse with a timeout to catch hangs
      const timeoutId = setTimeout(() => {
        if (wasmError === null) {
          wasmError = new Error('WASM parsing timeout');
          // Restore original handler
          window.onerror = originalOnError;
          reject(wasmError);
        }
      }, 5000); // 5 second timeout
      
      // Use our parser instance with the parse function
      let result;
      
      console.log('[browserSafeParser] Calling parse function from parserInstance');
      result = parserInstance.parse(data);
      
      // Clear timeout since parsing completed
      clearTimeout(timeoutId);
      
      // Restore original error handler
      window.onerror = originalOnError;
      
      if (wasmError) {
        reject(wasmError);
        return;
      }
      
      console.log('[browserSafeParser] Parsing completed, result:', 
        typeof result === 'object' ? 'Object returned' : typeof result);
      resolve(result);
    } catch (parseError) {
      console.error('[browserSafeParser] Error in parse function:', 
        typeof parseError === 'object' ? 
          (parseError ? JSON.stringify(parseError, Object.getOwnPropertyNames(parseError)) : 'null') : 
          String(parseError)
      );
      
      // Check if the error is a DOM event (which sometimes happens with WASM errors)
      if (parseError && typeof parseError === 'object' && 'isTrusted' in parseError) {
        console.error('[browserSafeParser] Received DOM event instead of error details. This might be a WASM error.');
        reject(new Error('WASM execution error occurred during parsing. The replay might be incompatible or corrupted.'));
      } else {
        reject(parseError);
      }
    }
  });
}
