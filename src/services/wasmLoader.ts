
/**
 * Handles WASM module loading and initialization for replay parsing
 */
import jssuh from 'jssuh';

// Flag to track if WASM module has been initialized
let wasmInitialized = false;

/**
 * Initialize the parser WASM module
 */
export async function initParserWasm(): Promise<void> {
  try {
    if (wasmInitialized) {
      console.log('[wasmLoader] WASM module already initialized');
      return;
    }

    console.log('[wasmLoader] Initializing WASM module...');
    await jssuh.ready;
    wasmInitialized = true;
    console.log('[wasmLoader] WASM module initialized successfully');
  } catch (error) {
    console.error('[wasmLoader] Failed to initialize WASM module:', error);
    wasmInitialized = false;
    throw new Error(`WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse a replay file using the WASM parser
 */
export async function parseReplayWasm(fileData: Uint8Array): Promise<any> {
  try {
    // Ensure WASM is initialized
    if (!wasmInitialized) {
      console.log('[wasmLoader] WASM not initialized, initializing now...');
      await initParserWasm();
    }

    console.log('[wasmLoader] Starting WASM parsing of replay data, size:', fileData.byteLength);
    
    // Use jssuh to parse the replay
    const replay = new jssuh.Replay();
    await replay.parseReplay(fileData);
    
    // Extract information from the replay
    const gameInfo = replay.getGameInfo();
    const players = replay.getPlayers();
    const actions = replay.getActions();
    
    console.log('[wasmLoader] WASM parsing completed successfully');
    console.log('[wasmLoader] Found', players.length, 'players');
    
    // Enhanced player logging for debugging - log the complete player objects
    players.forEach((player, index) => {
      console.log(`[wasmLoader] Player ${index + 1} raw data:`, JSON.stringify(player));
      console.log(`[wasmLoader] Player ${index + 1} extracted:`, {
        name: player.name,
        race: player.race, // This is the raw race code (P, T, Z)
        id: player.id,
        color: player.color,
        isComputer: player.isComputer
      });
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
 * Helper function to map race letter to full race name
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
}
