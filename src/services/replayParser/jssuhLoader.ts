
/**
 * Load the named export ReplayParser from jssuh
 */
export async function getReplayParserConstructor(): Promise<
  new (opts?: { encoding?: string }) => any
> {
  console.log('[jssuhLoader] Loading JSSUH ReplayParser with dynamic import');
  
  try {
    // dynamic import ensures you get the real ESM namespace
    const mod = await import('jssuh');
    console.log('[jssuhLoader] JSSUH module loaded:', mod);
    
    const ReplayParser = mod.ReplayParser;
    if (typeof ReplayParser !== 'function') {
      console.error('[jssuhLoader] exports from jssuh:', Object.keys(mod));
      throw new Error('jssuh did not export ReplayParser');
    }
    
    console.log('[jssuhLoader] Found ReplayParser constructor');
    
    // Quick smoke-test
    const test = new ReplayParser({ encoding: 'cp1252' });
    ['write', 'end', 'on'].forEach((fn) => {
      if (typeof (test as any)[fn] !== 'function') {
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
