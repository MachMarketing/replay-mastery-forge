
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
    
    // Generate unique parse ID for tracking
    const parseId = Math.random().toString(36).substring(2, 10);
    
    // Return a promise that will resolve with the parsed data
    return new Promise(async (resolve, reject) => {
      // Set a timeout
      const timeoutId = setTimeout(() => {
        console.error(`[browserReplayParser] Parsing timed out after ${PARSER_TIMEOUT_MS/1000} seconds`);
        reject(new Error('Parsing timed out'));
      }, PARSER_TIMEOUT_MS);
      
      try {
        console.log(`[browserReplayParser] Creating parser from ArrayBuffer (${parseId})...`);
        // Create the parser from the array buffer
        const parser = ReplayParser.fromArrayBuffer(fileData);
        
        console.log(`[browserReplayParser] Running parser.parse() (${parseId})...`);
        // Actually run the parsing operation
        const result = await parser.parse();
        
        // Add the debugging log to see the exact structure
        console.log(`🛠 Full parsed object structure (${parseId}):`, result);
        
        // Dump the raw data structure to help with debugging
        console.log(`🛠 Game info structure (${parseId}):`, result.gameInfo ? Object.keys(result.gameInfo) : 'none');
        console.log(`🛠 Players structure (${parseId}):`, result.players ? 
          result.players.map((p: any) => Object.keys(p)) : 'none');
        
        // Detailed player info
        if (result.players && result.players.length > 0) {
          console.log(`🛠 First player details (${parseId}):`, {
            name: result.players[0].name,
            race: result.players[0].race,
            // Log more player properties as needed
          });
          
          // Log build order info if available
          if (result.players[0].actions) {
            console.log(`🛠 First player actions sample (${parseId}):`, 
              result.players[0].actions.slice(0, 5));
          }
          
          if (result.players[0].buildOrder) {
            console.log(`🛠 First player build order sample (${parseId}):`, 
              result.players[0].buildOrder.slice(0, 5));
          }
        }
        
        // Clear the timeout since parsing completed
        clearTimeout(timeoutId);
        
        console.log(`[browserReplayParser] Parsing complete (${parseId}), found data:`, 
          result ? 'Result found' : 'No result');
        
        if (!result) {
          throw new Error('Parser returned empty data');
        }
        
        // Log more detailed information about the parsed result structure
        console.log(`[browserReplayParser] Result keys (${parseId}): ${Object.keys(result).join(', ')}`);
        
        if (result.gameInfo) {
          console.log(`[browserReplayParser] Game info (${parseId}): ${result.gameInfo.map || 'Unknown map'}`);
          console.log(`[browserReplayParser] Game frames (${parseId}): ${result.gameInfo.frames || 'Unknown'}`);
        }
        
        if (result.players) {
          console.log(`[browserReplayParser] Players count (${parseId}): ${result.players.length || 0}`);
        }
        
        // Format the data based on what we see in the result object
        // We'll use a more adaptive approach instead of assuming specific properties
        const parsedData = {
          header: result.gameInfo || {},
          players: result.players || [],
          mapName: result.gameInfo?.map || 'Unknown',
          chat: result.chatMessages || [],
          fileHash: String(file.size) + '_' + parseId // Add a unique hash for this specific file
        };
        
        // Map the raw parsed data to our application format
        console.log(`[browserReplayParser] Mapping parsed data to application format (${parseId})...`);
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
