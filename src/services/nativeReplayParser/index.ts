
/**
 * Simplified parser - ONLY screp-js
 */

import { ParsedReplayData } from '../replayParser/types';
import { ScrepParser } from './screpParser';

export async function parseReplayNative(file: File): Promise<ParsedReplayData> {
  console.log('[parseReplayNative] Using ONLY screp-js parser');
  
  // Use only screp-js
  const screpData = await ScrepParser.parseReplay(file);
  
  // Convert to legacy format
  const result: ParsedReplayData = {
    primaryPlayer: {
      name: screpData.players[0].name,
      race: screpData.players[0].race,
      apm: screpData.computed.apm[0] || 0,
      eapm: screpData.computed.eapm[0] || 0,
      buildOrder: screpData.computed.buildOrders[0] || [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    secondaryPlayer: {
      name: screpData.players[1].name,
      race: screpData.players[1].race,
      apm: screpData.computed.apm[1] || 0,
      eapm: screpData.computed.eapm[1] || 0,
      buildOrder: screpData.computed.buildOrders[1] || [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    map: screpData.header.mapName,
    matchup: screpData.computed.matchup,
    duration: screpData.header.duration,
    durationMS: screpData.header.durationMs,
    date: screpData.header.startTime.toISOString().split('T')[0],
    result: 'unknown' as const,
    strengths: [],
    weaknesses: [],
    recommendations: [],
    playerName: screpData.players[0].name,
    opponentName: screpData.players[1].name,
    playerRace: screpData.players[0].race,
    opponentRace: screpData.players[1].race,
    apm: screpData.computed.apm[0] || 0,
    eapm: screpData.computed.eapm[0] || 0,
    opponentApm: screpData.computed.apm[1] || 0,
    opponentEapm: screpData.computed.eapm[1] || 0,
    buildOrder: screpData.computed.buildOrders[0] || [],
    trainingPlan: []
  };
  
  console.log('[parseReplayNative] Final result with screp-js data:', {
    players: `${result.playerName} vs ${result.opponentName}`,
    map: result.map,
    apm: `${result.apm} vs ${result.opponentApm}`
  });
  
  return result;
}

// Re-export types
export * from './types';
