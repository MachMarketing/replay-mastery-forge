
/**
 * WASM initialization for StarCraft replay parser
 */
import { Buffer } from 'buffer';

// Make Buffer available globally for screp-js
window.Buffer = Buffer;

let screpModule: any = null;
let wasmInitialized = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Initializes the WebAssembly module for replay parsing
 * Uses a cached promise to prevent multiple simultaneous initialization attempts
 */
export async function initParserWasm(): Promise<boolean> {
  console.log('📊 [wasmLoader] Initializing screp-js WASM module...');
  
  if (wasmInitialized && screpModule) {
    console.log('📊 [wasmLoader] Module already initialized');
    return true;
  }
  
  // Use cached promise if initialization is in progress
  if (initPromise) {
    console.log('📊 [wasmLoader] Initialization already in progress, reusing promise');
    return initPromise;
  }
  
  // Create a new initialization promise
  initPromise = (async () => {
    try {
      // Import the module dynamically
      console.log('📊 [wasmLoader] Importing screp-js module...');
      const importedModule = await import('screp-js');
      
      if (!importedModule) {
        throw new Error('Failed to import screp-js module');
      }
      
      screpModule = importedModule.default || importedModule;
      
      // Log available functions for debugging
      console.log('📊 [wasmLoader] Module imported, available exports:', 
        Object.keys(screpModule).join(', '));
      
      // Wait for module initialization
      if (screpModule && typeof screpModule.ready === 'function') {
        console.log('📊 [wasmLoader] Calling module ready() function');
        await screpModule.ready();
        console.log('📊 [wasmLoader] Module ready() function completed');
      } else if (screpModule && screpModule.ready && typeof screpModule.ready.then === 'function') {
        console.log('📊 [wasmLoader] Waiting for module ready promise');
        await screpModule.ready;
        console.log('📊 [wasmLoader] Module ready promise resolved');
      }
      
      // Initialize the module if it has an init function
      if (screpModule && typeof screpModule.init === 'function') {
        console.log('📊 [wasmLoader] Calling module init() function');
        await screpModule.init();
        console.log('📊 [wasmLoader] Module init() function completed');
      }
      
      wasmInitialized = true;
      console.log('📊 [wasmLoader] WASM initialization successful');
      return true;
    } catch (error) {
      console.error('❌ [wasmLoader] Error during WASM initialization:', error);
      wasmInitialized = false;
      screpModule = null;
      throw error;
    } finally {
      // Clear the promise reference to allow retry
      initPromise = null;
    }
  })();
  
  return initPromise;
}

/**
 * Parse a replay file using the WASM parser
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  console.log('📊 [wasmLoader] Calling parseReplayWasm with data length:', data.length);
  
  // Ensure module is initialized
  if (!wasmInitialized || !screpModule) {
    console.log('📊 [wasmLoader] Module not initialized, initializing now...');
    const initialized = await initParserWasm();
    
    if (!initialized || !screpModule) {
      throw new Error('Failed to initialize WASM module');
    }
  }
  
  // Find the parse function - it could have different names depending on the module
  const parser = 
    screpModule.parseBuffer || 
    screpModule.parse || 
    screpModule.parseReplay || 
    (screpModule.default && (
      screpModule.default.parseBuffer || 
      screpModule.default.parse || 
      screpModule.default.parseReplay
    ));
  
  if (typeof parser !== 'function') {
    throw new Error('No valid parse function found in the WASM module');
  }
  
  try {
    console.log('📊 [wasmLoader] Parsing replay with function:', parser.name || 'anonymous');
    const result = await parser(data);
    
    if (!result) {
      throw new Error('Parser returned empty result');
    }
    
    console.log('📊 [wasmLoader] Parse successful, result keys:', Object.keys(result));
    return result;
  } catch (error) {
    console.error('❌ [wasmLoader] Error during parsing:', error);
    throw error;
  }
}

// Pre-initialize the WASM module when this file is imported
initParserWasm().catch(err => {
  console.warn('❌ [wasmLoader] Pre-initialization failed, will retry when needed:', err);
});
