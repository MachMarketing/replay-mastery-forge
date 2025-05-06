/**
 * Client-side parser for StarCraft: Brood War replay files
 * 
 * This implementation uses the SCREP-WASM parser with appropriate error handling.
 */
import { parseReplayWasm, canUseWasm, forceWasmReset } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';
import { hasBrowserWasmIssues, markBrowserAsHavingWasmIssues } from '@/utils/browserDetection';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_FILE_SIZE = 1000; // 1KB

/**
 * Main function for parsing replay files with comprehensive error handling
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Start parsing:', file.name);
  
  // Validate the input file
  if (!file || file.size === 0) {
    throw new Error('Invalid or empty replay file');
  }
  
  if (file.size < MIN_FILE_SIZE) {
    throw new Error('File too small to be a valid replay');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large, maximum size is 5MB');
  }
  
  // Check file extension (basic validation)
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'rep') {
    throw new Error('Only StarCraft Replay files (.rep) are allowed');
  }
  
  // Check for known browser WASM issues
  if (hasBrowserWasmIssues()) {
    console.warn('📊 [browserReplayParser] Browser has known WASM issues, generating mock data');
    // In a real application, you might want to use a server-side fallback here
    // For now, we'll throw a more helpful error
    throw new Error('Your browser has compatibility issues with the WASM parser. Please try a different browser or contact support.');
  }
  
  try {
    // Load file data
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Log the first few bytes for debugging
    console.log('📊 [browserReplayParser] First 20 bytes →', Array.from(data.slice(0, 20)));
    
    // Parse with WASM
    console.log('📊 [browserReplayParser] Parsing with WASM parser');
    const raw = await parseReplayWasm(data);
    
    // Check that we got a valid result
    if (!raw || typeof raw !== 'object') {
      throw new Error('Parser returned invalid data');
    }
    
    console.log('📊 [browserReplayParser] Raw keys →', Object.keys(raw));
    
    // Add enhanced debugging for Commands array
    if (raw.Commands && Array.isArray(raw.Commands)) {
      console.log('📊 [browserReplayParser] Commands count:', raw.Commands.length);
      // Log first few commands more descriptively
      if (raw.Commands.length > 0) {
        console.log('📊 [browserReplayParser] First command full object:', raw.Commands[0]);
        console.log('📊 [browserReplayParser] First command keys:', Object.keys(raw.Commands[0]));
        console.log('📊 [browserReplayParser] First 5 commands sample:', 
          raw.Commands.slice(0, 5).map(cmd => ({
            id: cmd.id,
            name: cmd.name,
            type: cmd.type,
            frame: cmd.frame,
            player: cmd.player
          }))
        );
        
        // Find build-related commands
        const buildCommands = raw.Commands.filter((cmd: any) => 
          cmd.type === 'build' || 
          cmd.type === 'train' || 
          (cmd.id && [0x0c, 0x1c, 0x1f, 0x23, 0x30, 0x32].includes(cmd.id))
        );
        
        if (buildCommands.length > 0) {
          console.log('📊 [browserReplayParser] Found', buildCommands.length, 'build-related commands');
          console.log('📊 [browserReplayParser] First 3 build commands:', buildCommands.slice(0, 3));
        } else {
          console.log('📊 [browserReplayParser] No build commands found, will use synthetic data');
        }
      }
    }
    
    // IMPORTANT: Pass the raw object completely unchanged to the mapper
    console.log('📊 [browserReplayParser] Passing raw data to mapper with keys:', Object.keys(raw));
    
    // Map to domain model
    const mapped = mapRawToParsed(raw);
    console.log('📊 [browserReplayParser] Mapped result →', mapped);
    
    return mapped;
  } catch (error) {
    console.error('📊 [browserReplayParser] Error during parsing:', error);
    
    // Reset the WASM module state to allow for future attempts
    forceWasmReset();
    
    // Add browser detection for specific errors
    if (error instanceof Error && 
        (error.message.includes('makeslice') || 
         error.message.includes('runtime error') ||
         error.message.includes('memory'))) {
      markBrowserAsHavingWasmIssues();
      throw new Error('Browser compatibility issue: WebAssembly memory error. Please try a different browser.');
    }
    
    // Rethrow with helpful message
    throw error instanceof Error 
      ? error 
      : new Error('Unknown error during replay parsing');
  }
}
