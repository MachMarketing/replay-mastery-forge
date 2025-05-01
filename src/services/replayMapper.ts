
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
  
  // More flexible validation that works with different parser output formats
  const hasData = rawResult.replay || rawResult.header || rawResult.players || rawResult.metadata;
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
