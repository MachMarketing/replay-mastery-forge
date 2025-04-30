
/**
 * WASM initialization for StarCraft replay parser
 */
import * as screpJs from 'screp-js';

/**
 * Initializes the WebAssembly module for replay parsing
 */
export async function initParserWasm(): Promise<void> {
  console.log('Initializing screp-js WASM module...');
  await screpJs.ready;
  console.log('screp-js WASM module initialized successfully');
}

/**
 * Export the parse function directly for convenience
 */
export const parseReplayWasm = screpJs.parseReplay;
