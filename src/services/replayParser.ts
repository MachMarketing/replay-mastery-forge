
import { ParsedReplayData } from './replayParser/types';
import { ScrepParser } from './nativeReplayParser/screpParser';

export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Using ONLY screp-js parser');
  console.log('[replayParser] File details:', {
    name: file.name,
    size: file.size,
    type: file.type
  });
  
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }
  
  // Use ONLY screp-js - no fallbacks
  try {
    console.log('[replayParser] Parsing with screp-js...');
    const screpData = await ScrepParser.parseReplay(file);
    console.log('[replayParser] screp-js parsing successful:', screpData);
    
    // Convert directly to ParsedReplayData format
    const result = convertScrepToParseFormat(screpData);
    console.log('[replayParser] Final result:', result);
    return result;
    
  } catch (error) {
    console.error('[replayParser] screp-js parsing failed:', error);
    throw new Error(`screp-js Parsing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}

function convertScrepToParseFormat(screpData: any): ParsedReplayData {
  console.log('[convertScrepToParseFormat] Converting screp data directly');
  
  if (!screpData.players || screpData.players.length < 2) {
    throw new Error('Nicht genügend Spieler gefunden');
  }
  
  const player1 = screpData.players[0];
  const player2 = screpData.players[1];
  
  // Use real APM data from screp-js
  const player1Apm = screpData.computed.apm[0] || 0;
  const player2Apm = screpData.computed.apm[1] || 0;
  const player1Eapm = screpData.computed.eapm[0] || 0;
  const player2Eapm = screpData.computed.eapm[1] || 0;
  
  console.log('[convertScrepToParseFormat] Players:', player1.name, player2.name);
  console.log('[convertScrepToParseFormat] APM:', player1Apm, player2Apm);
  
  // Convert build orders
  const player1BuildOrder = screpData.computed.buildOrders[0]?.map((action: any) => ({
    time: action.timestamp,
    action: action.action,
    supply: action.supply || 0
  })) || [];
  
  const player2BuildOrder = screpData.computed.buildOrders[1]?.map((action: any) => ({
    time: action.timestamp,
    action: action.action,
    supply: action.supply || 0
  })) || [];
  
  return {
    primaryPlayer: {
      name: player1.name,
      race: player1.race,
      apm: player1Apm,
      eapm: player1Eapm,
      buildOrder: player1BuildOrder,
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    secondaryPlayer: {
      name: player2.name,
      race: player2.race,
      apm: player2Apm,
      eapm: player2Eapm,
      buildOrder: player2BuildOrder,
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    map: screpData.header.mapName,
    matchup: `${player1.race.charAt(0)}v${player2.race.charAt(0)}`,
    duration: screpData.header.duration,
    durationMS: screpData.header.durationMs,
    date: screpData.header.startTime.toISOString().split('T')[0],
    result: 'unknown' as const,
    strengths: [],
    weaknesses: [],
    recommendations: [],
    playerName: player1.name,
    opponentName: player2.name,
    playerRace: player1.race,
    opponentRace: player2.race,
    apm: player1Apm,
    eapm: player1Eapm,
    opponentApm: player2Apm,
    opponentEapm: player2Eapm,
    buildOrder: player1BuildOrder,
    trainingPlan: []
  };
}
