
/**
 * Handles replay parsing with WASM in a browser-compatible way
 * 
 * This module uses the SCREP-WASM parser to handle StarCraft replay files.
 */
import * as Screp from 'screp-js';

// Flag to track if parser has been initialized
let parserInitialized = false;
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;
let screpModule: any;

/**
 * Initialize the WASM parser module
 */
export async function initParserWasm(): Promise<void> {
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

  // Store the initialization promise to allow multiple requestors to wait for it
  initializationPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // Use static import of Screp
      if (!screpModule) {
        screpModule = Screp.default || Screp;
        console.log('[wasmLoader] Screp module loaded:', screpModule);
      }
      
      // Initialize if the module has a ready property or init function
      if (screpModule.ready) {
        await screpModule.ready;
      } else if (typeof screpModule.init === 'function') {
        await screpModule.init();
      }
      
      console.log('[wasmLoader] WASM parser initialized successfully');
      parserInitialized = true;
      initializationInProgress = false;
      resolve();
    } catch (error) {
      console.error('[wasmLoader] Error initializing WASM parser module:', error);
      parserInitialized = false;
      initializationInProgress = false;
      reject(new Error('Failed to initialize WASM parser'));
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
  screpModule = null;
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
    
    // Ensure parser is initialized
    if (!screpModule) {
      console.log('[wasmLoader] WASM parser not initialized, initializing now...');
      try {
        await initParserWasm();
      } catch (error) {
        console.error('[wasmLoader] Failed to initialize WASM parser:', error);
        throw new Error('Fehler bei der Initialisierung des WASM-Parsers. Bitte versuchen Sie es später erneut.');
      }
    }

    console.log('[wasmLoader] Starting parsing of replay data with WASM, size:', fileData.byteLength);
    
    // Create a defensive copy of the file data to prevent WASM errors
    const defensiveCopy = new Uint8Array(fileData.length);
    defensiveCopy.set(fileData, 0);
    
    // Use screp-js WASM parser with the correct function
    let result;
    if (typeof screpModule.parseReplay === 'function') {
      result = screpModule.parseReplay(defensiveCopy);
    } else if (typeof screpModule.parse === 'function') {
      result = screpModule.parse(defensiveCopy);
    } else {
      throw new Error('No valid parse function found in screp-js module');
    }
    
    // Additional validation on the result
    if (!result || typeof result !== 'object') {
      throw new Error('Parser returned invalid or empty result');
    }
    
    console.log('[wasmLoader] Replay parsed successfully with WASM');
    return result;
  } catch (error) {
    console.error('[wasmLoader] Error during WASM parsing:', error);
    
    // In production, throw the error with a user-friendly message
    throw new Error(`WASM parsing failed: ${error instanceof Error ? error.message : String(error)}`);
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
  screpModule = null;
}
