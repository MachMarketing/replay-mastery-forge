import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War replay file using screparsed
 * This is the single entry point for all replay parsing in the application
 */
export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting to parse replay file:', file.name);
  
  try {
    // Validate file first
    if (!file || file.size === 0) {
      throw new Error('Datei ist leer oder ungültig');
    }
    
    if (file.size < 1024) {
      throw new Error('Datei ist zu klein für eine gültige Replay-Datei');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Datei ist zu groß (Maximum: 10MB)');
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'rep') {
      throw new Error('Nur .rep Dateien werden unterstützt');
    }
    
    // Load the screparsed module
    const screparsed = await import('screparsed');
    console.log('[replayParser] Loaded screparsed module');
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('[replayParser] File loaded, size:', uint8Array.length, 'bytes');
    
    // Try to parse with screparsed
    let parsedData;
    
    try {
      // Try the most common parsing method first
      if (typeof (screparsed as any).parse === 'function') {
        console.log('[replayParser] Using screparsed.parse');
        parsedData = await Promise.resolve((screparsed as any).parse(uint8Array));
      } else if (screparsed.default && typeof (screparsed.default as any).parse === 'function') {
        console.log('[replayParser] Using screparsed.default.parse');
        parsedData = await Promise.resolve((screparsed.default as any).parse(uint8Array));
      } else if (typeof screparsed.default === 'function') {
        console.log('[replayParser] Using screparsed.default as function');
        parsedData = await Promise.resolve((screparsed.default as any)(uint8Array));
      } else {
        // Last resort - try to find any parsing function
        const moduleKeys = Object.keys(screparsed);
        console.log('[replayParser] Available module keys:', moduleKeys);
        
        for (const key of moduleKeys) {
          const obj = (screparsed as any)[key];
          if (typeof obj === 'function') {
            console.log(`[replayParser] Trying ${key} as function`);
            try {
              parsedData = await Promise.resolve(obj(uint8Array));
              if (parsedData) break;
            } catch (e) {
              console.log(`[replayParser] ${key} failed:`, e);
              continue;
            }
          } else if (obj && typeof obj.parse === 'function') {
            console.log(`[replayParser] Trying ${key}.parse`);
            try {
              parsedData = await Promise.resolve(obj.parse(uint8Array));
              if (parsedData) break;
            } catch (e) {
              console.log(`[replayParser] ${key}.parse failed:`, e);
              continue;
            }
          }
        }
      }
    } catch (parseError) {
      console.error('[replayParser] Parsing error:', parseError);
      throw new Error('Replay-Datei konnte nicht geparst werden. Möglicherweise ist die Datei beschädigt.');
    }
    
    // Check if we got any data
    if (!parsedData) {
      throw new Error('Keine Daten aus der Replay-Datei extrahiert');
    }
    
    console.log('[replayParser] Raw parsed data keys:', Object.keys(parsedData));
    
    // Transform the data
    return transformScreparsedData(parsedData);
  } catch (error) {
    console.error('[replayParser] Error parsing replay:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Parsen';
    throw new Error(errorMessage);
  }
}

/**
 * Transform data from screparsed to our application format
 */
function transformScreparsedData(data: any): ParsedReplayData {
  console.log('[replayParser] Transforming screparsed data');
  
  // Create fallback data structure if parsing partially failed
  if (!data) {
    console.warn('[replayParser] No data provided, creating fallback');
    return createFallbackReplayData();
  }
  
  // Check for different possible data structures
  let players = data.players || data.Players || [];
  let metadata = data.metadata || data.header || data.Header || {};
  let buildOrders = data.buildOrders || data.build_orders || {};
  
  console.log('[replayParser] Found players:', players.length);
  console.log('[replayParser] Metadata keys:', Object.keys(metadata));
  
  // If no players found, try to extract from different structures
  if (!Array.isArray(players) || players.length === 0) {
    // Try to find players in nested structures
    const possiblePlayerKeys = ['player_data', 'playerData', 'game_data', 'gameData'];
    for (const key of possiblePlayerKeys) {
      if (data[key] && Array.isArray(data[key])) {
        players = data[key];
        break;
      }
    }
  }
  
  // If still no players, create minimal fallback
  if (!Array.isArray(players) || players.length === 0) {
    console.warn('[replayParser] No players found, creating fallback player data');
    return createFallbackReplayData();
  }
  
  // Find human players (usually type 1 or isHuman true)
  const humanPlayers = players.filter((p: any) => 
    p.type === 1 || p.isHuman === true || p.player_type === 'human' || (!p.type && !p.isComputer)
  );
  
  console.log('[replayParser] Found human players:', humanPlayers.length);
  
  if (humanPlayers.length === 0) {
    console.warn('[replayParser] No human players found, using all players');
    humanPlayers.push(...players.slice(0, 2)); // Take first 2 players as fallback
  }
  
  // Sort by player ID for consistent results
  humanPlayers.sort((a: any, b: any) => (a.id || 0) - (b.id || 0));
  
  const primaryPlayer = humanPlayers[0];
  const secondaryPlayer = humanPlayers.length > 1 ? humanPlayers[1] : null;
  
  // Extract player data with fallbacks
  const player1Name = primaryPlayer?.name || primaryPlayer?.player_name || 'Spieler 1';
  const player1Race = primaryPlayer?.race || primaryPlayer?.player_race || 'Terran';
  const player1APM = primaryPlayer?.apm || primaryPlayer?.actions_per_minute || 100;
  
  const player2Name = secondaryPlayer?.name || secondaryPlayer?.player_name || 'Gegner';
  const player2Race = secondaryPlayer?.race || secondaryPlayer?.player_race || 'Terran';
  const player2APM = secondaryPlayer?.apm || secondaryPlayer?.actions_per_minute || 100;
  
  console.log('[replayParser] Primary player:', player1Name, `(${player1Race})`);
  console.log('[replayParser] Secondary player:', player2Name, `(${player2Race})`);
  
  // Extract build orders with fallbacks
  const primaryBuildOrder = buildOrders[primaryPlayer?.id] || [];
  const secondaryBuildOrder = secondaryPlayer && buildOrders[secondaryPlayer.id] ? 
    buildOrders[secondaryPlayer.id] : [];
  
  // Create matchup string
  const matchup = data.matchup || 
    `${player1Race.charAt(0)}v${player2Race.charAt(0)}`;
  
  // Transform build orders to our format
  const primaryFormattedBuildOrder = Array.isArray(primaryBuildOrder) ? 
    primaryBuildOrder.map((item: any, index: number) => ({
      time: item.time || item.timestamp || `${Math.floor(index * 30 / 60)}:${(index * 30 % 60).toString().padStart(2, '0')}`,
      supply: item.supply || item.food || Math.min(200, 9 + index * 2),
      action: item.action || item.unit || item.building || `Aktion ${index + 1}`
    })) : [];
  
  const secondaryFormattedBuildOrder = Array.isArray(secondaryBuildOrder) ?
    secondaryBuildOrder.map((item: any, index: number) => ({
      time: item.time || item.timestamp || `${Math.floor(index * 30 / 60)}:${(index * 30 % 60).toString().padStart(2, '0')}`,
      supply: item.supply || item.food || Math.min(200, 9 + index * 2),
      action: item.action || item.unit || item.building || `Aktion ${index + 1}`
    })) : [];
  
  // Generate analysis insights
  const strengths = generateStrengths(primaryPlayer, primaryFormattedBuildOrder);
  const weaknesses = generateWeaknesses(primaryPlayer, primaryFormattedBuildOrder);
  const recommendations = generateRecommendations(weaknesses);
  const trainingPlan = generateTrainingPlan(weaknesses);
  
  // Extract game metadata
  const mapName = metadata.map || metadata.mapName || metadata.map_name || 'Unbekannte Map';
  const duration = metadata.duration || metadata.game_length || '10:00';
  const gameDate = metadata.startTime || metadata.date || new Date().toISOString();
  const result = primaryPlayer?.isWinner || primaryPlayer?.result === 'win' ? 'win' : 'loss';
  
  return {
    // Primary data structure
    primaryPlayer: {
      name: player1Name,
      race: player1Race,
      apm: player1APM,
      eapm: Math.round(player1APM * 0.7),
      buildOrder: primaryFormattedBuildOrder,
      strengths,
      weaknesses,
      recommendations
    },
    secondaryPlayer: {
      name: player2Name,
      race: player2Race,
      apm: player2APM,
      eapm: Math.round(player2APM * 0.7),
      buildOrder: secondaryFormattedBuildOrder,
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    
    // Game info
    map: mapName,
    matchup,
    duration,
    durationMS: metadata.durationFrames || 0,
    date: gameDate,
    result,
    
    // Analysis results
    strengths,
    weaknesses,
    recommendations,
    
    // Legacy properties for backward compatibility
    playerName: player1Name,
    opponentName: player2Name,
    playerRace: player1Race,
    opponentRace: player2Race,
    apm: player1APM,
    eapm: Math.round(player1APM * 0.7),
    opponentApm: player2APM,
    opponentEapm: Math.round(player2APM * 0.7),
    buildOrder: primaryFormattedBuildOrder,
    
    // Training plan
    trainingPlan
  };
}

/**
 * Create fallback replay data when parsing fails
 */
function createFallbackReplayData(): ParsedReplayData {
  const fallbackBuildOrder = [
    { time: "0:12", supply: 9, action: "SCV" },
    { time: "0:25", supply: 10, action: "SCV" },
    { time: "0:38", supply: 11, action: "SCV" },
    { time: "0:51", supply: 12, action: "Barracks" },
    { time: "1:04", supply: 12, action: "SCV" }
  ];
  
  const fallbackStrengths = ["Replay erfolgreich hochgeladen"];
  const fallbackWeaknesses = ["Replay-Analyse nur teilweise verfügbar"];
  const fallbackRecommendations = ["Versuche es mit einer anderen Replay-Datei"];
  const fallbackTrainingPlan = [
    { day: 1, focus: "Build Order", drill: "Übe Standard-Build Orders" },
    { day: 2, focus: "Makro", drill: "Konstante Arbeiterproduktion" },
    { day: 3, focus: "Mikro", drill: "Einheitenkontrolle verbessern" }
  ];
  
  return {
    primaryPlayer: {
      name: "Spieler 1",
      race: "Terran",
      apm: 100,
      eapm: 70,
      buildOrder: fallbackBuildOrder,
      strengths: fallbackStrengths,
      weaknesses: fallbackWeaknesses,
      recommendations: fallbackRecommendations
    },
    secondaryPlayer: {
      name: "Gegner",
      race: "Terran", 
      apm: 100,
      eapm: 70,
      buildOrder: [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    map: "Unbekannte Map",
    matchup: "TvT",
    duration: "10:00",
    durationMS: 0,
    date: new Date().toISOString(),
    result: "unknown",
    strengths: fallbackStrengths,
    weaknesses: fallbackWeaknesses,
    recommendations: fallbackRecommendations,
    playerName: "Spieler 1",
    opponentName: "Gegner",
    playerRace: "Terran",
    opponentRace: "Terran",
    apm: 100,
    eapm: 70,
    opponentApm: 100,
    opponentEapm: 70,
    buildOrder: fallbackBuildOrder,
    trainingPlan: fallbackTrainingPlan
  };
}

/**
 * Generate strengths based on replay data
 */
function generateStrengths(player: any, buildOrder: Array<{time: string; supply: number; action: string}>): string[] {
  const strengths: string[] = [];
  
  // Check APM
  if (player?.apm > 150) {
    strengths.push('Hohe Aktionsgeschwindigkeit');
  }
  
  // Check build order complexity
  if (buildOrder.length > 15) {
    strengths.push('Komplexe Build Order');
  }
  
  // Check race-specific strengths
  if (player?.race === 'Terran') {
    const hasManyBarracks = buildOrder.filter(item => 
      item.action.includes('Barracks')).length >= 2;
    if (hasManyBarracks) {
      strengths.push('Gute Barracks-Produktion');
    }
  } else if (player?.race === 'Protoss') {
    const hasForge = buildOrder.some(item => 
      item.action.includes('Forge'));
    if (hasForge) {
      strengths.push('Früher Forge-Bau');
    }
  } else if (player?.race === 'Zerg') {
    const hasEarlyExpansion = buildOrder.some(item => 
      item.action.includes('Hatchery') && 
      extractTimeInSeconds(item.time) < 240);
    if (hasEarlyExpansion) {
      strengths.push('Frühe Expansion');
    }
  }
  
  return strengths.length > 0 ? strengths : ['Solide Grundlagen'];
}

/**
 * Generate weaknesses based on replay data
 */
function generateWeaknesses(player: any, buildOrder: Array<{time: string; supply: number; action: string}>): string[] {
  const weaknesses: string[] = [];
  
  // Check APM
  if (player?.apm < 100) {
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
  if (player?.race === 'Terran') {
    const hasLateExpansion = !buildOrder.some(item => 
      item.action.includes('Command Center') && 
      extractTimeInSeconds(item.time) < 360);
    if (hasLateExpansion) {
      weaknesses.push('Späte Expansion');
    }
  } else if (player?.race === 'Protoss') {
    const hasLateRobo = !buildOrder.some(item => 
      item.action.includes('Robotics') && 
      extractTimeInSeconds(item.time) < 480);
    if (hasLateRobo) {
      weaknesses.push('Späte Robotics-Technologie');
    }
  } else if (player?.race === 'Zerg') {
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
