/**
 * Adapter für ScrepParseResult zu NewFinalReplayResult
 */

import { ScrepParseResult } from './types';
import { NewFinalReplayResult } from '@/services/nativeReplayParser/newScrepParser';

interface NewPlayerData {
  id: number;
  name: string;
  race: string;
  raceId: number;
  team: number;
  color: number;
  type: number;
  apm: number;
  eapm: number;
  buildOrder: any[];
}

export function adaptScrepResult(screpResult: ScrepParseResult): NewFinalReplayResult {
  // Convert players mit APM/EAPM aus computed data
  const players: NewPlayerData[] = screpResult.players.map((player, index) => ({
    id: player.id,
    name: player.name,
    race: player.race,
    raceId: player.raceId,
    team: player.team,
    color: player.color,
    type: player.type,
    apm: screpResult.computed.apm[index] || 0,
    eapm: screpResult.computed.eapm[index] || 0,
    buildOrder: screpResult.computed.buildOrders[index] || []
  }));

  // Build order analysis
  const buildOrderAnalysis = {
    primaryPlayer: players[0] ? {
      name: players[0].name,
      race: players[0].race,
      buildOrder: players[0].buildOrder,
      timings: extractTimings(players[0].buildOrder),
      strategy: analyzeStrategy(players[0].buildOrder, players[0].race)
    } : null,
    secondaryPlayer: players[1] ? {
      name: players[1].name,
      race: players[1].race,
      buildOrder: players[1].buildOrder,
      timings: extractTimings(players[1].buildOrder),
      strategy: analyzeStrategy(players[1].buildOrder, players[1].race)
    } : null
  };

  // Gameplay analysis
  const gameplayAnalysis = {
    duration: screpResult.header.duration,
    gameMinutes: Math.floor(screpResult.computed.gameDurationSeconds / 60),
    totalCommands: screpResult.parseStats.commandsParsed,
    averageAPM: Math.round(screpResult.computed.apm.reduce((a, b) => a + b, 0) / screpResult.computed.apm.length),
    averageEAPM: Math.round(screpResult.computed.eapm.reduce((a, b) => a + b, 0) / screpResult.computed.eapm.length),
    mapName: screpResult.header.mapName,
    matchup: getMatchup(players)
  };

  // Data quality assessment
  const dataQuality = {
    source: 'screp-core' as const,
    reliability: (screpResult.parseStats.headerParsed && screpResult.parseStats.playersFound >= 2 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
    commandsFound: screpResult.parseStats.commandsParsed,
    playersFound: screpResult.parseStats.playersFound,
    apmCalculated: true,
    eapmCalculated: true
  };

  return {
    header: {
      mapName: screpResult.header.mapName,
      duration: screpResult.header.duration,
      frames: screpResult.header.frames,
      gameType: screpResult.header.gameType.toString(),
      startTime: screpResult.header.startTime,
      version: screpResult.header.engine.toString(),
      engine: screpResult.header.engine.toString()
    },
    players: players.map(p => ({
      name: p.name,
      race: p.race,
      team: p.team,
      color: p.color,
      apm: p.apm,
      eapm: p.eapm,
      efficiency: p.eapm > 0 ? Math.round((p.eapm / p.apm) * 100) : 0
    })),
    buildOrderAnalysis: {},
    gameplayAnalysis: {},
    buildOrders: screpResult.computed.buildOrders,
    dataQuality
  };
}

function extractTimings(buildOrder: any[]): any[] {
  return buildOrder
    .filter(item => ['Build', 'Train', 'Tech', 'Upgrade'].some(action => item.action?.includes(action)))
    .map(item => ({
      time: item.timestamp,
      action: item.action,
      frame: item.frame
    }));
}

function analyzeStrategy(buildOrder: any[], race: string): string {
  if (buildOrder.length < 3) return 'Unknown Strategy';
  
  const actions = buildOrder.map(item => item.action).join(' ');
  
  // Basic strategy detection based on race and early actions
  if (race === 'Terran') {
    if (actions.includes('Marine') && actions.includes('Barracks')) return 'Marine Rush';
    if (actions.includes('Factory') && actions.includes('Vulture')) return 'Vulture Harass';
    if (actions.includes('Siege Tank')) return 'Tank Push';
    return 'Standard Terran';
  } else if (race === 'Protoss') {
    if (actions.includes('Zealot') && actions.includes('Gateway')) return 'Zealot Rush';
    if (actions.includes('Dragoon') && actions.includes('Cybernetics Core')) return 'Dragoon Build';
    if (actions.includes('Stargate')) return 'Air Build';
    return 'Standard Protoss';
  } else if (race === 'Zerg') {
    if (actions.includes('Zergling') && actions.includes('Spawning Pool')) return 'Zergling Rush';
    if (actions.includes('Hydralisk')) return 'Hydra Build';
    if (actions.includes('Mutalisk')) return 'Muta Build';
    return 'Standard Zerg';
  }
  
  return 'Unknown Strategy';
}

function getMatchup(players: NewPlayerData[]): string {
  if (players.length < 2) return 'Unknown';
  
  const race1 = players[0].race.charAt(0);
  const race2 = players[1].race.charAt(0);
  
  return `${race1}v${race2}`;
}