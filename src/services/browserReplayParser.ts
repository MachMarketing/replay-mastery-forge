
/**
 * Browser-based StarCraft: Brood War replay parser using screp-js (WASM)
 */

import { ParsedReplayResult } from './replayParserService';
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { readFileAsUint8Array } from './fileReader';
import { mapRawToParsed } from './replayMapper';

// Debug-Logging
console.log('📊 [browserReplayParser] Module loaded');

/**
 * Parse a StarCraft replay file directly in the browser using bundled screp-js WASM
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Parsing replay file in browser:', file.name, 'size:', file.size, 'bytes');
  
  try {
    // Validate the file
    if (file.size === 0) {
      throw new Error('Replay file is empty (0 bytes)');
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'rep') {
      throw new Error(`Invalid file extension: expected .rep, got .${fileExtension}`);
    }
    
    // 1) Initialize WASM module
    console.log('📊 [browserReplayParser] Starting WASM initialization...');
    try {
      await initParserWasm();
      console.log('📊 [browserReplayParser] WASM initialization complete');
    } catch (initError) {
      console.error('❌ [browserReplayParser] WASM initialization error:', initError);
      throw new Error(`WASM initialization failed: ${initError instanceof Error ? initError.message : String(initError)}`);
    }
    
    // 2) Read file into Uint8Array
    console.log('📊 [browserReplayParser] Reading file data...');
    let data: Uint8Array;
    try {
      data = await readFileAsUint8Array(file);
      console.log('📊 [browserReplayParser] File data read successfully, length:', data.length, 'bytes');
      
      if (data.length < 100) {
        throw new Error('Replay file is too small and likely invalid (less than 100 bytes)');
      }
      
      // Debug: Output the first bytes to console for verification
      const headerBytes = Array.from(data.slice(0, 16))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join(' ');
      console.log('📊 [browserReplayParser] File header bytes:', headerBytes);
      
    } catch (readError) {
      console.error('❌ [browserReplayParser] File reading error:', readError);
      throw new Error(`Failed to read replay file: ${readError instanceof Error ? readError.message : String(readError)}`);
    }
    
    // 3) Parse the replay
    console.log('📊 [browserReplayParser] Attempting to parse replay with WASM parser...');
    
    let result;
    try {
      // Force await to ensure any promise is resolved
      result = await parseReplayWasm(data);
      console.log('📊 [browserReplayParser] screp-js parsing result received:', result ? 'Success' : 'Empty result');
      
      if (!result) {
        throw new Error('Parser returned empty result');
      }
      
      console.log('📊 [browserReplayParser] Parsed data structure:', Object.keys(result));
      if (result.error) {
        throw new Error(`Parser error: ${result.error}`);
      }
    } catch (parseError) {
      console.error('❌ [browserReplayParser] WASM parsing error:', parseError);
      throw new Error(`Failed to parse replay file: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    // 4) Map to our domain model
    console.log('📊 [browserReplayParser] Mapping raw data to domain model...');
    try {
      const parsedData = mapRawToParsed(result);
      
      console.log('📊 [browserReplayParser] Successfully parsed replay data:', {
        playerName: parsedData.playerName,
        opponentName: parsedData.opponentName,
        map: parsedData.map,
        playerRace: parsedData.playerRace,
        opponentRace: parsedData.opponentRace,
        result: parsedData.result
      });
      
      return parsedData;
    } catch (mappingError) {
      console.error('❌ [browserReplayParser] Data mapping error:', mappingError);
      throw new Error(`Failed to process replay data: ${mappingError instanceof Error ? mappingError.message : String(mappingError)}`);
    }
  } catch (error) {
    console.error('❌ [browserReplayParser] Browser replay parsing error:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}
