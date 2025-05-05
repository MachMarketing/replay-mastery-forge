
/**
 * This module transforms data from the JSSUH parser to our application's format
 */
import { ParsedReplayData } from './types';

/**
 * Transform JSSUH parser data to our application's format
 */
export function transformJSSUHData(jssuhData: any): ParsedReplayData {
  // Extract player info
  const player = jssuhData.players?.[0] || { name: 'Player', race: 'T', raceLetter: 'T' };
  const opponent = jssuhData.players?.[1] || { name: 'Opponent', race: 'P', raceLetter: 'P' };
  
  // Map race letters to full race names
  const playerRace = mapRaceFromLetter(player.raceLetter || player.race);
  const opponentRace = mapRaceFromLetter(opponent.raceLetter || opponent.race);
  
  // Create matchup from race letters
  const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  
  // Format duration
  const durationMs = jssuhData.durationMS || 600000;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate APM
  const actions = Array.isArray(jssuhData.actions) ? jssuhData.actions.length : 0;
  const gameMinutes = Math.max(durationMs / 60000, 1);
  const apm = Math.round(actions / gameMinutes) || 150;
  const eapm = Math.round(apm * 0.8) || 120; // Calculate eapm as 80% of APM
  
  // Return the transformed data
  return {
    playerName: player.name || 'Player',
    opponentName: opponent.name || 'Opponent',
    playerRace: playerRace,
    opponentRace: opponentRace,
    map: jssuhData.mapName || 'Unknown Map',
    matchup: matchup,
    duration: duration,
    durationMS: durationMs,
    date: jssuhData.gameStartDate || new Date().toISOString().split('T')[0],
    result: 'win', // Default to win as we can't determine from JSSUH
    apm: apm,
    eapm: eapm, // Ensure eapm is set
    buildOrder: [], // JSSUH doesn't provide build order in a format we can easily use
    resourcesGraph: [], // JSSUH doesn't provide resource data
    strengths: ['Solid macro gameplay'],
    weaknesses: ['Could improve build order efficiency'],
    recommendations: ['Focus on early game scouting']
  };
}

/**
 * Maps race letter to full race name
 */
function mapRaceFromLetter(raceLetter: string): 'Terran' | 'Protoss' | 'Zerg' {
  const letter = typeof raceLetter === 'string' ? raceLetter.charAt(0).toUpperCase() : 'T';
  
  switch (letter) {
    case 'P':
      return 'Protoss';
    case 'Z':
      return 'Zerg';
    case 'T':
    default:
      return 'Terran';
  }
}
