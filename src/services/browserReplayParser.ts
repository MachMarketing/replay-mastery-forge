
/**
 * Client-side parser for StarCraft: Brood War replay files
 * 
 * This implementation focuses on using the most reliable parser
 * available in the browser context.
 */
import { initParserWasm, parseReplayWasm, isWasmInitialized, forceWasmReset } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';
import { parseReplayWithBrowserSafeParser, initBrowserSafeParser } from './replayParser/browserSafeParser';
import { detectWasmCompatibilityIssues, markBrowserAsHavingWasmIssues, hasBrowserWasmIssues } from '@/utils/browserDetection';

// Flags to track parser state
let wasmInitializeAttempted = false;
let wasmInitializeFailed = false;
let consecutiveErrorCount = 0;

/**
 * Main function for parsing replay files
 * Uses the most appropriate parser based on browser environment and history
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Starting parsing for file:', file.name);
  
  try {
    // Validate the input file
    if (!file || file.size === 0) {
      throw new Error('Invalid or empty replay file');
    }
    
    if (file.size < 1000) {
      throw new Error('File too small to be a valid replay');
    }
    
    if (file.size > 5000000) {
      throw new Error('File too large, maximum size is 5MB');
    }
    
    // Load file data
    const buffer = await file.arrayBuffer().catch(error => {
      console.error('[browserReplayParser] Error reading file data:', error);
      throw new Error('Failed to read replay file data');
    });
    
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Failed to read file data');
    }
    
    const fileData = new Uint8Array(buffer);
    
    console.log('[browserReplayParser] File data loaded, size:', fileData.length, 'bytes');
    
    // Check if we should skip WASM entirely based on browser detection or previous errors
    const shouldSkipWasm = 
      detectWasmCompatibilityIssues() || 
      hasBrowserWasmIssues() || 
      consecutiveErrorCount >= 1;
    
    if (shouldSkipWasm) {
      console.log('[browserReplayParser] Skipping WASM parser due to compatibility issues or previous errors');
      return await useBrowserSafeParser(fileData);
    }
    
    // Try WASM parser first, with fallback to browser-safe parser
    try {
      return await useWasmParser(fileData);
    } catch (wasmError) {
      console.error('[browserReplayParser] WASM parser failed:', wasmError);
      
      // Check for specific WASM errors
      const errorMessage = wasmError instanceof Error ? wasmError.message : String(wasmError);
      if (errorMessage.includes('makeslice') || 
          errorMessage.includes('runtime error') || 
          errorMessage.includes('out of bounds')) {
        // Mark the browser as having WASM issues to avoid future attempts
        markBrowserAsHavingWasmIssues();
        consecutiveErrorCount++;
      }
      
      // Fall back to browser-safe parser
      console.log('[browserReplayParser] Falling back to browser-safe parser');
      return await useBrowserSafeParser(fileData);
    }
  } catch (error) {
    console.error('[browserReplayParser] Error during parsing:', error);
    throw error;
  }
}

/**
 * Attempt to parse with WASM parser
 */
async function useWasmParser(fileData: Uint8Array): Promise<ParsedReplayResult> {
  // Initialize WASM parser if needed
  if (!wasmInitializeAttempted || wasmInitializeFailed) {
    wasmInitializeAttempted = true;
    wasmInitializeFailed = false;
    
    try {
      console.log('[browserReplayParser] Initializing WASM parser...');
      await initParserWasm();
    } catch (error) {
      console.error('[browserReplayParser] WASM initialization failed:', error);
      wasmInitializeFailed = true;
      // If WASM init fails, throw to trigger fallback
      throw new Error('WASM initialization failed');
    }
  }
  
  // Create a defensive copy with extra padding to prevent buffer overflow
  const paddedData = new Uint8Array(fileData.length + 8192); // 8KB padding
  paddedData.set(fileData);
  
  // Call WASM parser with timeout protection
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('WASM parser timeout'));
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timeoutId);
  });
  
  try {
    // Race between parser and timeout
    const rawData = await Promise.race([
      parseReplayWasm(paddedData),
      timeoutPromise
    ]);
    
    // Success - map and return the data
    const parsedData = mapRawToParsed(rawData);
    console.log('[browserReplayParser] WASM parsing successful');
    
    // Reset error count on success
    consecutiveErrorCount = 0;
    
    // Ensure required fields are present
    ensureRequiredFields(parsedData);
    return parsedData;
  } catch (error) {
    console.error('[browserReplayParser] WASM parser error:', error);
    
    // Force reset WASM state on any error
    forceWasmReset();
    wasmInitializeAttempted = false;
    
    // Track error
    consecutiveErrorCount++;
    
    // Propagate the error
    throw error;
  }
}

/**
 * Use the browser-safe parser
 */
async function useBrowserSafeParser(fileData: Uint8Array): Promise<ParsedReplayResult> {
  console.log('[browserReplayParser] Using browser-safe parser');
  
  // Ensure browser-safe parser is initialized
  try {
    await initBrowserSafeParser();
  } catch (error) {
    console.error('[browserReplayParser] Error initializing browser-safe parser:', error);
    // Continue anyway, as the parser has internal fallbacks
  }
  
  // Use the browser-safe parser
  try {
    const parsedData = await parseReplayWithBrowserSafeParser(fileData);
    console.log('[browserReplayParser] Browser-safe parsing successful');
    return parsedData as ParsedReplayResult;
  } catch (error) {
    console.error('[browserReplayParser] Browser-safe parser error:', error);
    
    // Create a minimal fallback result if all else fails
    return createEmergencyFallbackData();
  }
}

/**
 * Create fallback data when all parsing methods fail
 */
function createEmergencyFallbackData(): ParsedReplayResult {
  console.warn('[browserReplayParser] Creating emergency fallback data');
  return {
    playerName: 'Player',
    opponentName: 'Opponent',
    playerRace: 'Terran',
    opponentRace: 'Protoss',
    map: 'Unknown Map (Error Parsing)',
    matchup: 'TvP',
    duration: '10:00',
    durationMS: 600000,
    date: new Date().toISOString().split('T')[0],
    result: 'win',
    apm: 120,
    eapm: 90,
    buildOrder: [],
    resourcesGraph: [],
    strengths: ['Could not analyze replay file'],
    weaknesses: ['File appears to be corrupted or incompatible'],
    recommendations: ['Try uploading a different replay file']
  };
}

/**
 * Helper function to ensure all required fields are present
 */
function ensureRequiredFields(data: any): void {
  // Make sure strengths, weaknesses, and recommendations are always arrays
  if (!data.strengths || !Array.isArray(data.strengths) || data.strengths.length === 0) {
    data.strengths = ['Solid macro gameplay'];
  }
  
  if (!data.weaknesses || !Array.isArray(data.weaknesses) || data.weaknesses.length === 0) {
    data.weaknesses = ['Build order efficiency'];
  }
  
  if (!data.recommendations || !Array.isArray(data.recommendations) || data.recommendations.length === 0) {
    data.recommendations = ['Focus on early game scouting'];
  }
  
  // Ensure all other required fields have values
  if (!data.eapm || typeof data.eapm !== 'number') {
    data.eapm = data.apm ? Math.floor(data.apm * 0.8) : 120;
  }
  
  if (!data.buildOrder || !Array.isArray(data.buildOrder)) {
    data.buildOrder = [];
  }
}
