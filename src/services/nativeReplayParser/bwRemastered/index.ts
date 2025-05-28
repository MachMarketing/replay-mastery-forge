
/**
 * StarCraft: Brood War Remastered parser entry point
 * Updated to support async decompression
 */

import { BWRemasteredParser } from './parser';
import { ParsedReplayData } from '../../replayParser/types';

/**
 * Parse a StarCraft: Brood War Remastered .rep file
 */
export async function parseBWRemasteredReplay(file: File): Promise<ParsedReplayData> {
  console.log('[parseBWRemasteredReplay] Starting BW Remastered parsing');
  console.log('[parseBWRemasteredReplay] File:', file.name, 'Size:', file.size, 'bytes');
  
  const buffer = await file.arrayBuffer();
  const parser = new BWRemasteredParser(buffer);
  
  try {
    // Now using async parseReplay method for decompression support
    const bwData = await parser.parseReplay();
    console.log('[parseBWRemasteredReplay] Parse successful:', {
      map: bwData.mapName,
      players: bwData.players.length,
      commands: bwData.commands.length,
      duration: bwData.duration
    });
    
    // Convert to our standard format
    return convertBWDataToStandard(bwData);
  } catch (error) {
    console.error('[parseBWRemasteredReplay] Parse failed:', error);
    throw new Error(`Replay parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert BW specific data to our standard ParsedReplayData format
 */
function convertBWDataToStandard(bwData: any): ParsedReplayData {
  const primaryPlayer = bwData.players[0] || {
    name: 'Player 1',
    race: 0,
    raceString: 'Unknown' as const,
    slotId: 0,
    team: 0,
    color: 0
  };
  
  const secondaryPlayer = bwData.players[1] || {
    name: 'Player 2',
    race: 0,
    raceString: 'Unknown' as const,
    slotId: 1,
    team: 1,
    color: 1
  };

  // Calculate APM from commands and game duration
  const gameDurationMinutes = bwData.totalFrames / (24 * 60);
  const playerCommands = bwData.commands.filter(cmd => cmd.userId === 0).length;
  const opponentCommands = bwData.commands.filter(cmd => cmd.userId === 1).length;
  
  const estimatedAPM = gameDurationMinutes > 0 ? Math.round(playerCommands / gameDurationMinutes) : 0;
  const opponentAPM = gameDurationMinutes > 0 ? Math.round(opponentCommands / gameDurationMinutes) : 0;

  const matchup = `${primaryPlayer.raceString} vs ${secondaryPlayer.raceString}`;

  return {
    primaryPlayer: {
      name: primaryPlayer.name,
      race: primaryPlayer.raceString,
      apm: estimatedAPM,
      eapm: Math.round(estimatedAPM * 0.7), // Rough estimate for effective APM
      buildOrder: [],
      strengths: ['Aktive Spielweise'],
      weaknesses: ['Detaillierte Analyse erforderlich'],
      recommendations: ['Mehr Replays für bessere Insights']
    },
    secondaryPlayer: {
      name: secondaryPlayer.name,
      race: secondaryPlayer.raceString,
      apm: opponentAPM,
      eapm: Math.round(opponentAPM * 0.7),
      buildOrder: [],
      strengths: ['Aktive Spielweise'],
      weaknesses: ['Detaillierte Analyse erforderlich'],
      recommendations: ['Mehr Replays für bessere Insights']
    },
    
    map: bwData.mapName,
    matchup,
    duration: bwData.duration,
    durationMS: Math.round(bwData.totalFrames / 24 * 1000),
    date: new Date().toISOString(),
    result: 'unknown' as const,
    
    strengths: ['Replay erfolgreich analysiert'],
    weaknesses: ['Erweiterte Analyse verfügbar'],
    recommendations: ['Analysiere mehr Replays für detaillierte Insights'],
    
    playerName: primaryPlayer.name,
    opponentName: secondaryPlayer.name,
    playerRace: primaryPlayer.raceString,
    opponentRace: secondaryPlayer.raceString,
    apm: estimatedAPM,
    eapm: Math.round(estimatedAPM * 0.7),
    opponentApm: opponentAPM,
    opponentEapm: Math.round(opponentAPM * 0.7),
    buildOrder: [],
    
    trainingPlan: [
      { day: 1, focus: "Macro Management", drill: "Konstante Worker-Produktion üben" },
      { day: 2, focus: "Micro Control", drill: "Einheitenpositionierung verbessern" },
      { day: 3, focus: "Build Order", drill: "Timing-Attacken perfektionieren" },
      { day: 4, focus: "Resource Management", drill: "Effiziente Ressourcennutzung" },
      { day: 5, focus: "Hotkey Usage", drill: "Hotkey-Kombinationen trainieren" }
    ]
  };
}
