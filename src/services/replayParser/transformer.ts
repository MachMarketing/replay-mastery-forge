import { ParsedReplayData, PlayerData } from './types';

/**
 * Transform JSSUH parsed replay data to our application format
 */
export function transformJSSUHData(rawData: any): ParsedReplayData | null {
  if (!rawData || !rawData.metadata) {
    console.error('[transformer] Invalid JSSUH data format, missing metadata');
    return null;
  }

  try {
    const playerIndex = 0;
    const opponentIndex = 1;

    // Extract player names
    const playerName = rawData.metadata.playerNames?.[playerIndex] || 'Unknown Player';
    const opponentName = rawData.metadata.playerNames?.[opponentIndex] || 'Unknown Opponent';

    // Extract races
    const playerRace = mapRace(rawData.metadata.playerRaces?.[playerIndex]);
    const opponentRace = mapRace(rawData.metadata.playerRaces?.[opponentIndex]);

    // Extract match result
    const isWinner = rawData.metadata.winners?.[0] === playerIndex;

    // Extract APM
    const playerApm = rawData.metadata.apm?.[playerIndex] || 0;
    const opponentApm = rawData.metadata.apm?.[opponentIndex] || 0;

    // EAPM (effective APM) - estimate as 70% of APM if not available
    const playerEapm = rawData.metadata.eapm?.[playerIndex] || Math.round(playerApm * 0.7);
    const opponentEapm = rawData.metadata.eapm?.[opponentIndex] || Math.round(opponentApm * 0.7);

    // Extract game duration
    const durationMS = rawData.metadata.frames || 0;
    const durationSeconds = Math.floor(durationMS / 24); // Brood War runs at 24 frames per second
    const duration = formatDuration(durationSeconds);

    // Create build order array
    const buildOrder = extractBuildOrder(rawData, playerIndex);

    // Match timestamp
    const date = rawData.metadata.startTime 
      ? new Date(rawData.metadata.startTime).toISOString()
      : new Date().toISOString();

    // Map name
    const map = rawData.metadata.mapName || 'Unknown Map';

    // Create the matchup string (e.g., "TvZ")
    const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;

    // Create analysis insights (normally these would come from AI)
    const strengths = generateStrengths(rawData, playerIndex);
    const weaknesses = generateWeaknesses(rawData, playerIndex);
    const recommendations = generateRecommendations(weaknesses);

    // Player data objects
    const primaryPlayer: PlayerData = {
      name: playerName,
      race: playerRace,
      apm: playerApm,
      eapm: playerEapm,
      buildOrder: buildOrder,
      // Add required properties
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations
    };

    const secondaryPlayer: PlayerData = {
      name: opponentName,
      race: opponentRace,
      apm: opponentApm,
      eapm: opponentEapm,
      buildOrder: extractBuildOrder(rawData, opponentIndex),
      // Add required properties
      strengths: [],
      weaknesses: [],
      recommendations: []
    };

    // Create the training plan
    const trainingPlan = generateTrainingPlan(weaknesses);

    // Return structured data
    return {
      // Primary data structure
      primaryPlayer,
      secondaryPlayer,
      
      // Game info
      map,
      matchup,
      duration,
      durationMS,
      date,
      result: isWinner ? 'win' : 'loss',
      
      // Analysis results
      strengths,
      weaknesses,
      recommendations,
      
      // Legacy properties for backward compatibility
      playerName,
      opponentName,
      playerRace,
      opponentRace,
      apm: playerApm,
      eapm: playerEapm,
      opponentApm,
      opponentEapm,
      buildOrder,
      
      // Optional training plan
      trainingPlan
    };
  } catch (error) {
    console.error('[transformer] Error transforming replay data:', error);
    return null;
  }
}

/**
 * Helper function to map race strings
 */
function mapRace(race: string | undefined): string {
  if (!race) return 'Terran';
  const lowerRace = race.toLowerCase();
  if (lowerRace.includes('zerg')) return 'Zerg';
  if (lowerRace.includes('protoss')) return 'Protoss';
  return 'Terran';
}

/**
 * Helper function to format duration
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');
  return `${minutes}:${formattedSeconds}`;
}

/**
 * Helper function to extract build order
 */
function extractBuildOrder(rawData: any, playerIndex: number): Array<{ time: string; supply: number; action: string }> {
  const buildOrder = rawData.buildOrder?.[playerIndex] || [];
  return buildOrder.map((item: any) => ({
    time: formatDuration(Math.floor(item.time / 24)),
    supply: item.supply,
    action: item.name
  }));
}

/**
 * Generate strengths based on replay data
 */
function generateStrengths(rawData: any, playerIndex: number): string[] {
  const strengths: string[] = [];
  if (rawData.metadata.apm?.[playerIndex] > 100) {
    strengths.push('Hohe Aktionsgeschwindigkeit');
  }
  if (rawData.metadata.largestArmySize?.[playerIndex] > 50) {
    strengths.push('Große Armee aufgebaut');
  }
  return strengths;
}

/**
 * Generate weaknesses based on replay data
 */
function generateWeaknesses(rawData: any, playerIndex: number): string[] {
  const weaknesses: string[] = [];
  if (rawData.metadata.idleProductionTimePercentage?.[playerIndex] > 10) {
    weaknesses.push('Hohe Produktionsleerlaufzeit');
  }
  if (rawData.metadata.resourcesLostPercentage?.[playerIndex] > 15) {
    weaknesses.push('Viele Ressourcen verloren');
  }
  return weaknesses;
}

/**
 * Generate recommendations based on weaknesses
 */
function generateRecommendations(weaknesses: string[]): string[] {
  const recommendations: string[] = [];
  if (weaknesses.includes('Hohe Produktionsleerlaufzeit')) {
    recommendations.push('Verbessere die ununterbrochene Produktion von Einheiten');
  }
  if (weaknesses.includes('Viele Ressourcen verloren')) {
    recommendations.push('Vermeide unnötige Verluste von Einheiten und Gebäuden');
  }
  return recommendations;
}

/**
 * Generate a training plan based on weaknesses
 */
function generateTrainingPlan(weaknesses: string[]): Array<{ day: number; focus: string; drill: string }> {
  const trainingPlan: Array<{ day: number; focus: string; drill: string }> = [];
  if (weaknesses.includes('Hohe Produktionsleerlaufzeit')) {
    trainingPlan.push({ day: 1, focus: "Produktion", drill: "Übe ununterbrochene Worker- und Einheitenproduktion" });
  }
  if (weaknesses.includes('Viele Ressourcen verloren')) {
    trainingPlan.push({ day: 2, focus: "Ressourcenmanagement", drill: "Optimiere das Ausgeben von Ressourcen, um Verluste zu minimieren" });
  }
  if (trainingPlan.length === 0) {
    trainingPlan.push({ day: 1, focus: "Allgemein", drill: "Spiele mehr Spiele, um Erfahrung zu sammeln" });
  }
  return trainingPlan;
}
