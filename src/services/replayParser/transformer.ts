
import { ParsedReplayData, PlayerData } from './types';

interface SCREPPlayer {
  id: number;
  name: string;
  race: string;
  type: number;
  team: number;
  isWinner: boolean;
  apm: number;
  eapm?: number;
}

interface SCREPBuildOrder {
  time: string;
  frame: number;
  supply: number;
  action: string;
}

interface SCREPReplayData {
  players: SCREPPlayer[];
  buildOrders: Record<number, SCREPBuildOrder[]>;
  metadata: {
    map: string;
    startTime: string;
    duration: string;
    durationFrames: number;
    gameType: string;
    gameSubType?: string;
    gameEngine: string;
  };
  commands: number;
  matchup?: string;
}

/**
 * Transform scraped parsed replay data to our application format
 */
export function transformJSSUHData(rawData: any): ParsedReplayData | null {
  if (!rawData) {
    console.error('[transformer] Invalid scraped data format');
    return null;
  }

  try {
    console.log('[transformer] Raw data structure:', Object.keys(rawData));
    
    // First check if this is coming from our Go SCREP service
    if (rawData.players && Array.isArray(rawData.players) && rawData.metadata) {
      console.log('[transformer] Detected SCREP service data format, using direct mapping');
      return transformSCREPData(rawData as SCREPReplayData);
    }
    
    // Extract metadata from JSSUH format (fallback)
    const metadata = rawData.metadata || {};
    const playerIndex = 0;
    const opponentIndex = 1;

    // Extract player names
    const playerName = metadata.playerNames?.[playerIndex] || 'Unknown Player';
    const opponentName = metadata.playerNames?.[opponentIndex] || 'Unknown Opponent';

    // Extract races
    const playerRace = mapRace(metadata.playerRaces?.[playerIndex]);
    const opponentRace = mapRace(metadata.playerRaces?.[opponentIndex]);

    // Extract match result
    const isWinner = metadata.winners?.[0] === playerIndex;

    // Extract APM
    const playerApm = metadata.apm?.[playerIndex] || 0;
    const opponentApm = metadata.apm?.[opponentIndex] || 0;

    // EAPM (effective APM) - estimate as 70% of APM if not available
    const playerEapm = metadata.eapm?.[playerIndex] || Math.round(playerApm * 0.7);
    const opponentEapm = metadata.eapm?.[opponentIndex] || Math.round(opponentApm * 0.7);

    // Extract game duration
    const durationMS = metadata.frames || 0;
    const durationSeconds = Math.floor(durationMS / 24); // Brood War runs at 24 frames per second
    const duration = formatDuration(durationSeconds);

    // Create build order array
    const buildOrder = extractBuildOrder(rawData, playerIndex);

    // Match timestamp
    const date = metadata.startTime 
      ? new Date(metadata.startTime).toISOString()
      : new Date().toISOString();

    // Map name
    const map = metadata.mapName || 'Unknown Map';

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
 * Transform data from our SCREP service into application format
 */
function transformSCREPData(data: SCREPReplayData): ParsedReplayData {
  console.log('[transformer] Processing SCREP data with', data.players.length, 'players');
  
  // Ensure we have at least one player
  if (!data.players || data.players.length === 0) {
    throw new Error('No players found in replay data');
  }
  
  // Find the first two human players (assuming 1v1 for simplicity)
  const humanPlayers = data.players.filter(p => p.type === 1); // type 1 = human
  
  // Sort players by ID for consistency
  humanPlayers.sort((a, b) => a.id - b.id);
  
  const primaryPlayer = humanPlayers[0];
  const secondaryPlayer = humanPlayers.length > 1 ? humanPlayers[1] : null;
  
  console.log('[transformer] Found players:', 
    `${primaryPlayer?.name} (${primaryPlayer?.race})`, 
    secondaryPlayer ? `vs ${secondaryPlayer.name} (${secondaryPlayer.race})` : '(no opponent)');
  
  // Get build orders for primary player
  const primaryBuildOrder = data.buildOrders[primaryPlayer.id] || [];
  const secondaryBuildOrder = secondaryPlayer ? (data.buildOrders[secondaryPlayer.id] || []) : [];
  
  console.log('[transformer] Build order items:', primaryBuildOrder.length);
  
  // Convert build orders to our format
  const mappedPrimaryBuildOrder = primaryBuildOrder.map(item => ({
    time: item.time,
    supply: item.supply,
    action: item.action
  }));
  
  const mappedSecondaryBuildOrder = secondaryBuildOrder.map(item => ({
    time: item.time,
    supply: item.supply,
    action: item.action
  }));
  
  // Extract match result (win/loss)
  const result = primaryPlayer.isWinner ? 'win' : 'loss';
  
  // Get game duration (MS)
  const durationMS = data.metadata.durationFrames;
  
  // Create matchup string
  const matchup = data.matchup || 
    `${primaryPlayer.race.charAt(0)}v${secondaryPlayer?.race.charAt(0) || 'X'}`;
  
  // Create strengths and weaknesses based on patterns in the build order and APM
  const strengths = generateStrengthsFromReplay(primaryPlayer, mappedPrimaryBuildOrder);
  const weaknesses = generateWeaknessesFromReplay(primaryPlayer, mappedPrimaryBuildOrder);
  const recommendations = generateRecommendations(weaknesses);
  const trainingPlan = generateTrainingPlan(weaknesses);
  
  // Create PlayerData objects
  const primaryPlayerData: PlayerData = {
    name: primaryPlayer.name,
    race: primaryPlayer.race,
    apm: primaryPlayer.apm,
    eapm: primaryPlayer.eapm || Math.round(primaryPlayer.apm * 0.7),
    buildOrder: mappedPrimaryBuildOrder,
    strengths,
    weaknesses,
    recommendations
  };
  
  const secondaryPlayerData: PlayerData = secondaryPlayer ? {
    name: secondaryPlayer.name,
    race: secondaryPlayer.race,
    apm: secondaryPlayer.apm,
    eapm: secondaryPlayer.eapm || Math.round(secondaryPlayer.apm * 0.7),
    buildOrder: mappedSecondaryBuildOrder,
    strengths: [],
    weaknesses: [],
    recommendations: []
  } : {
    name: 'Unknown Opponent',
    race: 'Unknown',
    apm: 0,
    eapm: 0,
    buildOrder: [],
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  // Format date from metadata
  const date = data.metadata.startTime || new Date().toISOString();
  
  // Format to expected ParsedReplayData
  return {
    // Primary data structure
    primaryPlayer: primaryPlayerData,
    secondaryPlayer: secondaryPlayerData,
    
    // Game info
    map: data.metadata.map,
    matchup,
    duration: data.metadata.duration,
    durationMS,
    date,
    result,
    
    // Analysis results
    strengths,
    weaknesses,
    recommendations,
    
    // Legacy properties for backward compatibility
    playerName: primaryPlayer.name,
    opponentName: secondaryPlayer?.name || 'Unknown Opponent',
    playerRace: primaryPlayer.race,
    opponentRace: secondaryPlayer?.race || 'Unknown',
    apm: primaryPlayer.apm,
    eapm: primaryPlayer.eapm || Math.round(primaryPlayer.apm * 0.7),
    opponentApm: secondaryPlayer?.apm || 0,
    opponentEapm: secondaryPlayer?.eapm || 0,
    buildOrder: mappedPrimaryBuildOrder,
    
    // Training plan
    trainingPlan
  };
}

/**
 * Generate strengths based on replay data from our SCREP service
 */
function generateStrengthsFromReplay(player: SCREPPlayer, buildOrder: Array<{time: string; supply: number; action: string}>): string[] {
  const strengths: string[] = [];
  
  // Check APM
  if (player.apm > 150) {
    strengths.push('Hohe Aktionsgeschwindigkeit');
  }
  
  // Check build order execution
  if (buildOrder.length > 15) {
    strengths.push('Komplexe Build Order');
  }
  
  // Check race-specific strengths
  if (player.race === 'Terran') {
    const hasManyBarracks = buildOrder.filter(item => 
      item.action.includes('Barracks')).length >= 2;
    if (hasManyBarracks) {
      strengths.push('Gute Barracks-Produktion');
    }
  } else if (player.race === 'Protoss') {
    const hasForge = buildOrder.some(item => 
      item.action.includes('Forge'));
    if (hasForge) {
      strengths.push('Früher Forge-Bau');
    }
  } else if (player.race === 'Zerg') {
    const hasEarlyExpansion = buildOrder.some(item => 
      item.action.includes('Hatchery') && 
      extractTimeInSeconds(item.time) < 240);
    if (hasEarlyExpansion) {
      strengths.push('Frühe Expansion');
    }
  }
  
  return strengths;
}

/**
 * Generate weaknesses based on replay data from our SCREP service
 */
function generateWeaknessesFromReplay(player: SCREPPlayer, buildOrder: Array<{time: string; supply: number; action: string}>): string[] {
  const weaknesses: string[] = [];
  
  // Check APM
  if (player.apm < 100) {
    weaknesses.push('Niedrige Aktionsgeschwindigkeit');
  }
  
  // Check for supply blocks (detected by long gaps between similar supply values)
  const supplyValues = buildOrder.map(item => item.supply);
  let supplyBlocked = false;
  
  for (let i = 1; i < buildOrder.length; i++) {
    const currentItem = buildOrder[i];
    const previousItem = buildOrder[i - 1];
    
    const currentTime = extractTimeInSeconds(currentItem.time);
    const previousTime = extractTimeInSeconds(previousItem.time);
    
    // If supply hasn't changed for more than 30 seconds, might be supply blocked
    if (currentItem.supply === previousItem.supply && (currentTime - previousTime > 30)) {
      supplyBlocked = true;
      break;
    }
  }
  
  if (supplyBlocked) {
    weaknesses.push('Supply Blocks erkannt');
  }
  
  // Check race-specific weaknesses
  if (player.race === 'Terran') {
    const hasLateExpansion = !buildOrder.some(item => 
      item.action.includes('Command Center') && 
      extractTimeInSeconds(item.time) < 360);
    if (hasLateExpansion) {
      weaknesses.push('Späte Expansion');
    }
  } else if (player.race === 'Protoss') {
    const hasLateRobo = !buildOrder.some(item => 
      item.action.includes('Robotics') && 
      extractTimeInSeconds(item.time) < 480);
    if (hasLateRobo) {
      weaknesses.push('Späte Robotics-Technologie');
    }
  } else if (player.race === 'Zerg') {
    const hasLateGas = !buildOrder.some(item => 
      item.action.includes('Extractor') && 
      extractTimeInSeconds(item.time) < 200);
    if (hasLateGas) {
      weaknesses.push('Spätes Gas');
    }
  }
  
  return weaknesses;
}

/**
 * Helper function to extract time in seconds from a MM:SS format
 */
function extractTimeInSeconds(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  return minutes * 60 + seconds;
}

/**
 * Helper function to map race strings
 */
function mapRace(race: string | undefined): string {
  if (!race) return 'Terran';
  const lowerRace = race.toLowerCase();
  if (lowerRace.includes('zerg')) return 'Zerg';
  if (lowerRace.includes('protoss')) return 'Protoss';
  if (lowerRace.includes('random')) return 'Random';
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
  if (rawData.metadata?.apm?.[playerIndex] > 100) {
    strengths.push('Hohe Aktionsgeschwindigkeit');
  }
  if (rawData.metadata?.largestArmySize?.[playerIndex] > 50) {
    strengths.push('Große Armee aufgebaut');
  }
  return strengths;
}

/**
 * Generate weaknesses based on replay data
 */
function generateWeaknesses(rawData: any, playerIndex: number): string[] {
  const weaknesses: string[] = [];
  if (rawData.metadata?.idleProductionTimePercentage?.[playerIndex] > 10) {
    weaknesses.push('Hohe Produktionsleerlaufzeit');
  }
  if (rawData.metadata?.resourcesLostPercentage?.[playerIndex] > 15) {
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
  if (weaknesses.includes('Supply Blocks erkannt')) {
    recommendations.push('Achte auf dein Supply und baue rechtzeitig Supply-Gebäude');
  }
  if (weaknesses.includes('Niedrige Aktionsgeschwindigkeit')) {
    recommendations.push('Verbessere deine APM durch Hotkey-Training und mehr Spiele');
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
  
  if (weaknesses.includes('Supply Blocks erkannt')) {
    trainingPlan.push({ day: 3, focus: "Supply Management", drill: "Trainiere das regelmäßige Bauen von Supply-Gebäuden" });
  }
  
  if (weaknesses.includes('Niedrige Aktionsgeschwindigkeit')) {
    trainingPlan.push({ day: 4, focus: "APM Training", drill: "Übe Hotkey-Nutzung und schnelle Einheitenproduktion" });
  }
  
  // Add general training if no specific weaknesses were found
  if (trainingPlan.length === 0) {
    trainingPlan.push(
      { day: 1, focus: "Build Order", drill: "Perfektioniere eine Standard-Build Order für deine Rasse" },
      { day: 2, focus: "Makro", drill: "Achte auf ununterbrochene Arbeiter- und Einheitenproduktion" },
      { day: 3, focus: "Mikro", drill: "Übe Einheitenpositionierung und -kontrolle in kleinen Gefechten" }
    );
  }
  
  return trainingPlan;
}
