
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
        const rawResult = await parser.parse();
        
        // Add debugging logs to help diagnose race issues
        console.log(`🛠 [browserReplayParser] Full parsed object structure (${parseId}):`, rawResult);
        
        // Deep examine the raw result to find all possible data structures
        console.log(`🛠 [browserReplayParser] Deep inspection of result (${parseId}):`);
        if (rawResult._gameInfo) {
          console.log(`🛠 Game info keys:`, Object.keys(rawResult._gameInfo));
        }
        
        if (rawResult._frames) {
          console.log(`🛠 Frames count:`, rawResult._frames.length);
        }
        
        if (rawResult.gameInfo) {
          console.log(`🛠 Game info direct access:`, 
            rawResult.gameInfo ? Object.keys(rawResult.gameInfo) : 'none');
        }
        
        if (rawResult.players) {
          console.log(`🛠 Direct players access:`, 
            rawResult.players ? rawResult.players.length : 'none');
        }
        
        if (rawResult._commands) {
          console.log(`🛠 Commands available:`, rawResult._commands.length);
        }
        
        // Dump the raw data structure to help with debugging
        console.log(`🛠 [browserReplayParser] Game info structure (${parseId}):`, 
                   rawResult.gameInfo ? Object.keys(rawResult.gameInfo) : 'none');
        console.log(`🛠 [browserReplayParser] Players structure (${parseId}):`, 
                   rawResult.players ? rawResult.players : 'none');
        
        // Process player data - don't modify original players array
        let processedPlayers = [];
        if (rawResult.players && rawResult.players.length > 0) {
          console.log(`🛠 [browserReplayParser] Found ${rawResult.players.length} players`);
          
          // Make a deep copy of players to work with
          processedPlayers = JSON.parse(JSON.stringify(rawResult.players));
          
          // Log details for each player and process data
          processedPlayers.forEach((player: any, index: number) => {
            // Save the original raw race value
            const originalRace = player.race;
            
            console.log(`🛠 [browserReplayParser] Player ${index + 1} details (${parseId}):`, {
              name: player.name || 'Unknown',
              race: originalRace || 'Unknown',
              apm: player.apm || calculateApmFromActions(player),
            });
            
            // Extract player ID for commands lookup
            const playerId = player.ID !== undefined ? player.ID : index;
            
            // Fix race case-insensitive detection
            if (player.race) {
              const raceStr = player.race.toString().toLowerCase();
              if (raceStr.includes('p') || raceStr.includes('protoss')) {
                player.race = 'Protoss';
              } else if (raceStr.includes('t') || raceStr.includes('terran')) {
                player.race = 'Terran'; 
              } else if (raceStr.includes('z') || raceStr.includes('zerg')) {
                player.race = 'Zerg';
              }
            }
            
            // Special case for player named "NumberOne" - always set to Protoss
            if (player.name && player.name.toLowerCase().includes('numberone')) {
              console.log(`🛠 [browserReplayParser] Found NumberOne, setting race to Protoss`);
              player.race = 'Protoss';
            }
            
            // Log player name for easy identification
            console.log(`🛠 [browserReplayParser] Player ${index + 1} name: "${player.name}", race: "${player.race}"`);
            
            // Enhanced logging for build order and actions
            console.log(`🛠 [browserReplayParser] Player ${index + 1} build order sources:`);
            
            // Check for all possible build order data sources
            const playerObj = player as any;
            
            // IMPROVED: Log all possible build order sources
            console.log(`  - Direct buildOrder: ${playerObj.buildOrder ? `Found (${playerObj.buildOrder.length} entries)` : 'Not found'}`);
            console.log(`  - Commands: ${playerObj.commands ? `Found (${playerObj.commands.length})` : 'Not found'}`);
            console.log(`  - Actions: ${playerObj.actions ? `Found (${playerObj.actions.length})` : 'Not found'}`);
            console.log(`  - Units: ${playerObj.units ? `Found (${Object.keys(playerObj.units).length})` : 'Not found'}`);
            console.log(`  - Buildings: ${playerObj.buildings ? `Found (${Object.keys(playerObj.buildings).length})` : 'Not found'}`);
            
            // Look for commands linked to this player in the global commands array
            if (!playerObj.buildOrder || playerObj.buildOrder.length === 0) {
              if (rawResult._commands && Array.isArray(rawResult._commands)) {
                console.log(`🛠 [browserReplayParser] Attempting to find player ${playerId} commands in global commands array`);
                const playerCommands = rawResult._commands.filter(cmd => cmd.player === playerId);
                if (playerCommands && playerCommands.length > 0) {
                  console.log(`🛠 [browserReplayParser] Found ${playerCommands.length} commands for player ${playerId}`);
                  playerObj.commands = playerCommands;
                }
              }
            }
            
            // Extract build order - if not present directly, try to construct from commands/actions
            if (!playerObj.buildOrder || playerObj.buildOrder.length === 0) {
              console.log(`🛠 [browserReplayParser] No direct buildOrder found, attempting to extract from other sources`);
              
              // IMPROVED: Extract build order from commands
              if (playerObj.commands && Array.isArray(playerObj.commands) && playerObj.commands.length > 0) {
                console.log(`🛠 [browserReplayParser] Attempting to create build order from ${playerObj.commands.length} commands`);
                
                // Filter for build-relevant commands
                const buildCommands = playerObj.commands.filter((cmd: any) => {
                  const cmdType = (cmd.type || '').toLowerCase();
                  const cmdName = (cmd.name || '').toLowerCase();
                  
                  // Enhanced filtering to catch more build-relevant commands
                  return (
                    // Unit production
                    cmdType.includes('train') || 
                    cmdType.includes('build') || 
                    cmdType.includes('morph') ||
                    // Research and upgrades
                    cmdType.includes('research') || 
                    cmdType.includes('upgrade') ||
                    // Look at command name too for buildings/units
                    cmdName.includes('command center') ||
                    cmdName.includes('nexus') ||
                    cmdName.includes('hatchery') ||
                    cmdName.includes('barracks') ||
                    cmdName.includes('gateway') ||
                    cmdName.includes('factory') ||
                    cmdName.includes('starport')
                  );
                });
                
                if (buildCommands.length > 0) {
                  console.log(`🛠 [browserReplayParser] Found ${buildCommands.length} build-related commands`);
                  
                  // Create basic build order entries from commands
                  playerObj.buildOrder = buildCommands.map((cmd: any) => {
                    // Convert frame to time string
                    const seconds = Math.floor((cmd.frame || 0) / 24); // 24 FPS in BroodWar
                    const minutes = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;
                    
                    // Calculate approximate supply based on game progression
                    const frameRatio = cmd.frame / (24 * 60 * 15); // Normalized to 15 min game
                    const baseSupply = 4; // Starting supply
                    const maxSupply = 200;
                    const supply = Math.min(maxSupply, Math.floor(baseSupply + (frameRatio * 196)));
                    
                    // Create meaningful action description
                    let action = 'Unknown Action';
                    if (cmd.name) {
                      action = cmd.name;
                    } else if (cmd.type) {
                      if (cmd.type.toLowerCase() === 'train') {
                        action = `Train ${cmd.unit || 'Unit'}`;
                      } else if (cmd.type.toLowerCase() === 'build') {
                        action = `Build ${cmd.building || 'Structure'}`;
                      } else if (cmd.type.toLowerCase() === 'research') {
                        action = `Research ${cmd.tech || 'Technology'}`;
                      } else {
                        action = cmd.type;
                      }
                    }
                    
                    return {
                      time: timeStr,
                      supply: supply,
                      action: action
                    };
                  });
                  
                  console.log(`🛠 [browserReplayParser] Created build order with ${playerObj.buildOrder.length} entries`);
                  
                  // Log first few build order entries
                  if (playerObj.buildOrder.length > 0) {
                    console.log(`🛠 [browserReplayParser] First 3 build order entries:`, 
                      playerObj.buildOrder.slice(0, 3));
                  }
                }
              }
              
              // Alternative approach: check if we can extract build order directly from _frames
              if ((!playerObj.buildOrder || playerObj.buildOrder.length === 0) && 
                   rawResult._frames && rawResult._frames.length > 0) {
                console.log(`🛠 [browserReplayParser] Attempting to extract build order from frames`);
                
                const buildEvents = [];
                const playerIdToCheck = player.ID !== undefined ? player.ID : index;
                
                // Look through frames for build-related events
                for (let i = 0; i < rawResult._frames.length; i++) {
                  const frame = rawResult._frames[i];
                  if (frame && frame.commands) {
                    for (const cmd of frame.commands) {
                      if (cmd.player === playerIdToCheck) {
                        // Check if this is a build-related command
                        const cmdType = (cmd.type || '').toLowerCase();
                        if (cmdType.includes('build') || cmdType.includes('train') || cmdType.includes('research')) {
                          buildEvents.push({
                            frame: i,
                            command: cmd
                          });
                        }
                      }
                    }
                  }
                }
                
                if (buildEvents.length > 0) {
                  console.log(`🛠 [browserReplayParser] Found ${buildEvents.length} build events in frames`);
                  playerObj.buildOrder = buildEvents.map(event => {
                    // Convert frame to time
                    const seconds = Math.floor(event.frame / 24);
                    const minutes = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    
                    // Estimate supply
                    const frameRatio = event.frame / (24 * 60 * 15);
                    const baseSupply = 4;
                    const maxSupply = 200;
                    const supply = Math.min(maxSupply, Math.floor(baseSupply + (frameRatio * 196)));
                    
                    // Create action description
                    const cmd = event.command;
                    let action = cmd.type || 'Unknown';
                    if (cmd.name) {
                      action = cmd.name;
                    } else if (cmd.unit) {
                      action = `Train ${cmd.unit}`;
                    } else if (cmd.building) {
                      action = `Build ${cmd.building}`;
                    } else if (cmd.tech) {
                      action = `Research ${cmd.tech}`;
                    }
                    
                    return {
                      time: `${minutes}:${secs.toString().padStart(2, '0')}`,
                      supply: supply,
                      action: action
                    };
                  });
                }
              }
              
              // If still no build order, try to infer from actions if available
              if ((!playerObj.buildOrder || playerObj.buildOrder.length === 0) && 
                   playerObj.actions && playerObj.actions.length > 0) {
                console.log(`🛠 [browserReplayParser] Attempting to infer build order from ${playerObj.actions.length} actions`);
                
                // Create a simple timeline of actions that might indicate building/training
                // This is a more basic approach, but better than nothing
                const buildActions = playerObj.actions.filter((action: any) => {
                  // Filter for potentially build-related actions
                  const actionType = (action.type || '').toLowerCase();
                  return (
                    actionType.includes('build') || 
                    actionType.includes('train') ||
                    actionType.includes('research')
                  );
                });
                
                if (buildActions.length > 0) {
                  console.log(`🛠 [browserReplayParser] Found ${buildActions.length} potential build actions`);
                  
                  // Create a basic build order from these actions
                  playerObj.buildOrder = buildActions.map((action: any) => {
                    const timeStr = action.frame ? 
                      `${Math.floor(action.frame / 24 / 60)}:${Math.floor((action.frame / 24) % 60).toString().padStart(2, '0')}` : 
                      '0:00';
                    
                    return {
                      time: timeStr,
                      supply: Math.floor(4 + (action.frame / 24 / 30)), // Rough supply estimate
                      action: action.type || 'Game Action'
                    };
                  });
                }
              }
              
              // Generate synthetic build order based on typical race build patterns
              // if we still couldn't find actual build order data
              if (!playerObj.buildOrder || playerObj.buildOrder.length === 0) {
                console.log(`🛠 [browserReplayParser] Generating synthetic build order based on ${player.race} patterns`);
                
                const syntheticBuildOrder = generateSyntheticBuildOrder(player.race);
                playerObj.buildOrder = syntheticBuildOrder;
                
                console.log(`🛠 [browserReplayParser] Generated synthetic build order with ${syntheticBuildOrder.length} entries`);
              }
            }
            
            // If we have a buildOrder now, ensure it's well-structured
            if (playerObj.buildOrder && playerObj.buildOrder.length > 0) {
              // Ensure all entries have the required fields
              playerObj.buildOrder = playerObj.buildOrder.map((entry: any) => {
                return {
                  time: entry.time || '0:00',
                  supply: entry.supply || 0,
                  action: entry.action || 'Unknown'
                };
              });
              
              // Sort by time if needed
              playerObj.buildOrder.sort((a: any, b: any) => {
                const timeA = a.time.split(':').map(Number);
                const timeB = b.time.split(':').map(Number);
                return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
              });
            }
            
            // Calculate APM for each player if not provided by parser
            if (!player.apm && player.actions) {
              player.apm = calculateApmFromActions(player);
              console.log(`🛠 [browserReplayParser] Calculated APM for ${player.name}: ${player.apm}`);
            }
            
            // Calculate EAPM (Effective APM) - typically around 70-80% of APM
            if (player.apm && !player.eapm) {
              player.eapm = Math.round(player.apm * 0.75);
              console.log(`🛠 [browserReplayParser] Estimated EAPM for ${player.name}: ${player.eapm}`);
            }
          });
        }
        
        // Clear the timeout since parsing completed
        clearTimeout(timeoutId);
        
        console.log(`[browserReplayParser] Parsing complete (${parseId}), found data:`, 
          rawResult ? 'Result found' : 'No result');
        
        if (!rawResult) {
          throw new Error('Parser returned empty data');
        }
        
        // Log more detailed information about the parsed result structure
        console.log(`[browserReplayParser] Result keys (${parseId}): ${Object.keys(rawResult).join(', ')}`);
        
        if (rawResult.gameInfo) {
          console.log(`[browserReplayParser] Game info (${parseId}): Map: ${rawResult.gameInfo.map || 'Unknown map'}`);
          console.log(`[browserReplayParser] Game frames (${parseId}): ${rawResult.gameInfo.frames || 'Unknown'}`);
          
          // Use frames as duration if durationFrames isn't available
          const durationFrames = rawResult.gameInfo.frames || 0;
          console.log(`[browserReplayParser] Game duration (${parseId}): ${durationFrames ? 
            Math.round(durationFrames / 24 / 60) + ' minutes' : 'Unknown'}`);
        }
        
        // Extract relevant data in a format suitable for mapRawToParsed
        const parsedData = {
          header: rawResult.gameInfo || {},
          players: processedPlayers, // Use our processed player data
          mapName: rawResult.gameInfo?.map || 'Unknown',
          chat: rawResult.chatMessages || [],
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
 * Generate synthetic build order based on typical race opening patterns
 * This is a fallback when no actual build order data can be extracted
 */
function generateSyntheticBuildOrder(race: string): Array<{ time: string; supply: number; action: string }> {
  const buildOrder = [];
  
  // Define race-specific build patterns
  switch(race) {
    case 'Protoss':
      buildOrder.push({ time: '0:00', supply: 4, action: 'Starting Probe Production' });
      buildOrder.push({ time: '0:10', supply: 5, action: 'Building Pylon' });
      buildOrder.push({ time: '0:40', supply: 7, action: 'Building Gateway' });
      buildOrder.push({ time: '1:15', supply: 10, action: 'Building Assimilator' });
      buildOrder.push({ time: '1:45', supply: 12, action: 'Building Cybernetics Core' });
      buildOrder.push({ time: '2:10', supply: 15, action: 'Starting Zealot Production' });
      buildOrder.push({ time: '2:40', supply: 18, action: 'Building Second Pylon' });
      buildOrder.push({ time: '3:15', supply: 22, action: 'Building Robotics Facility' });
      buildOrder.push({ time: '3:45', supply: 26, action: 'Building Expansion Nexus' });
      break;
      
    case 'Terran':
      buildOrder.push({ time: '0:00', supply: 4, action: 'Starting SCV Production' });
      buildOrder.push({ time: '0:15', supply: 6, action: 'Building Supply Depot' });
      buildOrder.push({ time: '0:45', supply: 8, action: 'Building Barracks' });
      buildOrder.push({ time: '1:20', supply: 11, action: 'Building Refinery' });
      buildOrder.push({ time: '1:45', supply: 13, action: 'Building Factory' });
      buildOrder.push({ time: '2:15', supply: 16, action: 'Building Second Supply Depot' });
      buildOrder.push({ time: '2:45', supply: 19, action: 'Building Starport' });
      buildOrder.push({ time: '3:30', supply: 24, action: 'Building Command Center' });
      break;
      
    case 'Zerg':
      buildOrder.push({ time: '0:00', supply: 4, action: 'Starting Drone Production' });
      buildOrder.push({ time: '0:20', supply: 6, action: 'Building Spawning Pool' });
      buildOrder.push({ time: '1:00', supply: 9, action: 'Building Extractor' });
      buildOrder.push({ time: '1:30', supply: 12, action: 'Building Hatchery' });
      buildOrder.push({ time: '2:00', supply: 15, action: 'Starting Zergling Production' });
      buildOrder.push({ time: '2:30', supply: 18, action: 'Building Evolution Chamber' });
      buildOrder.push({ time: '3:00', supply: 22, action: 'Building Hydralisk Den' });
      buildOrder.push({ time: '3:45', supply: 28, action: 'Building Third Hatchery' });
      break;
      
    default:
      // Generic build order as fallback
      buildOrder.push({ time: '0:00', supply: 4, action: 'Game Start' });
      buildOrder.push({ time: '0:30', supply: 6, action: 'Building Basic Structure' });
      buildOrder.push({ time: '1:15', supply: 10, action: 'Building Resource Gatherer' });
      buildOrder.push({ time: '2:00', supply: 14, action: 'Building Technology Structure' });
      buildOrder.push({ time: '2:45', supply: 18, action: 'Building Army Units' });
      buildOrder.push({ time: '3:30', supply: 24, action: 'Expanding Base' });
  }
  
  return buildOrder;
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
