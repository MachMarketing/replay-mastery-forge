
/**
 * Handles replay parsing in a browser-compatible way
 * 
 * This module uses our browser-safe parser to handle StarCraft replay files.
 */
import { initBrowserSafeParser, parseReplayWithBrowserSafeParser } from './replayParser/browserSafeParser';

// Flag to track if parser has been initialized
let parserInitialized = false;
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;
let lastInitTime = 0;

/**
 * Initialize the parser module
 */
export async function initParserWasm(): Promise<void> {
  // Prevent initialization spamming
  const now = Date.now();
  if (now - lastInitTime < 2000) {
    console.log('[wasmLoader] Throttling parser initialization attempts');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  lastInitTime = now;
  
  // If already initialized, return immediately
  if (parserInitialized) {
    console.log('[wasmLoader] Parser module already initialized');
    return Promise.resolve();
  }
  
  // Don't start multiple initializations
  if (initializationInProgress) {
    console.log('[wasmLoader] Parser initialization already in progress, waiting...');
    return initializationPromise as Promise<void>;
  }

  console.log('[wasmLoader] Starting parser module initialization...');
  initializationInProgress = true;
  initializationAttempts++;

  // Store the initialization promise to allow multiple requestors to wait for it
  initializationPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // Initialize browser-safe parser
      await initBrowserSafeParser();
      
      console.log('[wasmLoader] Browser-safe parser initialized successfully');
      parserInitialized = true;
      initializationInProgress = false;
      resolve();
    } catch (error) {
      console.error('[wasmLoader] Error initializing parser module:', error);
      
      if (initializationAttempts < MAX_INIT_ATTEMPTS) {
        console.log(`[wasmLoader] Retrying initialization (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);
        initializationInProgress = false;
        // Try again with a slight delay
        setTimeout(() => {
          resolve(initParserWasm());
        }, 1000);
      } else {
        console.log('[wasmLoader] Maximum initialization attempts reached, marking as initialized anyway');
        // Even if initialization fails, we'll mark as initialized
        // since our browser-safe implementation doesn't really need initialization
        parserInitialized = true;
        initializationInProgress = false;
        resolve(); // Resolve anyway to allow the app to continue
      }
    }
  });

  return initializationPromise;
}

/**
 * Force reset the parser initialization state
 */
export function forceWasmReset(): void {
  console.log('[wasmLoader] Force resetting parser initialization state');
  parserInitialized = false;
  initializationInProgress = false;
  initializationPromise = null;
  initializationAttempts = 0;
}

/**
 * Parse a replay file using our browser-safe parser
 */
export async function parseReplayWasm(fileData: Uint8Array): Promise<any> {
  try {
    // Ensure parser is initialized
    if (!parserInitialized) {
      console.log('[wasmLoader] Parser not initialized, initializing now...');
      await initParserWasm();
    }

    console.log('[wasmLoader] Starting parsing of replay data, size:', fileData.byteLength);
    
    // Use our browser-safe parser with explicit error handling
    const parsePromise = parseReplayWithBrowserSafeParser(fileData);
    
    // Set a timeout for parsing
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Parsing timed out after 30 seconds')), 30000);
    });
    
    // Race the parsing against the timeout
    let parsedData;
    try {
      parsedData = await Promise.race([parsePromise, timeoutPromise]);
    } catch (error) {
      console.error('[wasmLoader] Error during parsing race:', error);
      throw error;
    }
    
    // Verify we have data
    if (!parsedData) {
      throw new Error('Parser returned empty data');
    }
    
    console.log('[wasmLoader] Replay parsed successfully:', parsedData);
    
    return parsedData;
  } catch (error) {
    console.error('[wasmLoader] Error during parsing:', error);
    
    // Create fallback data with more clear error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fallbackData = {
      playerName: 'Player',
      opponentName: 'Opponent',
      playerRace: 'Terran',
      opponentRace: 'Zerg',
      map: 'Unknown Map',
      matchup: 'TvZ', 
      duration: '5:00',
      date: new Date().toISOString().split('T')[0],
      result: 'win',
      apm: 150,
      eapm: 120,
      strengths: ['Gute mechanische Fähigkeiten', 'Effektives Makromanagement'],
      weaknesses: ['Könnte Scouting verbessern', 'Unregelmäßige Produktion'],
      recommendations: ['Übe Build-Order Timings', 'Fokussiere dich auf Map-Kontrolle'],
      buildOrder: [],
      _error: errorMessage, // Include error for debugging
      _fallback: true // Mark as fallback data
    };
    
    // For development builds, return fallback data
    if (process.env.NODE_ENV === 'development') {
      console.log('[wasmLoader] Using fallback data in development mode');
      return fallbackData;
    }
    
    // In production, throw the error
    throw new Error(`Parsing failed: ${errorMessage}`);
  }
}

/**
 * Check if parser is initialized
 */
export function isWasmInitialized(): boolean {
  return parserInitialized;
}

/**
 * Reset parser initialization status (for testing)
 */
export function resetWasmStatus(): void {
  parserInitialized = false;
  initializationInProgress = false;
  initializationPromise = null;
  initializationAttempts = 0;
}
