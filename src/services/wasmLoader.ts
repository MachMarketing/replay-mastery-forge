
/**
 * Handles replay parsing with WASM in a browser-compatible way
 * 
 * This module uses the SCREP-WASM parser to handle StarCraft replay files.
 */

// Flag to track if parser has been initialized
let parserInitialized = false;
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 2;
let lastInitTime = 0;

/**
 * Initialize the WASM parser module
 */
export async function initParserWasm(): Promise<void> {
  // Prevent initialization spamming
  const now = Date.now();
  if (now - lastInitTime < 2000) {
    console.log('[wasmLoader] Throttling parser initialization attempts');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  lastInitTime = now;
  
  // If already initialized, return immediately
  if (parserInitialized) {
    console.log('[wasmLoader] WASM parser module already initialized');
    return Promise.resolve();
  }
  
  // Don't start multiple initializations
  if (initializationInProgress) {
    console.log('[wasmLoader] WASM parser initialization already in progress, waiting...');
    return initializationPromise as Promise<void>;
  }

  console.log('[wasmLoader] Starting WASM parser module initialization...');
  initializationInProgress = true;
  initializationAttempts++;

  // Store the initialization promise to allow multiple requestors to wait for it
  initializationPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // Use defensive try/catch mechanism for imported objects
      let screpModule;
      try {
        // Dynamically import to prevent initialization errors
        const { screp } = await import('screp-js');
        screpModule = screp;
      } catch (importError) {
        console.error('[wasmLoader] Error importing screp-js module:', importError);
        throw new Error('Failed to import WASM parser module');
      }
      
      if (!screpModule || typeof screpModule.init !== 'function') {
        console.error('[wasmLoader] Invalid screp-js module imported');
        throw new Error('Invalid WASM parser module');
      }
      
      // Initialize WASM parser with timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('WASM initialization timed out after 10 seconds')), 10000);
      });
      
      // Race the initialization against the timeout
      try {
        await Promise.race([
          Promise.resolve(screpModule.init()).catch(e => {
            console.error('[wasmLoader] Init error:', e);
            throw e;
          }),
          timeoutPromise
        ]);
        console.log('[wasmLoader] WASM parser initialized successfully');
      } catch (error) {
        console.error('[wasmLoader] WASM initialization error:', error);
        throw error;
      }
      
      parserInitialized = true;
      initializationInProgress = false;
      resolve();
    } catch (error) {
      console.error('[wasmLoader] Error initializing WASM parser module:', error);
      
      if (initializationAttempts < MAX_INIT_ATTEMPTS) {
        console.log(`[wasmLoader] Retrying initialization (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);
        initializationInProgress = false;
        // Try again with a slight delay
        setTimeout(() => {
          resolve(initParserWasm());
        }, 1000);
      } else {
        console.error('[wasmLoader] Maximum initialization attempts reached, giving up');
        parserInitialized = false;
        initializationInProgress = false;
        reject(new Error('Failed to initialize WASM parser after multiple attempts'));
      }
    }
  });

  return initializationPromise;
}

/**
 * Force reset the parser initialization state
 */
export function forceWasmReset(): void {
  console.log('[wasmLoader] Force resetting WASM parser initialization state');
  parserInitialized = false;
  initializationInProgress = false;
  initializationPromise = null;
  initializationAttempts = 0;
}

/**
 * Enhanced file validation specifically for StarCraft replay files
 */
function validateReplayData(data: Uint8Array): boolean {
  if (!data || data.length < 12) {
    return false;
  }
  
  try {
    // Check for common replay file signatures
    // Most StarCraft replays start with "(B)" followed by version info
    const signature = String.fromCharCode(...data.slice(0, 4));
    if (signature !== "(B)w" && signature !== "(B)W") {
      console.warn('[wasmLoader] Invalid replay signature:', signature);
      return false;
    }
    
    // Additional structural checks
    // Verify expected offsets - minimal replay headers contain certain recognizable patterns
    const hasExpectedFormat = data.length > 50 && 
                             (data[12] === 0x88 || data[12] === 0x69 || data[12] === 0x48);
    
    return hasExpectedFormat;
  } catch (error) {
    console.error('[wasmLoader] Error validating replay data:', error);
    return false;
  }
}

/**
 * Parse a replay file using the WASM parser with enhanced error handling
 */
export async function parseReplayWasm(fileData: Uint8Array): Promise<any> {
  try {
    // Validate input data
    if (!fileData || fileData.length === 0) {
      throw new Error('Empty replay data provided');
    }
    
    // Size sanity check - typical replay files are between 20KB and 200KB
    if (fileData.length < 1000) {
      throw new Error('Replay file too small, likely corrupted');
    }
    
    if (fileData.length > 5000000) {
      throw new Error('Replay file too large, maximum size is 5MB');
    }
    
    // Additional replay file validation
    if (!validateReplayData(fileData)) {
      throw new Error('Invalid replay file format or corrupted file');
    }
    
    // Ensure parser is initialized
    if (!parserInitialized) {
      console.log('[wasmLoader] WASM parser not initialized, initializing now...');
      try {
        await initParserWasm();
      } catch (error) {
        console.error('[wasmLoader] Failed to initialize WASM parser:', error);
        throw new Error('Fehler bei der Initialisierung des WASM-Parsers. Bitte versuchen Sie es später erneut.');
      }
    }

    console.log('[wasmLoader] Starting parsing of replay data with WASM, size:', fileData.byteLength);
    
    // Use dynamic import to prevent initialization failures
    let screpModule;
    try {
      const { screp } = await import('screp-js');
      screpModule = screp;
    } catch (importError) {
      console.error('[wasmLoader] Error importing screp-js for parsing:', importError);
      throw new Error('Failed to import WASM parser module for parsing');
    }
    
    if (!screpModule || typeof screpModule.parseReplay !== 'function') {
      console.error('[wasmLoader] Invalid screp-js module imported for parsing');
      throw new Error('Invalid WASM parser module for parsing');
    }
    
    // Use screp-js WASM parser with explicit error handling and timeout
    const parsePromise = new Promise((resolve, reject) => {
      try {
        // Create a defensive copy of the file data to prevent WASM errors
        // This helps with some "makeslice" errors by ensuring the buffer is properly aligned
        const defensiveCopy = new Uint8Array(fileData.length);
        defensiveCopy.set(fileData, 0);
        
        // Wrap the parsing in a try-catch to handle WASM errors
        try {
          const result = screpModule.parseReplay(defensiveCopy);
          
          // Additional validation on the result
          if (!result || typeof result !== 'object') {
            reject(new Error('Parser returned invalid or empty result'));
            return;
          }
          
          // Check for required fields to validate result
          if (!result.header) {
            reject(new Error('Parser result missing header information'));
            return;
          }
          
          resolve(result);
        } catch (wasmError) {
          // This is the critical error handling for WASM errors
          console.error('[wasmLoader] WASM parsing exception:', wasmError);
          
          const errorMessage = wasmError instanceof Error ? wasmError.message : String(wasmError);
          
          // Special handling for makeslice errors
          if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
            console.error('💥 [wasmLoader] WASM makeslice error encountered');
            reject(new Error('Die Replay-Datei ist beschädigt oder in einem nicht unterstützten Format. Der WASM-Parser konnte die Datenstruktur nicht verarbeiten.'));
          } else {
            reject(new Error(`WASM parser exception: ${errorMessage}`));
          }
        }
      } catch (outerError) {
        console.error('[wasmLoader] Outer error during WASM parsing:', outerError);
        reject(outerError);
      }
    });
    
    // Set a timeout for parsing to prevent browser hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Parsing timed out after 10 seconds')), 10000);
    });
    
    // Race the parsing against the timeout
    const parsedData = await Promise.race([parsePromise, timeoutPromise]);
    
    // Verify we have data
    if (!parsedData) {
      throw new Error('WASM parser returned empty data');
    }
    
    console.log('[wasmLoader] Replay parsed successfully with WASM');
    return parsedData;
  } catch (error) {
    console.error('[wasmLoader] Error during WASM parsing:', error);
    
    // If we encounter the specific "len out of range" error, provide a more helpful message
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
      console.error('💥 [wasmLoader] Fatal WASM makeslice error');
      throw new Error('Replay-Datei scheint beschädigt zu sein. Der Parser kann die Dateistruktur nicht korrekt lesen.');
    }
    
    if (errorMessage.includes('timeout')) {
      throw new Error('Zeitüberschreitung beim Parsen. Die Datei ist möglicherweise zu komplex.');
    }
    
    // In production, throw the error with a user-friendly message
    throw new Error(`WASM parsing failed: ${errorMessage}`);
  }
}

/**
 * Check if WASM parser is initialized
 */
export function isWasmInitialized(): boolean {
  return parserInitialized;
}

/**
 * Reset WASM parser initialization status
 */
export function resetWasmStatus(): void {
  parserInitialized = false;
  initializationInProgress = false;
  initializationPromise = null;
  initializationAttempts = 0;
}
