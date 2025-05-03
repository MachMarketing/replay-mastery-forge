
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
    
    // Enhanced player logging for debugging
    players.forEach((player, index) => {
      console.log(`[wasmLoader] Player ${index + 1}:`, {
        name: player.name,
        race: player.race,
        id: player.id
      });
    });
    
    // Return structured data from parser
    return {
      gameInfo,
      players,
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
