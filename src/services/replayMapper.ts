
/**
 * Maps raw parser data to our application's format
 */
import { ParsedReplayResult } from './replayParserService';

/**
 * Transform WASM parser raw data to our application's format
 */
export function mapRawToParsed(rawData: any): ParsedReplayResult {
  if (!rawData) {
    throw new Error('Invalid parser data');
  }
  
  try {
    // Extract basic info
    const playerName = rawData.playerName || 'Player';
    const opponentName = rawData.opponentName || 'Opponent';
    const playerRace = standardizeRaceName(rawData.playerRace || 'Terran');
    const opponentRace = standardizeRaceName(rawData.opponentRace || 'Zerg');
    const map = rawData.map || 'Unknown Map';
    const matchup = rawData.matchup || `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
    
    // Format duration
    const durationMs = rawData.durationMS || 600000;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Ensure arrays
    const buildOrder = Array.isArray(rawData.buildOrder) ? rawData.buildOrder : [];
    const resourcesGraph = Array.isArray(rawData.resourcesGraph) ? rawData.resourcesGraph : [];
    const strengths = Array.isArray(rawData.strengths) ? rawData.strengths : ['Solid macro gameplay'];
    const weaknesses = Array.isArray(rawData.weaknesses) ? rawData.weaknesses : ['Could improve build order efficiency'];
    const recommendations = Array.isArray(rawData.recommendations) ? rawData.recommendations : ['Focus on early game scouting'];
    
    // Return the parsed data
    return {
      playerName,
      opponentName,
      playerRace,
      opponentRace,
      map,
      matchup,
      duration,
      durationMS: durationMs,
      date: rawData.date || new Date().toISOString().split('T')[0],
      result: rawData.result || 'win',
      apm: rawData.apm || 150,
      eapm: rawData.eapm || 120,
      buildOrder,
      resourcesGraph,
      strengths,
      weaknesses,
      recommendations,
      trainingPlan: rawData.trainingPlan || undefined
    };
  } catch (error) {
    console.error('[replayMapper] Error mapping data:', error);
    
    // Return minimal data if mapping fails
    return {
      playerName: 'Player',
      opponentName: 'Opponent',
      playerRace: 'Terran',
      opponentRace: 'Protoss',
      map: 'Unknown Map',
      matchup: 'TvP',
      duration: '10:00',
      durationMS: 600000,
      date: new Date().toISOString().split('T')[0],
      result: 'win',
      apm: 150,
      eapm: 120,
      buildOrder: [],
      resourcesGraph: [],
      strengths: ['Solid macro gameplay'],
      weaknesses: ['Could improve build order efficiency'],
      recommendations: ['Focus on early game scouting']
    };
  }
}

/**
 * Standardize race names to ensure consistent formatting
 */
function standardizeRaceName(race: string): string {
  if (!race) return 'Terran';
  
  const normalized = race.toLowerCase().trim();
  
  if (normalized.startsWith('t') || normalized.includes('terran')) {
    return 'Terran';
  } else if (normalized.startsWith('p') || normalized.includes('protoss')) {
    return 'Protoss';
  } else if (normalized.startsWith('z') || normalized.includes('zerg')) {
    return 'Zerg';
  }
  
  return 'Terran'; // Default
}
