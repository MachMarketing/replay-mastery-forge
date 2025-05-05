
/**
 * Client-side parser for StarCraft: Brood War replay files using JSSUH
 * 
 * This implementation uses the JSSUH (JavaScript StarCraft: Brood War Unit Handling) library
 * for client-side parsing of .rep files directly in the browser.
 */
import { initParserWasm, parseReplayWasm, forceWasmReset } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';
import { readFileAsUint8Array } from './fileReader';

/**
 * Parse a StarCraft: Brood War replay file in the browser using WASM
 * 
 * @param file The replay file to parse
 * @returns The parsed replay data
 * @throws Error if parsing fails
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name, file.size, 'bytes');
  
  try {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Datei ist leer oder ungültig');
    }
    
    // Bei wiederholten Fehlern WASM zurücksetzen
    const resetWasm = Math.random() > 0.9; // 10% Chance für Reset bei jedem Versuch
    if (resetWasm) {
      console.log('📊 [browserReplayParser] Performing preventative WASM reset');
      forceWasmReset();
    }
    
    // Ensure WASM is initialized with proper error handling
    try {
      console.log('📊 [browserReplayParser] Initializing WASM...');
      const wasmInitPromise = initParserWasm();
      const wasmTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('WASM-Initialisierung dauerte zu lange')), 10000);
      });
      
      await Promise.race([wasmInitPromise, wasmTimeoutPromise]);
      console.log('📊 [browserReplayParser] WASM initialized successfully');
    } catch (wasmError) {
      console.error('❌ [browserReplayParser] WASM initialization failed:', wasmError);
      throw new Error('Parser-Initialisierung fehlgeschlagen. Bitte versuchen Sie es erneut oder laden Sie die Seite neu.');
    }
    
    // Read file data with a timeout
    console.log('📊 [browserReplayParser] Reading file data...');
    let fileData: Uint8Array;
    
    try {
      const readPromise = readFileAsUint8Array(file);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Datei-Lesevorgang hat das Zeitlimit überschritten')), 10000);
      });
      
      fileData = await Promise.race([readPromise, timeoutPromise]);
    } catch (readError) {
      console.error('❌ [browserReplayParser] Error reading file:', readError);
      throw new Error(`Fehler beim Lesen der Datei: ${readError instanceof Error ? readError.message : 'Unbekannter Fehler'}`);
    }
    
    if (!fileData || fileData.byteLength === 0) {
      throw new Error('Konnte Datei nicht einlesen oder Datei ist leer');
    }
    
    console.log('📊 [browserReplayParser] File read successfully, size:', fileData.byteLength);
    
    // Parse the replay with WASM parser and a timeout
    console.log('📊 [browserReplayParser] Parsing replay with WASM parser...');
    let parsedReplay;
    
    try {
      // Use Promise.race to enforce a timeout
      const parsePromise = parseReplayWasm(fileData);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Parsing hat das Zeitlimit überschritten')), 20000);
      });
      
      parsedReplay = await Promise.race([parsePromise, timeoutPromise]);
      console.log('📊 [browserReplayParser] WASM parser returned data:', parsedReplay);
      
      // Verify we have player data
      if (!parsedReplay.players || !Array.isArray(parsedReplay.players) || parsedReplay.players.length === 0) {
        throw new Error('Keine Spielerdaten im Replay gefunden');
      }
    } catch (parseError) {
      console.error('❌ [browserReplayParser] WASM parser error:', parseError);
      throw new Error(`Parser-Fehler: ${parseError instanceof Error ? parseError.message : 'Unbekannter Fehler'}`);
    }
    
    if (!parsedReplay) {
      console.error('❌ [browserReplayParser] Parser returned null or empty result');
      throw new Error('Parser gab kein Ergebnis zurück');
    }
    
    console.log('📊 [browserReplayParser] Raw parser output:', parsedReplay);
    
    // Map the raw parser output to our application's format ALWAYS using mapRawToParsed
    // NEVER use mock data
    let mappedData;
    try {
      mappedData = mapRawToParsed(parsedReplay);
      console.log('📊 [browserReplayParser] Mapping successful:', mappedData);
    } catch (mappingError) {
      console.error('❌ [browserReplayParser] Data mapping error:', mappingError);
      throw new Error(`Fehler bei der Datentransformation: ${mappingError instanceof Error ? mappingError.message : 'Unbekannter Fehler'}`);
    }
    
    if (!mappedData) {
      throw new Error('Datentransformation fehlgeschlagen');
    }
    
    return mappedData;
  } catch (error) {
    console.error('❌ [browserReplayParser] Parsing error:', error);
    throw error; // Let the caller handle the error
  }
}
