import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War replay file using screparsed
 * This is the single entry point for all replay parsing in the application
 */
export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting to parse replay file:', file.name);
  
  try {
    // Load the screparsed module
    const screparsed = await import('screparsed');
    console.log('[replayParser] Loaded screparsed module:', Object.keys(screparsed));
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('[replayParser] File loaded, size:', uint8Array.length, 'bytes');
    
    // Use a more flexible approach to find the parsing function
    let parsedData;
    
    // Try all possible ways to parse the replay with screparsed
    // Use type assertion to bypass TypeScript's strict checking
    if (screparsed.ReplayParser) {
      console.log('[replayParser] Found ReplayParser, attempting to use it');
      const replayParser = screparsed.ReplayParser as any;
      if (typeof replayParser.parse === 'function') {
        console.log('[replayParser] Using ReplayParser.parse');
        parsedData = await Promise.resolve(replayParser.parse(uint8Array));
      }
    } 
    else if (screparsed.ParsedReplay) {
      console.log('[replayParser] Found ParsedReplay, attempting to use it');
      const parsedReplay = screparsed.ParsedReplay as any;
      if (typeof parsedReplay.fromBuffer === 'function') {
        console.log('[replayParser] Using ParsedReplay.fromBuffer');
        parsedData = await Promise.resolve(parsedReplay.fromBuffer(uint8Array));
      } 
      else if (typeof parsedReplay.parse === 'function') {
        console.log('[replayParser] Using ParsedReplay.parse');
        parsedData = await Promise.resolve(parsedReplay.parse(uint8Array));
      }
    }
    else if (screparsed.default && typeof screparsed.default === 'function') {
      console.log('[replayParser] Using default export as function');
      parsedData = await Promise.resolve((screparsed.default as any)(uint8Array));
    }
    else if (screparsed.default && typeof (screparsed.default as any).parse === 'function') {
      console.log('[replayParser] Using default.parse');
      parsedData = await Promise.resolve((screparsed.default as any).parse(uint8Array));
    }
    else if (typeof (screparsed as any).parse === 'function') {
      console.log('[replayParser] Using module.parse');
      parsedData = await Promise.resolve((screparsed as any).parse(uint8Array));
    }
    else {
      throw new Error('No suitable parsing function found in screparsed module');
    }
    
    // Check if we got any data
    if (!parsedData) {
      throw new Error('Failed to parse replay data');
    }
    
    console.log('[replayParser] Raw parsed data:', parsedData);
    
    // Transform the data
    return transformScreparsedData(parsedData);
  } catch (error) {
    console.error('[replayParser] Error parsing replay:', error);
    throw new Error(`Failed to parse replay: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Transform data from screparsed to our application format
 */
function transformScreparsedData(data: any): ParsedReplayData {
  console.log('[replayParser] Transforming screparsed data');
  
  // Validate input data
  if (!data || !data.players || !Array.isArray(data.players) || data.players.length === 0) {
    console.error('[replayParser] Invalid or incomplete screparsed data:', data);
    throw new Error('Invalid replay data format');
  }
  
  // Find human players (type 1)
  const humanPlayers = data.players.filter((p: any) => p.type === 1);
  console.log('[replayParser] Found human players:', humanPlayers.length);
  
  if (humanPlayers.length === 0) {
    throw new Error('No human players found in replay');
  }
  
  // Sort by player ID for consistent results
  humanPlayers.sort((a: any, b: any) => a.id - b.id);
  
  const primaryPlayer = humanPlayers[0];
  const secondaryPlayer = humanPlayers.length > 1 ? humanPlayers[1] : null;
  
  console.log('[replayParser] Primary player:', primaryPlayer.name, `(${primaryPlayer.race})`);
  if (secondaryPlayer) {
    console.log('[replayParser] Secondary player:', secondaryPlayer.name, `(${secondaryPlayer.race})`);
  }
  
  // Extract build orders
  const primaryBuildOrder = data.buildOrders?.[primaryPlayer.id] || [];
  const secondaryBuildOrder = secondaryPlayer && data.buildOrders?.[secondaryPlayer.id] ? 
    data.buildOrders[secondaryPlayer.id] : [];
  
  // Create matchup string if not provided
  const matchup = data.matchup || 
    `${primaryPlayer.race.charAt(0)}v${secondaryPlayer?.race.charAt(0) || 'X'}`;
  
  // Transform build orders to our format
  const primaryFormattedBuildOrder = primaryBuildOrder.map((item: any) => ({
    time: item.time,
    supply: item.supply,
    action: item.action
  }));
  
  const secondaryFormattedBuildOrder = secondaryBuildOrder.map((item: any) => ({
    time: item.time,
    supply: item.supply,
    action: item.action
  }));
  
  // Generate analysis insights
  const strengths = generateStrengths(primaryPlayer, primaryFormattedBuildOrder);
  const weaknesses = generateWeaknesses(primaryPlayer, primaryFormattedBuildOrder);
  const recommendations = generateRecommendations(weaknesses);
  const trainingPlan = generateTrainingPlan(weaknesses);
  
  return {
    // Primary data structure
    primaryPlayer: {
      name: primaryPlayer.name,
      race: primaryPlayer.race,
      apm: primaryPlayer.apm,
      eapm: primaryPlayer.eapm || Math.round(primaryPlayer.apm * 0.7),
      buildOrder: primaryFormattedBuildOrder,
      strengths,
      weaknesses,
      recommendations
    },
    secondaryPlayer: secondaryPlayer ? {
      name: secondaryPlayer.name,
      race: secondaryPlayer.race,
      apm: secondaryPlayer.apm,
      eapm: secondaryPlayer.eapm || Math.round(secondaryPlayer.apm * 0.7),
      buildOrder: secondaryFormattedBuildOrder,
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
    },
    
    // Game info
    map: data.metadata.map,
    matchup,
    duration: data.metadata.duration,
    durationMS: data.metadata.durationFrames,
    date: data.metadata.startTime || new Date().toISOString(),
    result: primaryPlayer.isWinner ? 'win' : 'loss',
    
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
    opponentEapm: secondaryPlayer?.eapm || (secondaryPlayer ? Math.round(secondaryPlayer.apm * 0.7) : 0),
    buildOrder: primaryFormattedBuildOrder,
    
    // Training plan
    trainingPlan
  };
}

/**
 * Generate strengths based on replay data
 */
function generateStrengths(player: any, buildOrder: Array<{time: string; supply: number; action: string}>): string[] {
  const strengths: string[] = [];
  
  // Check APM
  if (player.apm > 150) {
    strengths.push('Hohe Aktionsgeschwindigkeit');
  }
  
  // Check build order complexity
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
 * Generate weaknesses based on replay data
 */
function generateWeaknesses(player: any, buildOrder: Array<{time: string; supply: number; action: string}>): string[] {
  const weaknesses: string[] = [];
  
  // Check APM
  if (player.apm < 100) {
    weaknesses.push('Niedrige Aktionsgeschwindigkeit');
  }
  
  // Check for supply blocks
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
  
  // Race-specific weaknesses
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
 * Generate recommendations based on weaknesses
 */
function generateRecommendations(weaknesses: string[]): string[] {
  const recommendations: string[] = [];
  
  if (weaknesses.includes('Supply Blocks erkannt')) {
    recommendations.push('Achte auf dein Supply und baue rechtzeitig Supply-Gebäude');
  }
  
  if (weaknesses.includes('Niedrige Aktionsgeschwindigkeit')) {
    recommendations.push('Verbessere deine APM durch Hotkey-Training und mehr Spiele');
  }
  
  if (weaknesses.includes('Späte Expansion')) {
    recommendations.push('Übe frühere Expansionen, um deine Ressourcenproduktion zu steigern');
  }
  
  if (weaknesses.includes('Späte Robotics-Technologie')) {
    recommendations.push('Integriere Robotics früher in deine Build Order');
  }
  
  if (weaknesses.includes('Spätes Gas')) {
    recommendations.push('Baue Gas früher, um Technologien schneller freizuschalten');
  }
  
  // Add a default recommendation if none were generated
  if (recommendations.length === 0) {
    recommendations.push('Trainiere deine Build Order für dieses Matchup');
  }
  
  return recommendations;
}

/**
 * Generate a training plan based on weaknesses
 */
function generateTrainingPlan(weaknesses: string[]): Array<{ day: number; focus: string; drill: string }> {
  const trainingPlan: Array<{ day: number; focus: string; drill: string }> = [];
  
  if (weaknesses.includes('Supply Blocks erkannt')) {
    trainingPlan.push({ day: 1, focus: "Supply Management", drill: "Trainiere das regelmäßige Bauen von Supply-Gebäuden" });
  }
  
  if (weaknesses.includes('Niedrige Aktionsgeschwindigkeit')) {
    trainingPlan.push({ day: 2, focus: "APM Training", drill: "Übe Hotkey-Nutzung und schnelle Einheitenproduktion" });
  }
  
  if (weaknesses.includes('Späte Expansion')) {
    trainingPlan.push({ day: 3, focus: "Expansion Timing", drill: "Übe Build Orders mit früheren Expansionen" });
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
