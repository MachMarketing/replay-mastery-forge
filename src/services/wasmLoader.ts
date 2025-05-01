
/**
 * WASM initialization for StarCraft replay parser
 */
import { Buffer } from 'buffer';

// Make Buffer available globally for potential use by screp-js
window.Buffer = Buffer;

// Debug logging to track the loading process
console.log('📊 [wasmLoader] Initializing WASM module loader');

let screpModule: any = null;

/**
 * Initializes the WebAssembly module for replay parsing
 */
export async function initParserWasm(): Promise<void> {
  console.log('📊 [wasmLoader] Initializing screp-js WASM module...');
  
  try {
    if (screpModule) {
      console.log('📊 [wasmLoader] Module already initialized');
      return;
    }

    console.log('📊 [wasmLoader] Dynamically importing screp-js...');
    
    // Dynamically import the module to avoid require() issues
    const importedModule = await import('screp-js');
    screpModule = importedModule.default || importedModule;
    
    console.log('📊 [wasmLoader] screp-js module imported:', Object.keys(screpModule));
    
    // Wait for WASM initialization if supported
    if (screpModule.ready && typeof screpModule.ready.then === 'function') {
      console.log('📊 [wasmLoader] Waiting for module.ready Promise to resolve...');
      await screpModule.ready;
      console.log('📊 [wasmLoader] module.ready Promise resolved successfully');
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
    // Ensure module is initialized
    if (!screpModule) {
      console.log('📊 [wasmLoader] Module not initialized yet, initializing now...');
      await initParserWasm();
      
      if (!screpModule) {
        throw new Error('Failed to initialize WASM module');
      }
    }
    
    // Try different possible export names
    const parser = screpModule.parse || 
                  screpModule.parseReplay || 
                  screpModule.default?.parse || 
                  screpModule.default?.parseReplay;
    
    if (typeof parser !== 'function') {
      console.error('❌ [wasmLoader] No valid parse function found in screp-js module');
      console.log('Available exports:', Object.keys(screpModule));
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
