
/**
 * Browser-based StarCraft: Brood War replay parser using screp-js (WASM)
 */

import { ParsedReplayResult } from './replayParserService';
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { readFileAsUint8Array } from './fileReader';
import { mapRawToParsed } from './replayMapper';

// Debug-Logging
console.log('📊 [browserReplayParser] Module loaded, parsing available:', typeof parseReplayWasm === 'function');

/**
 * Parse a StarCraft replay file directly in the browser using bundled screp-js WASM
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Parsing replay file in browser:', file.name, 'size:', file.size, 'bytes');
  
  try {
    // Validieren der Datei
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
      
      // Grundlegende Validierung der Daten
      if (data.length < 100) {
        throw new Error('Replay file is too small and likely invalid (less than 100 bytes)');
      }
    } catch (readError) {
      console.error('❌ [browserReplayParser] File reading error:', readError);
      throw new Error(`Failed to read replay file: ${readError instanceof Error ? readError.message : String(readError)}`);
    }
    
    // 3) Parse the replay
    console.log('📊 [browserReplayParser] Attempting to parse replay with WASM parser...');
    
    if (typeof parseReplayWasm !== 'function') {
      console.error('❌ [browserReplayParser] parseReplayWasm is not available as a function!');
      throw new Error('WASM parser function not available - module may not be properly loaded');
    }
    
    console.log('📊 [browserReplayParser] Parsing replay with bundled screp-js…');
    let result;
    try {
      result = await parseReplayWasm(data);
      console.log('📊 [browserReplayParser] screp-js parsing result received:', !!result);
      
      if (!result) {
        throw new Error('Parser returned empty result');
      }
    } catch (parseError) {
      console.error('❌ [browserReplayParser] WASM parsing error:', parseError);
      throw new Error(`Failed to parse replay file: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    // 4) Map to our domain model
    console.log('📊 [browserReplayParser] Mapping raw data to domain model...');
    try {
      const parsedData = mapRawToParsed(result);
      
      // Validieren der geparsten Daten
      if (!parsedData.playerName) {
        console.warn('⚠️ [browserReplayParser] Player name is missing in parsed data');
      }
      if (!parsedData.opponentName) {
        console.warn('⚠️ [browserReplayParser] Opponent name is missing in parsed data');
      }
      if (!parsedData.map) {
        console.warn('⚠️ [browserReplayParser] Map name is missing in parsed data');
      }
      
      console.log('📊 [browserReplayParser] Successfully parsed replay data:', {
        playerName: parsedData.playerName,
        opponentName: parsedData.opponentName,
        map: parsedData.map,
        playerRace: parsedData.playerRace,
        opponentRace: parsedData.opponentRace,
        result: parsedData.result,
        buildOrderCount: parsedData.buildOrder?.length
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
