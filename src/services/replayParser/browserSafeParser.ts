
/**
 * Browser-safe wrapper for screparsed replay parser
 */

// Import the specific types
import { ParsedReplayData } from './types';

// Track initialization state
let isInitialized = false;
let parserModule: any = null;

/**
 * Initialize the browser-safe parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  if (isInitialized) {
    console.log('[browserSafeParser] Parser already initialized');
    return;
  }
  
  try {
    console.log('[browserSafeParser] Initializing screparsed parser');
    
    // Import the screparsed module
    const screparsed = await import('screparsed');
    console.log('[browserSafeParser] Screparsed import successful:', Object.keys(screparsed));
    
    // Store the module for later use
    parserModule = screparsed;
    isInitialized = true;
    console.log('[browserSafeParser] ✅ Parser initialized successfully');
  } catch (err) {
    console.error('[browserSafeParser] Failed to initialize parser:', err);
    throw new Error(`Failed to initialize replay parser: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parse a replay file using the browser-safe screparsed parser
 * Based on the official screparsed documentation
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<any> {
  if (!isInitialized || !parserModule) {
    await initBrowserSafeParser();
  }
  
  if (!parserModule) {
    throw new Error('screparsed parser module not available');
  }
  
  console.log('[browserSafeParser] Parsing replay data:', data.length, 'bytes');
  
  try {
    // According to screparsed documentation, we need to use ReplayParser class
    console.log('[browserSafeParser] Using ReplayParser from screparsed');
    
    // Check if ReplayParser exists
    if (typeof parserModule.ReplayParser === 'function') {
      // Create a new ReplayParser instance
      // According to the documentation, we should use fromArrayBuffer method
      const parser = await parserModule.ReplayParser.fromArrayBuffer(data.buffer);
      console.log('[browserSafeParser] Created ReplayParser instance');
      
      // Parse the replay
      const result = parser.parse();
      console.log('[browserSafeParser] Parse successful, result structure:', 
        result ? Object.keys(result).join(', ') : 'null');
      
      // Log the full structure to help with debugging
      console.log('[browserSafeParser] ReplayParser properties:', Object.getOwnPropertyNames(parser));
      console.log('[browserSafeParser] First-level properties:', Object.keys(result || {}));
      
      // Extract more detailed information for debugging
      if (result && typeof result === 'object') {
        // Deep analyze the replay structure
        console.log('[browserSafeParser] Analyzing replay structure...');
        deepAnalyzeReplayStructure(result);
      }
      
      return result;
    } else if (typeof parserModule.ParsedReplay === 'function') {
      // Fallback to ParsedReplay if available
      console.log('[browserSafeParser] Trying ParsedReplay class instead');
      const parsedReplay = new parserModule.ParsedReplay(data);
      const result = parsedReplay.parse ? parsedReplay.parse() : parsedReplay;
      
      console.log('[browserSafeParser] Parse with ParsedReplay successful, result structure:',
        result ? Object.keys(result).join(', ') : 'null');
        
      return result;
    } else {
      console.error('[browserSafeParser] Neither ReplayParser nor ParsedReplay found in screparsed module');
      console.log('[browserSafeParser] Available functions:', 
        Object.keys(parserModule).filter(key => typeof parserModule[key] === 'function').join(', '));
      throw new Error('Required parser classes not available in screparsed module');
    }
  } catch (parseError) {
    console.error('[browserSafeParser] Error parsing replay:', parseError);
    throw parseError;
  }
}

/**
 * Helper function to deeply analyze the replay structure
 */
function deepAnalyzeReplayStructure(obj: any, path: string = '', depth: number = 0): void {
  if (depth > 3) return; // Limit recursion depth
  
  if (obj === null || obj === undefined) {
    console.log(`[browserSafeParser] ${path} is ${obj === null ? 'null' : 'undefined'}`);
    return;
  }
  
  if (typeof obj !== 'object') {
    console.log(`[browserSafeParser] ${path} = ${obj} (${typeof obj})`);
    return;
  }
  
  // Handle array
  if (Array.isArray(obj)) {
    console.log(`[browserSafeParser] ${path || 'root'}: Array with ${obj.length} items`);
    if (obj.length > 0 && depth < 2) {
      console.log(`[browserSafeParser] ${path}[0] sample:`, obj[0]);
      // If it's a complex array, analyze the first item
      if (typeof obj[0] === 'object' && obj[0] !== null) {
        deepAnalyzeReplayStructure(obj[0], `${path}[0]`, depth + 1);
      }
    }
    return;
  }
  
  // Handle objects
  console.log(`[browserSafeParser] ${path || 'root'}: Object with keys: ${Object.keys(obj).join(', ')}`);
  
  // Look for specific keys of interest
  const interestingKeys = ['frames', 'players', 'commands', 'events', 'units', 'buildings', 'header', 'gameEvents', 'metadata', '_frames', '_gameInfo'];
  
  for (const key of interestingKeys) {
    if (key in obj) {
      const value = obj[key];
      const nextPath = path ? `${path}.${key}` : key;
      
      if (Array.isArray(value)) {
        console.log(`[browserSafeParser] ${nextPath}: Array with ${value.length} items`);
        if (value.length > 0) {
          console.log(`[browserSafeParser] ${nextPath}[0] sample:`, value[0]);
        }
      } else if (typeof value === 'object' && value !== null) {
        console.log(`[browserSafeParser] ${nextPath}: Object with keys: ${Object.keys(value).join(', ')}`);
        if (depth < 2) {
          deepAnalyzeReplayStructure(value, nextPath, depth + 1);
        }
      } else {
        console.log(`[browserSafeParser] ${nextPath} = ${value} (${typeof value})`);
      }
    }
  }
  
  // Check for specific properties that might contain build order info
  if ('_frames' in obj || '_gameInfo' in obj) {
    console.log('[browserSafeParser] Found internal replay data structures (_frames or _gameInfo)');
    // These are likely the raw parsed data that we need to extract information from
  }
}
