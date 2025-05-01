
/**
 * Client-side parser for StarCraft: Brood War replay files
 */
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';
import { readFileAsUint8Array } from './fileReader';

/**
 * Parse a StarCraft: Brood War replay file in the browser using the WASM-based parser
 * 
 * @param file The replay file to parse
 * @returns The parsed replay data or throws an error
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name, file.size, 'bytes');
  
  try {
    // Read the file as array buffer
    const fileData = await readFileAsUint8Array(file);
    console.log('📊 [browserReplayParser] File read successfully, size:', fileData.byteLength);
    
    // Parse the replay with WASM parser
    console.log('📊 [browserReplayParser] Parsing replay with WASM parser...');
    const parsedReplay = await parseReplayWasm(fileData);
    
    if (!parsedReplay) {
      throw new Error('Parser returned null or empty result');
    }
    
    console.log('📊 [browserReplayParser] Parsing successful, mapping results...');
    console.log('📊 [browserReplayParser] Raw parser output structure:', Object.keys(parsedReplay));
    
    // Map the raw parser output to our application's format
    const mappedData = mapRawToParsed(parsedReplay);
    console.log('📊 [browserReplayParser] Mapping successful:', mappedData);
    
    return mappedData;
  } catch (error) {
    console.error('❌ [browserReplayParser] Parsing error:', error);
    throw error; // Propagate error to caller - we won't use fallbacks
  }
}
