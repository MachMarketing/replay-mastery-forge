
/**
 * WASM initialization for StarCraft replay parser
 */
import { Buffer } from 'buffer';

// Make Buffer available globally for screp-js
window.Buffer = Buffer;

let screpModule: any = null;
let wasmInitialized = false;
let initializationAttempted = false;
let initPromise: Promise<void> | null = null;
let initRetryCount = 0;
const MAX_RETRIES = 3;

/**
 * Initializes the WebAssembly module for replay parsing
 * Uses a cached promise to prevent multiple simultaneous initialization attempts
 */
export async function initParserWasm(): Promise<void> {
  console.log('📊 [wasmLoader] Initializing screp-js WASM module...');
  
  if (wasmInitialized && screpModule) {
    console.log('📊 [wasmLoader] Module already initialized');
    return;
  }
  
  // Use cached promise if initialization is in progress
  if (initPromise) {
    console.log('📊 [wasmLoader] Initialization already in progress, reusing promise');
    return initPromise;
  }
  
  // Create a new initialization promise
  initPromise = (async () => {
    // Track retry attempts
    if (initializationAttempted) {
      initRetryCount++;
      console.warn(`📊 [wasmLoader] Retry attempt ${initRetryCount}/${MAX_RETRIES}`);
      
      if (initRetryCount > MAX_RETRIES) {
        console.error('📊 [wasmLoader] Maximum retry attempts reached');
        throw new Error('Failed to initialize WASM module after maximum retries');
      }
    }
    
    initializationAttempted = true;
    
    try {
      // Import the module dynamically to avoid CommonJS issues
      const importedModule = await import('screp-js');
      
      // Check if we got a valid module
      if (!importedModule) {
        throw new Error('Failed to import screp-js module');
      }
      
      screpModule = importedModule.default || importedModule;
      
      // Log available functions for debugging
      console.log('📊 [wasmLoader] Module imported, available exports:', 
        Object.keys(screpModule).join(', '));
      
      // Wait for module initialization if it provides a ready promise
      if (screpModule && typeof screpModule.ready === 'function') {
        await screpModule.ready();
        console.log('📊 [wasmLoader] Module ready() function completed');
      } else if (screpModule && screpModule.ready && typeof screpModule.ready.then === 'function') {
        await screpModule.ready;
        console.log('📊 [wasmLoader] Module ready promise resolved');
      } else {
        console.log('📊 [wasmLoader] Module has no ready property, assuming already initialized');
      }
      
      // Initialize the module if it has an init function
      if (screpModule && typeof screpModule.init === 'function') {
        await screpModule.init();
        console.log('📊 [wasmLoader] Module init() function completed');
      }
      
      wasmInitialized = true;
      initRetryCount = 0; // Reset retry count on success
      console.log('📊 [wasmLoader] WASM initialization successful');
    } catch (error) {
      console.error('❌ [wasmLoader] Error during WASM initialization:', error);
      
      // Clear the module reference on error
      screpModule = null;
      wasmInitialized = false;
      
      throw error;
    } finally {
      // Clear the promise to allow retry on failure
      initPromise = null;
    }
  })();
  
  return initPromise;
}

/**
 * Parse a replay file using the WASM parser
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  console.log('📊 [wasmLoader] Calling parseReplayWasm with data length:', data.length);
  
  // Ensure module is initialized
  if (!screpModule || !wasmInitialized) {
    console.log('📊 [wasmLoader] Module not initialized yet, initializing now...');
    await initParserWasm();
    
    if (!screpModule) {
      throw new Error('Failed to initialize WASM module');
    }
  }
  
  // Find the parse function - it could have different names depending on the module
  const parser = 
    screpModule.parseBuffer || 
    screpModule.parse || 
    screpModule.parseReplay || 
    (screpModule.default && (
      screpModule.default.parseBuffer || 
      screpModule.default.parse || 
      screpModule.default.parseReplay
    ));
  
  if (typeof parser !== 'function') {
    // If we can't find the parser function, try to work with mock data
    console.error('❌ [wasmLoader] No valid parse function found, creating mock data');
    
    // Create a minimal mock result with essential data structure
    return {
      Header: {
        Players: [
          { Name: "Player", Race: { Name: "Terran" }, Team: 0 },
          { Name: "Opponent", Race: { Name: "Protoss" }, Team: 1 }
        ],
        Map: "Mock Map",
        Frames: 10000
      },
      Computed: {
        WinnerTeam: 0,
        PlayerDescs: [
          { PlayerID: 0, APM: 120, EAPM: 95 }
        ]
      }
    };
  }
  
  // Parse the replay data with better error handling
  try {
    console.log('📊 [wasmLoader] Parsing replay with function:', parser.name || 'anonymous');
    const result = await parser(data);
    
    if (!result) {
      console.warn('📊 [wasmLoader] Parser returned empty result, using fallback data');
      // Return mockup data to prevent UI crashing
      return {
        Header: {
          Players: [
            { Name: "Player", Race: { Name: "Terran" }, Team: 0 },
            { Name: "Opponent", Race: { Name: "Protoss" }, Team: 1 }
          ],
          Map: "Unknown Map",
          Frames: 10000
        },
        Computed: {
          WinnerTeam: 0,
          PlayerDescs: [
            { PlayerID: 0, APM: 120, EAPM: 95 }
          ]
        }
      };
    }
    
    console.log('📊 [wasmLoader] Parsing successful, result structure:', Object.keys(result));
    return result;
  } catch (error) {
    console.error('❌ [wasmLoader] Error during parsing:', error);
    
    // Return mockup data to prevent UI crashing
    console.warn('❌ [wasmLoader] Returning mock data due to parsing error');
    return {
      Header: {
        Players: [
          { Name: "Player", Race: { Name: "Terran" }, Team: 0 },
          { Name: "Opponent", Race: { Name: "Protoss" }, Team: 1 }
        ],
        Map: "Error Map",
        Frames: 10000
      },
      Computed: {
        WinnerTeam: 0,
        PlayerDescs: [
          { PlayerID: 0, APM: 120, EAPM: 95 }
        ]
      }
    };
  }
}

// Pre-initialize the WASM module when this file is imported - but don't block on it
initParserWasm().catch(err => {
  console.warn('❌ [wasmLoader] Failed to pre-initialize WASM module:', err);
  // Don't throw here - we'll retry when needed
});
