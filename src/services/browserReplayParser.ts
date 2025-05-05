
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
    
    // Ensure WASM is initialized with proper error handling
    try {
      console.log('📊 [browserReplayParser] Initializing WASM...');
      await initParserWasm();
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
        setTimeout(() => reject(new Error('Parsing hat das Zeitlimit überschritten')), 15000);
      });
      
      parsedReplay = await Promise.race([parsePromise, timeoutPromise]);
      console.log('📊 [browserReplayParser] WASM parser returned data:', parsedReplay);
      
      // Verify we have player data
      if (!parsedReplay.players || !Array.isArray(parsedReplay.players) || parsedReplay.players.length === 0) {
        throw new Error('Keine Spielerdaten im Replay gefunden');
      }
      
      // Log player data specifically to verify race information
      parsedReplay.players.forEach((player, index) => {
        console.log(`📊 [browserReplayParser] Player ${index + 1}:`, {
          name: player.name || 'Unknown',
          rawRace: player.raceLetter || 'unknown',
          mappedRace: player.race || 'unknown',
          id: player.id || index
        });
      });
    } catch (parseError) {
      console.error('❌ [browserReplayParser] WASM parser error:', parseError);
      throw new Error(`Parser-Fehler: ${parseError instanceof Error ? parseError.message : 'Unbekannter Fehler'}`);
    }
    
    if (!parsedReplay) {
      console.error('❌ [browserReplayParser] Parser returned null or empty result');
      throw new Error('Parser gab kein Ergebnis zurück');
    }
    
    console.log('📊 [browserReplayParser] Raw parser output:', parsedReplay);
    
    // Map the raw parser output to our application's format with better error handling
    let mappedData;
    try {
      // Create fallback data in case mapping fails
      const fallbackRace = parsedReplay.players[0]?.race || 'Terran';
      const fallbackOpponentRace = parsedReplay.players[1]?.race || 'Terran';
      
      mappedData = mapRawToParsed(parsedReplay);
      console.log('📊 [browserReplayParser] Mapping successful:', mappedData);
      
      // Verify essential race data and add fallbacks if needed
      if (!mappedData.playerRace || mappedData.playerRace === 'Unknown') {
        console.warn('📊 [browserReplayParser] Player race missing, using fallback:', fallbackRace);
        mappedData.playerRace = fallbackRace as any;
      }
      
      if (!mappedData.opponentRace || mappedData.opponentRace === 'Unknown') {
        console.warn('📊 [browserReplayParser] Opponent race missing, using fallback:', fallbackOpponentRace);
        mappedData.opponentRace = fallbackOpponentRace as any;
      }
      
      console.log('📊 [browserReplayParser] Final player race:', mappedData.playerRace);
      console.log('📊 [browserReplayParser] Final opponent race:', mappedData.opponentRace);
    } catch (mappingError) {
      console.error('❌ [browserReplayParser] Data mapping error:', mappingError);
      
      // Create minimal valid data structure if mapping fails completely
      const fallbackPlayerName = parsedReplay.players[0]?.name || 'Player';
      const fallbackOpponentName = parsedReplay.players[1]?.name || 'Opponent';
      const fallbackRace = parsedReplay.players[0]?.race || 'Terran';
      const fallbackOpponentRace = parsedReplay.players[1]?.race || 'Terran';
      const fallbackMap = parsedReplay.mapName || 'Unknown Map';
      
      console.warn('❌ [browserReplayParser] Using fallback data mapping');
      mappedData = {
        playerName: fallbackPlayerName,
        opponentName: fallbackOpponentName,
        playerRace: fallbackRace as any,
        opponentRace: fallbackOpponentRace as any,
        map: fallbackMap,
        duration: '5:00',
        date: new Date().toISOString().split('T')[0],
        result: 'win',
        apm: 0,
        eapm: 0,
        matchup: `${fallbackRace.charAt(0)}v${fallbackOpponentRace.charAt(0)}`,
        buildOrder: [],
        resourcesGraph: []
      };
    }
    
    // Validate essential fields
    if (!mappedData.playerName || !mappedData.map) {
      console.warn('❌ [browserReplayParser] Essential data missing after mapping');
      
      // Try to extract minimal data directly from parsed replay
      const fallbackName = parsedReplay.players?.[0]?.name || 'Player';
      const fallbackMap = parsedReplay.mapName || 'Unknown Map';
      
      mappedData.playerName = mappedData.playerName || fallbackName;
      mappedData.map = mappedData.map || fallbackMap;
      
      if (!mappedData.playerName || !mappedData.map) {
        throw new Error('Wichtige Replay-Daten fehlen nach dem Parsing');
      }
    }

    // Only use explicit test mode for development and only if explicitly requested
    const isTestMode = process.env.NODE_ENV === 'development' && file.name.toLowerCase().includes('test_mock');
    if (isTestMode) {
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
 * This is only used when a file with "test_mock" in its name is uploaded
 * and the application is running in development mode
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
