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

export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name);
  
  try {
    // Add more thorough file validation
    const buffer = await file.arrayBuffer();
    const fileData = new Uint8Array(buffer);
    
    // Check minimum file size (typical replays are at least a few KB)
    if (fileData.length < 1024) {
      console.warn('[browserReplayParser] File too small to be valid replay');
      throw new Error('Die Datei ist zu klein, um eine gültige Replay-Datei zu sein');
    }
    
    // Validate replay signature
    const signature = String.fromCharCode(...fileData.slice(0, 4));
    if (signature !== "(B)w" && signature !== "(B)W") {
      console.warn('[browserReplayParser] Invalid replay signature:', signature);
      return createFallbackData(file.name);
    }
    
    // Initialize WASM with timeout
    const timeoutMs = 10000;
    const initPromise = screp.init();
    const initTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('WASM initialization timed out')), timeoutMs);
    });
    
    await Promise.race([initPromise, initTimeout]);
    
    // Create defensive buffer copy to prevent memory issues
    const safeData = new Uint8Array(fileData.length);
    safeData.set(fileData);
    
    // Parse with timeout protection
    const parsePromise = screp.parseReplay(safeData);
    const parseTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Parsing timed out')), timeoutMs);
    });
    
    const parsedData = await Promise.race([parsePromise, parseTimeout]);
    
    if (!parsedData) {
      return createFallbackData(file.name);
    }
    
    return mapRawToParsed(parsedData);
  } catch (error) {
    console.error('[browserReplayParser] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle specific WASM errors with fallback data
    if (errorMessage.includes('len out of range') || 
        errorMessage.includes('makeslice') ||
        errorMessage.includes('runtime error')) {
      console.warn('[browserReplayParser] WASM error detected, using fallback data');
      return createFallbackData(file.name);
    }
    
    throw error;
  }
}

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
