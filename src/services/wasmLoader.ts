
/**
 * WASM initialization for StarCraft replay parser
 */
import { Buffer } from 'buffer';

// Make Buffer available globally for potential use by screp-js
window.Buffer = Buffer;

// Debug logging to track the loading process
console.log('📊 [wasmLoader] Initializing WASM module loader');

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
  
  // If initialization was already attempted but failed, don't try again
  // to avoid getting stuck in an error loop
  if (initializationAttempted && !wasmInitialized) {
    throw new Error('WASM initialization was already attempted and failed');
  }
  
  initializationAttempted = true;
  
  try {
    console.log('📊 [wasmLoader] Dynamically importing screp-js...');
    
    // Handle potential "require is not defined" error
    if (typeof window.require === 'undefined') {
      console.warn('📊 [wasmLoader] "require" is not defined, setting up a mock function');
      // Create a mock require function to prevent errors
      (window as any).require = function mockRequire() {
        console.warn('📊 [wasmLoader] Mock require function called');
        return {};
      };
    }
    
    // Dynamically import the module to avoid require() issues
    try {
      // Set a timeout to catch hanging imports
      const importPromise = import('screp-js');
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Import timed out after 5000ms')), 5000);
      });
      
      const importedModule = await Promise.race([importPromise, timeoutPromise]);
      screpModule = importedModule.default || importedModule;
      
      console.log('📊 [wasmLoader] screp-js module imported:', Object.keys(screpModule));
    } catch (importError) {
      console.error('❌ [wasmLoader] Error importing screp-js:', importError);
      throw new Error(`Failed to import screp-js: ${importError instanceof Error ? importError.message : String(importError)}`);
    }
    
    // Wait for WASM initialization if supported
    if (screpModule && screpModule.ready && typeof screpModule.ready.then === 'function') {
      console.log('📊 [wasmLoader] Waiting for module.ready Promise to resolve...');
      
      // Set a timeout for the ready promise
      const readyPromise = screpModule.ready;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Module ready timed out after 5000ms')), 5000);
      });
      
      try {
        await Promise.race([readyPromise, timeoutPromise]);
        console.log('📊 [wasmLoader] module.ready Promise resolved successfully');
      } catch (readyError) {
        console.error('❌ [wasmLoader] Error during module.ready:', readyError);
        throw new Error(`Module.ready failed: ${readyError instanceof Error ? readyError.message : String(readyError)}`);
      }
    } else {
      console.warn('⚠️ [wasmLoader] No ready Promise found, continuing without explicit initialization');
    }
    
    wasmInitialized = true;
    console.log('📊 [wasmLoader] WASM initialization complete');
  } catch (error) {
    wasmInitialized = false;
    initializationAttempted = true; // Mark as attempted even if failed
    screpModule = null;
    console.error('❌ [wasmLoader] Error during WASM initialization:', error);
    throw new Error(`WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse function that handles different module export formats
 * @param data The replay file data as a Uint8Array
 * @returns Parsed replay data or throws an error
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  console.log('📊 [wasmLoader] Calling parseReplayWasm with data length:', data.length);
  
  try {
    // Ensure module is initialized
    if (!screpModule || !wasmInitialized) {
      // Skip initialization if it was already attempted but failed
      if (initializationAttempted) {
        throw new Error('Cannot parse: WASM initialization previously failed');
      }
      
      console.log('📊 [wasmLoader] Module not initialized yet, initializing now...');
      try {
        await initParserWasm();
      } catch (initError) {
        console.error('❌ [wasmLoader] WASM initialization failed on demand:', initError);
        throw new Error('WASM initialization failed, falling back to alternative parsing');
      }
      
      if (!screpModule) {
        throw new Error('Failed to initialize WASM module');
      }
    }
    
    // The logs show the available function is "parseBuffer" not "parse" or "parseReplay"
    const parser = screpModule.parseBuffer || 
                  screpModule.parse || 
                  screpModule.parseReplay || 
                  screpModule.default?.parseBuffer || 
                  screpModule.default?.parse;
    
    if (typeof parser !== 'function') {
      console.error('❌ [wasmLoader] No valid parse function found in screp-js module');
      console.log('Available exports:', Object.keys(screpModule));
      throw new Error('Could not find a valid parse function in screp-js module');
    }
    
    console.log('📊 [wasmLoader] Using parse function:', parser.name || 'anonymous');
    
    // Set a timeout for parsing
    const parsePromise = new Promise((resolve, reject) => {
      try {
        // Call the parser with the data
        let result = parser(data);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(err);
      }
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Parsing timed out after 10000ms')), 10000);
    });
    
    // Race the parse operation against a timeout
    const result = await Promise.race([parsePromise, timeoutPromise]);
    
    if (!result) {
      throw new Error('Parser returned empty result');
    }
    
    console.log('📊 [wasmLoader] Parsing completed successfully, result type:', typeof result);
    console.log('📊 [wasmLoader] Result structure:', Object.keys(result));
    
    return result;
    
  } catch (error) {
    console.error('❌ [wasmLoader] Error in parseReplayWasm:', error);
    throw error;
  }
}
