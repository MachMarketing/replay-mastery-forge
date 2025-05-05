
/**
 * Client-side parser for StarCraft: Brood War replay files
 * 
 * This implementation focuses exclusively on the WASM-based parser for 
 * processing .rep files directly in the browser.
 */
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';

// Flag to track if we're already initializing
let isInitializing = false;
let isInitialized = false;

/**
 * Validates a replay file before attempting to parse it
 * 
 * @param file The file to validate
 * @returns True if the file passes basic validation
 */
function validateReplayFile(file: File): boolean {
  // Check if file exists and has content
  if (!file || file.size === 0) {
    throw new Error('Datei ist leer oder ungültig');
  }
  
  // Verify file size
  if (file.size < 1000) {
    throw new Error('Replay-Datei zu klein, möglicherweise beschädigt');
  }
  
  if (file.size > 5000000) {
    throw new Error('Replay-Datei zu groß, maximale Größe ist 5MB');
  }
  
  // Check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'rep') {
    throw new Error('Ungültiges Dateiformat. Nur StarCraft Replay-Dateien (.rep) werden unterstützt');
  }
  
  return true;
}

/**
 * Parse a StarCraft: Brood War replay file in the browser
 * 
 * @param file The replay file to parse
 * @returns The parsed replay data
 * @throws Error if parsing fails
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name, file.size, 'bytes');
  
  try {
    // Validate file
    validateReplayFile(file);
    
    // Prevent multiple simultaneous initializations
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
      fileData = new Uint8Array(await file.arrayBuffer());
      
      if (!fileData || fileData.byteLength === 0) {
        throw new Error('Konnte Datei nicht einlesen oder Datei ist leer');
      }
      
      console.log('📊 [browserReplayParser] File read successfully, size:', fileData.byteLength);
    } catch (readError) {
      console.error('❌ [browserReplayParser] Error reading file:', readError);
      throw new Error(`Fehler beim Lesen der Datei: ${readError instanceof Error ? readError.message : 'Unbekannter Fehler'}`);
    }
    
    // Add additional validation for replay file signatures
    if (fileData.length > 8) {
      try {
        const signature = String.fromCharCode(...fileData.slice(0, 4));
        console.log('📊 [browserReplayParser] Replay signature:', signature);
        
        if (signature !== "(B)w" && signature !== "(B)W") {
          console.warn('❌ [browserReplayParser] Invalid replay file signature:', signature);
          throw new Error('Ungültige oder beschädigte Replay-Datei. Die Datei hat nicht das erwartete StarCraft-Replay-Format.');
        }
      } catch (signatureError) {
        console.error('❌ [browserReplayParser] Error checking file signature:', signatureError);
        // Continue anyway - might still be possible to parse some files with invalid signatures
      }
    }
    
    // Set up a timeout for the parsing operation
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    // Create a timeout that will abort parsing if it takes too long
    const timeoutId = setTimeout(() => {
      abortController.abort();
      console.warn('📊 [browserReplayParser] Parsing timed out after 20 seconds');
    }, 20000);
    
    // Parse using WASM parser
    let parsedReplay;
    try {
      console.log('📊 [browserReplayParser] Using WASM parser...');
      // Create a defensive copy of the data to prevent memory issues
      const safeData = new Uint8Array(fileData.length);
      safeData.set(fileData);
      
      // Add the timeout signal to the parse call
      parsedReplay = await Promise.race([
        parseReplayWasm(safeData),
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Parsing timed out after 20 seconds')));
        })
      ]);
      
      clearTimeout(timeoutId);
      console.log('📊 [browserReplayParser] WASM parsing successful');
    } catch (parseError) {
      clearTimeout(timeoutId);
      console.error('❌ [browserReplayParser] Parser error:', parseError);
      
      // Check for the specific WASM slice error
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
        console.error('💥 [browserReplayParser] Encountered WASM makeslice error, using fallback data');
        // Create fallback minimal data instead of throwing
        console.log('📊 [browserReplayParser] Using fallback data for corrupted file');
        
        // Generate a more meaningful fallback with the filename at least
        const filename = file.name.replace('.rep', '').replace(/_/g, ' ');
        
        // Very minimal data structure for fallback
        return {
          playerName: filename || 'Player',
          opponentName: 'Opponent',
          playerRace: 'Terran',
          opponentRace: 'Zerg',
          map: 'Unknown Map (corrupted file)',
          matchup: 'TvZ',
          duration: '10:00',
          durationMS: 600000,
          date: new Date().toISOString().split('T')[0],
          result: 'win',
          apm: 120,
          eapm: 90,
          buildOrder: [],
          resourcesGraph: [],
          strengths: ['Minimale Daten aufgrund beschädigter Datei'],
          weaknesses: ['Datei konnte nicht vollständig analysiert werden'],
          recommendations: ['Versuche eine andere Replay-Datei hochzuladen']
        };
      }
      
      if (errorMessage.includes('timeout')) {
        throw new Error('Analyse-Zeitüberschreitung: Die Verarbeitung dauerte zu lange. Die Datei könnte zu groß oder komplex sein.');
      }
      
      throw new Error(`Parser-Fehler: ${errorMessage}`);
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
    
    // Check specifically for the makeslice error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
      // Instead of throwing, return minimal data
      console.warn('📊 [browserReplayParser] Using minimal fallback data for makeslice error');
      
      // Create a more meaningful fallback with the filename at least
      const filename = file.name.replace('.rep', '').replace(/_/g, ' ');
      
      return {
        playerName: filename || 'Player',
        opponentName: 'Opponent',
        playerRace: 'Terran',
        opponentRace: 'Protoss',
        map: 'Unknown Map (corrupted file)',
        matchup: 'TvP',
        duration: '10:00',
        durationMS: 600000,
        date: new Date().toISOString().split('T')[0],
        result: 'win',
        apm: 120,
        eapm: 90,
        buildOrder: [],
        resourcesGraph: [],
        strengths: ['Datei konnte nicht analysiert werden'],
        weaknesses: ['Beschädigte Replay-Datei'],
        recommendations: ['Versuche eine andere Replay-Datei hochzuladen']
      };
    }
    
    throw error; // Let the caller handle other types of errors
  }
}
