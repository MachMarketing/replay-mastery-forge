
/**
 * Load the ReplayParser constructor from jssuh, whether it's
 * exported as a named, default, or direct function/class.
 */
export async function getReplayParserConstructor(): Promise<
  new (opts?: { encoding?: string }) => any
> {
  console.log('[jssuhLoader] Loading JSSUH ReplayParser with dynamic import');
  
  try {
    // dynamic import ensures you get the real ESM namespace
    const mod: any = await import('jssuh');
    console.log('[jssuhLoader] Raw module:', mod);
    
    // Try named export
    let ReplayParser = mod.ReplayParser;
    console.log('[jssuhLoader] Named export ReplayParser:', ReplayParser);
    
    // Try default namespace
    if (!ReplayParser && mod.default) {
      console.log('[jssuhLoader] Checking default export:', mod.default);
      ReplayParser = mod.default.ReplayParser || mod.default;
    }
    
    // Try direct function export
    if (!ReplayParser && typeof mod === 'function') {
      console.log('[jssuhLoader] Module itself is a function, using directly');
      ReplayParser = mod;
    }
    
    console.log('[jssuhLoader] Resolved ReplayParser:', ReplayParser);
    
    if (typeof ReplayParser !== 'function') {
      console.error('[jssuhLoader] exports from jssuh:', Object.keys(mod));
      console.error('[jssuhLoader] Default export is:', typeof mod.default);
      throw new Error('Could not locate ReplayParser constructor in jssuh module');
    }
    
    console.log('[jssuhLoader] Found ReplayParser constructor');
    
    // Quick smoke-test
    const test = new ReplayParser({ encoding: 'cp1252' });
    console.log('[jssuhLoader] Created test instance with encoding cp1252');
    
    ['write', 'end', 'on', 'pipeChk'].forEach((fn) => {
      if (typeof (test as any)[fn] !== 'function') {
        console.error(`[jssuhLoader] ReplayParser missing method ${fn}:`, test);
        throw new Error(`ReplayParser missing method ${fn}`);
      }
    });
    
    console.log('[jssuhLoader] ReplayParser smoke test passed');
    return ReplayParser;
  } catch (error) {
    console.error('[jssuhLoader] Error getting ReplayParser constructor:', error);
    throw error;
  }
}

// For backward compatibility, also export the default import
export { default } from 'jssuh';
