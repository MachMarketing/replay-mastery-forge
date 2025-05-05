
/**
 * Browser Safe Parser Utilities
 * This file helps to safely use the JSSUH library in a browser context
 */

// We'll use this constant to track if we've already warned the user about browser limitations
let browserLimitationWarningShown = false;

// Create a fallback parser that can be used when JSSUH isn't working
export function createFallbackParser() {
  console.warn('[browserSafeParser] Creating fallback parser due to browser limitations');
  
  if (!browserLimitationWarningShown) {
    console.warn('[browserSafeParser] The JSSUH library has limited functionality in browser environments');
    browserLimitationWarningShown = true;
  }
  
  // Return a minimal mock implementation that will satisfy our interface
  return class MockReplay {
    constructor() {
      console.log('[browserSafeParser] Using mock replay parser');
    }
    
    async parseReplay() {
      console.log('[browserSafeParser] Mock parseReplay called');
      return Promise.resolve();
    }
    
    getGameInfo() {
      return { 
        mapName: 'Unknown Map', 
        durationFrames: 7200 // About 5 minutes at 24fps
      };
    }
    
    getPlayers() {
      return [
        { name: 'Player', race: 'T', id: '1', color: 0, isComputer: false },
        { name: 'Opponent', race: 'Z', id: '2', color: 1, isComputer: false }
      ];
    }
    
    getActions() {
      return [];
    }
  };
}

/**
 * Safe require for browser environment
 * This helps handle modules that might not be available in the browser
 */
export function safeRequire(moduleName: string) {
  try {
    // Dynamic import is not used here as it would complicate things
    // We're just safely checking if a module is available
    return require(moduleName);
  } catch (error) {
    console.warn(`[browserSafeParser] Module '${moduleName}' is not available in the browser`);
    return null;
  }
}

/**
 * Initialize JSSUH safely in browser environment
 */
export async function initSafeJSSUH() {
  try {
    // Try to import JSSUH
    const jssuhModule = await import('jssuh');
    
    if (!jssuhModule || !jssuhModule.default) {
      console.error('[browserSafeParser] Failed to load JSSUH module');
      return { Replay: createFallbackParser() };
    }
    
    // Replace any missing classes with mock implementations
    if (!jssuhModule.default.Replay) {
      console.warn('[browserSafeParser] JSSUH.Replay is undefined, using fallback');
      jssuhModule.default.Replay = createFallbackParser();
    }
    
    return jssuhModule.default;
  } catch (error) {
    console.error('[browserSafeParser] Error initializing JSSUH:', error);
    
    // Return a mock object with the necessary interface
    return {
      Replay: createFallbackParser()
    };
  }
}
