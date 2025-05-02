
/**
 * Client-side parser for StarCraft: Brood War replay files
 */
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';
import { readFileAsUint8Array } from './fileReader';

// Initialize WASM module early but don't block
const wasmReady = initParserWasm().catch(error => {
  console.error('❌ [browserReplayParser] Failed to pre-initialize WASM:', error);
  return false;
});

/**
 * Parse a StarCraft: Brood War replay file in the browser using the WASM-based parser
 * 
 * @param file The replay file to parse
 * @returns The parsed replay data or throws an error
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name, file.size, 'bytes');
  
  try {
    // Ensure WASM is initialized
    await wasmReady;
    
    // Read the file as array buffer with validation
    if (file.size === 0) {
      throw new Error('File is empty (0 bytes)');
    }
    
    const fileData = await readFileAsUint8Array(file);
    
    if (!fileData || fileData.byteLength === 0) {
      throw new Error('Failed to read file data or file is empty');
    }
    
    console.log('📊 [browserReplayParser] File read successfully, size:', fileData.byteLength);
    
    // Parse the replay with WASM parser
    console.log('📊 [browserReplayParser] Parsing replay with WASM parser...');
    const parsedReplay = await parseReplayWasm(fileData);
    
    if (!parsedReplay) {
      console.error('❌ [browserReplayParser] Parser returned null or empty result');
      throw new Error('Parser returned null or empty result');
    }
    
    console.log('📊 [browserReplayParser] Raw parser output:', parsedReplay);
    console.log('📊 [browserReplayParser] Raw parser output structure:', Object.keys(parsedReplay));
    
    // Map the raw parser output to our application's format
    const mappedData = mapRawToParsed(parsedReplay);
    console.log('📊 [browserReplayParser] Mapping successful:', mappedData);
    
    // Validate the mapped data before returning
    if (!mappedData || !mappedData.playerName) {
      throw new Error('Failed to extract replay data. The file may be in an unsupported format or corrupted.');
    }
    
    return mappedData;
  } catch (error) {
    console.error('❌ [browserReplayParser] Parsing error:', error);
    throw error;
  }
}
