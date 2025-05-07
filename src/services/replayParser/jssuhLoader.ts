
/**
 * Helper module to directly import and test the JSSUH library
 * This helps ensure we're loading the library correctly
 */
import JSSUH from 'jssuh';

// This function returns the ReplayParser constructor from JSSUH
export function getReplayParserConstructor() {
  console.log('[jssuhLoader] Loading JSSUH ReplayParser');
  
  try {
    // Log what we received from the import
    console.log('[jssuhLoader] JSSUH import:', JSSUH);
    
    if (!JSSUH) {
      throw new Error('JSSUH module not properly loaded');
    }
    
    // Log the available exports
    const jssuKeys = typeof JSSUH === 'object' ? Object.keys(JSSUH) : [];
    console.log('[jssuhLoader] JSSUH available exports:', jssuKeys);
    
    // Attempt to find the ReplayParser, trying different possible locations
    const ReplayParserClass = JSSUH.ReplayParser || 
                             JSSUH.default?.ReplayParser || 
                             (typeof JSSUH === 'function' ? JSSUH : null);
                             
    if (!ReplayParserClass) {
      throw new Error('Could not find ReplayParser in JSSUH module');
    }
    
    // Test if it's instantiable
    try {
      const testInstance = new ReplayParserClass();
      console.log('[jssuhLoader] Successfully created ReplayParser instance:', testInstance);
      
      // Check for required methods on the parser
      const hasWrite = typeof testInstance.write === 'function';
      const hasEnd = typeof testInstance.end === 'function';
      const hasOn = typeof testInstance.on === 'function';
      
      console.log('[jssuhLoader] Parser methods check:', { hasWrite, hasEnd, hasOn });
      
      if (!hasWrite || !hasEnd || !hasOn) {
        throw new Error('ReplayParser instance is missing required methods');
      }
    } catch (instError) {
      console.error('[jssuhLoader] Failed to instantiate ReplayParser:', instError);
      throw new Error(`ReplayParser instantiation failed: ${instError instanceof Error ? instError.message : String(instError)}`);
    }
    
    console.log('[jssuhLoader] Successfully verified ReplayParser constructor');
    return ReplayParserClass;
  } catch (error) {
    console.error('[jssuhLoader] Error getting ReplayParser constructor:', error);
    throw error;
  }
}

// Export the JSSUH module directly
export default JSSUH;
