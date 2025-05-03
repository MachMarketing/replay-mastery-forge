
/**
 * Client-side parser for StarCraft: Brood War replay files
 */
import { initParserWasm, parseReplayWasm } from './wasmLoader';
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
    
    // Ensure WASM is initialized
    try {
      await initParserWasm();
      console.log('📊 [browserReplayParser] WASM initialized successfully');
    } catch (wasmError) {
      console.error('❌ [browserReplayParser] WASM initialization failed:', wasmError);
      throw new Error('Parser-Initialisierung fehlgeschlagen. Bitte versuchen Sie es erneut oder laden Sie die Seite neu.');
    }
    
    // Read file data
    const fileData = await readFileAsUint8Array(file);
    
    if (!fileData || fileData.byteLength === 0) {
      throw new Error('Konnte Datei nicht einlesen oder Datei ist leer');
    }
    
    console.log('📊 [browserReplayParser] File read successfully, size:', fileData.byteLength);
    
    // Parse the replay with WASM parser
    console.log('📊 [browserReplayParser] Parsing replay with WASM parser...');
    let parsedReplay;
    
    try {
      parsedReplay = await parseReplayWasm(fileData);
      console.log('📊 [browserReplayParser] WASM parser returned:', parsedReplay);
    } catch (parseError) {
      console.error('❌ [browserReplayParser] WASM parser error:', parseError);
      throw new Error(`Parser-Fehler: ${parseError instanceof Error ? parseError.message : 'Unbekannter Fehler'}`);
    }
    
    if (!parsedReplay) {
      console.error('❌ [browserReplayParser] Parser returned null or empty result');
      throw new Error('Parser gab kein Ergebnis zurück');
    }
    
    console.log('📊 [browserReplayParser] Raw parser output keys:', Object.keys(parsedReplay));
    
    // Map the raw parser output to our application's format
    let mappedData;
    try {
      mappedData = mapRawToParsed(parsedReplay);
      console.log('📊 [browserReplayParser] Mapping successful:', mappedData);
    } catch (mappingError) {
      console.error('❌ [browserReplayParser] Data mapping error:', mappingError);
      throw new Error(`Datenumwandlungsfehler: ${mappingError instanceof Error ? mappingError.message : 'Unbekannter Fehler'}`);
    }
    
    // Validate essential fields
    if (!mappedData.playerName || !mappedData.map) {
      console.warn('❌ [browserReplayParser] Essential data missing after mapping');
      throw new Error('Wichtige Replay-Daten fehlen nach dem Parsing');
    }

    // Only use explicit test mode for development
    if (process.env.NODE_ENV === 'development' && file.name.includes('mock_test')) {
      console.warn('📊 [browserReplayParser] Test mode detected, enhancing with test data');
      return enhanceWithTestData(mappedData);
    }
    
    return mappedData;
  } catch (error) {
    console.error('❌ [browserReplayParser] Parsing error:', error);
    throw error; // Let the caller handle the error
  }
}

/**
 * For development testing only, enhance data with test values
 */
function enhanceWithTestData(data: ParsedReplayResult): ParsedReplayResult {
  return {
    ...data,
    // Ensure these fields are present for development
    strengths: data.strengths || ['Gute mechanische Fähigkeiten', 'Effektives Makromanagement'],
    weaknesses: data.weaknesses || ['Könnte Scouting verbessern', 'Unregelmäßige Produktion'],
    recommendations: data.recommendations || ['Übe Build-Order Timings', 'Fokussiere dich auf Map-Kontrolle']
  };
}
