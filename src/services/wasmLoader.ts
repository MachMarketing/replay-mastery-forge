
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
    console.log('[wasmLoader] Getting version, available methods:', Object.keys(screpModule));
    
    if (typeof screpModule.getVersion === 'function') {
      const version = screpModule.getVersion();
      console.log('[wasmLoader] Version from getVersion():', version);
      return version;
    }
    
    if (typeof screpModule.getVersionObject === 'function') {
      const versionObj = screpModule.getVersionObject();
      console.log('[wasmLoader] Version object:', versionObj);
      return `${versionObj.Major}.${versionObj.Minor}.${versionObj.Patch}`;
    }
    
    if (typeof screpModule.version === 'string') {
      console.log('[wasmLoader] Version from version property:', screpModule.version);
      return screpModule.version;
    }
    
    // Try to get version from package info if available
    if (screpModule.VERSION || screpModule.version || screpModule.__VERSION__) {
      const version = screpModule.VERSION || screpModule.version || screpModule.__VERSION__;
      console.log('[wasmLoader] Version from static property:', version);
      return version;
    }
  } catch (e) {
    console.warn('[wasmLoader] Error getting parser version:', e);
  }
  
  console.log('[wasmLoader] No version method found, returning unknown');
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
    // Log screp-js package details
    console.log('🔍 Screp package info:', {
      hasDefault: !!Screp.default,
      mainExports: Object.keys(Screp),
      defaultExports: Object.keys(Screp.default || {})
    });
    
    // Try to get the module, prioritizing default export
    screpModule = Screp.default || Screp;
    
    // Validate that we have the module - should have at least some methods
    if (!screpModule || typeof screpModule !== 'object' || Object.keys(screpModule).length === 0) {
      throw new Error('Invalid screp-js module imported');
    }
    
    // Wait for the module to be ready if it has a Promise-like ready property
    if (screpModule.ready && typeof screpModule.ready.then === 'function') {
      console.log('[wasmLoader] Waiting for module to be ready...');
      await screpModule.ready;
      console.log('[wasmLoader] Module is ready');
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
  const hasParseFn = (
    (typeof module.parseBuffer === 'function') || 
    (typeof module.parseReplay === 'function') || 
    (typeof module.parse === 'function')
  );
  
  console.log('[wasmLoader] Parse function check:', {
    hasParseBuffer: typeof module.parseBuffer === 'function',
    hasParseReplay: typeof module.parseReplay === 'function',
    hasParse: typeof module.parse === 'function',
    result: hasParseFn
  });
  
  return hasParseFn;
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
    console.log('[wasmLoader] Using screp-js version:', getParserVersion());
    
    // Create a copy of the data to avoid any potential memory issues
    const dataCopy = new Uint8Array(data);
    
    // Try parseBuffer first with options
    if (typeof screpModule.parseBuffer === 'function') {
      try {
        console.log('[wasmLoader] Trying parseBuffer function with options');
        const parseOptions = { ...PARSER_OPTIONS };
        
        // Always pass options as second argument to parseBuffer
        console.log('[wasmLoader] Calling parseBuffer with options:', parseOptions);
        const result = await screpModule.parseBuffer(dataCopy, parseOptions);
        
        console.log('[wasmLoader] parseBuffer result structure:', Object.keys(result || {}));
        
        // Log commands status with enhanced information
        if (result && result.Commands) {
          console.log(`[wasmLoader] Commands found: ${Array.isArray(result.Commands) ? result.Commands.length : 'not an array'}`);
          if (Array.isArray(result.Commands) && result.Commands.length > 0) {
            console.log('[wasmLoader] First command sample:', result.Commands[0]);
            console.log('[wasmLoader] First 3 command types:', result.Commands.slice(0, 3).map(cmd => cmd.type || 'unknown'));
          } else {
            console.log('[wasmLoader] Commands array is empty or not properly initialized');
          }
        } else {
          console.warn('[wasmLoader] No Commands array in result');
          
          // Additional deep inspection of the result structure
          console.log('[wasmLoader] Deep inspection of result structure:');
          for (const key in result) {
            if (typeof result[key] === 'object' && result[key] !== null) {
              console.log(`[wasmLoader] Property ${key}:`, Object.keys(result[key]));
              
              // Check if commands might be under a different property name with a similar structure
              if (Array.isArray(result[key]) && result[key].length > 0) {
                console.log(`[wasmLoader] First item in ${key}:`, result[key][0]);
              }
            }
          }
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
        // Also pass options to parseReplay if it accepts them
        const result = await screpModule.parseReplay(dataCopy, PARSER_OPTIONS);
        
        // Log commands for this method too
        if (result && result.Commands) {
          console.log(`[wasmLoader] parseReplay - Commands found: ${Array.isArray(result.Commands) ? result.Commands.length : 'not an array'}`);
        }
        
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
        // Also try to pass options to parse
        const result = await screpModule.parse(dataCopy, PARSER_OPTIONS);
        
        // Log commands for this method too
        if (result && result.Commands) {
          console.log(`[wasmLoader] parse - Commands found: ${Array.isArray(result.Commands) ? result.Commands.length : 'not an array'}`);
        }
        
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
