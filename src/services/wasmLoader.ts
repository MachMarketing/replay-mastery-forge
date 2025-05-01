
/**
 * WASM initialization for StarCraft replay parser
 */
import { Buffer } from 'buffer';

// Make Buffer available globally for potential use by screp-js
// This is needed because some WASM modules expect Buffer to be available
window.Buffer = Buffer;

// Will store the loaded module
let screpJsModule: any = null;

/**
 * Dynamically loads the screp-js module, handling browser compatibility
 */
async function loadScrepJs() {
  console.log('📊 [screp-js] Attempting to dynamically load screp-js...');
  
  try {
    // Dynamic import to handle potential require/ESM conflicts
    const module = await import('screp-js');
    
    // Detaillierte Debugging-Informationen
    console.log('📊 [screp-js] Module loaded successfully');
    console.log('📊 [screp-js] Module type:', typeof module);
    console.log('📊 [screp-js] Direct exports:', Object.keys(module));
    
    if (module.default) {
      console.log('📊 [screp-js] Default export type:', typeof module.default);
      console.log('📊 [screp-js] Default export keys:', Object.keys(module.default));
    }
    
    // Überprüfen der wichtigsten Funktionen
    console.log('📊 [screp-js] parseReplay function available:', typeof module.parseReplay === 'function');
    console.log('📊 [screp-js] parse function available:', typeof module.parse === 'function');
    
    if (module.default) {
      console.log('📊 [screp-js] default.parseReplay function available:', 
                  typeof module.default.parseReplay === 'function');
      console.log('📊 [screp-js] default.parse function available:', 
                  typeof module.default.parse === 'function');
    }
    
    // Überprüfen der ready-Promise
    console.log('📊 [screp-js] ready property available:', !!module.ready);
    if (module.ready) {
      console.log('📊 [screp-js] ready is a Promise:', typeof module.ready.then === 'function');
    }
    
    if (module.default?.ready) {
      console.log('📊 [screp-js] default.ready is a Promise:', typeof module.default.ready.then === 'function');
    }
    
    return module;
  } catch (error) {
    console.error('❌ [screp-js] Failed to load screp-js module:', error);
    throw new Error(`Failed to load screp-js: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Initializes the WebAssembly module for replay parsing
 */
export async function initParserWasm(): Promise<void> {
  console.log('📊 [screp-js] Initializing screp-js WASM module...');
  
  try {
    // Load the module if not already loaded
    if (!screpJsModule) {
      screpJsModule = await loadScrepJs();
    }
    
    // Wait for WASM initialization if supported
    if (screpJsModule.ready && typeof screpJsModule.ready.then === 'function') {
      console.log('📊 [screp-js] Waiting for module.ready Promise to resolve...');
      await screpJsModule.ready;
      console.log('📊 [screp-js] module.ready Promise resolved successfully');
    } else if (screpJsModule.default?.ready && typeof screpJsModule.default.ready.then === 'function') {
      console.log('📊 [screp-js] Waiting for module.default.ready Promise to resolve...');
      await screpJsModule.default.ready;
      console.log('📊 [screp-js] module.default.ready Promise resolved successfully');
    } else {
      console.warn('⚠️ [screp-js] No ready Promise found in screp-js, continuing without explicit initialization');
    }
    
    console.log('📊 [screp-js] WASM initialization complete');
  } catch (error) {
    console.error('❌ [screp-js] Error during WASM initialization:', error);
    throw new Error(`WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse function that handles different module export formats
 */
export async function parseReplayWasm(data: Uint8Array): Promise<any> {
  console.log('📊 [screp-js] Calling parseReplayWasm with data length:', data.length);
  
  try {
    // Ensure module is loaded
    if (!screpJsModule) {
      console.log('📊 [screp-js] Module not loaded yet, initializing...');
      await initParserWasm();
    }
    
    // Detaillierte Debug-Informationen über den Modul-Status
    console.log('📊 [screp-js] Module state before parsing:');
    console.log('📊 [screp-js] Module type:', typeof screpJsModule);
    console.log('📊 [screp-js] Module direct exports:', Object.keys(screpJsModule));
    
    if (screpJsModule.default) {
      console.log('📊 [screp-js] Module default export keys:', Object.keys(screpJsModule.default));
    }
    
    // Versuchen, die Parse-Funktion zu finden und aufzurufen
    let result;
    let usedMethod = '';
    
    // Try different possible export names
    if (typeof screpJsModule.parseReplay === 'function') {
      console.log('📊 [screp-js] Using screpJsModule.parseReplay()');
      usedMethod = 'screpJsModule.parseReplay';
      result = screpJsModule.parseReplay(data);
    } 
    else if (typeof screpJsModule.parse === 'function') {
      console.log('📊 [screp-js] Using screpJsModule.parse()');
      usedMethod = 'screpJsModule.parse';
      result = screpJsModule.parse(data);
    }
    else if (typeof screpJsModule.default?.parseReplay === 'function') {
      console.log('📊 [screp-js] Using screpJsModule.default.parseReplay()');
      usedMethod = 'screpJsModule.default.parseReplay';
      result = screpJsModule.default.parseReplay(data);
    }
    else if (typeof screpJsModule.default?.parse === 'function') {
      console.log('📊 [screp-js] Using screpJsModule.default.parse()');
      usedMethod = 'screpJsModule.default.parse';
      result = screpJsModule.default.parse(data);
    }
    else {
      // Wenn keine Methode gefunden wurde, werfen wir einen aussagekräftigen Fehler
      console.error('❌ [screp-js] No valid parse function found in screp-js module');
      console.error('📊 [screp-js] Available methods:', Object.keys(screpJsModule));
      if (screpJsModule.default) {
        console.error('📊 [screp-js] Available default methods:', Object.keys(screpJsModule.default));
      }
      throw new Error('Could not find a valid parse function in screp-js module');
    }
    
    // Überprüfen des Ergebnisses
    if (result && typeof result.then === 'function') {
      console.log(`📊 [screp-js] ${usedMethod} returned a Promise, awaiting result...`);
      result = await result;
    }
    
    console.log(`📊 [screp-js] Parsing completed using ${usedMethod}`);
    
    if (!result) {
      console.error('❌ [screp-js] Parser returned empty result');
      throw new Error('Parser returned empty result');
    }
    
    console.log('📊 [screp-js] Parser result type:', typeof result);
    console.log('📊 [screp-js] Parser result structure:', Object.keys(result));
    
    return result;
  } catch (error) {
    console.error('❌ [screp-js] Error in parseReplayWasm:', error);
    throw error;
  }
}
