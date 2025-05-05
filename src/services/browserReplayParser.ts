
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
import { initBrowserSafeParser, parseReplayWithBrowserSafeParser } from './replayParser/browserSafeParser';

// Flag to track if we're already initializing
let isInitializing = false;
let isInitialized = false;

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
    
    // Prevent multiple simultaneous initializations
    if (!isInitialized && !isInitializing) {
      isInitializing = true;
      
      // Bei wiederholten Fehlern WASM zurücksetzen
      const resetWasm = Math.random() > 0.9; // 10% Chance für Reset bei jedem Versuch
      if (resetWasm) {
        console.log('📊 [browserReplayParser] Performing preventative WASM reset');
        forceWasmReset();
      }
      
      // Ensure all parsers are initialized with proper error handling
      try {
        console.log('📊 [browserReplayParser] Initializing WASM and browser-safe parsers...');
        
        // Initialize both parsers in parallel
        const wasmInitPromise = initParserWasm();
        const browserSafeInitPromise = initBrowserSafeParser();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Parser-Initialisierung dauerte zu lange')), 10000);
        });
        
        await Promise.race([
          Promise.all([wasmInitPromise, browserSafeInitPromise]), 
          timeoutPromise
        ]);
        
        isInitialized = true;
        console.log('📊 [browserReplayParser] All parsers initialized successfully');
      } catch (wasmError) {
        console.error('❌ [browserReplayParser] Parser initialization failed:', wasmError);
        isInitialized = false; // Force re-initialization on next attempt
        throw new Error('Parser-Initialisierung fehlgeschlagen. Bitte versuchen Sie es erneut oder laden Sie die Seite neu.');
      } finally {
        isInitializing = false;
      }
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
    
    // Try primary WASM parser first
    let parsedReplay;
    let parsingSuccessful = false;
    
    try {
      console.log('📊 [browserReplayParser] Trying primary WASM parser first...');
      // Use Promise.race to enforce a timeout
      const parsePromise = parseReplayWasm(fileData);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('WASM-Parsing hat das Zeitlimit überschritten')), 15000);
      });
      
      parsedReplay = await Promise.race([parsePromise, timeoutPromise]);
      
      // Verify basic data structure
      if (parsedReplay && (parsedReplay.players || parsedReplay.header?.players)) {
        console.log('📊 [browserReplayParser] Primary WASM parser successful');
        parsingSuccessful = true;
      } else {
        console.warn('📊 [browserReplayParser] Primary parser returned incomplete data, trying fallback...');
        parsingSuccessful = false;
      }
    } catch (primaryError) {
      console.warn('📊 [browserReplayParser] Primary parser failed, using fallback parser:', primaryError);
      parsingSuccessful = false;
    }
    
    // If primary parser failed, try the browser-safe parser
    if (!parsingSuccessful) {
      try {
        console.log('📊 [browserReplayParser] Using fallback browser-safe parser...');
        const fallbackPromise = parseReplayWithBrowserSafeParser(fileData);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Fallback-Parsing hat das Zeitlimit überschritten')), 10000);
        });
        
        parsedReplay = await Promise.race([fallbackPromise, timeoutPromise]);
        console.log('📊 [browserReplayParser] Fallback parser returned data:', parsedReplay);
        
        // Verify we have player data
        if (!parsedReplay || (!parsedReplay.playerName && !parsedReplay.players)) {
          throw new Error('Keine Spielerdaten im Replay gefunden');
        }
      } catch (fallbackError) {
        console.error('❌ [browserReplayParser] All parsers failed:', fallbackError);
        throw new Error(`Parser-Fehler: ${fallbackError instanceof Error ? fallbackError.message : 'Unbekannter Fehler'}`);
      }
    }
    
    if (!parsedReplay) {
      console.error('❌ [browserReplayParser] Parser returned null or empty result');
      throw new Error('Parser gab kein Ergebnis zurück');
    }
    
    console.log('📊 [browserReplayParser] Raw parser output:', parsedReplay);
    
    // ALWAYS map the raw parser output to our application's format using mapRawToParsed
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
