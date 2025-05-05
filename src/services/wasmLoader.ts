
/**
 * Handles replay parsing with WASM in a browser-compatible way
 * 
 * This module uses the SCREP-WASM parser to handle StarCraft replay files.
 */
import * as Screp from 'screp-js';
import { markBrowserAsHavingWasmIssues } from '@/utils/browserDetection';

// State management for WASM initialization
let parserInitialized = false;
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;
let screpModule: any = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 2; // Reduced max attempts

/**
 * Initialize the WASM parser module with safer try/catch blocks
 */
export async function initParserWasm(): Promise<void> {
  // If already initialized, return immediately
  if (parserInitialized && screpModule) {
    return Promise.resolve();
  }
  
  // Don't start multiple initializations
  if (initializationInProgress) {
    return initializationPromise as Promise<void>;
  }

  console.log('[wasmLoader] Starting WASM parser module initialization...');
  initializationInProgress = true;
  initializationAttempts++;

  // Store the initialization promise
  initializationPromise = new Promise<void>((resolve, reject) => {
    // Set a timeout for the entire operation
    const timeoutId = setTimeout(() => {
      initializationInProgress = false;
      reject(new Error('WASM initialization timed out'));
    }, 5000);
    
    const cleanupAndResolve = () => {
      clearTimeout(timeoutId);
      initializationInProgress = false;
      parserInitialized = true;
      resolve();
    };
    
    const cleanupAndReject = (error: any) => {
      clearTimeout(timeoutId);
      initializationInProgress = false;
      parserInitialized = false;
      screpModule = null;
      reject(error);
    };
    
    try {
      if (initializationAttempts > MAX_INIT_ATTEMPTS) {
        return cleanupAndReject(new Error(`Failed to initialize WASM after ${MAX_INIT_ATTEMPTS} attempts`));
      }
      
      // Initialize the screp module
      if (!screpModule) {
        try {
          screpModule = Screp.default || Screp;
          
          if (!screpModule || typeof screpModule !== 'object') {
            return cleanupAndReject(new Error('Invalid screp-js module structure'));
          }
        } catch (error) {
          return cleanupAndReject(new Error('Failed to load screp-js module'));
        }
      }
      
      // Initialize the module with safer promise handling
      Promise.resolve()
        .then(() => {
          if (screpModule.ready && typeof screpModule.ready.then === 'function') {
            return screpModule.ready;
          } else if (typeof screpModule.init === 'function') {
            return screpModule.init();
          }
          return Promise.resolve();
        })
        .then(() => {
          // Add a small delay after initialization
          return new Promise(resolve => setTimeout(resolve, 100));
        })
        .then(() => {
          // Check for parse function
          const hasParseFunction = typeof screpModule.parse === 'function' || 
                                  typeof screpModule.parseReplay === 'function';
                                  
          if (!hasParseFunction) {
            throw new Error('screp-js module loaded but parse function not available');
          }
          
          cleanupAndResolve();
        })
        .catch(error => {
          cleanupAndReject(error);
        });
    } catch (error) {
      cleanupAndReject(error);
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
    } catch (e) {
      // Ignore errors - gc() isn't standard
    }
  }
}

/**
 * Parse a replay file using the WASM parser with enhanced safety features
 */
export async function parseReplayWasm(fileData: Uint8Array): Promise<any> {
  if (!fileData || fileData.length === 0) {
    throw new Error('Empty replay data provided');
  }
  
  try {
    if (!screpModule) {
      await initParserWasm();
    }
    
    console.log('[wasmLoader] Starting parsing with WASM, size:', fileData.byteLength);
    
    // Create a defensive copy with extra padding to prevent buffer overflow
    const paddedData = new Uint8Array(fileData.length + 16384); // 16KB padding
    paddedData.set(fileData, 0);
    
    // Use a Promise with timeout to prevent hanging
    const parsePromise = new Promise((resolve, reject) => {
      try {
        // Use whatever parse function is available
        if (typeof screpModule.parseReplay === 'function') {
          resolve(screpModule.parseReplay(paddedData));
        } else if (typeof screpModule.parse === 'function') {
          resolve(screpModule.parse(paddedData));
        } else {
          reject(new Error('No parse function available'));
        }
      } catch (error) {
        // Immediate synchronous errors
        if (error instanceof Error && 
            (error.message.includes('makeslice') || 
             error.message.includes('runtime error'))) {
          markBrowserAsHavingWasmIssues();
        }
        reject(error);
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('WASM parsing timed out')), 3000);
    });
    
    // Race between parsing and timeout
    const result = await Promise.race([parsePromise, timeoutPromise]);
    
    if (!result || typeof result !== 'object') {
      throw new Error('Parser returned invalid result');
    }
    
    return result;
  } catch (error) {
    console.error('[wasmLoader] Error in WASM parsing:', error);
    
    // Check for makeslice errors
    if (error instanceof Error && 
        (error.message.includes('makeslice') || 
         error.message.includes('runtime error'))) {
      markBrowserAsHavingWasmIssues();
    }
    
    // Force reset on any parsing error
    forceWasmReset();
    
    throw error;
  }
}

/**
 * Check if WASM parser is initialized
 */
export function isWasmInitialized(): boolean {
  return parserInitialized && screpModule !== null;
}
