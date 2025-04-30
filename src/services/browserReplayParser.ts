
/**
 * Browser-based StarCraft: Brood War replay parser using screp-js (WASM)
 */

import { ParsedReplayResult } from './replayParserService';
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { readFileAsUint8Array } from './fileReader';
import { mapRawToParsed } from './replayMapper';

// Debug-Logging
console.log('💡 running browserReplayParser.ts, screpParse=', parseReplayWasm);

/**
 * Parse a StarCraft replay file directly in the browser using bundled screp-js WASM
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('Parsing replay file in browser:', file.name);
  
  try {
    // 1) Initialize WASM module
    await initParserWasm();
    
    // 2) Read file into Uint8Array
    const data = await readFileAsUint8Array(file);
    
    // 3) Parse the replay
    console.log('Parsing replay with bundled screp-js...', parseReplayWasm ? 'Parser available' : 'PARSER NOT FOUND');
    let result;
    try {
      if (!parseReplayWasm || typeof parseReplayWasm !== 'function') {
        throw new Error('screp-js parseReplay function not available');
      }
      result = await parseReplayWasm(data);
    } catch (e) {
      console.error('screp-js parse error:', e);
      throw new Error('Failed to parse replay file: ' + (e instanceof Error ? e.message : String(e)));
    }
    
    console.log('screp-js parsing result:', result);

    // 4) Map to our domain model
    const parsedData = mapRawToParsed(result);
    console.log('Successfully parsed replay data:', parsedData);
    
    return parsedData;
    
  } catch (error) {
    console.error('Browser replay parsing error:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}
