
/**
 * Handles WASM module loading and initialization for replay parsing
 */
import jssuh from 'jssuh';

// Flag to track if WASM module has been initialized
let wasmInitialized = false;
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the parser WASM module with improved error handling
 */
export async function initParserWasm(): Promise<void> {
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

  // Store the initialization promise to allow multiple requestors to wait for it
  initializationPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // Check if jssuh is available
      if (!jssuh || !jssuh.ready) {
        throw new Error('JSSUH module not loaded or ready property not available');
      }

      console.log('[wasmLoader] Waiting for JSSUH to be ready...');
      await jssuh.ready;
      
      wasmInitialized = true;
      initializationInProgress = false;
      console.log('[wasmLoader] WASM module initialized successfully');
      resolve();
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
    
    // Use jssuh to parse the replay
    const replay = new jssuh.Replay();
    
    console.log('[wasmLoader] Created Replay instance, parsing data...');
    await replay.parseReplay(fileData);
    console.log('[wasmLoader] Replay parsed successfully');
    
    // Extract information from the replay
    const gameInfo = replay.getGameInfo();
    console.log('[wasmLoader] Game info:', gameInfo);
    
    const players = replay.getPlayers();
    console.log('[wasmLoader] Found', players.length, 'players');
    
    const actions = replay.getActions();
    console.log('[wasmLoader] Found', actions.length, 'actions');
    
    // Enhanced player logging with all available properties
    players.forEach((player, index) => {
      console.log(`[wasmLoader] Player ${index + 1} complete data:`, player);
      
      // Create a complete extracted player with enhanced data
      const extractedPlayer = {
        name: player.name,
        raceLetter: player.race, // Raw race code (P, T, Z)
        race: mapRaceLetter(player.race), // Map to full race name
        id: player.id,
        color: player.color,
        isComputer: player.isComputer,
        apm: player.apm || 0
      };
      
      console.log(`[wasmLoader] Player ${index + 1} extracted:`, extractedPlayer);
    });
    
    // Return structured data from parser with enhanced race information
    return {
      gameInfo,
      players: players.map(player => ({
        ...player,
        raceLetter: player.race, // Preserve the original race letter
        race: mapRaceLetter(player.race) // Map to full race name
      })),
      actions,
      // Calculate duration in milliseconds
      durationMS: gameInfo.durationFrames * (1000/24), // SC uses 24 frames per second
      mapName: gameInfo.mapName,
      gameStartDate: new Date(gameInfo.startTime).toISOString()
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
    console.warn('[wasmLoader] Empty race letter, defaulting to Unknown');
    return 'Unknown';
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
      console.warn('[wasmLoader] Unknown race letter:', race, 'defaulting to Unknown');
      return 'Unknown';
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
}
