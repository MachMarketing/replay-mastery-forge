
/**
 * This module provides a unified browser-based replay parser system 
 * that uses screparsed library for reliable replay parsing without server dependencies.
 */
import { ParsedReplayData, PlayerData } from './replayParser/types';
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
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayData> {
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
        console.log(`🛠 [browserReplayParser] Full parsed object structure (${parseId}):`, result);
        
        // Dump the raw data structure to help with debugging
        console.log(`🛠 [browserReplayParser] Game info structure (${parseId}):`, result.gameInfo ? Object.keys(result.gameInfo) : 'none');
        console.log(`🛠 [browserReplayParser] Players structure (${parseId}):`, result.players ? 
          result.players.map((p: any) => Object.keys(p)) : 'none');
        
        // Detailed player info for ALL players
        if (result.players && result.players.length > 0) {
          console.log(`🛠 [browserReplayParser] Found ${result.players.length} players`);
          
          // Make sure players is mutable before modifying
          const updatedPlayers = [...result.players];
          
          // Log details for each player
          updatedPlayers.forEach((player: any, index: number) => {
            console.log(`🛠 [browserReplayParser] Player ${index + 1} details (${parseId}):`, {
              name: player.name,
              race: player.race,
              apm: player.apm || calculateApmFromActions(player),
              // Log more player properties
            });
            
            // Check for actual command/build order properties and log them
            // Use typecasting and safe access to prevent errors
            const playerObj = player as any;
            
            // Log commands if available
            if (playerObj.commands && Array.isArray(playerObj.commands)) {
              console.log(`🛠 [browserReplayParser] Player ${index + 1} commands sample (${parseId}):`, 
                playerObj.commands.slice(0, 5));
            }
            
            // Log actions if available
            if (playerObj.actions && Array.isArray(playerObj.actions)) {
              console.log(`🛠 [browserReplayParser] Player ${index + 1} actions sample (${parseId}):`, 
                playerObj.actions.slice(0, 5));
              console.log(`🛠 [browserReplayParser] Player ${index + 1} action count: ${playerObj.actions.length}`);
            }
            
            // Log units if available
            if (playerObj.units && Array.isArray(playerObj.units)) {
              console.log(`🛠 [browserReplayParser] Player ${index + 1} units sample (${parseId}):`, 
                playerObj.units.slice(0, 5));
            }
            
            // Log build order if available
            if (playerObj.buildOrder && Array.isArray(playerObj.buildOrder)) {
              console.log(`🛠 [browserReplayParser] Player ${index + 1} build order sample (${parseId}):`, 
                playerObj.buildOrder.slice(0, 5));
            }
            
            // Calculate APM for each player if not provided by parser
            if (!player.apm && player.actions) {
              player.apm = calculateApmFromActions(player);
              console.log(`🛠 [browserReplayParser] Calculated APM for ${player.name}: ${player.apm}`);
            }
          });
          
          // Create a copy of the result with updated players array
          const updatedResult = { 
            ...result,
            players: updatedPlayers 
          };
          
          // Use the updated result from now on
          result = updatedResult;
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
          console.log(`[browserReplayParser] Game info (${parseId}): Map: ${result.gameInfo.map || 'Unknown map'}`);
          console.log(`[browserReplayParser] Game frames (${parseId}): ${result.gameInfo.frames || 'Unknown'}`);
          
          // Use frames as duration if durationFrames isn't available
          const durationFrames = result.gameInfo.frames || 0;
          console.log(`[browserReplayParser] Game duration (${parseId}): ${durationFrames ? 
            Math.round(durationFrames / 24 / 60) + ' minutes' : 'Unknown'}`);
        }
        
        // Format the data based on what we see in the result object
        // We'll use a more adaptive approach instead of assuming specific properties
        const parsedData = {
          header: result.gameInfo || {},
          players: result.players || [],
          mapName: result.gameInfo?.map || 'Unknown',
          chat: result.chatMessages || [],
          fileHash: String(file.size) + '_' + parseId, // Add a unique hash for this specific file
          fileDate: new Date().toISOString(),
          fileName: file.name
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
 * Calculate APM from player actions if not provided by parser
 */
function calculateApmFromActions(player: any): number {
  if (!player || !player.actions || !Array.isArray(player.actions)) {
    return 0;
  }
  
  // Get game duration from last action timestamp or use default
  let gameDurationMinutes = 10; // Default 10 minutes if we can't determine
  
  if (player.actions.length > 0) {
    // Try to determine game duration from the last action's timestamp
    const lastAction = player.actions[player.actions.length - 1];
    if (lastAction && lastAction.frame) {
      // Convert frames to minutes (24 frames per second)
      gameDurationMinutes = lastAction.frame / 24 / 60;
    }
  }
  
  // Ensure we don't divide by zero
  if (gameDurationMinutes <= 0) gameDurationMinutes = 1;
  
  // Calculate APM: actions count / game duration in minutes
  const apm = Math.round(player.actions.length / gameDurationMinutes);
  
  return apm;
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
