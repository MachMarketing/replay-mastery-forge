
/**
 * Client-side parser for StarCraft: Brood War replay files
 * 
 * This implementation uses exclusively the SCREP-WASM parser for processing
 * .rep files directly in the browser.
 */
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';
import { readFileAsUint8Array } from './fileReader';

// Flag to track if we're already initializing
let isInitialized = false;
let isInitializing = false;

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
    
    // Ensure WASM parser is initialized
    if (!isInitialized && !isInitializing) {
      isInitializing = true;
      try {
        console.log('📊 [browserReplayParser] Initializing WASM parser...');
        await initParserWasm();
        isInitialized = true;
        console.log('📊 [browserReplayParser] WASM parser initialized successfully');
      } catch (initError) {
        console.error('❌ [browserReplayParser] Parser initialization failed:', initError);
        throw new Error(`Parser-Initialisierung fehlgeschlagen: ${initError instanceof Error ? initError.message : 'Unbekannter Fehler'}`);
      } finally {
        isInitializing = false;
      }
    }
    
    // Read file data
    console.log('📊 [browserReplayParser] Reading file data...');
    let fileData: Uint8Array;
    
    try {
      fileData = await readFileAsUint8Array(file);
      
      if (!fileData || fileData.byteLength === 0) {
        throw new Error('Konnte Datei nicht einlesen oder Datei ist leer');
      }
      
      console.log('📊 [browserReplayParser] File read successfully, size:', fileData.byteLength);
    } catch (readError) {
      console.error('❌ [browserReplayParser] Error reading file:', readError);
      throw new Error(`Fehler beim Lesen der Datei: ${readError instanceof Error ? readError.message : 'Unbekannter Fehler'}`);
    }
    
    // Parse using WASM parser
    let parsedReplay;
    try {
      console.log('📊 [browserReplayParser] Using WASM parser...');
      parsedReplay = await parseReplayWasm(fileData);
      console.log('📊 [browserReplayParser] WASM parsing successful');
    } catch (parseError) {
      console.error('❌ [browserReplayParser] WASM parser error:', parseError);
      throw new Error(`Parser-Fehler: ${parseError instanceof Error ? parseError.message : 'Unbekannter Fehler'}`);
    }
    
    if (!parsedReplay) {
      console.error('❌ [browserReplayParser] Parser returned null or empty result');
      throw new Error('Parser gab kein Ergebnis zurück');
    }
    
    console.log('📊 [browserReplayParser] Raw parser output:', parsedReplay);
    
    // Map the raw parser output to our application's format
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

/**
 * For development only - creates mock replay data
 */
function createMockReplayData() {
  return {
    playerName: 'TestPlayer',
    opponentName: 'TestOpponent',
    playerRace: 'Terran',
    opponentRace: 'Zerg',
    map: 'Test Map',
    matchup: 'TvZ',
    duration: '10:30',
    durationMS: 630000,
    date: new Date().toISOString().split('T')[0],
    result: 'win',
    apm: 180,
    eapm: 145,
    buildOrder: [
      { time: '0:45', supply: 9, action: 'Supply Depot' },
      { time: '1:30', supply: 11, action: 'Barracks' },
      { time: '2:15', supply: 13, action: 'Refinery' }
    ],
    resourcesGraph: [
      { time: '1:00', minerals: 250, gas: 0 },
      { time: '2:00', minerals: 320, gas: 40 },
      { time: '3:00', minerals: 450, gas: 100 }
    ],
    strengths: ['Gute Einheitenkontrolle', 'Effektives Makromanagement'],
    weaknesses: ['Könnte besseres Scouting betreiben', 'Build-Order Timing verbessern'],
    recommendations: ['Früher expandieren', 'Aggressiver gegen Zerg spielen'],
    _isMockData: true
  };
}
