
/**
 * Handles replay parsing with WASM in a browser-compatible way
 * 
 * This module uses the SCREP-WASM parser to handle StarCraft replay files.
 * Includes fallback mechanisms for browsers with WASM compatibility issues.
 */
import * as Screp from 'screp-js';
import { markBrowserAsHavingWasmIssues, hasBrowserWasmIssues } from '@/utils/browserDetection';

// Constants for better code readability
const WASM_MEMORY_ERROR_KEYWORDS = ['makeslice', 'runtime error', 'out of bounds', 'memory access'];
const MIN_VALID_REPLAY_SIZE = 1024; // Minimum size (bytes) for a valid replay file

// State management for WASM initialization
let screpModule: any = null;
let initializationAttempted = false;
let initializationFailed = false;

/**
 * Check if browser is likely to support WASM properly
 */
export function canUseWasm(): boolean {
  return !hasBrowserWasmIssues() && typeof WebAssembly === 'object';
}

/**
 * Initialize the WASM parser module with enhanced error handling
 */
export async function initParserWasm(): Promise<boolean> {
  // Skip if already initialized or a previous attempt failed
  if (screpModule) {
    return true;
  }
  
  if (initializationAttempted && initializationFailed) {
    console.warn('[wasmLoader] Skipping initialization due to previous failure');
    return false;
  }
  
  // Check for known browser compatibility issues
  if (hasBrowserWasmIssues()) {
    console.warn('[wasmLoader] Browser has known WASM issues, skipping initialization');
    initializationAttempted = true;
    initializationFailed = true;
    return false;
  }
  
  console.log('[wasmLoader] Initializing WASM parser module');
  initializationAttempted = true;
  
  try {
    // Log available exports for debugging
    console.log('🔍 Screp module exports:', Object.keys(Screp));
    console.log('🔍 Screp.default exports:', Object.keys(Screp.default || {}));
    
    // Try to get the module, prioritizing default export
    screpModule = Screp.default || Screp;
    
    // Validate that we have the module - should have at least some methods
    if (!screpModule || typeof screpModule !== 'object' || Object.keys(screpModule).length === 0) {
      throw new Error('Invalid screp-js module imported');
    }
    
    // Wait for the module to be ready if it has a Promise-like ready property
    if (screpModule.ready && typeof screpModule.ready.then === 'function') {
      await screpModule.ready;
    }
    
    // Validate that the module has a parseBuffer function
    if (!hasParseFunction(screpModule)) {
      throw new Error('No valid parse function found in screp-js module');
    }
    
    console.log('[wasmLoader] WASM parser initialized successfully');
    initializationFailed = false;
    return true;
  } catch (error) {
    console.error('[wasmLoader] WASM initialization error:', error);
    
    // Mark the browser as having WASM issues if the error suggests memory problems
    if (error instanceof Error && 
        WASM_MEMORY_ERROR_KEYWORDS.some(keyword => error.message.includes(keyword))) {
      markBrowserAsHavingWasmIssues();
    }
    
    // Reset state and return failure
    screpModule = null;
    initializationFailed = true;
    return false;
  }
}

/**
 * Force reset the parser initialization state
 */
export function forceWasmReset(): void {
  console.log('[wasmLoader] Force resetting WASM parser initialization state');
  screpModule = null;
  initializationAttempted = false;
  initializationFailed = false;
}

/**
 * Check if WASM parser is initialized and ready
 */
export function isWasmInitialized(): boolean {
  return screpModule !== null && !initializationFailed;
}

/**
 * Helper function to check if the module has a valid parse function
 */
function hasParseFunction(module: any): boolean {
  return (
    (typeof module.parseBuffer === 'function') || 
    (typeof module.parseReplay === 'function') || 
    (typeof module.parse === 'function')
  );
}

/**
 * Validate replay data before parsing
 */
function validateReplayData(data: Uint8Array): boolean {
  if (!data || data.length < MIN_VALID_REPLAY_SIZE) {
    return false;
  }
  
  return true;
}

/**
 * Parse a replay file using the WASM parser with enhanced error handling
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  if (!data || data.length === 0) {
    throw new Error('Empty replay data provided');
  }
  
  // Validate basic replay file structure
  if (!validateReplayData(data)) {
    throw new Error('Invalid replay data format');
  }
  
  // Check for known browser issues before attempting parse
  if (hasBrowserWasmIssues()) {
    throw new Error('Browser has known WASM compatibility issues');
  }
  
  try {
    // Initialize WASM if not already done
    if (!screpModule) {
      const initialized = await initParserWasm();
      if (!initialized) {
        throw new Error('Failed to initialize WASM parser');
      }
    }
    
    console.log('[wasmLoader] Starting parsing with WASM, size:', data.byteLength);
    console.log('[wasmLoader] Available methods on screpModule:', Object.keys(screpModule));
    
    // Prioritize using parseBuffer as the correct function
    if (typeof screpModule.parseBuffer === 'function') {
      console.log('[wasmLoader] Using parseBuffer function');
      return await screpModule.parseBuffer(data);
    } 
    // Fallbacks for backward compatibility, but less likely to work
    else if (typeof screpModule.parseReplay === 'function') {
      console.log('[wasmLoader] Falling back to parseReplay function');
      return screpModule.parseReplay(data);
    } 
    else if (typeof screpModule.parse === 'function') {
      console.log('[wasmLoader] Falling back to parse function');
      return screpModule.parse(data);
    } 
    else {
      throw new Error('No valid parse function found in screp-js module');
    }
  } catch (error) {
    console.error('[wasmLoader] Error in WASM parsing:', error);
    
    // Check for memory errors and mark browser accordingly
    if (error instanceof Error && 
        WASM_MEMORY_ERROR_KEYWORDS.some(keyword => error.message.includes(keyword))) {
      markBrowserAsHavingWasmIssues();
    }
    
    // Force reset on any parsing error to allow for retries
    forceWasmReset();
    
    throw error;
  }
}
