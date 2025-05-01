
/**
 * WASM initialization for StarCraft replay parser
 */
import { Buffer } from 'buffer';

// Make Buffer available globally for screp-js
window.Buffer = Buffer;

let screpModule: any = null;
let wasmInitialized = false;
let initializationAttempted = false;

/**
 * Initializes the WebAssembly module for replay parsing
 */
export async function initParserWasm(): Promise<void> {
  console.log('📊 [wasmLoader] Initializing screp-js WASM module...');
  
  if (wasmInitialized && screpModule) {
    console.log('📊 [wasmLoader] Module already initialized');
    return;
  }
  
  // Don't retry failed initialization
  if (initializationAttempted && !wasmInitialized) {
    throw new Error('WASM initialization was already attempted and failed');
  }
  
  initializationAttempted = true;
  
  try {
    // Import the module dynamically to avoid CommonJS issues
    const importedModule = await import('screp-js');
    screpModule = importedModule.default || importedModule;
    
    // Wait for module initialization if it provides a ready promise
    if (screpModule && typeof screpModule.ready === 'function') {
      await screpModule.ready();
    } else if (screpModule && screpModule.ready && typeof screpModule.ready.then === 'function') {
      await screpModule.ready;
    }
    
    wasmInitialized = true;
    console.log('📊 [wasmLoader] WASM initialization successful');
  } catch (error) {
    wasmInitialized = false;
    console.error('❌ [wasmLoader] Error during WASM initialization:', error);
    throw error;
  }
}

/**
 * Parse a replay file using the WASM parser
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  console.log('📊 [wasmLoader] Calling parseReplayWasm with data length:', data.length);
  
  // Ensure module is initialized
  if (!screpModule || !wasmInitialized) {
    await initParserWasm();
    
    if (!screpModule) {
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
    console.error('❌ [wasmLoader] Available functions:', Object.keys(screpModule));
    throw new Error('No valid parse function found in the WASM module');
  }
  
  // Parse the replay data
  console.log('📊 [wasmLoader] Parsing replay with function:', parser.name || 'anonymous');
  const result = await parser(data);
  
  if (!result) {
    throw new Error('Parser returned empty result');
  }
  
  return result;
}
