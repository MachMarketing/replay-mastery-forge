
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
    
    // Validate that the module has a parse function
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
    
    // Try all available parsing methods until one works
    let result = null;
    let hasValidCommands = false;
    
    // Try parseBuffer first (most common in newer versions)
    if (typeof screpModule.parseBuffer === 'function') {
      try {
        console.log('[wasmLoader] Trying parseBuffer function');
        result = await screpModule.parseBuffer(dataCopy);
        console.log('[wasmLoader] parseBuffer result:', JSON.stringify(result).substring(0, 200) + '...');
        
        // Check if Commands array is valid
        if (result && Array.isArray(result.Commands) && result.Commands.length > 0) {
          hasValidCommands = true;
          console.log(`[wasmLoader] parseBuffer returned ${result.Commands.length} valid commands`);
        } else if (result) {
          console.warn('[wasmLoader] parseBuffer returned result without valid Commands array');
        }
      } catch (err) {
        console.error('[wasmLoader] Error in parseBuffer:', err);
        // Continue to next method
      }
    }
    
    // If parseBuffer didn't work, try parseReplay
    if (!hasValidCommands && typeof screpModule.parseReplay === 'function') {
      try {
        console.log('[wasmLoader] Trying parseReplay function');
        const replayResult = await screpModule.parseReplay(dataCopy);
        console.log('[wasmLoader] parseReplay result:', JSON.stringify(replayResult).substring(0, 200) + '...');
        
        if (replayResult && Array.isArray(replayResult.Commands) && replayResult.Commands.length > 0) {
          result = replayResult;
          hasValidCommands = true;
          console.log(`[wasmLoader] parseReplay returned ${replayResult.Commands.length} valid commands`);
        } else if (!result) {
          // Only use this result if we don't have any previous result
          result = replayResult;
        }
      } catch (err) {
        console.error('[wasmLoader] Error in parseReplay:', err);
        // Continue to next method
      }
    }
    
    // If neither worked, try parse function
    if (!hasValidCommands && typeof screpModule.parse === 'function') {
      try {
        console.log('[wasmLoader] Trying parse function');
        const parseResult = await screpModule.parse(dataCopy);
        console.log('[wasmLoader] parse result:', JSON.stringify(parseResult).substring(0, 200) + '...');
        
        if (parseResult && Array.isArray(parseResult.Commands) && parseResult.Commands.length > 0) {
          result = parseResult;
          hasValidCommands = true;
          console.log(`[wasmLoader] parse returned ${parseResult.Commands.length} valid commands`);
        } else if (!result) {
          // Only use this result if we don't have any previous result
          result = parseResult;
        }
      } catch (err) {
        console.error('[wasmLoader] Error in parse:', err);
      }
    }
    
    // Check if we have a meaningful result
    if (!result) {
      throw new Error('All WASM parsing methods failed');
    }
    
    // If we have header but no commands, try to fix the data structure
    if (result.Header && !hasValidCommands) {
      console.warn('[wasmLoader] Using partial replay data (header only)');
      
      // Make sure Commands exists as an empty array rather than null
      if (result.Commands === null || result.Commands === undefined) {
        result.Commands = [];
      }
    }
    
    return result;
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
