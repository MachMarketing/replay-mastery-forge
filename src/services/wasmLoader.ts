
/**
 * Handles replay parsing with WASM in a browser-compatible way
 * 
 * This module uses the SCREP-WASM parser to handle StarCraft replay files.
 */
import { screp } from 'screp-js';

// Flag to track if parser has been initialized
let parserInitialized = false;
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;
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
      // Initialize WASM parser (screp-js will initialize itself on first use)
      try {
        // Force WASM initialization by calling a simple method
        await screp.init();
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
 * Checks common replay file signatures and validates structure
 */
function validateReplayData(data: Uint8Array): boolean {
  if (!data || data.length < 12) {
    return false;
  }
  
  // Check for common replay file signatures
  // Most StarCraft replays start with "(B)" followed by version info
  const signature = String.fromCharCode(...data.slice(0, 4));
  if (signature !== "(B)w" && signature !== "(B)W") {
    console.warn('[wasmLoader] Invalid replay signature:', signature);
    return false;
  }
  
  // Additional structural checks could be added here
  return true;
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
      await initParserWasm();
    }

    console.log('[wasmLoader] Starting parsing of replay data with WASM, size:', fileData.byteLength);
    
    // Use screp-js WASM parser with explicit error handling
    const parsePromise = new Promise((resolve, reject) => {
      try {
        // Wrap the WASM parsing in a try-catch block with detailed error handling
        const result = screp.parseReplay(fileData);
        
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
      } catch (error) {
        console.error('[wasmLoader] WASM parsing exception:', error);
        
        // Enhanced error reporting for specific WASM errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
          reject(new Error('Die Replay-Datei ist beschädigt oder in einem nicht unterstützten Format. Der WASM-Parser konnte die Datenstruktur nicht verarbeiten.'));
        } else {
          reject(new Error(`WASM parser exception: ${errorMessage}`));
        }
      }
    });
    
    // Set a timeout for parsing to prevent browser hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Parsing timed out after 20 seconds')), 20000);
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
      throw new Error('Replay-Datei scheint beschädigt zu sein. Der Parser kann die Dateistruktur nicht korrekt lesen.');
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
