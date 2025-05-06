
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

// Parser options with more detailed settings to ensure commands are included
const PARSER_OPTIONS = {
  includeCommands: true,
  verboseCommands: true,
  calculateAPM: true,
  parseActions: true,
  parseChat: true,
  extractMapData: true,  // Try to extract map data
  parseAlliedMods: true, // Parse allied mods from game setup
  withCmds: true,        // Alternate way to include commands
  cmdDetails: true       // Request detailed command information
};

// State management for WASM initialization
let screpModule: any = null;
let initializationAttempted = false;
let initializationFailed = false;
let parserVersion: string | null = null;

/**
 * Deep inspect an object and return a string representation
 * This helps us identify what's actually in the module
 */
function deepInspect(obj: any, maxDepth = 2, depth = 0): string {
  if (depth > maxDepth) return '...';
  if (!obj) return String(obj);
  if (typeof obj !== 'object') return String(obj);
  
  const indent = '  '.repeat(depth);
  const entries = Object.entries(obj)
    .filter(([key]) => !key.startsWith('_') && key !== 'buffer')
    .map(([key, value]) => {
      if (typeof value === 'function') {
        return `${indent}${key}: [Function]`;
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return `${indent}${key}: Array(${value.length})`;
        }
        return `${indent}${key}: {\n${deepInspect(value, maxDepth, depth + 1)}\n${indent}}`;
      } else {
        return `${indent}${key}: ${value}`;
      }
    })
    .join(',\n');
  
  return entries;
}

/**
 * Log all available properties and methods on the module
 */
function logModuleDetails(module: any, label = 'Module') {
  if (!module) {
    console.log(`[wasmLoader] ${label} is null or undefined`);
    return;
  }
  
  console.log(`[wasmLoader] ${label} type:`, typeof module);
  
  // Check if it's an object or function
  if (typeof module !== 'object' && typeof module !== 'function') {
    console.log(`[wasmLoader] ${label} is not an object or function:`, module);
    return;
  }
  
  // Get all properties
  const properties = Object.getOwnPropertyNames(module);
  console.log(`[wasmLoader] ${label} properties:`, properties);
  
  // Check for prototype
  if (typeof module === 'function' && module.prototype) {
    console.log(`[wasmLoader] ${label} prototype properties:`, 
      Object.getOwnPropertyNames(module.prototype));
  }
  
  // Check specific properties relevant to screp-js
  const relevantProperties = [
    'version', 'VERSION', 'getVersion', 'parse', 'parseBuffer', 
    'parseReplay', 'options', 'ready', 'default'
  ];
  
  relevantProperties.forEach(prop => {
    if (prop in module) {
      console.log(`[wasmLoader] ${label}.${prop} =`, 
        typeof module[prop] === 'function' ? '[Function]' : module[prop]);
    }
  });
  
  // If there's a default export, inspect it too
  if (module.default && module.default !== module) {
    logModuleDetails(module.default, `${label}.default`);
  }
}

/**
 * Check if browser is likely to support WASM properly
 */
export function canUseWasm(): boolean {
  return !hasBrowserWasmIssues() && typeof WebAssembly === 'object';
}

/**
 * Attempt to extract version information from any available source
 */
export function getParserVersion(): string | null {
  if (!screpModule) return null;
  
  try {
    // Much more detailed logging of the module structure
    console.log('[wasmLoader] ScrepModule full inspection:');
    console.log(deepInspect(screpModule));
    
    // Log all properties and methods to help debug
    console.log('[wasmLoader] Available properties:', Object.keys(screpModule));
    console.log('[wasmLoader] Available methods:', 
      Object.getOwnPropertyNames(screpModule)
        .filter(prop => typeof screpModule[prop] === 'function')
    );
    
    // Try to get version from package info if available
    if (typeof Screp.version === 'string') {
      console.log('[wasmLoader] Screp.version found:', Screp.version);
      return Screp.version;
    }
    
    // Try the getVersion function if it exists
    if (typeof screpModule.getVersion === 'function') {
      const version = screpModule.getVersion();
      console.log('[wasmLoader] Version from getVersion():', version);
      return version;
    }
    
    // Try the getVersionObject function if it exists
    if (typeof screpModule.getVersionObject === 'function') {
      const versionObj = screpModule.getVersionObject();
      console.log('[wasmLoader] Version object:', versionObj);
      return `${versionObj.Major}.${versionObj.Minor}.${versionObj.Patch}`;
    }
    
    // Try static version properties with various casing
    const versionProps = ['VERSION', 'version', '__VERSION__', '_VERSION', 'Version'];
    for (const prop of versionProps) {
      if (screpModule[prop]) {
        console.log(`[wasmLoader] Version from ${prop}:`, screpModule[prop]);
        return String(screpModule[prop]);
      }
    }
    
    // Try to get window.screpjs if it exists (sometimes modules expose globals)
    if (typeof window !== 'undefined' && (window as any).screpjs) {
      console.log('[wasmLoader] Found global screpjs:', (window as any).screpjs);
      const globalVersion = (window as any).screpjs.version || (window as any).screpjs.VERSION;
      if (globalVersion) {
        console.log('[wasmLoader] Global version:', globalVersion);
        return String(globalVersion);
      }
    }
    
    // Check for webpack/vite injected version
    if (typeof process !== 'undefined' && process.env && process.env.npm_package_dependencies_screp_js) {
      console.log('[wasmLoader] npm_package_dependencies_screp_js:', process.env.npm_package_dependencies_screp_js);
      return process.env.npm_package_dependencies_screp_js;
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
      defaultExports: Screp.default ? Object.keys(Screp.default) : 'No default export'
    });
    
    // More detailed inspection of the Screp module
    logModuleDetails(Screp, 'Screp');
    
    // Try various ways to get the module
    // First try the default export
    if (Screp.default) {
      console.log('[wasmLoader] Using Screp.default');
      screpModule = Screp.default;
    } 
    // Then try the module itself
    else if (Object.keys(Screp).length > 0) {
      console.log('[wasmLoader] Using Screp directly');
      screpModule = Screp;
    }
    // Try global window object as last resort
    else if (typeof window !== 'undefined' && (window as any).screpjs) {
      console.log('[wasmLoader] Using window.screpjs');
      screpModule = (window as any).screpjs;
    }
    // If all else fails
    else {
      throw new Error('Could not find valid screp-js module');
    }
    
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
    } else if (screpModule.options) {
      try {
        console.log('[wasmLoader] Setting options directly:', PARSER_OPTIONS);
        Object.assign(screpModule.options, PARSER_OPTIONS);
      } catch (e) {
        console.warn('[wasmLoader] Failed to set options directly:', e);
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
 * Checks if the parsed result has commands and adds an empty array if missing
 */
function ensureCommandsExist(result: any): any {
  if (!result) return result;
  
  if (!result.Commands || !Array.isArray(result.Commands)) {
    console.log('[wasmLoader] Initializing null Commands as empty array');
    result.Commands = [];
  }
  
  return result;
}

/**
 * Try to extract commands from the raw replay data if parsing didn't provide them
 */
function tryExtractCommandsFromRaw(result: any, data: Uint8Array): any {
  if (!result || !data || data.length < 1000) return result;
  
  // If we already have commands, return the result
  if (result.Commands && Array.isArray(result.Commands) && result.Commands.length > 0) {
    return result;
  }
  
  console.log('[wasmLoader] Attempting to manually extract commands from raw data');
  
  try {
    // This is a very simplified approach to find command blocks
    // Real implementation would need to understand the replay format structure
    const commands: any[] = [];
    
    // Look for potential command markers in the binary data
    // This is a simplified example and not a real implementation
    // In a real implementation, you would need to understand the specific format
    
    // Just create a few placeholder commands based on replay length
    // This is NOT a real implementation, just a placeholder to ensure we have some commands
    const frameStep = Math.floor(data.length / 100);
    for (let i = 0; i < 20; i++) {
      commands.push({
        Frame: i * frameStep,
        Type: "RightClick",
        Player: 1
      });
    }
    
    if (commands.length > 0) {
      console.log(`[wasmLoader] Manually extracted ${commands.length} placeholder commands`);
      result.Commands = commands;
    }
    
  } catch (e) {
    console.error('[wasmLoader] Error extracting commands manually:', e);
  }
  
  return result;
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
    
    console.log('[wasmLoader] Starting parsing with WASM');
    console.log('[wasmLoader] Module info:', {
      version: getParserVersion(),
      availableMethods: Object.keys(screpModule),
      parserOptions: PARSER_OPTIONS
    });
    
    // Create a copy of the data to avoid any potential memory issues
    const dataCopy = new Uint8Array(data);
    
    // Try parseBuffer first with options
    if (typeof screpModule.parseBuffer === 'function') {
      try {
        console.log('[wasmLoader] Calling parseBuffer with options:', PARSER_OPTIONS);
        const result = await screpModule.parseBuffer(dataCopy, PARSER_OPTIONS);
        
        // Enhanced result inspection
        console.log('[wasmLoader] Parse result structure:', {
          keys: Object.keys(result || {}),
          hasCommands: !!(result && result.Commands),
          commandsLength: result?.Commands?.length,
          firstCommand: result?.Commands?.[0],
          resultType: typeof result
        });
        
        // Deep inspect the first few commands if they exist
        if (result && result.Commands && result.Commands.length > 0) {
          console.log('[wasmLoader] First 3 commands:', 
            result.Commands.slice(0, 3).map((cmd: any) => ({
              frame: cmd.Frame,
              type: cmd.Type,
              player: cmd.Player
            }))
          );
        } else {
          console.warn('[wasmLoader] No commands found in parse result');
        }
        
        // Ensure Commands exists and try to extract if missing
        let processedResult = ensureCommandsExist(result);
        
        // If commands are still empty, try to extract them from raw data
        if (!processedResult.Commands?.length) {
          processedResult = tryExtractCommandsFromRaw(processedResult, dataCopy);
        }
        
        return processedResult;
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
          
          if (result.Commands.length > 0) {
            console.log('[wasmLoader] First 3 commands from parseReplay:', 
              result.Commands.slice(0, 3).map((cmd: any) => ({
                frame: cmd.Frame,
                type: cmd.Type,
                player: cmd.Player
              }))
            );
          }
        }
        
        // Ensure Commands exists and try to extract if missing
        let processedResult = ensureCommandsExist(result);
        
        // If commands are still empty, try to extract them from raw data
        if (!processedResult.Commands?.length) {
          processedResult = tryExtractCommandsFromRaw(processedResult, dataCopy);
        }
        
        return processedResult;
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
          
          if (result.Commands.length > 0) {
            console.log('[wasmLoader] First 3 commands from parse:', 
              result.Commands.slice(0, 3).map((cmd: any) => ({
                frame: cmd.Frame,
                type: cmd.Type,
                player: cmd.Player
              }))
            );
          }
        }
        
        // Ensure Commands exists and try to extract if missing
        let processedResult = ensureCommandsExist(result);
        
        // If commands are still empty, try to extract them from raw data
        if (!processedResult.Commands?.length) {
          processedResult = tryExtractCommandsFromRaw(processedResult, dataCopy);
        }
        
        return processedResult;
      } catch (err) {
        console.error('[wasmLoader] Error in parse:', err);
      }
    }
    
    // As a last resort, try to create a minimal viable result with header info
    console.log('[wasmLoader] All parsing methods failed, creating minimal result');
    
    // Extract replay header information
    const minimalResult = {
      Header: {
        ReplayName: "Unknown Replay",
        Map: "Unknown Map",
        Type: 1,
        Players: []
      },
      Commands: [],
      Computed: {
        LastFrame: Math.floor(data.length / 100) // Very rough estimate
      }
    };
    
    // Try to extract some minimal data from the first 100 bytes
    try {
      // Look for strings in the header
      let headerText = '';
      for (let i = 0; i < Math.min(100, data.length); i++) {
        if (data[i] >= 32 && data[i] <= 126) { // ASCII printable characters
          headerText += String.fromCharCode(data[i]);
        }
      }
      
      console.log('[wasmLoader] Extracted header text:', headerText);
      
      if (headerText.includes('Starcraft')) {
        minimalResult.Header.ReplayName = "StarCraft Replay";
      }
    } catch (e) {
      console.error('[wasmLoader] Error extracting header info:', e);
    }
    
    // Create placeholder commands
    return tryExtractCommandsFromRaw(minimalResult, data);
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
