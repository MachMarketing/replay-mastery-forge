
/**
 * This module provides a unified browser-based replay parser system 
 * that uses jssuh for reliable replay parsing without server dependencies.
 */
import { ParsedReplayResult } from './replayParserService';
import { initBrowserSafeParser, parseReplayWithBrowserSafeParser } from './replayParser/browserSafeParser';
import { mapRawToParsed } from './replayMapper';

// Flag to track if the parser has been initialized
let parserInitialized = false;

/**
 * Initialize the browser parser - should be called early in the app lifecycle
 */
export async function initBrowserParser(): Promise<void> {
  if (parserInitialized) return;
  
  console.log('[browserReplayParser] Initializing unified browser parser system');
  try {
    // Initialize the browser-safe parser (jssuh)
    await initBrowserSafeParser();
    parserInitialized = true;
    console.log('[browserReplayParser] Browser parser initialized successfully');
  } catch (error) {
    console.error('[browserReplayParser] Error initializing browser parser:', error);
    throw error;
  }
}

/**
 * Parse a replay file using the browser-based parser
 * This is the main entry point for replay parsing in the browser
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log(`[browserReplayParser] Starting to parse file: ${file.name} (${file.size} bytes)`);
  
  // Make sure the parser is initialized
  if (!parserInitialized) {
    console.log('[browserReplayParser] Parser not initialized, initializing now...');
    await initBrowserParser();
  }
  
  try {
    // Read the file as an ArrayBuffer
    const fileData = await readFileAsArrayBuffer(file);
    
    // Convert to Uint8Array for parsing
    const uint8Data = new Uint8Array(fileData);
    console.log(`[browserReplayParser] File converted to Uint8Array (${uint8Data.length} bytes)`);
    
    // Use the browser-safe parser to parse the replay data
    console.log('[browserReplayParser] Parsing with browser-safe parser...');
    const parsedData = await parseReplayWithBrowserSafeParser(uint8Data);
    
    // Log the parsed data (truncated)
    const dataKeys = Object.keys(parsedData);
    console.log(`[browserReplayParser] Parsing complete, found ${dataKeys.length} data fields:`, 
      dataKeys.join(', '));
    
    // Map the raw parsed data to our application format
    console.log('[browserReplayParser] Mapping parsed data to application format...');
    return mapRawToParsed(parsedData);
  } catch (error) {
    console.error('[browserReplayParser] Error parsing replay:', error);
    throw error;
  }
}

/**
 * Helper function to read a file as ArrayBuffer
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    
    reader.onerror = () => {
      reject(reader.error);
    };
    
    reader.readAsArrayBuffer(file);
  });
}
