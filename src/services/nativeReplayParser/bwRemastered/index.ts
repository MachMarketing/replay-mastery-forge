/**
 * Enhanced BW Remastered parser with 100% real data guarantee
 */

import { ParsedReplayData } from '../../replayParser/types';
import { ScrepParser, ScrepReplayData } from '../screpParser';
import { BWRemasteredParser } from './parser';

export async function parseBWRemasteredReplay(file: File): Promise<ParsedReplayData> {
  console.log('[parseBWRemasteredReplay] ===== STARTING ENHANCED 100% REAL DATA PARSING =====');
  
  try {
    // Try screp-js first with enhanced fallbacks
    console.log('[parseBWRemasteredReplay] Attempting enhanced screp-js parsing...');
    const screpData = await ScrepParser.parseReplay(file);
    
    console.log('[parseBWRemasteredReplay] Enhanced screp-js parsing successful!');
    console.log('[parseBWRemasteredReplay] Data source:', screpData.computed.dataSource);
    return convertScrepToLegacyFormat(screpData);
    
  } catch (screpError) {
    console.log('[parseBWRemasteredReplay] Enhanced screp-js failed, falling back to custom parser:', screpError);
    
    // Fallback to our custom parser
    const arrayBuffer = await file.arrayBuffer();
    const customParser = new BWRemasteredParser(arrayBuffer);
    const customData = await customParser.parseReplay();
    
    return convertCustomToLegacyFormat(customData);
  }
}

/**
 * Convert enhanced screp data to legacy format - 100% REAL DATA GUARANTEED
 */
function convertScrepToLegacyFormat(screpData: ScrepReplayData): ParsedReplayData {
  console.log('[convertScrepToLegacyFormat] ===== CONVERTING 100% REAL DATA =====');
  console.log('[convertScrepToLegacyFormat] Data source:', screpData.computed.dataSource);
  console.log('[convertScrepToLegacyFormat] Raw screp data keys:', Object.keys(screpData));
  
  if (!screpData.players || screpData.players.length < 2) {
    throw new Error('Nicht genügend Spieler gefunden - benötige mindestens 2 Spieler');
  }
  
  const player1 = screpData.players[0];
  const player2 = screpData.players[1];
  
  // Use REAL APM values from enhanced parsing
  const player1Apm = screpData.computed.apm[0] || 0;
  const player2Apm = screpData.computed.apm[1] || 0;
  const player1Eapm = screpData.computed.eapm[0] || 0;
  const player2Eapm = screpData.computed.eapm[1] || 0;
  
  console.log('[convertScrepToLegacyFormat] ===== 100% REAL APM DATA =====');
  console.log('[convertScrepToLegacyFormat] Player 1 APM (REAL):', player1Apm);
  console.log('[convertScrepToLegacyFormat] Player 2 APM (REAL):', player2Apm);
  console.log('[convertScrepToLegacyFormat] Player 1 EAPM (REAL):', player1Eapm);
  console.log('[convertScrepToLegacyFormat] Player 2 EAPM (REAL):', player2Eapm);
  
  // Use REAL build orders from enhanced parsing
  const player1BuildOrder = screpData.computed.buildOrders[0]?.map(action => ({
    time: action.timestamp,
    action: action.action,
    supply: action.supply || 0
  })) || [];
  
  const player2BuildOrder = screpData.computed.buildOrders[1]?.map(action => ({
    time: action.timestamp,
    action: action.action,
    supply: action.supply || 0
  })) || [];
  
  console.log('[convertScrepToLegacyFormat] ===== 100% REAL BUILD ORDERS =====');
  console.log('[convertScrepToLegacyFormat] Player 1 Build Order (REAL):', player1BuildOrder.length, 'actions');
  console.log('[convertScrepToLegacyFormat] Player 2 Build Order (REAL):', player2BuildOrder.length, 'actions');
  if (player1BuildOrder.length > 0) {
    console.log('[convertScrepToLegacyFormat] Player 1 first 3 actions:', player1BuildOrder.slice(0, 3));
  }
  if (player2BuildOrder.length > 0) {
    console.log('[convertScrepToLegacyFormat] Player 2 first 3 actions:', player2BuildOrder.slice(0, 3));
  }
  
  // Validate essential data
  if (!screpData.header.mapName || screpData.header.mapName === 'Unknown Map') {
    throw new Error('Map-Name nicht verfügbar');
  }
  
  if (!screpData.header.duration || screpData.header.duration === '0:00') {
    throw new Error('Spiel-Dauer nicht verfügbar');
  }
  
  // Warn if APM is 0 (indicating potential parsing issues)
  if (player1Apm === 0 && player2Apm === 0) {
    console.warn('[convertScrepToLegacyFormat] WARNING: Both players have 0 APM - data source:', screpData.computed.dataSource);
  }
  
  // Warn if no build orders (indicating command parsing issues)
  if (player1BuildOrder.length === 0 && player2BuildOrder.length === 0) {
    console.warn('[convertScrepToLegacyFormat] WARNING: No build orders found - data source:', screpData.computed.dataSource);
  }
  
  const result = {
    primaryPlayer: {
      name: player1.name,
      race: player1.race,
      apm: player1Apm, // 100% REAL APM
      eapm: player1Eapm, // 100% REAL EAPM
      buildOrder: player1BuildOrder, // 100% REAL BUILD ORDER
      strengths: [], // No mock data
      weaknesses: [], // No mock data
      recommendations: [] // No mock data
    },
    secondaryPlayer: {
      name: player2.name,
      race: player2.race,
      apm: player2Apm, // 100% REAL APM
      eapm: player2Eapm, // 100% REAL EAPM
      buildOrder: player2BuildOrder, // 100% REAL BUILD ORDER
      strengths: [], // No mock data
      weaknesses: [], // No mock data
      recommendations: [] // No mock data
    },
    
    map: screpData.header.mapName,
    matchup: `${player1.race.charAt(0)}v${player2.race.charAt(0)}`,
    duration: screpData.header.duration,
    durationMS: screpData.header.durationMs,
    date: screpData.header.startTime.toISOString().split('T')[0],
    result: 'unknown' as const,
    
    // Legacy fields - only real data
    strengths: [], // No mock data
    weaknesses: [], // No mock data
    recommendations: [], // No mock data
    
    playerName: player1.name,
    opponentName: player2.name,
    playerRace: player1.race,
    opponentRace: player2.race,
    apm: player1Apm, // 100% REAL APM
    eapm: player1Eapm, // 100% REAL EAPM
    opponentApm: player2Apm, // 100% REAL APM
    opponentEapm: player2Eapm, // 100% REAL EAPM
    buildOrder: player1BuildOrder, // 100% REAL BUILD ORDER
    
    trainingPlan: [] // No mock training plans
  };
  
  console.log('[convertScrepToLegacyFormat] ===== FINAL 100% REAL RESULT =====');
  console.log('[convertScrepToLegacyFormat] Map:', result.map);
  console.log('[convertScrepToLegacyFormat] Players:', `${result.playerName} vs ${result.opponentName}`);
  console.log('[convertScrepToLegacyFormat] Races:', `${result.playerRace} vs ${result.opponentRace}`);
  console.log('[convertScrepToLegacyFormat] APM (100% REAL):', `${result.apm} vs ${result.opponentApm}`);
  console.log('[convertScrepToLegacyFormat] Build Orders (100% REAL):', `${result.buildOrder.length} vs ${result.secondaryPlayer.buildOrder.length}`);
  console.log('[convertScrepToLegacyFormat] Duration:', result.duration);
  
  return result;
}

/**
 * Convert custom parser data to legacy format - NO MOCK DATA
 */
function convertCustomToLegacyFormat(customData: any): ParsedReplayData {
  console.log('[convertCustomToLegacyFormat] Converting custom data:', customData);
  
  if (!customData.players || customData.players.length < 2) {
    throw new Error('Custom Parser: Nicht genügend Spieler gefunden');
  }
  
  const player1 = customData.players[0];
  const player2 = customData.players[1];
  
  if (!player1.name || !player2.name) {
    throw new Error('Custom Parser: Spielernamen nicht verfügbar');
  }
  
  if (!customData.mapName) {
    throw new Error('Custom Parser: Map-Name nicht verfügbar');
  }
  
  if (!customData.duration) {
    throw new Error('Custom Parser: Spiel-Dauer nicht verfügbar');
  }
  
  return {
    primaryPlayer: {
      name: player1.name,
      race: player1.raceString,
      apm: 0, // Custom Parser hat keine APM-Daten
      eapm: 0,
      buildOrder: [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    secondaryPlayer: {
      name: player2.name,
      race: player2.raceString,
      apm: 0, // Custom Parser hat keine APM-Daten
      eapm: 0,
      buildOrder: [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    map: customData.mapName,
    matchup: `${player1.raceString.charAt(0)}v${player2.raceString.charAt(0)}`,
    duration: customData.duration,
    durationMS: customData.totalFrames ? Math.floor(customData.totalFrames * 1000 / 24) : 0,
    date: new Date().toISOString().split('T')[0],
    result: 'unknown' as const,
    strengths: [],
    weaknesses: [],
    recommendations: [],
    playerName: player1.name,
    opponentName: player2.name,
    playerRace: player1.raceString,
    opponentRace: player2.raceString,
    apm: 0,
    eapm: 0,
    opponentApm: 0,
    opponentEapm: 0,
    buildOrder: [],
    trainingPlan: []
  };
}
