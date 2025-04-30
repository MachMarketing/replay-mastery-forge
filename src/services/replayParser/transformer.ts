
import { ParsedReplayData } from './types';
import { determineResult, extractBuildOrder, extractResourceGraph, mapRace } from './utils';

/**
 * Transform raw SCREP data into our application's format
 */
export function transformScrepData(screpData: any): ParsedReplayData {
  // Extract player information
  const players = screpData.header.players;
  const playerInfo = players[0];
  const opponentInfo = players.length > 1 ? players[1] : { name: 'Unknown', race: 'Unknown' };
  
  // Calculate game duration
  const ms = screpData.header.durationMS;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate APM
  const totalActions = screpData.computedStats?.actionCount || 0;
  const gameMinutes = ms / 60000;
  const apm = Math.round(totalActions / gameMinutes);
  
  // Determine matchup
  const playerRace = mapRace(playerInfo.race);
  const opponentRace = mapRace(opponentInfo.race);
  const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  
  // Extract build order
  const buildOrder = extractBuildOrder(screpData.commands || []);
  
  // Extract resources graph
  const resourcesGraph = extractResourceGraph(screpData.mapData?.resourceUnits || []);
  
  // Return the structured replay data
  return {
    playerName: playerInfo.name,
    opponentName: opponentInfo.name,
    playerRace,
    opponentRace,
    map: screpData.header.mapName || 'Unknown Map',
    duration,
    date: new Date(screpData.header.gameStartDate).toISOString().split('T')[0],
    result: determineResult(screpData, playerInfo.id),
    apm,
    eapm: Math.floor(apm * 0.85), // Estimated EAPM
    matchup,
    buildOrder,
    resourcesGraph
  };
}
