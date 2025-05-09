
import { ParsedReplayData, PlayerData } from './replayParser/types';

interface ScreparsedResult {
  players: Array<{
    id: number;
    name: string;
    race: string;
    type: number;
    isWinner: boolean;
    apm: number;
    eapm?: number;
  }>;
  buildOrders?: Record<number, Array<{
    time: string;
    frame: number;
    supply: number;
    action: string;
  }>>;
  metadata: {
    map: string;
    startTime: string;
    duration: string;
    durationFrames: number;
    gameType: string;
    gameSubType?: string;
    gameEngine: string;
  };
  commands?: number;
  matchup?: string;
}

// Type for dynamic access to parsing function
type ParseFunction = (data: Uint8Array) => Promise<any> | any;

/**
 * Parse StarCraft: Brood War replay file using screparsed WASM module
 */
export async function parseReplayWithScreparsed(file: File): Promise<ParsedReplayData> {
  console.log('[screparsed-parser] Starting to parse replay file:', file.name);
  
  // Load the screparsed module
  try {
    // Check if screparsed is available
    let screparsed;
    try {
      screparsed = await import('screparsed');
      console.log('[screparsed-parser] Loaded screparsed module:', Object.keys(screparsed));
    } catch (importError) {
      console.error('[screparsed-parser] Failed to import screparsed:', importError);
      throw new Error(`Failed to load screparsed module: ${importError instanceof Error ? importError.message : String(importError)}`);
    }
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('[screparsed-parser] File loaded, size:', uint8Array.length, 'bytes');
    
    // Find a suitable parse function in the module
    let parseFn: ParseFunction | null = null;
    let parsedData: any = null;
    
    // Try different ways to access the parsing functionality
    console.log('[screparsed-parser] Looking for parsing functionality...');
    
    // Examine the structure of the screparsed module
    const hasDefaultExport = !!screparsed.default;
    const hasReplayParser = !!screparsed.ReplayParser;
    const hasParsedReplay = !!screparsed.ParsedReplay;
    
    console.log('[screparsed-parser] Module structure:', { 
      hasDefaultExport, 
      hasReplayParser, 
      hasParsedReplay,
      defaultType: hasDefaultExport ? typeof screparsed.default : 'undefined'
    });
    
    if (hasReplayParser && typeof screparsed.ReplayParser.parse === 'function') {
      console.log('[screparsed-parser] Using ReplayParser.parse');
      parseFn = screparsed.ReplayParser.parse;
    } 
    else if (hasParsedReplay && typeof screparsed.ParsedReplay.fromBuffer === 'function') {
      console.log('[screparsed-parser] Using ParsedReplay.fromBuffer');
      parseFn = screparsed.ParsedReplay.fromBuffer;
    }
    else if (hasParsedReplay && typeof screparsed.ParsedReplay.parse === 'function') {
      console.log('[screparsed-parser] Using ParsedReplay.parse');
      parseFn = screparsed.ParsedReplay.parse;
    }
    else if (hasDefaultExport && typeof screparsed.default === 'function') {
      console.log('[screparsed-parser] Using default export as function');
      parseFn = screparsed.default;
    }
    else if (hasDefaultExport && typeof screparsed.default.parse === 'function') {
      console.log('[screparsed-parser] Using default.parse');
      parseFn = screparsed.default.parse;
    }
    else if (typeof (screparsed as any).parse === 'function') {
      console.log('[screparsed-parser] Using module.parse');
      parseFn = (screparsed as any).parse;
    }
    
    if (!parseFn) {
      console.error('[screparsed-parser] No parsing function found in module');
      throw new Error('No suitable parsing function found in screparsed module');
    }
    
    // Parse the replay file using the function we found
    console.log('[screparsed-parser] Calling parse function...');
    try {
      parsedData = await Promise.resolve(parseFn(uint8Array));
    } catch (parseError) {
      console.error('[screparsed-parser] Error during parsing:', parseError);
      throw new Error(`Parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    // The original code tries to access parsedData directly, but let's make sure it exists
    if (!parsedData) {
      throw new Error('Parsing completed but no data was returned');
    }
    
    console.log('[screparsed-parser] Raw parsed data:', parsedData);
    
    // Transform the screparsed result to our application format
    return transformScreparsedData(parsedData);
  } catch (error) {
    console.error('[screparsed-parser] Error parsing replay with screparsed:', error);
    throw new Error(`Failed to parse replay: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Transform data from screparsed to our application format
 */
function transformScreparsedData(data: any): ParsedReplayData {
  console.log('[screparsed-parser] Transforming screparsed data');
  
  // Validate input data
  if (!data || !data.players || !Array.isArray(data.players) || data.players.length === 0) {
    console.error('[screparsed-parser] Invalid or incomplete screparsed data:', data);
    throw new Error('Invalid replay data format');
  }
  
  // Find human players (type 1)
  const humanPlayers = data.players.filter((p: any) => p.type === 1);
  console.log('[screparsed-parser] Found human players:', humanPlayers.length);
  
  if (humanPlayers.length === 0) {
    throw new Error('No human players found in replay');
  }
  
  // Sort by player ID for consistent results
  humanPlayers.sort((a: any, b: any) => a.id - b.id);
  
  const primaryPlayer = humanPlayers[0];
  const secondaryPlayer = humanPlayers.length > 1 ? humanPlayers[1] : null;
  
  console.log('[screparsed-parser] Primary player:', primaryPlayer.name, `(${primaryPlayer.race})`);
  if (secondaryPlayer) {
    console.log('[screparsed-parser] Secondary player:', secondaryPlayer.name, `(${secondaryPlayer.race})`);
  }
  
  // Extract build orders
  const primaryBuildOrder = data.buildOrders?.[primaryPlayer.id] || [];
  const secondaryBuildOrder = secondaryPlayer && data.buildOrders?.[secondaryPlayer.id] ? 
    data.buildOrders[secondaryPlayer.id] : [];
  
  console.log('[screparsed-parser] Build order items:', 
    `P1: ${primaryBuildOrder.length}, P2: ${secondaryBuildOrder.length}`);
  
  // Create matchup string if not provided
  const matchup = data.matchup || 
    `${primaryPlayer.race.charAt(0)}v${secondaryPlayer?.race.charAt(0) || 'X'}`;
  
  // Create player data objects
  const primaryPlayerData: PlayerData = {
    name: primaryPlayer.name,
    race: primaryPlayer.race,
    apm: primaryPlayer.apm,
    eapm: primaryPlayer.eapm || Math.round(primaryPlayer.apm * 0.7),
    buildOrder: primaryBuildOrder.map((item: any) => ({
      time: item.time,
      supply: item.supply,
      action: item.action
    })),
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  const secondaryPlayerData: PlayerData = secondaryPlayer ? {
    name: secondaryPlayer.name,
    race: secondaryPlayer.race,
    apm: secondaryPlayer.apm,
    eapm: secondaryPlayer.eapm || Math.round(secondaryPlayer.apm * 0.7),
    buildOrder: secondaryBuildOrder.map((item: any) => ({
      time: item.time,
      supply: item.supply,
      action: item.action
    })),
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
  
  // Generate strengths, weaknesses, and recommendations based on the data
  const strengths = generateStrengths(primaryPlayer, primaryBuildOrder);
  const weaknesses = generateWeaknesses(primaryPlayer, primaryBuildOrder);
  const recommendations = generateRecommendations(weaknesses);
  
  // Generate training plan
  const trainingPlan = generateTrainingPlan(weaknesses);
  
  // Date from metadata or current date
  const date = data.metadata?.startTime || new Date().toISOString();
  
  // Format the final parsed data
  const parsedData: ParsedReplayData = {
    // Primary data structure
    primaryPlayer: {
      ...primaryPlayerData,
      strengths,
      weaknesses,
      recommendations
    },
    secondaryPlayer: secondaryPlayerData,
    
    // Game info
    map: data.metadata.map,
    matchup,
    duration: data.metadata.duration,
    durationMS: data.metadata.durationFrames,
    date,
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
    opponentEapm: secondaryPlayer?.eapm || Math.round((secondaryPlayer?.apm || 0) * 0.7),
    buildOrder: primaryPlayerData.buildOrder,
    
    // Training plan
    trainingPlan
  };
  
  return parsedData;
}

/**
 * Generate strengths based on replay data
 */
function generateStrengths(player: any, buildOrder: any[]): string[] {
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
 * Generate weaknesses based on replay data
 */
function generateWeaknesses(player: any, buildOrder: any[]): string[] {
  const weaknesses: string[] = [];
  
  // Check APM
  if (player.apm < 100) {
    weaknesses.push('Niedrige Aktionsgeschwindigkeit');
  }
  
  // Check for supply blocks (detected by long gaps between similar supply values)
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
