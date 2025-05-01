
/**
 * Client-side parser for StarCraft: Brood War replay files
 */
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';

/**
 * Parse a StarCraft: Brood War replay file in the browser using the WASM-based parser (screp-js)
 * 
 * @param file The replay file to parse
 * @returns The parsed replay data or throws an error
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  try {
    console.log('📊 [browserReplayParser] Starting browser-based parsing for file:', file.name);
    
    // Step 1: Read the file as an array buffer
    const fileBuffer = await readFileAsArrayBuffer(file);
    console.log('📊 [browserReplayParser] File read as ArrayBuffer, size:', fileBuffer.byteLength);
    
    // Step 2: Initialize the WASM parser if needed
    try {
      console.log('📊 [browserReplayParser] Initializing WASM parser...');
      await initParserWasm();
      console.log('📊 [browserReplayParser] WASM parser initialized successfully');
    } catch (wasmInitError) {
      console.error('❌ [browserReplayParser] WASM initialization error:', wasmInitError);
      throw new Error(`WASM initialization failed: ${wasmInitError instanceof Error ? wasmInitError.message : String(wasmInitError)}`);
    }
    
    // Step 3: Parse the replay with the WASM parser
    console.log('📊 [browserReplayParser] Calling WASM parser with file data...');
    let parsedReplay;
    
    try {
      parsedReplay = await parseReplayWasm(new Uint8Array(fileBuffer));
      console.log('📊 [browserReplayParser] WASM parsing returned result:', parsedReplay ? 'success' : 'null');
    } catch (parseError) {
      console.error('❌ [browserReplayParser] Error in WASM parser:', parseError);
      throw new Error(`WASM parser error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    if (!parsedReplay) {
      console.error('❌ [browserReplayParser] WASM parser returned null or empty result');
      throw new Error('WASM parser returned empty result');
    }
    
    console.log('📊 [browserReplayParser] WASM parsing successful, mapping results...');
    
    // Step 4: Map the raw parser output to our application's format
    try {
      const mappedData = mapRawToParsed(parsedReplay);
      console.log('📊 [browserReplayParser] Mapping successful:', mappedData);
      return mappedData;
    } catch (mappingError) {
      console.error('❌ [browserReplayParser] Error mapping parser output:', mappingError);
      throw new Error(`Error mapping parser output: ${mappingError instanceof Error ? mappingError.message : String(mappingError)}`);
    }
    
  } catch (error) {
    console.error('❌ [browserReplayParser] Browser replay parsing error:', error);
    throw error;
  }
}

/**
 * Read a file as an ArrayBuffer
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
