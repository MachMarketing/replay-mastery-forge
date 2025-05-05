
/**
 * Handles WASM module loading and initialization for replay parsing
 */
import jssuh from 'jssuh';

// Flag to track if WASM module has been initialized
let wasmInitialized = false;
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;
let lastInitTime = 0;

/**
 * Initialize the parser WASM module with improved error handling and retry mechanism
 */
export async function initParserWasm(): Promise<void> {
  // Prevent initialization spamming
  const now = Date.now();
  if (now - lastInitTime < 2000) {
    console.log('[wasmLoader] Throttling WASM initialization attempts');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  lastInitTime = now;
  
  // Don't start multiple initializations
  if (initializationInProgress) {
    console.log('[wasmLoader] WASM initialization already in progress, waiting...');
    return initializationPromise as Promise<void>;
  }

  // Return immediately if already initialized
  if (wasmInitialized) {
    console.log('[wasmLoader] WASM module already initialized');
    return Promise.resolve();
  }

  console.log('[wasmLoader] Starting WASM module initialization...');
  initializationInProgress = true;
  initializationAttempts++;

  // Store the initialization promise to allow multiple requestors to wait for it
  initializationPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // Check if jssuh is available
      if (!jssuh) {
        throw new Error('JSSUH module not loaded');
      }

      console.log('[wasmLoader] Checking JSSUH availability:', { 
        exists: !!jssuh, 
        ready: jssuh.ready ? 'function/promise exists' : 'missing', 
        Replay: jssuh.Replay ? 'exists' : 'missing' 
      });
      
      // Einfacher Initialisierungsfall - wenn kein ready-Promise vorhanden ist
      if (!jssuh.ready) {
        console.warn('[wasmLoader] jssuh.ready is not available, assuming ready');
        wasmInitialized = !!jssuh.Replay;
        initializationInProgress = false;
        
        if (wasmInitialized) {
          console.log('[wasmLoader] WASM module assumed initialized');
          resolve();
        } else {
          reject(new Error('JSSUH module missing Replay constructor'));
        }
        return;
      }

      console.log('[wasmLoader] Waiting for JSSUH to be ready...');
      
      // Set a timeout for WASM initialization
      const timeout = setTimeout(() => {
        console.error('[wasmLoader] WASM initialization timed out after 10 seconds');
        
        if (jssuh.Replay) {
          // If Replay constructor is available, assume WASM is usable despite timeout
          console.warn('[wasmLoader] Timeout occurred but Replay constructor exists, continuing anyway');
          wasmInitialized = true;
          initializationInProgress = false;
          resolve();
        } else {
          initializationInProgress = false;
          
          // Erneut versuchen, wenn Limit nicht erreicht
          if (initializationAttempts < MAX_INIT_ATTEMPTS) {
            console.log(`[wasmLoader] Retry WASM init (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);
            initParserWasm().then(resolve).catch(reject);
          } else {
            reject(new Error('WASM initialization timed out after multiple attempts'));
          }
        }
      }, 10000);
      
      try {
        // Wait for the ready promise to resolve
        await jssuh.ready;
        clearTimeout(timeout);
        
        // Verify the module is actually functional
        if (!jssuh.Replay) {
          throw new Error('JSSUH initialized but Replay constructor is missing');
        }
        
        wasmInitialized = true;
        initializationInProgress = false;
        console.log('[wasmLoader] WASM module initialized successfully');
        resolve();
      } catch (readyError) {
        clearTimeout(timeout);
        
        // If ready promise fails but Replay constructor exists, assume we can use it anyway
        if (jssuh.Replay) {
          console.warn('[wasmLoader] Ready promise failed but Replay constructor exists, continuing anyway:', readyError);
          wasmInitialized = true;
          initializationInProgress = false;
          resolve();
        } else {
          console.error('[wasmLoader] Failed waiting for JSSUH ready:', readyError);
          initializationInProgress = false;
          
          // Erneut versuchen, wenn Limit nicht erreicht
          if (initializationAttempts < MAX_INIT_ATTEMPTS) {
            console.log(`[wasmLoader] Retry WASM init (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);
            setTimeout(() => {
              initParserWasm().then(resolve).catch(reject);
            }, 1000); // Kurze Verzögerung vor dem erneuten Versuch
          } else {
            reject(new Error('WASM initialization failed after multiple attempts'));
          }
        }
      }
    } catch (error) {
      console.error('[wasmLoader] Critical error initializing WASM module:', error);
      wasmInitialized = false;
      initializationInProgress = false;
      reject(new Error(`WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  });

  return initializationPromise;
}

/**
 * Force reset the WASM initialization state
 * This can be used when the WASM module gets into a bad state
 */
export function forceWasmReset(): void {
  console.log('[wasmLoader] Force resetting WASM initialization state');
  wasmInitialized = false;
  initializationInProgress = false;
  initializationPromise = null;
  initializationAttempts = 0;
}

/**
 * Parse a replay file using the WASM parser with enhanced race detection
 */
export async function parseReplayWasm(fileData: Uint8Array): Promise<any> {
  try {
    // Ensure WASM is initialized
    if (!wasmInitialized) {
      console.log('[wasmLoader] WASM not initialized, initializing now...');
      await initParserWasm();
    }

    console.log('[wasmLoader] Starting WASM parsing of replay data, size:', fileData.byteLength);
    
    if (!jssuh || !jssuh.Replay) {
      throw new Error('JSSUH module not properly loaded');
    }
    
    // Use jssuh to parse the replay with explicit error handling
    let replay;
    try {
      replay = new jssuh.Replay();
      console.log('[wasmLoader] Created Replay instance');
    } catch (instError) {
      console.error('[wasmLoader] Error creating Replay instance:', instError);
      throw new Error('Fehler beim Erstellen des Replay-Parsers');
    }
    
    console.log('[wasmLoader] Parsing replay data...');
    
    // Set a timeout for parsing
    const parsePromise = (async () => {
      try {
        await replay.parseReplay(fileData);
        return true;
      } catch (parseErr) {
        console.error('[wasmLoader] Error during parseReplay:', parseErr);
        throw parseErr;
      }
    })();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Parsing timed out after 20 seconds')), 20000);
    });
    
    // Race the parsing against the timeout
    await Promise.race([parsePromise, timeoutPromise]);
    
    console.log('[wasmLoader] Replay parsed successfully');
    
    // Extract information from the replay
    let gameInfo;
    try {
      gameInfo = replay.getGameInfo();
      console.log('[wasmLoader] Game info:', gameInfo);
    } catch (gameInfoError) {
      console.error('[wasmLoader] Error getting game info:', gameInfoError);
      gameInfo = { mapName: 'Unknown Map', durationFrames: 7200 }; // 5 min default
    }
    
    let players;
    try {
      players = replay.getPlayers();
      console.log('[wasmLoader] Found', players?.length || 0, 'players');
      
      if (!players || players.length === 0) {
        // Erstelle Fallback-Spielerdaten
        players = [
          { name: 'Player', race: 'T', id: '1', color: 0, isComputer: false },
          { name: 'Opponent', race: 'T', id: '2', color: 1, isComputer: false }
        ];
        console.warn('[wasmLoader] No players found, using fallback player data');
      }
    } catch (playersError) {
      console.error('[wasmLoader] Error getting players:', playersError);
      // Erstelle Fallback-Spielerdaten
      players = [
        { name: 'Player', race: 'T', id: '1', color: 0, isComputer: false },
        { name: 'Opponent', race: 'T', id: '2', color: 1, isComputer: false }
      ];
    }
    
    let actions;
    try {
      actions = replay.getActions();
      console.log('[wasmLoader] Found', actions?.length || 0, 'actions');
    } catch (actionsError) {
      console.error('[wasmLoader] Error getting actions:', actionsError);
      actions = []; // Leere Aktionsliste als Fallback
    }
    
    // Enhanced player logging with all available properties
    players.forEach((player, index) => {
      console.log(`[wasmLoader] Player ${index + 1} complete data:`, player);
      
      // Create a complete extracted player with enhanced data
      const extractedPlayer = {
        name: player.name || `Player ${index + 1}`,
        raceLetter: player.race || 'T', // Raw race code (P, T, Z)
        race: mapRaceLetter(player.race), // Map to full race name
        id: player.id || `${index + 1}`,
        color: player.color !== undefined ? player.color : index,
        isComputer: !!player.isComputer,
        apm: player.apm || 0
      };
      
      console.log(`[wasmLoader] Player ${index + 1} extracted:`, extractedPlayer);
    });
    
    // Return structured data from parser with enhanced race information
    return {
      gameInfo,
      players: players.map(player => ({
        ...player,
        name: player.name || 'Unknown',
        raceLetter: player.race || 'T', // Preserve the original race letter
        race: mapRaceLetter(player.race) // Map to full race name
      })),
      actions: actions || [],
      // Calculate duration in milliseconds
      durationMS: (gameInfo?.durationFrames || 7200) * (1000/24), // SC uses 24 frames per second
      mapName: gameInfo?.mapName || 'Unknown Map',
      gameStartDate: gameInfo?.startTime ? new Date(gameInfo.startTime).toISOString() : new Date().toISOString()
    };
  } catch (error) {
    console.error('[wasmLoader] Error during WASM parsing:', error);
    throw new Error(`WASM parsing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper function to map race letter to full race name with improved logging
 */
function mapRaceLetter(raceLetter: string): string {
  console.log('[wasmLoader] Mapping race letter:', raceLetter);
  
  if (!raceLetter) {
    console.warn('[wasmLoader] Empty race letter, defaulting to Terran');
    return 'Terran';
  }
  
  // Ensure raceLetter is a string and uppercase
  const race = String(raceLetter).toUpperCase();
  
  switch (race) {
    case 'P':
      return 'Protoss';
    case 'T':
      return 'Terran';
    case 'Z':
      return 'Zerg';
    default:
      console.warn('[wasmLoader] Unknown race letter:', race, 'defaulting to Terran');
      return 'Terran';
  }
}

/**
 * Check if WASM is initialized
 */
export function isWasmInitialized(): boolean {
  return wasmInitialized;
}

/**
 * Reset WASM initialization status (for testing)
 */
export function resetWasmStatus(): void {
  wasmInitialized = false;
  initializationInProgress = false;
  initializationPromise = null;
  initializationAttempts = 0;
}
