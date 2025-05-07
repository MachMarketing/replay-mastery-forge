
/**
 * This module provides a unified browser-based replay parser system 
 * that uses jssuh for reliable replay parsing without server dependencies.
 */
import { ParsedReplayResult } from './replayParserService';
import { initBrowserSafeParser, parseReplayWithBrowserSafeParser } from './replayParser/browserSafeParser';
import { mapRawToParsed } from './replayMapper';
import { transformJSSUHData } from './replayParser/transformer';

// Add an explicit import of JSSUH to test if it's available and log its structure
import JSSUH from 'jssuh';

// Log the JSSUH object to help debug imports
console.log('[browserReplayParser] JSSUH import:', JSSUH);
console.log('[browserReplayParser] JSSUH keys:', JSSUH ? Object.keys(JSSUH) : 'not loaded');

// Ensure global.process is available with proper nextTick implementation
if (typeof globalThis.process === 'undefined') {
  console.log('[browserReplayParser] Polyfilling global.process');
  (globalThis as any).process = {
    env: {},
    browser: true,
    nextTick: (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0),
  };
} else {
  // Make sure process.env exists
  if (!(globalThis as any).process.env) {
    (globalThis as any).process.env = {};
  }
  // Ensure nextTick is available and properly implemented
  if (typeof (globalThis as any).process.nextTick !== 'function') {
    (globalThis as any).process.nextTick = (fn: Function, ...args: any[]) => setTimeout(() => fn(...args), 0);
    console.log('[browserReplayParser] Polyfilled global.process.nextTick');
  }
}

// Flag to track if the parser has been initialized
let parserInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Define consistent timeout duration - 60 seconds
const PARSER_TIMEOUT_MS = 60000;

/**
 * Initialize the browser parser - should be called early in the app lifecycle
 * With a timeout to prevent hanging
 */
export async function initBrowserParser(): Promise<void> {
  // If already initialized, just return
  if (parserInitialized) return;
  
  // If initialization is in progress, wait for it
  if (initializationPromise) {
    console.log('[browserReplayParser] Parser initialization already in progress, waiting...');
    return initializationPromise;
  }
  
  console.log('[browserReplayParser] Initializing unified browser parser system');
  
  // Set up initialization with timeout
  initializationPromise = new Promise<void>(async (resolve, reject) => {
    // Set a timeout for initialization - 60 seconds
    const timeoutId = setTimeout(() => {
      console.error('[browserReplayParser] Parser initialization timed out after 60 seconds');
      reject(new Error('Parser initialization timed out'));
    }, PARSER_TIMEOUT_MS);
    
    try {
      // Initialize the browser-safe parser (jssuh)
      await initBrowserSafeParser();
      parserInitialized = true;
      console.log('[browserReplayParser] Browser parser initialized successfully');
      clearTimeout(timeoutId);
      resolve();
    } catch (error) {
      console.error('[browserReplayParser] Error initializing browser parser:', error);
      clearTimeout(timeoutId);
      reject(error);
    }
  });
  
  return initializationPromise;
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
    
    // Check if we have valid parsed data
    if (!parsedData || (typeof parsedData === 'object' && Object.keys(parsedData).length === 0)) {
      console.error('[browserReplayParser] Parser returned empty data');
      throw new Error('Parser returned empty data');
    }
    
    // Log the parsed data (truncated)
    const dataKeys = Object.keys(parsedData);
    console.log(`[browserReplayParser] Parsing complete, found ${dataKeys.length} data fields:`, 
      dataKeys.join(', '));
    
    // Log more detailed information about the parsed data to help debugging
    console.log(`[browserReplayParser] Header present: ${parsedData.header ? 'Yes' : 'No'}`);
    console.log(`[browserReplayParser] Commands count: ${parsedData.commands?.length || 0}`);
    console.log(`[browserReplayParser] Players count: ${parsedData.players?.length || 0}`);
    console.log(`[browserReplayParser] Map name: ${parsedData.mapName || 'Unknown'}`);
    
    // Apply JSSUH-specific transformation if needed
    const transformedData = transformJSSUHData(parsedData);
    
    // Map the raw parsed data to our application format
    console.log('[browserReplayParser] Mapping parsed data to application format...');
    return mapRawToParsed(transformedData);
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
