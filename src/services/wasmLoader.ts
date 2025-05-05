
/**
 * Handles replay parsing with WASM in a browser-compatible way
 * 
 * This module uses the SCREP-WASM parser to handle StarCraft replay files.
 */
import * as Screp from 'screp-js';
import { markBrowserAsHavingWasmIssues } from '@/utils/browserDetection';

// State management for WASM initialization
let screpModule: any = null;

/**
 * Initialize the WASM parser module
 */
export async function initParserWasm(): Promise<void> {
  if (!screpModule) {
    console.log('[wasmLoader] Initializing WASM parser module');
    screpModule = Screp.default || Screp;
    
    if (screpModule.ready && typeof screpModule.ready.then === 'function') {
      await screpModule.ready;
    }
  }
}

/**
 * Force reset the parser initialization state
 */
export function forceWasmReset(): void {
  console.log('[wasmLoader] Force resetting WASM parser initialization state');
  screpModule = null;
}

/**
 * Check if WASM parser is initialized
 */
export function isWasmInitialized(): boolean {
  return screpModule !== null;
}

/**
 * Parse a replay file using the WASM parser
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  if (!data || data.length === 0) {
    throw new Error('Empty replay data provided');
  }
  
  try {
    if (!screpModule) {
      await initParserWasm();
    }
    
    console.log('[wasmLoader] Starting parsing with WASM, size:', data.byteLength);
    
    // Use whatever parse function is available
    if (typeof screpModule.parseReplay === 'function') {
      return screpModule.parseReplay(data);
    }
    
    if (typeof screpModule.parse === 'function') {
      return screpModule.parse(data);
    }
    
    throw new Error('No valid parse function found in screp-js module');
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
