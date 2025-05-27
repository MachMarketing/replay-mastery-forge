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
 * Transform screparsed data to our application format
 */
export function transformSCREPData(data: SCREPReplayData): ParsedReplayData {
  console.log('[transformer] Processing screparsed data with', data.players.length, 'players');
  
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
  
  // Return structured data
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
 * Helper function to generate recommendations based on weaknesses
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
 * Helper function to generate a training plan based on weaknesses
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
