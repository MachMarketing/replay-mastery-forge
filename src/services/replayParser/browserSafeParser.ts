
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
    // According to screparsed documentation, this is the correct way to parse replays
    console.log('[browserSafeParser] Using parseReplay from screparsed');
    
    // The official API is parseReplay(buffer)
    if (typeof parserModule.parseReplay === 'function') {
      const result = await parserModule.parseReplay(data);
      console.log('[browserSafeParser] Parse successful, result structure:', 
        result ? Object.keys(result).join(', ') : 'null');
      
      // Log the full structure to help with debugging
      console.log('[browserSafeParser] First-level properties:', Object.keys(result || {}));
      
      if (result && typeof result === 'object') {
        // Log some more details about the structure
        Object.keys(result).forEach(key => {
          const value = result[key];
          const type = typeof value;
          if (type === 'object' && value !== null) {
            console.log(`[browserSafeParser] Property ${key} is an ${Array.isArray(value) ? 'array' : 'object'} with ${Array.isArray(value) ? value.length + ' items' : Object.keys(value).length + ' keys'}`);
            
            // For arrays, log the first item
            if (Array.isArray(value) && value.length > 0) {
              console.log(`[browserSafeParser] First item in ${key}:`, value[0]);
            }
          } else {
            console.log(`[browserSafeParser] Property ${key} is a ${type}`);
          }
        });
      }
      
      return result;
    } else {
      console.error('[browserSafeParser] parseReplay function not found in screparsed module');
      console.log('[browserSafeParser] Available functions:', 
        Object.keys(parserModule).filter(key => typeof parserModule[key] === 'function').join(', '));
      throw new Error('parseReplay function not available in screparsed module');
    }
  } catch (parseError) {
    console.error('[browserSafeParser] Error parsing replay:', parseError);
    throw parseError;
  }
}
