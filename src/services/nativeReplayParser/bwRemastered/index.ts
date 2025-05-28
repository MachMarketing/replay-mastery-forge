
/**
 * Enhanced BW Remastered parser that uses screp-js as primary method
 */

import { ParsedReplayData } from '../../replayParser/types';
import { ScrepParser, ScrepReplayData } from '../screpParser';
import { BWRemasteredParser } from './parser';

export async function parseBWRemasteredReplay(file: File): Promise<ParsedReplayData> {
  console.log('[parseBWRemasteredReplay] Starting enhanced BW Remastered parsing');
  
  try {
    // Try screp-js first (most reliable)
    console.log('[parseBWRemasteredReplay] Attempting screp-js parsing...');
    const screpData = await ScrepParser.parseReplay(file);
    
    console.log('[parseBWRemasteredReplay] screp-js parsing successful!');
    return convertScrepToLegacyFormat(screpData);
    
  } catch (screpError) {
    console.log('[parseBWRemasteredReplay] screp-js failed, falling back to custom parser:', screpError);
    
    // Fallback to our custom parser
    const arrayBuffer = await file.arrayBuffer();
    const customParser = new BWRemasteredParser(arrayBuffer);
    const customData = await customParser.parseReplay();
    
    return convertCustomToLegacyFormat(customData);
  }
}

/**
 * Convert screp data to legacy ParsedReplayData format - WITH REAL APM DATA
 */
function convertScrepToLegacyFormat(screpData: ScrepReplayData): ParsedReplayData {
  console.log('[convertScrepToLegacyFormat] Converting screp data to legacy format');
  console.log('[convertScrepToLegacyFormat] Raw screp data:', screpData);
  
  if (!screpData.players || screpData.players.length < 2) {
    throw new Error('Nicht genügend Spieler gefunden - benötige mindestens 2 Spieler');
  }
  
  const player1 = screpData.players[0];
  const player2 = screpData.players[1];
  
  // NEW: Use real APM values from screp-js
  const player1Apm = screpData.computed.apm[0] || 0;
  const player2Apm = screpData.computed.apm[1] || 0;
  const player1Eapm = screpData.computed.eapm[0] || 0;
  const player2Eapm = screpData.computed.eapm[1] || 0;
  
  console.log('[convertScrepToLegacyFormat] Real APM data - Player 1:', player1Apm, 'Player 2:', player2Apm);
  
  // NEW: Convert build orders from screp-js to legacy format
  const player1BuildOrder = screpData.computed.buildOrders[0]?.map(action => ({
    time: action.timestamp,
    action: action.action,
    supply: action.supply?.toString() || '?'
  })) || [];
  
  const player2BuildOrder = screpData.computed.buildOrders[1]?.map(action => ({
    time: action.timestamp,
    action: action.action,
    supply: action.supply?.toString() || '?'
  })) || [];
  
  console.log('[convertScrepToLegacyFormat] Real Build Orders - Player 1:', player1BuildOrder.length, 'Player 2:', player2BuildOrder.length);
  
  // Validierung der Basisdaten
  if (!screpData.header.mapName || screpData.header.mapName === 'Unknown Map') {
    throw new Error('Map-Name nicht verfügbar');
  }
  
  if (!screpData.header.duration || screpData.header.duration === '0:00') {
    throw new Error('Spiel-Dauer nicht verfügbar');
  }
  
  return {
    primaryPlayer: {
      name: player1.name,
      race: player1.race,
      apm: player1Apm, // Real APM from screp-js
      eapm: player1Eapm, // Real EAPM from screp-js
      buildOrder: player1BuildOrder, // Real build order from commands
      strengths: [], // Keine Mock-Stärken
      weaknesses: [], // Keine Mock-Schwächen  
      recommendations: [] // Keine Mock-Empfehlungen
    },
    secondaryPlayer: {
      name: player2.name,
      race: player2.race,
      apm: player2Apm, // Real APM from screp-js
      eapm: player2Eapm, // Real EAPM from screp-js
      buildOrder: player2BuildOrder, // Real build order from commands
      strengths: [], // Keine Mock-Stärken
      weaknesses: [], // Keine Mock-Schwächen
      recommendations: [] // Keine Mock-Empfehlungen
    },
    
    map: screpData.header.mapName,
    matchup: `${player1.race.charAt(0)}v${player2.race.charAt(0)}`,
    duration: screpData.header.duration,
    durationMS: screpData.header.durationMs,
    date: screpData.header.startTime.toISOString().split('T')[0],
    result: 'unknown' as const,
    
    // Legacy fields - nur echte Daten
    strengths: [], // Keine Mock-Daten
    weaknesses: [], // Keine Mock-Daten
    recommendations: [], // Keine Mock-Daten
    
    playerName: player1.name,
    opponentName: player2.name,
    playerRace: player1.race,
    opponentRace: player2.race,
    apm: player1Apm, // Real APM
    eapm: player1Eapm, // Real EAPM
    opponentApm: player2Apm, // Real APM
    opponentEapm: player2Eapm, // Real EAPM
    buildOrder: player1BuildOrder, // Real build order
    
    trainingPlan: [] // Keine Mock-Trainingspläne
  };
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
