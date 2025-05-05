
/**
 * Client-side parser for StarCraft: Brood War replay files
 * 
 * This implementation focuses exclusively on the WASM-based parser for 
 * processing .rep files directly in the browser.
 */
import { initParserWasm, parseReplayWasm } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';
import { screp } from 'screp-js';

// Flag to track if we're already initializing
let isInitializing = false;
let isInitialized = false;
let wasmParsingEnabled = true;

/**
 * Validates a replay file before attempting to parse it
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
 * Pre-validates replay data before sending to WASM parser
 */
function preValidateReplayData(data: Uint8Array): boolean {
  if (!data || data.length < 12) {
    console.warn('[browserReplayParser] Data too small to be valid replay');
    return false;
  }
  
  try {
    // Check for StarCraft replay signature
    const signature = String.fromCharCode(...data.slice(0, 4));
    if (signature !== "(B)w" && signature !== "(B)W") {
      console.warn('[browserReplayParser] Invalid replay signature:', signature);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[browserReplayParser] Error in pre-validation:', error);
    return false;
  }
}

/**
 * Creates a minimal fallback result when parsing fails
 */
function createFallbackData(filename: string): ParsedReplayResult {
  const cleanFilename = filename.replace('.rep', '').replace(/_/g, ' ');
  
  return {
    playerName: cleanFilename || 'Player',
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
    weaknesses: ['Die Replay-Datei scheint beschädigt zu sein'],
    recommendations: ['Versuche eine andere Replay-Datei hochzuladen']
  };
}

/**
 * Main function for parsing replay files
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name);
  
  try {
    // More thorough file validation
    if (!validateReplayFile(file)) {
      console.warn('[browserReplayParser] File validation failed');
      return createFallbackData(file.name);
    }
    
    const buffer = await file.arrayBuffer();
    const fileData = new Uint8Array(buffer);
    
    // Skip WASM parsing completely if pre-validation fails
    if (!preValidateReplayData(fileData)) {
      console.warn('[browserReplayParser] Pre-validation failed, using fallback');
      return createFallbackData(file.name);
    }
    
    // Skip WASM if it's been disabled due to previous errors
    if (!wasmParsingEnabled) {
      console.warn('[browserReplayParser] WASM parsing disabled due to previous errors');
      return createFallbackData(file.name);
    }
    
    // Try WASM parsing with timeout and error protection
    try {
      // Initialize WASM with timeout
      const timeoutMs = 5000;
      const initPromise = screp.init();
      const initTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('WASM initialization timed out')), timeoutMs);
      });
      
      await Promise.race([initPromise, initTimeout]).catch(error => {
        console.warn('[browserReplayParser] WASM initialization error:', error);
        wasmParsingEnabled = false;
        throw error;
      });
      
      // Defensive copy for WASM parsing (helps prevent memory corruption)
      const safeData = new Uint8Array(fileData.length);
      safeData.set(fileData);
      
      // Parse with timeout protection
      const parsePromise = screp.parseReplay(safeData);
      const parseTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Parsing timed out')), timeoutMs);
      });
      
      const parsedData = await Promise.race([parsePromise, parseTimeout]).catch(error => {
        console.warn('[browserReplayParser] WASM parsing timeout:', error);
        throw error;
      });
      
      if (!parsedData) {
        console.warn('[browserReplayParser] No data returned from WASM parser');
        return createFallbackData(file.name);
      }
      
      return mapRawToParsed(parsedData);
    } catch (wasmError) {
      console.error('[browserReplayParser] WASM parsing error:', wasmError);
      
      // Disable WASM parsing for future attempts if we hit a critical error
      if (wasmError.message && (
        wasmError.message.includes('makeslice') || 
        wasmError.message.includes('len out of range') ||
        wasmError.message.includes('runtime error')
      )) {
        console.warn('[browserReplayParser] Disabling WASM parsing due to critical error');
        wasmParsingEnabled = false;
      }
      
      // Always return fallback data on any WASM error
      return createFallbackData(file.name);
    }
  } catch (error) {
    console.error('[browserReplayParser] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Ensure we always return fallback data rather than crashing
    return createFallbackData(file.name);
  }
}
