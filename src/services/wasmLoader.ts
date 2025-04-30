
/**
 * WASM initialization for StarCraft replay parser
 */
import { Buffer } from 'buffer';

// Make Buffer available globally for potential use by screp-js
// This is needed because some WASM modules expect Buffer to be available
window.Buffer = Buffer;

// Will store the loaded module
let screpJsModule: any = null;

/**
 * Dynamically loads the screp-js module, handling browser compatibility
 */
async function loadScrepJs() {
  console.log('Attempting to dynamically load screp-js...');
  
  try {
    // Dynamic import to handle potential require/ESM conflicts
    const module = await import('screp-js');
    console.log('🔍 screp-js exports:', Object.keys(module));
    console.log('🔍 screp-js ready:', !!module.ready);
    return module;
  } catch (error) {
    console.error('Failed to load screp-js module:', error);
    throw new Error(`Failed to load screp-js: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Initializes the WebAssembly module for replay parsing
 */
export async function initParserWasm(): Promise<void> {
  console.log('Initializing screp-js WASM module...');
  
  try {
    // Load the module if not already loaded
    if (!screpJsModule) {
      screpJsModule = await loadScrepJs();
    }
    
    // Wait for WASM initialization if supported
    if (screpJsModule.ready && typeof screpJsModule.ready.then === 'function') {
      await screpJsModule.ready;
      console.log('screp-js WASM module initialized successfully');
    } else if (screpJsModule.default?.ready && typeof screpJsModule.default.ready.then === 'function') {
      await screpJsModule.default.ready;
      console.log('screp-js WASM module initialized successfully via default export');
    } else {
      console.warn('No ready Promise found in screp-js, continuing without explicit initialization');
    }
  } catch (error) {
    console.error('Error during WASM initialization:', error);
    throw new Error(`WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse function that handles different module export formats
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  console.log('Calling parseReplayWasm with data length:', data.length);
  
  try {
    // Ensure module is loaded
    if (!screpJsModule) {
      await initParserWasm();
    }
    
    // Try different possible export names
    if (typeof screpJsModule.parseReplay === 'function') {
      console.log('Using screpJsModule.parseReplay');
      return screpJsModule.parseReplay(data);
    } 
    else if (typeof screpJsModule.parse === 'function') {
      console.log('Using screpJsModule.parse');
      return screpJsModule.parse(data);
    }
    else if (typeof screpJsModule.default?.parseReplay === 'function') {
      console.log('Using screpJsModule.default.parseReplay');
      return screpJsModule.default.parseReplay(data);
    }
    else if (typeof screpJsModule.default?.parse === 'function') {
      console.log('Using screpJsModule.default.parse');
      return screpJsModule.default.parse(data);
    }
    
    // If we get here, no valid parse function was found
    console.error('No valid parse function found in screp-js module:', screpJsModule);
    throw new Error('Could not find a valid parse function in screp-js module');
  } catch (error) {
    console.error('Error in parseReplayWasm:', error);
    throw error;
  }
}
