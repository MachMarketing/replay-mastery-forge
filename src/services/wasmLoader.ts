
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

// Parser options to ensure commands are included
const PARSER_OPTIONS = {
  includeCommands: true,
  verboseCommands: true,
  calculateAPM: true,
  parseActions: true,
  parseChat: true
};

// State management for WASM initialization
let screpModule: any = null;
let initializationAttempted = false;
let initializationFailed = false;
let parserVersion: string | null = null;

/**
 * Check if browser is likely to support WASM properly
 */
export function canUseWasm(): boolean {
  return !hasBrowserWasmIssues() && typeof WebAssembly === 'object';
}

/**
 * Get the version of the WASM parser if available
 */
export function getParserVersion(): string | null {
  if (!screpModule) return null;
  
  try {
    if (typeof screpModule.getVersion === 'function') {
      return screpModule.getVersion();
    }
    
    if (typeof screpModule.getVersionObject === 'function') {
      const versionObj = screpModule.getVersionObject();
      return `${versionObj.Major}.${versionObj.Minor}.${versionObj.Patch}`;
    }
  } catch (e) {
    console.warn('[wasmLoader] Error getting parser version:', e);
  }
  
  return 'unknown';
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
    
    // Validate that the module has a parse function
    if (!hasParseFunction(screpModule)) {
      throw new Error('No valid parse function found in screp-js module');
    }
    
    // Get and log the parser version
    parserVersion = getParserVersion();
    console.log(`[wasmLoader] WASM parser initialized successfully (version: ${parserVersion})`);
    
    // Pre-configure options if possible
    if (typeof screpModule.resolveOptions === 'function') {
      try {
        console.log('[wasmLoader] Configuring parser options:', PARSER_OPTIONS);
        screpModule.resolveOptions(PARSER_OPTIONS);
      } catch (e) {
        console.warn('[wasmLoader] Failed to set parser options:', e);
      }
    }
    
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
  parserVersion = null;
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
 * Parse a replay file using the WASM parser with enhanced error handling
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  if (!data || data.length === 0) {
    throw new Error('Empty replay data provided');
  }
  
  // Basic size check (very minimal validation)
  if (data.length < MIN_VALID_REPLAY_SIZE) {
    throw new Error('Replay file too small to be valid');
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
    
    // Create a copy of the data to avoid any potential memory issues
    const dataCopy = new Uint8Array(data);
    
    // Try parseBuffer first with options
    if (typeof screpModule.parseBuffer === 'function') {
      try {
        console.log('[wasmLoader] Trying parseBuffer function with options');
        const parseOptions = { ...PARSER_OPTIONS };
        
        // Try to pass options if method signature supports it
        let result;
        if (screpModule.parseBuffer.length >= 2) {
          console.log('[wasmLoader] Calling parseBuffer with options:', parseOptions);
          result = await screpModule.parseBuffer(dataCopy, parseOptions);
        } else {
          // Fall back to calling without options
          console.log('[wasmLoader] Calling parseBuffer without options');
          result = await screpModule.parseBuffer(dataCopy);
        }
        
        console.log('[wasmLoader] parseBuffer result structure:', Object.keys(result || {}));
        
        // Log commands status
        if (result && result.Commands) {
          console.log(`[wasmLoader] Commands found: ${Array.isArray(result.Commands) ? result.Commands.length : 'not an array'}`);
          if (Array.isArray(result.Commands) && result.Commands.length > 0) {
            console.log('[wasmLoader] First command sample:', result.Commands[0]);
          }
        } else {
          console.warn('[wasmLoader] No Commands array in result');
        }
        
        // Initialize Commands as empty array if null/undefined
        if (result && (result.Commands === null || result.Commands === undefined)) {
          console.log('[wasmLoader] Initializing null Commands as empty array');
          result.Commands = [];
        }
        
        return result;
      } catch (err) {
        console.error('[wasmLoader] Error in parseBuffer:', err);
        // Continue to next method
      }
    }
    
    // If parseBuffer didn't work, try parseReplay
    if (typeof screpModule.parseReplay === 'function') {
      try {
        console.log('[wasmLoader] Trying parseReplay function');
        const result = await screpModule.parseReplay(dataCopy);
        
        // Initialize Commands as empty array if null/undefined
        if (result && (result.Commands === null || result.Commands === undefined)) {
          console.log('[wasmLoader] Initializing null Commands as empty array');
          result.Commands = [];
        }
        
        return result;
      } catch (err) {
        console.error('[wasmLoader] Error in parseReplay:', err);
        // Continue to next method
      }
    }
    
    // If neither worked, try parse function
    if (typeof screpModule.parse === 'function') {
      try {
        console.log('[wasmLoader] Trying parse function');
        const result = await screpModule.parse(dataCopy);
        
        // Initialize Commands as empty array if null/undefined
        if (result && (result.Commands === null || result.Commands === undefined)) {
          console.log('[wasmLoader] Initializing null Commands as empty array');
          result.Commands = [];
        }
        
        return result;
      } catch (err) {
        console.error('[wasmLoader] Error in parse:', err);
      }
    }
    
    throw new Error('All WASM parsing methods failed');
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
