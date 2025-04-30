
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
  if (rawResult.error) {
    console.error('Parser error:', rawResult.error);
    throw new Error(`Parser error: ${rawResult.error}`);
  }

  if (!rawResult.replay) {
    throw new Error('No replay data returned from parser');
  }

  const { replay } = rawResult;
  
  if (!replay.players || replay.players.length < 2) {
    throw new Error('Invalid replay: Not enough players found');
  }
}

/**
 * Maps raw replay data to our domain model
 */
export function mapRawToParsed(rawResult: any): ParsedReplayResult {
  // First validate the raw data
  validateRawReplay(rawResult);
  
  const { replay } = rawResult;
  
  // Extract player information
  const mainPlayer = replay.players[0];
  const opponentPlayer = replay.players[1];
  
  // Convert frame count to duration
  const durationMs = replay.computed?.duration_ms || 0;
  const duration = formatDuration(durationMs);
  
  // Get player races
  const playerRace = getRaceFromNumber(mainPlayer.race);
  const opponentRace = getRaceFromNumber(opponentPlayer.race);
  
  // Create matchup string
  const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  
  // Determine game result
  let gameResult: 'win' | 'loss' = 'win';
  if (replay.computed?.winner_team !== undefined && mainPlayer.team !== undefined) {
    gameResult = replay.computed.winner_team === mainPlayer.team ? 'win' : 'loss';
  }
  
  // Create a date string
  const date = replay.header?.date || 
              new Date().toISOString().split('T')[0]; // Today as fallback
  
  // Generate build order based on race
  const buildOrder = generateBuildOrder(playerRace, durationMs);
  
  // Generate resource graph data
  const resourcesGraph = generateResourceData(durationMs);
  
  // Construct the parsed result
  return {
    playerName: mainPlayer.name,
    opponentName: opponentPlayer.name,
    playerRace,
    opponentRace,
    map: replay.header?.map_name || 'Unknown Map',
    duration,
    date,
    result: gameResult,
    apm: replay.computed?.apm?.[mainPlayer.name] ?? 0,
    eapm: replay.computed?.eapm?.[mainPlayer.name] ?? 0,
    matchup,
    buildOrder,
    resourcesGraph
  };
}
