
/**
 * WASM initialization for StarCraft replay parser
 */
import * as screpJs from 'screp-js';

// Debug the available exports
console.log('Available screp-js exports:', Object.keys(screpJs));

/**
 * Initializes the WebAssembly module for replay parsing
 */
export async function initParserWasm(): Promise<void> {
  console.log('Initializing screp-js WASM module...');
  console.log('screp-js module structure:', screpJs);
  
  if (screpJs.ready && typeof screpJs.ready.then === 'function') {
    await screpJs.ready;
    console.log('screp-js WASM module initialized successfully');
  } else {
    console.warn('screp-js.ready is not a Promise, attempting to initialize without waiting');
  }
}

/**
 * Define the parse function based on what's actually exported
 */
export function parseReplayWasm(data: Uint8Array): any {
  console.log('Calling parseReplayWasm wrapper with screpJs:', screpJs);
  
  // Try different possible export names
  if (typeof screpJs.parseReplay === 'function') {
    console.log('Using screpJs.parseReplay');
    return screpJs.parseReplay(data);
  } 
  else if (typeof screpJs.parse === 'function') {
    console.log('Using screpJs.parse');
    return screpJs.parse(data);
  }
  else if (typeof screpJs.default === 'object' && typeof screpJs.default.parseReplay === 'function') {
    console.log('Using screpJs.default.parseReplay');
    return screpJs.default.parseReplay(data);
  }
  else if (typeof screpJs.default === 'object' && typeof screpJs.default.parse === 'function') {
    console.log('Using screpJs.default.parse');
    return screpJs.default.parse(data);
  }
  else {
    console.error('No valid parse function found in screp-js module:', screpJs);
    throw new Error('Could not find parseReplay function in screp-js module');
  }
}
