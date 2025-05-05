
/**
 * Client-side parser for StarCraft: Brood War replay files
 * 
 * This implementation uses the SCREP-WASM parser.
 */
import { parseReplayWasm } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';
import { ParsedReplayResult } from './replayParserService';

/**
 * Main function for parsing replay files
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('📊 [browserReplayParser] Start parsing:', file.name);
  
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
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  console.log('📊 [browserReplayParser] First 20 bytes →', Array.from(data.slice(0, 20)));
  
  // Direct WASM parse
  const raw = await parseReplayWasm(data);
  console.log('📊 [browserReplayParser] Raw keys →', Object.keys(raw));
  
  // Map to domain model
  const mapped = mapRawToParsed(raw);
  console.log('📊 [browserReplayParser] Mapped result →', mapped);
  
  return mapped;
}
