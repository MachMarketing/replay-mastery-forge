
/**
 * WASM initialization for StarCraft replay parser
 */
import { Buffer } from 'buffer';
import * as screpJs from 'screp-js';

// Make Buffer available globally for potential use by screp-js
window.Buffer = Buffer;

// Debug logging to track the loading process
console.log('📊 [wasmLoader] Initializing WASM module loader');
console.log('📊 [wasmLoader] screp-js available:', typeof screpJs !== 'undefined');
console.log('📊 [wasmLoader] screp-js exports:', Object.keys(screpJs));

/**
 * Initializes the WebAssembly module for replay parsing
 */
export async function initParserWasm(): Promise<void> {
  console.log('📊 [wasmLoader] Initializing screp-js WASM module...');
  
  try {
    // Wait for WASM initialization if supported
    if (screpJs.ready && typeof screpJs.ready.then === 'function') {
      console.log('📊 [wasmLoader] Waiting for module.ready Promise to resolve...');
      await screpJs.ready;
      console.log('📊 [wasmLoader] module.ready Promise resolved successfully');
    } else if (typeof screpJs.default?.ready?.then === 'function') {
      console.log('📊 [wasmLoader] Waiting for module.default.ready Promise to resolve...');
      await screpJs.default.ready;
      console.log('📊 [wasmLoader] module.default.ready Promise resolved successfully');
    } else {
      console.warn('⚠️ [wasmLoader] No ready Promise found, continuing without explicit initialization');
    }
    
    console.log('📊 [wasmLoader] WASM initialization complete');
  } catch (error) {
    console.error('❌ [wasmLoader] Error during WASM initialization:', error);
    throw new Error(`WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse function that handles different module export formats
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  console.log('📊 [wasmLoader] Calling parseReplayWasm with data length:', data.length);
  
  try {
    // Try different possible export names
    let parser = screpJs.parse || screpJs.parseReplay || 
                screpJs.default?.parse || screpJs.default?.parseReplay;
    
    if (typeof parser !== 'function') {
      console.error('❌ [wasmLoader] No valid parse function found in screp-js module');
      throw new Error('Could not find a valid parse function in screp-js module');
    }
    
    // Call the parser with the data
    let result = parser(data);
    
    // Handle promises
    if (result && typeof result.then === 'function') {
      console.log('📊 [wasmLoader] Parser returned a Promise, awaiting result...');
      result = await result;
    }
    
    if (!result) {
      throw new Error('Parser returned empty result');
    }
    
    console.log('📊 [wasmLoader] Parsing completed, result type:', typeof result);
    return result;
    
  } catch (error) {
    console.error('❌ [wasmLoader] Error in parseReplayWasm:', error);
    throw error;
  }
}
