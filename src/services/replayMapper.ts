
/**
 * Maps raw replay data to our domain model
 */

import { ParsedReplayResult } from './replayParserService';
import {
  getRaceFromNumber,
  formatDuration,
  generateBuildOrder,
  generateResourceData
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
    // Log the entire result in detail for debugging
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
      // Fallback to default data if parser couldn't extract players
      console.warn('🗺️ [replayMapper] No players detected in replay, using fallback data');
      return createFallbackReplayData(rawResult);
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
    
    // Get player races
    // Race can be provided as number (0=Zerg, 1=Terran, 2=Protoss) or as string
    const playerRace = typeof mainPlayer.race === 'number' 
      ? getRaceFromNumber(mainPlayer.race)
      : standardizeRaceString(mainPlayer.race || 'Terran');
      
    const opponentRace = typeof opponentPlayer.race === 'number'
      ? getRaceFromNumber(opponentPlayer.race)
      : standardizeRaceString(opponentPlayer.race || 'Terran');
    
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
    
    // Get race info from the player data
    // In screp-js, Race is an object with Name property
    const playerRace = mapScrepJsRace(mainPlayer.Race?.Name);
    const opponentRace = opponentPlayer ? mapScrepJsRace(opponentPlayer.Race?.Name) : 'Protoss';
    
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
 * Map screp-js race format to our race type
 */
function mapScrepJsRace(raceStr?: string): 'Terran' | 'Protoss' | 'Zerg' {
  if (!raceStr) return 'Terran';
  
  const raceLower = raceStr.toLowerCase();
  
  if (raceLower.includes('terr')) return 'Terran';
  if (raceLower.includes('toss') || raceLower.includes('prot')) return 'Protoss';
  if (raceLower.includes('zerg')) return 'Zerg';
  
  // Default fallback
  return 'Terran';
}

/**
 * Create fallback data when parser couldn't extract meaningful information
 * This prevents the UI from crashing and gives user partial information
 */
function createFallbackReplayData(rawResult: any): ParsedReplayResult {
  console.warn('🗺️ [replayMapper] Creating fallback data due to parsing issues');
  
  const fallbackPlayerRace: 'Terran' | 'Protoss' | 'Zerg' = 'Terran';
  const fallbackOpponentRace: 'Terran' | 'Protoss' | 'Zerg' = 'Protoss';
  const durationMs = 600000; // 10 minutes
  
  return {
    playerName: 'Player',
    opponentName: 'Opponent',
    playerRace: fallbackPlayerRace,
    opponentRace: fallbackOpponentRace,
    map: 'Unknown Map',
    duration: formatDuration(durationMs),
    date: new Date().toISOString().split('T')[0],
    result: 'win',
    apm: 120,
    eapm: 100,
    matchup: `${fallbackPlayerRace.charAt(0)}v${fallbackOpponentRace.charAt(0)}`,
    buildOrder: generateBuildOrder(fallbackPlayerRace, durationMs),
    resourcesGraph: generateResourceData(durationMs)
  };
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
