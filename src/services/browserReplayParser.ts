
/**
 * Browser-based StarCraft: Brood War replay parser using screp-js (WASM)
 */

import { ParsedReplayResult } from './replayParserService';
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { readFileAsUint8Array } from './fileReader';
import { mapRawToParsed } from './replayMapper';

// Debug-Logging
console.log('💡 running browserReplayParser.ts, parsing available:', typeof parseReplayWasm === 'function');

/**
 * Parse a StarCraft replay file directly in the browser using bundled screp-js WASM
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('Parsing replay file in browser:', file.name);
  
  try {
    // 1) Initialize WASM module
    console.log('Starting WASM initialization...');
    try {
      await initParserWasm();
      console.log('WASM initialization complete');
    } catch (initError) {
      console.error('WASM initialization error:', initError);
      throw new Error(`WASM initialization failed: ${initError instanceof Error ? initError.message : String(initError)}`);
    }
    
    // 2) Read file into Uint8Array
    console.log('Reading file data...');
    let data: Uint8Array;
    try {
      data = await readFileAsUint8Array(file);
      console.log('File data read successfully, length:', data.length);
    } catch (readError) {
      console.error('File reading error:', readError);
      throw new Error(`Failed to read replay file: ${readError instanceof Error ? readError.message : String(readError)}`);
    }
    
    // 3) Parse the replay
    console.log('Attempting to parse replay with WASM parser...');
    
    if (typeof parseReplayWasm !== 'function') {
      console.error('parseReplayWasm is not available as a function!');
      throw new Error('WASM parser function not available - module may not be properly loaded');
    }
    
    console.log('Parsing replay with bundled screp-js…');
    let result;
    try {
      result = await parseReplayWasm(data);
      console.log('screp-js parsing result:', result);
      
      if (!result) {
        throw new Error('Parser returned empty result');
      }
    } catch (parseError) {
      console.error('WASM parsing error:', parseError);
      throw new Error(`Failed to parse replay file: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    // 4) Map to our domain model
    console.log('Mapping raw data to domain model...');
    try {
      const parsedData = mapRawToParsed(result);
      console.log('Successfully parsed replay data:', parsedData);
      return parsedData;
    } catch (mappingError) {
      console.error('Data mapping error:', mappingError);
      throw new Error(`Failed to process replay data: ${mappingError instanceof Error ? mappingError.message : String(mappingError)}`);
    }
    
  } catch (error) {
    console.error('Browser replay parsing error:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}
