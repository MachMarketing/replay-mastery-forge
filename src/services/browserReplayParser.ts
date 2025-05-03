
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
      
      // Only generate stub data if explicitly requested for testing
      if (process.env.NODE_ENV === 'development' && file.name.includes('mock_test')) {
        console.warn('📊 [browserReplayParser] Test mode detected, generating stub data');
        return generateStubData(file);
      }
      
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
      
      // Only generate stub data if explicitly requested for testing
      if (process.env.NODE_ENV === 'development' && file.name.includes('mock_test')) {
        console.warn('📊 [browserReplayParser] Test mode detected after parsing error, generating stub data');
        return generateStubData(file);
      }
      
      throw new Error(`Parser-Fehler: ${parseError instanceof Error ? parseError.message : 'Unbekannter Fehler'}`);
    }
    
    if (!parsedReplay) {
      console.error('❌ [browserReplayParser] Parser returned null or empty result');
      
      // Only generate stub data if explicitly requested for testing
      if (process.env.NODE_ENV === 'development' && file.name.includes('mock_test')) {
        console.warn('📊 [browserReplayParser] Test mode detected after null result, generating stub data');
        return generateStubData(file);
      }
      
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
      
      // Only generate stub data if explicitly requested for testing
      if (process.env.NODE_ENV === 'development' && file.name.includes('mock_test')) {
        console.warn('📊 [browserReplayParser] Test mode detected after mapping error, generating stub data');
        return generateStubData(file);
      }
      
      throw new Error(`Datenumwandlungsfehler: ${mappingError instanceof Error ? mappingError.message : 'Unbekannter Fehler'}`);
    }
    
    // Validate essential fields
    if (!mappedData.playerName || !mappedData.map) {
      console.warn('❌ [browserReplayParser] Essential data missing after mapping');
      
      // Only generate stub data if explicitly requested for testing
      if (process.env.NODE_ENV === 'development' && file.name.includes('mock_test')) {
        console.warn('📊 [browserReplayParser] Test mode detected after validation, generating stub data');
        return generateStubData(file);
      }
      
      throw new Error('Wichtige Replay-Daten fehlen nach dem Parsing');
    }
    
    return mappedData;
  } catch (error) {
    console.error('❌ [browserReplayParser] Parsing error:', error);
    
    // Only generate stub data if explicitly requested for testing
    if (process.env.NODE_ENV === 'development' && file.name.includes('mock_test')) {
      console.warn('📊 [browserReplayParser] Test mode detected, returning stub data');
      return generateStubData(file);
    }
    
    throw error; // Let the caller handle the error in production
  }
}

/**
 * Generate stub data for development testing when parsing fails
 */
function generateStubData(file: File): ParsedReplayResult {
  const filename = file.name.replace('.rep', '');
  const randomDate = new Date();
  randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
  
  console.warn('📊 [browserReplayParser] Generating stub data for development testing');
  
  return {
    playerName: 'TestPlayer',
    opponentName: 'Opponent',
    playerRace: 'Protoss',
    opponentRace: 'Terran',
    map: 'Test Map',
    duration: '10:30',
    date: randomDate.toISOString().split('T')[0],
    result: Math.random() > 0.5 ? 'win' : 'loss',
    apm: Math.floor(Math.random() * 200) + 50,
    eapm: Math.floor(Math.random() * 150) + 30,
    matchup: 'PvT',
    buildOrder: [
      { time: "00:45", supply: 8, action: "Pylon" },
      { time: "01:20", supply: 10, action: "Gateway" },
      { time: "01:55", supply: 12, action: "Assimilator" }
    ],
    resourcesGraph: [
      { time: "0:00", minerals: 50, gas: 0 },
      { time: "1:00", minerals: 250, gas: 0 },
      { time: "2:00", minerals: 450, gas: 50 },
    ]
  };
}
