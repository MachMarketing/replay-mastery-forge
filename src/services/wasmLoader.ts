
/**
 * WASM initialization for StarCraft replay parser
 */
import { ready, parseReplay } from 'screp-js';

/**
 * Initializes the WebAssembly module for replay parsing
 */
export async function initParserWasm(): Promise<void> {
  console.log('Initializing screp-js WASM module...');
  await ready;
  console.log('screp-js WASM module initialized successfully');
}

/**
 * Export the parse function directly for convenience
 */
export const parseReplayWasm = parseReplay;
