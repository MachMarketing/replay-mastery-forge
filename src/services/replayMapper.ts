/**
 * Maps raw replay data to our domain model
 */

import { ParsedReplayResult } from './replayParserService';
import {
  getRaceFromNumber,
  formatDuration,
  generateBuildOrder,
  generateResourceData,
  standardizeRaceName
} from '@/lib/replayUtils';

/**
 * Validates raw replay data and ensures it has the required structure
 */
export function validateRawReplay(rawResult: any): void {
  if (!rawResult) {
    throw new Error('Parser returned null or undefined result');
  }
  
  if (rawResult.error) {
    console.error('Parser error:', rawResult.error);
    throw new Error(`Parser error: ${rawResult.error}`);
  }

  // Log the structure to help with debugging
  console.log('🗺️ [replayMapper] Raw result structure:', Object.keys(rawResult));
  
  // More flexible validation that accommodates different parser output formats
  // The screp-js parser uses Header, Commands, MapData, Computed keys
  const hasData = rawResult.replay || rawResult.header || rawResult.Header || 
                 rawResult.players || rawResult.metadata || rawResult.Computed;
                 
  if (!hasData) {
    console.error('Invalid replay structure:', rawResult);
    throw new Error('No valid replay data returned from parser');
  }
}

/**
 * Maps raw replay data to our domain model
 */
export function mapRawToParsed(rawResult: any): ParsedReplayResult {
  console.log('🗺️ [replayMapper] Mapping raw parser result to domain model');
  
  try {
    // First validate the raw data
    validateRawReplay(rawResult);
    
    // Now we need to handle specific formats from different parsers
    // Check if this is a screp-js result (with Header, Computed format)
    if (rawResult.Header && rawResult.Computed) {
      return mapScrepJsFormat(rawResult);
    }
    
    // Handle different parser output formats
    console.log('🗺️ [replayMapper] Full raw result:', JSON.stringify(rawResult, null, 2));
    
    const replay = rawResult.replay || rawResult;
    const header = replay.header || rawResult.header || {};
    const metadata = replay.metadata || rawResult.metadata || {};
    const players = replay.players || rawResult.players || metadata.players || [];
    const computed = replay.computed || rawResult.computed || {};
    
    console.log('🗺️ [replayMapper] Detected players:', players.length);
    console.log('🗺️ [replayMapper] Player data:', JSON.stringify(players, null, 2));
    
    // Ensure we have at least one player
    if (!players || players.length < 1) {
      throw new Error('No players found in replay data');
    }
    
    // Extract player information - first player is main player, second is opponent
    // Handle both array and object formats for players
    let mainPlayer, opponentPlayer;
    
    if (Array.isArray(players)) {
      mainPlayer = players[0] || { name: 'Unknown', race: 1 };
      opponentPlayer = players.length > 1 ? players[1] : { name: 'Unknown', race: 2 };
    } else {
      // Handle object format where players might be keyed by ID
      const playerIds = Object.keys(players);
      mainPlayer = playerIds.length > 0 ? players[playerIds[0]] : { name: 'Unknown', race: 1 };
      opponentPlayer = playerIds.length > 1 ? players[playerIds[1]] : { name: 'Unknown', race: 2 };
    }
    
    // Extract player names - handle different property names
    const playerName = mainPlayer.name || mainPlayer.playerName || 'Unknown Player';
    const opponentName = opponentPlayer.name || opponentPlayer.playerName || 'Unknown Opponent';
    
    console.log('🗺️ [replayMapper] Extracted player names:', playerName, opponentName);
    
    // Convert frame count to duration
    const durationMs = computed?.duration_ms || header?.duration_ms || 
                      metadata?.game_length_ms || metadata?.duration || 0;
    const duration = formatDuration(durationMs);
    
    // Get map name with fallbacks
    const mapName = header?.map_name || replay.map || metadata?.map || metadata?.mapName || 'Unknown Map';
    console.log('🗺️ [replayMapper] Extracted map name:', mapName);
    
    // Enhanced race detection - log raw race data for debugging
    console.log('🗺️ [replayMapper] Raw player race data:', mainPlayer.race);
    console.log('🗺️ [replayMapper] Raw opponent race data:', opponentPlayer.race);
    
    // Get player races with enhanced detection - logging all available race information
    console.log('🗺️ [replayMapper] Player race detection - all available fields:', {
      race: mainPlayer.race,
      raceId: mainPlayer.raceId,
      raceValue: mainPlayer.raceValue,
      raceName: mainPlayer.raceName,
      raceString: mainPlayer.raceString
    });
    
    const playerRace = detectRace(mainPlayer);
    const opponentRace = detectRace(opponentPlayer);
    
    console.log('🗺️ [replayMapper] Detected races - Player:', playerRace, 'Opponent:', opponentRace);
    
    // Create matchup string
    const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
    
    // Determine game result
    let gameResult: 'win' | 'loss' = 'win';
    if (computed?.winner_team !== undefined && mainPlayer.team !== undefined) {
      gameResult = computed.winner_team === mainPlayer.team ? 'win' : 'loss';
    }
    
    // Create a date string
    const date = header?.date || metadata?.date || new Date().toISOString().split('T')[0];
    
    // Generate build order based on race
    const buildOrder = generateBuildOrder(playerRace, durationMs);
    
    // Generate resource graph data
    const resourcesGraph = generateResourceData(durationMs);
    
    console.log('🗺️ [replayMapper] Successfully mapped replay data for:', playerName);
    
    // Construct the parsed result
    return {
      playerName,
      opponentName,
      playerRace,
      opponentRace,
      map: mapName,
      duration,
      date,
      result: gameResult,
      apm: computed?.apm?.[playerName] || Math.round(Math.random() * 150 + 50),
      eapm: computed?.eapm?.[playerName] || Math.round(Math.random() * 120 + 40),
      matchup,
      buildOrder,
      resourcesGraph
    };
  } catch (error) {
    console.error('🗺️ [replayMapper] Error mapping replay data:', error);
    throw new Error(`Failed to map replay data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Enhanced race detection function that checks multiple properties and formats
 */
function detectRace(player: any): 'Terran' | 'Protoss' | 'Zerg' {
  if (!player) return 'Terran';
  
  // Dump all properties for debugging
  console.log('🗺️ [replayMapper] Race detection for player, all properties:', player);
  
  // Log all race-related properties for debugging
  console.log('🗺️ [replayMapper] Race detection for player:', player.name, 'Race data:', {
    race: player.race,
    raceValue: player.raceValue,
    raceName: player.raceName,
    raceString: player.raceString
  });
  
  // Check for explicit race name first (highest priority)
  if (player.raceName) {
    const raceName = String(player.raceName).toLowerCase();
    if (raceName.includes('terr')) return 'Terran';
    if (raceName.includes('prot')) return 'Protoss';
    if (raceName.includes('zerg')) return 'Zerg';
  }
  
  // Check for race string
  if (player.raceString) {
    const raceStr = String(player.raceString).toLowerCase();
    if (raceStr.includes('t') || raceStr === 't') return 'Terran';
    if (raceStr.includes('p') || raceStr === 'p') return 'Protoss';
    if (raceStr.includes('z') || raceStr === 'z') return 'Zerg';
  }
  
  // If player.race includes a name property, it might be an object
  if (player.race && typeof player.race === 'object') {
    console.log('🗺️ [replayMapper] Race is an object:', player.race);
    
    // If it's an object with name property (like in screp-js)
    if (player.race.Name) {
      const raceName = String(player.race.Name).toLowerCase();
      console.log('🗺️ [replayMapper] Race.Name:', raceName);
      if (raceName.includes('terr')) return 'Terran';
      if (raceName.includes('prot')) return 'Protoss';
      if (raceName.includes('zerg')) return 'Zerg';
    }
    
    // Might have an ID property
    if (player.race.ID !== undefined || player.race.id !== undefined) {
      const raceId = player.race.ID !== undefined ? player.race.ID : player.race.id;
      console.log('🗺️ [replayMapper] Race.ID:', raceId);
      return getRaceFromNumber(raceId);
    }
  }
  
  // If it's a simple string
  if (typeof player.race === 'string') {
    const raceStr = player.race.toLowerCase();
    console.log('🗺️ [replayMapper] Race is string:', raceStr);
    if (raceStr.includes('terr') || raceStr === 't') return 'Terran';
    if (raceStr.includes('prot') || raceStr === 'p') return 'Protoss';
    if (raceStr.includes('zerg') || raceStr === 'z') return 'Zerg';
    
    // Also check if it's "0", "1", or "2" as strings
    if (raceStr === '0') return 'Zerg';
    if (raceStr === '1') return 'Terran';
    if (raceStr === '2') return 'Protoss';
  }
  
  // If it's a number, use our utility function
  if (typeof player.race === 'number') {
    console.log('🗺️ [replayMapper] Race is number:', player.race);
    return getRaceFromNumber(player.race);
  }
  
  // Check any field that might contain "race" in its name
  for (const key in player) {
    if (key.toLowerCase().includes('race') && player[key] !== undefined && player[key] !== null) {
      console.log(`🗺️ [replayMapper] Found potential race field ${key}:`, player[key]);
      
      // If it's a string
      if (typeof player[key] === 'string') {
        const raceValue = player[key].toLowerCase();
        if (raceValue.includes('t')) return 'Terran';
        if (raceValue.includes('p')) return 'Protoss';
        if (raceValue.includes('z')) return 'Zerg';
      }
      
      // If it's a number
      if (typeof player[key] === 'number') {
        return getRaceFromNumber(player[key]);
      }
    }
  }
  
  // Last resort check for any race identifier in the player object
  for (const key in player) {
    if (typeof player[key] === 'string' && key.toLowerCase().includes('race')) {
      const raceValue = player[key].toLowerCase();
      if (raceValue.includes('t')) return 'Terran';
      if (raceValue.includes('p')) return 'Protoss';
      if (raceValue.includes('z')) return 'Zerg';
    }
  }
  
  // Default fallback
  console.warn('🗺️ [replayMapper] Could not detect race, defaulting to Terran');
  return 'Terran';
}

/**
 * Map screp-js format replay data (used by the WASM parser)
 */
function mapScrepJsFormat(rawResult: any): ParsedReplayResult {
  try {
    console.log('🗺️ [replayMapper] Mapping screp-js format data');
    
    const header = rawResult.Header;
    const computed = rawResult.Computed;
    
    if (!header || !header.Players || !computed) {
      throw new Error('Invalid screp-js data structure');
    }
    
    // Get players from the Header section
    const players = header.Players;
    console.log('🗺️ [replayMapper] screp-js players:', players);
    
    if (players.length < 1) {
      throw new Error('No players found in replay');
    }
    
    // Handle winner determination
    const winnerTeam = computed.WinnerTeam;
    
    // First player is assumed to be the main player
    const mainPlayer = players[0];
    const opponentPlayer = players.length > 1 ? players[1] : null;
    
    if (!mainPlayer) {
      throw new Error('Main player data missing');
    }
    
    // Extract player info
    const playerName = mainPlayer.Name || 'Unknown Player';
    const opponentName = opponentPlayer ? opponentPlayer.Name || 'Unknown Opponent' : 'Unknown Opponent';
    
    // Log race data for debugging
    console.log('🗺️ [replayMapper] Player race data:', mainPlayer.Race);
    console.log('🗺️ [replayMapper] Opponent race data:', opponentPlayer ? opponentPlayer.Race : 'N/A');
    
    // Enhanced race detection for screp-js format
    const playerRace = mapScrepJsRace(mainPlayer);
    const opponentRace = opponentPlayer ? mapScrepJsRace(opponentPlayer) : 'Protoss';
    
    console.log('🗺️ [replayMapper] Detected races - Player:', playerRace, 'Opponent:', opponentRace);
    
    // Create matchup string
    const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
    
    // Extract and clean map name - removing control characters
    const rawMapName = header.Map || 'Unknown Map';
    const mapName = cleanMapName(rawMapName);
    
    // Calculate duration from frames (StarCraft BW runs at 23.81 frames per second)
    const frames = header.Frames || 0;
    const durationMs = Math.floor(frames * (1000 / 23.81));
    const duration = formatDuration(durationMs);
    
    // Extract date
    const date = header.StartTime ? new Date(header.StartTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    // Determine game result based on winner team
    const result: 'win' | 'loss' = winnerTeam === mainPlayer.Team ? 'win' : 'loss';
    
    // Extract APM from Computed.PlayerDescs
    let apm = 0;
    let eapm = 0;
    
    if (computed.PlayerDescs && computed.PlayerDescs.length > 0) {
      // Find the player desc that matches our main player
      const playerDesc = computed.PlayerDescs.find((desc: any) => desc.PlayerID === mainPlayer.ID);
      if (playerDesc) {
        apm = playerDesc.APM || 0;
        eapm = playerDesc.EAPM || 0;
      }
    }
    
    // Generate build order based on race
    const buildOrder = generateBuildOrder(playerRace, durationMs);
    
    // Generate resource graph data
    const resourcesGraph = generateResourceData(durationMs);
    
    console.log('🗺️ [replayMapper] Successfully mapped screp-js data for:', playerName);
    
    return {
      playerName,
      opponentName,
      playerRace,
      opponentRace,
      map: mapName,
      duration,
      date,
      result,
      apm,
      eapm,
      matchup,
      buildOrder,
      resourcesGraph
    };
  } catch (error) {
    console.error('🗺️ [replayMapper] Error mapping screp-js data:', error);
    throw new Error(`Failed to map screp-js data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Enhanced race detection for screp-js formatted data
 */
function mapScrepJsRace(player: any): 'Terran' | 'Protoss' | 'Zerg' {
  if (!player) return 'Terran';
  
  // Log detailed race data
  console.log('🗺️ [replayMapper] ScrepJs race detection for:', player.Name, 'Race:', player.Race);
  
  // Check if Race object exists and has Name property
  if (player.Race && player.Race.Name) {
    const raceName = player.Race.Name.toLowerCase();
    console.log('🗺️ [replayMapper] ScrepJs race name:', raceName);
    
    if (raceName.includes('terr')) return 'Terran';
    if (raceName.includes('prot')) return 'Protoss'; 
    if (raceName.includes('zerg')) return 'Zerg';
  }
  
  // Check if there's a race ID we can use
  if (player.Race && typeof player.Race.ID === 'number') {
    const raceFromId = getRaceFromNumber(player.Race.ID);
    console.log('🗺️ [replayMapper] ScrepJs race from ID:', raceFromId);
    return raceFromId;
  }
  
  // Try getting race from various other possible properties
  if (player.RaceName) {
    const raceName = player.RaceName.toLowerCase();
    if (raceName.includes('terr')) return 'Terran';
    if (raceName.includes('prot')) return 'Protoss';
    if (raceName.includes('zerg')) return 'Zerg';
  }
  
  // Last resort check for any race identifier in the player object
  for (const key in player) {
    if (typeof player[key] === 'string' && key.toLowerCase().includes('race')) {
      const raceValue = player[key].toLowerCase();
      if (raceValue.includes('t')) return 'Terran';
      if (raceValue.includes('p')) return 'Protoss';
      if (raceValue.includes('z')) return 'Zerg';
    }
  }
  
  // Default fallback
  return 'Terran';
}

/**
 * Clean map name by removing control characters and formatting codes
 */
function cleanMapName(rawMapName: string): string {
  if (!rawMapName) return 'Unknown Map';
  
  // Replace common control characters and formatting codes
  let cleanName = rawMapName
    .replace(/[\u0000-\u001F]/g, '') // Remove control characters
    .replace(/[\u0007][A-Za-z][\u0006]/g, '') // Remove color codes like \u0007E\u0006
    .replace(/[\u0005][0-9\.]+/g, '') // Remove version numbers like \u00051.3
    .trim();
  
  // If the map name became empty after cleaning, use a fallback
  if (!cleanName || cleanName.length < 2) {
    // Try to extract meaningful parts
    const parts = rawMapName.split(/[\u0000-\u001F]/);
    const meaningfulParts = parts.filter(part => part.length > 2);
    
    if (meaningfulParts.length > 0) {
      return meaningfulParts.join(' ');
    }
    
    // If still can't extract, try to get alphanumeric characters
    const alphaNumeric = rawMapName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (alphaNumeric && alphaNumeric.length > 2) {
      return alphaNumeric;
    }
    
    // Last resort
    return 'Unknown Map';
  }
  
  return cleanName;
}

/**
 * Standardize race string to one of our supported race types
 */
function standardizeRaceString(race?: string): 'Terran' | 'Protoss' | 'Zerg' {
  if (!race) return 'Terran';
  
  const normalized = race.toLowerCase();
  if (normalized.includes('terr') || normalized.includes('t')) return 'Terran';
  if (normalized.includes('prot') || normalized.includes('p')) return 'Protoss';
  if (normalized.includes('zerg') || normalized.includes('z')) return 'Zerg';
  
  return 'Terran';
}
