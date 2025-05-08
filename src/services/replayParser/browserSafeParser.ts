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
      
      // APPROACH 1: Try Direct Parsing Methods with new keyword
      if (typeof (screparsed as any).ParsedReplay === 'function') {
        console.log('[browserSafeParser] Found ParsedReplay constructor function');
        parserInstance = {
          parse: (data: Uint8Array) => {
            // Fixed: Use 'new' keyword when calling the constructor
            return new (screparsed as any).ParsedReplay(data);
          }
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using ParsedReplay constructor with new)');
        return;
      }

      // APPROACH 2: Create and test ParsedReplay object
      if (screparsed.ParsedReplay) {
        console.log('[browserSafeParser] Found ParsedReplay class/object');
        
        // Check if it has static parse method
        if (typeof (screparsed.ParsedReplay as any).parse === 'function') {
          console.log('[browserSafeParser] Using ParsedReplay.parse static method');
          parserInstance = {
            parse: (data: Uint8Array) => (screparsed.ParsedReplay as any).parse(data)
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using ParsedReplay static parse)');
          return;
        }
      }

      // APPROACH 3: Use ReplayParser - with enhanced buffer reader
      if (screparsed.ReplayParser) {
        console.log('[browserSafeParser] Found ReplayParser, trying with custom reader implementation');
        
        try {
          // Create a specialized testing function for ReplayParser
          const testParsingWithReplayParser = (buffer: Uint8Array) => {
            // Create an enhanced buffer reader that matches what ReplayParser expects
            const createEnhancedReader = (buffer: Uint8Array) => {
              let position = 0;
              // Based on console logs, we know the module is looking for specific methods
              return {
                read: (len: number) => {
                  if (position + len > buffer.length) {
                    throw new Error(`Read beyond buffer: position ${position}, length ${len}, buffer size ${buffer.length}`);
                  }
                  const result = buffer.slice(position, position + len);
                  position += len;
                  return result;
                },
                readByte: () => {
                  if (position >= buffer.length) {
                    throw new Error('Read beyond buffer end');
                  }
                  return buffer[position++];
                },
                readBytes: (len: number) => {
                  if (position + len > buffer.length) {
                    throw new Error(`Read beyond buffer: position ${position}, length ${len}, buffer size ${buffer.length}`);
                  }
                  const result = buffer.slice(position, position + len);
                  position += len;
                  return result;
                },
                seek: (pos: number) => {
                  if (pos < 0 || pos > buffer.length) {
                    throw new Error(`Invalid seek position: ${pos}, buffer size ${buffer.length}`);
                  }
                  position = pos;
                  return position;
                },
                tell: () => position,
                size: () => buffer.length,
                slice: (start: number, end: number) => {
                  if (start < 0 || end > buffer.length || start >= end) {
                    throw new Error(`Invalid slice: start ${start}, end ${end}, buffer size ${buffer.length}`);
                  }
                  return buffer.slice(start, end);
                },
                getBuffer: () => buffer,
                // Add additional methods that might be expected
                readString: (len: number) => {
                  const bytes = buffer.slice(position, position + len);
                  position += len;
                  return new TextDecoder('utf-8').decode(bytes);
                },
                readUint8: () => {
                  return buffer[position++];
                },
                readUint16: () => {
                  const value = (buffer[position] | (buffer[position + 1] << 8));
                  position += 2;
                  return value;
                },
                readUint32: () => {
                  const value = (buffer[position] | 
                                (buffer[position + 1] << 8) | 
                                (buffer[position + 2] << 16) | 
                                (buffer[position + 3] << 24));
                  position += 4;
                  return value >>> 0; // Convert to unsigned
                }
              };
            };
            
            // Try several approaches with ReplayParser
            const readerObj = createEnhancedReader(buffer);
            
            // Try static parse method
            if (typeof (screparsed.ReplayParser as any).parse === 'function') {
              console.log('[browserSafeParser] Calling ReplayParser.parse with reader');
              return (screparsed.ReplayParser as any).parse(readerObj);
            }
            
            // Try static ParseReplay method
            if (typeof (screparsed.ReplayParser as any).ParseReplay === 'function') {
              console.log('[browserSafeParser] Calling ReplayParser.ParseReplay with reader');
              return (screparsed.ReplayParser as any).ParseReplay(readerObj);
            }
            
            // Try direct parsing - use as constructor if possible
            try {
              // This is tricky - try to call the constructor and check if parse exists
              // We use 'as any' to bypass TypeScript's private constructor restriction
              const parser = new (screparsed.ReplayParser as any)({ encoding: 'cp1252' });
              console.log('[browserSafeParser] Created ReplayParser instance:', parser);
              
              // If we have a parse method on the instance, use it
              if (typeof parser.parse === 'function') {
                console.log('[browserSafeParser] Calling instance parse method with reader');
                return parser.parse(readerObj);
              }
              
              // Try other parsing methods on the instance
              if (typeof parser.parseReplay === 'function') {
                console.log('[browserSafeParser] Calling instance parseReplay method with reader');
                return parser.parseReplay(readerObj);
              }
              
              if (typeof parser.ParseReplay === 'function') {
                console.log('[browserSafeParser] Calling instance ParseReplay method with reader');
                return parser.ParseReplay(readerObj);
              }
              
              console.log('[browserSafeParser] ReplayParser instance methods:', 
                Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
              
              throw new Error('No parse method found on ReplayParser instance');
            } catch (constrErr) {
              console.error('[browserSafeParser] Error creating/using ReplayParser instance:', constrErr);
              throw constrErr;
            }
          };
          
          // Test the parsing function with a small buffer
          const testBuffer = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
          try {
            console.log('[browserSafeParser] Testing parser with small buffer');
            testParsingWithReplayParser(testBuffer);
            console.log('[browserSafeParser] Test succeeded');
            
            // Set up our instance with the tested function
            parserInstance = {
              parse: testParsingWithReplayParser
            };
            isInitialized = true;
            console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using ReplayParser with reader)');
            return;
          } catch (testErr) {
            console.log('[browserSafeParser] Parser test failed:', testErr);
            // Continue to other approaches
          }
        } catch (readerErr) {
          console.error('[browserSafeParser] Error with reader-based approach:', readerErr);
        }
      }
      
      // APPROACH 4: Try direct module methods
      if (typeof (screparsed as any).parse === 'function') {
        console.log('[browserSafeParser] Found direct parse function on module');
        parserInstance = {
          parse: (data: Uint8Array) => (screparsed as any).parse(data)
        };
        isInitialized = true;
        console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using module.parse)');
        return;
      }
      
      // APPROACH 5: Try default export
      if (screparsed.default) {
        console.log('[browserSafeParser] Found default export, type:', typeof screparsed.default);
        
        if (typeof screparsed.default === 'function') {
          console.log('[browserSafeParser] Using default as function');
          // Fixed: Add 'new' keyword if it's a constructor
          parserInstance = {
            parse: (data: Uint8Array) => {
              try {
                // Try with 'new' keyword first
                return new (screparsed.default as any)(data);
              } catch (e) {
                // Fall back to regular function call if 'new' fails
                return (screparsed.default as any)(data);
              }
            }
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using default as function)');
          return;
        }
        
        if (typeof (screparsed.default as any).parse === 'function') {
          console.log('[browserSafeParser] Using default.parse');
          parserInstance = {
            parse: (data: Uint8Array) => (screparsed.default as any).parse(data)
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using default.parse)');
          return;
        }
        
        if (typeof (screparsed.default as any).ParsedReplay === 'function') {
          console.log('[browserSafeParser] Using default.ParsedReplay with new');
          parserInstance = {
            parse: (data: Uint8Array) => {
              // Use 'new' keyword for constructor
              return new (screparsed.default as any).ParsedReplay(data);
            }
          };
          isInitialized = true;
          console.log('[browserSafeParser] ✅ Browser-safe parser initialized (using default.ParsedReplay with new)');
          return;
        }
      }
      
      // Log available exports to help debug
      console.log('[browserSafeParser] Module exports:', Object.keys(screparsed));
      
      // If we get here, we couldn't find a working parser
      throw new Error('No compatible parsing method found in module');
      
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
