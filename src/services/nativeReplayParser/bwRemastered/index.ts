
/**
 * StarCraft: Brood War Remastered parser entry point
 */

import { BWRemasteredParser } from './parser';
import { BWReplayData } from './types';
import { ParsedReplayData } from '../../replayParser/types';

/**
 * Parse a StarCraft: Brood War Remastered .rep file
 */
export async function parseBWRemasteredReplay(file: File): Promise<ParsedReplayData> {
  console.log('[parseBWRemasteredReplay] Starting BW Remastered specific parsing');
  
  const buffer = await file.arrayBuffer();
  const parser = new BWRemasteredParser(buffer);
  const bwData = parser.parseReplay();
  
  // Convert to our standard format
  return convertBWDataToStandard(bwData);
}

/**
 * Convert BW specific data to our standard ParsedReplayData format
 */
function convertBWDataToStandard(bwData: BWReplayData): ParsedReplayData {
  const primaryPlayer = bwData.players[0] || {
    name: 'Unknown Player',
    race: 0,
    raceString: 'Unknown' as const,
    slotId: 0,
    team: 0,
    color: 0
  };
  
  const secondaryPlayer = bwData.players[1] || primaryPlayer;

  // Calculate basic APM from commands
  const totalCommands = bwData.commands.length;
  const gameDurationMinutes = bwData.totalFrames / (24 * 60); // 24 FPS
  const estimatedAPM = Math.round(totalCommands / gameDurationMinutes);

  const matchup = `${primaryPlayer.raceString} vs ${secondaryPlayer.raceString}`;

  return {
    primaryPlayer: {
      name: primaryPlayer.name,
      race: primaryPlayer.raceString,
      apm: estimatedAPM,
      eapm: Math.round(estimatedAPM * 0.8), // Rough estimate
      buildOrder: [],
      strengths: ['Aktive Spielweise'],
      weaknesses: ['Benötigt weitere Analyse'],
      recommendations: ['Mehr Replays für detaillierte Analyse']
    },
    secondaryPlayer: {
      name: secondaryPlayer.name,
      race: secondaryPlayer.raceString,
      apm: estimatedAPM,
      eapm: Math.round(estimatedAPM * 0.8),
      buildOrder: [],
      strengths: ['Aktive Spielweise'],
      weaknesses: ['Benötigt weitere Analyse'],
      recommendations: ['Mehr Replays für detaillierte Analyse']
    },
    
    map: bwData.mapName,
    matchup,
    duration: bwData.duration,
    durationMS: bwData.totalFrames / 24 * 1000,
    date: new Date().toISOString(),
    result: 'unknown' as const,
    
    strengths: ['Aktive Spielweise'],
    weaknesses: ['Benötigt weitere Analyse'],
    recommendations: ['Mehr Replays für detaillierte Analyse'],
    
    playerName: primaryPlayer.name,
    opponentName: secondaryPlayer.name,
    playerRace: primaryPlayer.raceString,
    opponentRace: secondaryPlayer.raceString,
    apm: estimatedAPM,
    eapm: Math.round(estimatedAPM * 0.8),
    opponentApm: estimatedAPM,
    opponentEapm: Math.round(estimatedAPM * 0.8),
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
