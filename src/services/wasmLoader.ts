
/**
 * Handles replay parsing with WASM in a browser-compatible way
 * 
 * This module uses the SCREP-WASM parser to handle StarCraft replay files.
 */
import * as Screp from 'screp-js';

// State management for WASM initialization
let parserInitialized = false;
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;
let screpModule: any = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Memory management tracking
let lastMemoryErrorTime = 0;
let memoryErrorCount = 0;

/**
 * Initialize the WASM parser module with retry mechanism
 */
export async function initParserWasm(): Promise<void> {
  // If already initialized, return immediately
  if (parserInitialized && screpModule) {
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
      if (initializationAttempts > MAX_INIT_ATTEMPTS) {
        throw new Error(`Failed to initialize WASM after ${MAX_INIT_ATTEMPTS} attempts`);
      }
      
      // Load the module
      if (!screpModule) {
        try {
          // Try to access the module in different ways to handle variations in how it might be exposed
          screpModule = Screp.default || Screp;
          
          // Extra safety check - ensure we have a valid module object
          if (!screpModule || typeof screpModule !== 'object') {
            throw new Error('Invalid screp-js module structure');
          }
          
          console.log('[wasmLoader] Screp module loaded:', typeof screpModule);
        } catch (error) {
          console.error('[wasmLoader] Error loading Screp module:', error);
          throw new Error('Failed to load screp-js module');
        }
      }
      
      // Initialize the module
      try {
        // Check for different ways the module might be initialized
        if (screpModule.ready && typeof screpModule.ready.then === 'function') {
          await screpModule.ready;
          console.log('[wasmLoader] Module ready promise resolved');
        } else if (typeof screpModule.init === 'function') {
          await screpModule.init();
          console.log('[wasmLoader] Module init function called');
        } else {
          console.log('[wasmLoader] No explicit initialization method found, assuming module is ready');
        }
        
        // Add a small delay after initialization for WASM to fully settle
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('[wasmLoader] Error during module initialization:', error);
        throw error;
      }
      
      // Final check for module readiness - be flexible about function names
      const hasParseFunction = typeof screpModule.parse === 'function' || 
                               typeof screpModule.parseReplay === 'function';
                               
      if (!screpModule || !hasParseFunction) {
        throw new Error('screp-js module loaded but parse function not available');
      }
      
      console.log('[wasmLoader] WASM parser initialized successfully');
      parserInitialized = true;
      initializationInProgress = false;
      resolve();
    } catch (error) {
      console.error('[wasmLoader] Error initializing WASM parser module:', error);
      parserInitialized = false;
      initializationInProgress = false;
      screpModule = null; // Clear the module reference on failure
      
      // Cleanup for next attempt
      setTimeout(() => {
        console.log('[wasmLoader] Cleaning up failed initialization state');
        initializationInProgress = false;
      }, 500);
      
      reject(new Error(`Failed to initialize WASM parser: ${error instanceof Error ? error.message : String(error)}`));
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
  initializationAttempts = 0;
  
  // Try to help the garbage collector
  if (typeof window !== 'undefined' && window.gc) {
    try {
      // @ts-ignore - Ignore TypeScript errors for this experimental feature
      window.gc();
      console.log('[wasmLoader] Triggered garbage collection');
    } catch (e) {
      // Ignore errors - gc() isn't standard
    }
  }
}

/**
 * Parse a replay file using the WASM parser with enhanced error handling
 */
export async function parseReplayWasm(fileData: Uint8Array): Promise<any> {
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
  
  // Reset memory error count if it's been more than 60 seconds
  const now = Date.now();
  if (now - lastMemoryErrorTime > 60000) {
    memoryErrorCount = 0;
  }
  
  // Check if we've had too many memory errors recently
  if (memoryErrorCount >= 3) {
    console.warn('[wasmLoader] Too many recent memory errors, forcing reset before parsing');
    forceWasmReset();
    await new Promise(resolve => setTimeout(resolve, 500));
    memoryErrorCount = 0;
  }
  
  // Ensure parser is initialized, with retry if needed
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (!parserInitialized || !screpModule) {
        console.log(`[wasmLoader] WASM parser initialization attempt ${attempt + 1}`);
        try {
          await initParserWasm();
        } catch (initError) {
          console.error(`[wasmLoader] Failed to initialize WASM parser on attempt ${attempt + 1}:`, initError);
          // If this is the last attempt, throw the error
          if (attempt >= 1) throw initError;
          
          // Otherwise, reset and try again
          forceWasmReset();
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before retry
          continue;
        }
      }
      
      console.log('[wasmLoader] Starting parsing of replay data with WASM, size:', fileData.byteLength);
      
      // Create a defensive copy of the file data to prevent memory corruption
      const defensiveCopy = new Uint8Array(fileData.length);
      defensiveCopy.set(fileData, 0);
      
      // Add extra padding to the buffer as a protection against buffer overflows
      // This can prevent some "makeslice: len out of range" errors
      const paddedCopy = new Uint8Array(defensiveCopy.length + 2048);
      paddedCopy.set(defensiveCopy, 0);
      
      // Try parsing with different approaches
      try {
        let result;
        
        // First try the standard parse function or alternatives
        if (typeof screpModule.parseReplay === 'function') {
          result = await Promise.resolve(screpModule.parseReplay(defensiveCopy));
        } else if (typeof screpModule.parse === 'function') {
          result = await Promise.resolve(screpModule.parse(defensiveCopy));
        } else {
          throw new Error('No valid parse function found in screp-js module');
        }
        
        // Verify the result
        if (!result || typeof result !== 'object') {
          throw new Error('Parser returned invalid result');
        }
        
        console.log('[wasmLoader] WASM parsing successful');
        return result;
      } catch (parseError) {
        // Check for known WASM memory errors
        const isMemoryError = parseError.message && (
          parseError.message.includes('makeslice: len out of range') || 
          parseError.message.includes('runtime error') ||
          parseError.message.includes('memory access out of bounds')
        );
        
        if (isMemoryError) {
          console.warn('[wasmLoader] WASM memory error detected:', parseError.message);
          
          // Track memory errors
          lastMemoryErrorTime = Date.now();
          memoryErrorCount++;
          
          // If this is the first attempt, try again with the padded buffer
          if (attempt === 0) {
            console.log('[wasmLoader] Retrying with padded buffer after memory error');
            forceWasmReset();
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before retry
            
            try {
              // Try to initialize with fresh state
              await initParserWasm();
              
              // Try with padded buffer on second attempt
              if (typeof screpModule.parseReplay === 'function') {
                const result = await Promise.resolve(screpModule.parseReplay(paddedCopy));
                if (!result || typeof result !== 'object') {
                  throw new Error('Parser returned invalid result with padded buffer');
                }
                console.log('[wasmLoader] WASM parsing successful with padded buffer');
                return result;
              }
            } catch (paddedError) {
              console.error('[wasmLoader] Error with padded buffer:', paddedError);
              // Let it fall through to retry on next iteration
            }
          }
        }
        
        throw parseError;
      }
    } catch (error) {
      // If this is the last attempt, throw the error
      if (attempt >= 1) throw error;
      
      // Otherwise reset and try again
      console.error(`[wasmLoader] Error during attempt ${attempt + 1}:`, error);
      forceWasmReset();
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before retry
    }
  }
  
  throw new Error('Failed to parse replay after multiple attempts');
}

/**
 * Check if WASM parser is initialized
 */
export function isWasmInitialized(): boolean {
  return parserInitialized && screpModule !== null;
}

/**
 * Reset WASM parser initialization status
 */
export function resetWasmStatus(): void {
  parserInitialized = false;
  initializationInProgress = false;
  initializationPromise = null;
  screpModule = null;
  initializationAttempts = 0;
  memoryErrorCount = 0;
  lastMemoryErrorTime = 0;
}
