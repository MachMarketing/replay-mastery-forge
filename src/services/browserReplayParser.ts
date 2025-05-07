
/**
 * This module provides a unified browser-based replay parser system 
 * that uses screparsed library for reliable replay parsing without server dependencies.
 */
import { ParsedReplayResult } from './replayParserService';
import { mapRawToParsed } from './replayMapper';
import { ReplayParser } from 'screparsed';

// Define consistent timeout duration - 60 seconds
const PARSER_TIMEOUT_MS = 60000;

/**
 * Initialize the browser parser - should be called early in the app lifecycle
 */
export async function initBrowserParser(): Promise<void> {
  console.log('[browserReplayParser] Initializing screparsed parser');
  // No initialization needed for screparsed
  return Promise.resolve();
}

/**
 * Parse a replay file using the browser-based parser
 * This is the main entry point for replay parsing in the browser
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log(`[browserReplayParser] Starting to parse file: ${file.name} (${file.size} bytes)`);
  
  try {
    // Read the file as an ArrayBuffer
    const fileData = await readFileAsArrayBuffer(file);
    
    console.log(`[browserReplayParser] File converted to ArrayBuffer (${fileData.byteLength} bytes)`);
    
    // Return a promise that will resolve with the parsed data
    return new Promise(async (resolve, reject) => {
      // Set a timeout
      const timeoutId = setTimeout(() => {
        console.error(`[browserReplayParser] Parsing timed out after ${PARSER_TIMEOUT_MS/1000} seconds`);
        reject(new Error('Parsing timed out'));
      }, PARSER_TIMEOUT_MS);
      
      try {
        console.log('[browserReplayParser] Parsing with screparsed...');
        const result = await ReplayParser.fromArrayBuffer(fileData);
        
        console.log(`[browserReplayParser] Parsing complete, found data:`, 
          result ? 'Result found' : 'No result');
        
        // Clear the timeout since parsing completed
        clearTimeout(timeoutId);
        
        if (!result) {
          throw new Error('Parser returned empty data');
        }
        
        // Log more detailed information about the parsed data to help debugging
        console.log(`[browserReplayParser] Header present: ${result.header ? 'Yes' : 'No'}`);
        console.log(`[browserReplayParser] Commands count: ${result.commands?.length || 0}`);
        console.log(`[browserReplayParser] Players count: ${result.players?.length || 0}`);
        console.log(`[browserReplayParser] Map name: ${result.mapName || 'Unknown'}`);
        
        // Format the data in a way that matches our expected output
        const parsedData = {
          header: result.header,
          commands: result.commands,
          players: result.players,
          mapName: result.mapName,
        };
        
        // Map the raw parsed data to our application format
        console.log('[browserReplayParser] Mapping parsed data to application format...');
        return resolve(mapRawToParsed(parsedData));
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('[browserReplayParser] Error in screparsed parsing:', error);
        reject(error);
      }
    });
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
