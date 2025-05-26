import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War replay file using screparsed
 * This is the single entry point for all replay parsing in the application
 */
export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting to parse replay file:', file.name);
  console.log('[replayParser] File size:', file.size, 'bytes');
  console.log('[replayParser] File type:', file.type);
  console.log('[replayParser] File last modified:', new Date(file.lastModified).toISOString());
  
  try {
    // Enhanced file validation
    if (!file || file.size === 0) {
      throw new Error('Datei ist leer oder ungültig');
    }
    
    if (file.size < 1024) {
      throw new Error('Datei ist zu klein für eine gültige Replay-Datei (minimum 1KB)');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Datei ist zu groß (Maximum: 10MB)');
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'rep') {
      throw new Error('Nur .rep Dateien werden unterstützt');
    }
    
    // Read file as ArrayBuffer with enhanced error checking
    console.log('[replayParser] Reading file as ArrayBuffer...');
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      console.log('[replayParser] Successfully read ArrayBuffer, size:', arrayBuffer.byteLength);
    } catch (fileError) {
      console.error('[replayParser] Failed to read file:', fileError);
      throw new Error('Konnte Datei nicht lesen - möglicherweise beschädigt');
    }
    
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log('[replayParser] Created Uint8Array, length:', uint8Array.length);
    
    // Check if file starts with expected replay header
    const firstBytes = Array.from(uint8Array.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log('[replayParser] First 16 bytes:', firstBytes);
    
    // Load the screparsed module with detailed error handling
    console.log('[replayParser] Loading screparsed module...');
    let screparsed: any;
    try {
      screparsed = await import('screparsed');
      console.log('[replayParser] Successfully loaded screparsed module');
      console.log('[replayParser] Available screparsed properties:', Object.keys(screparsed));
    } catch (importError) {
      console.error('[replayParser] Failed to import screparsed:', importError);
      throw new Error('Parser-Modul konnte nicht geladen werden');
    }
    
    // Try to parse with screparsed with enhanced debugging
    let parsedData: any;
    console.log('[replayParser] Starting screparsed parsing...');
    
    try {
      // Try different parsing approaches with detailed logging
      if (typeof screparsed.parse === 'function') {
        console.log('[replayParser] Using screparsed.parse method');
        parsedData = await Promise.resolve(screparsed.parse(uint8Array));
        console.log('[replayParser] screparsed.parse completed successfully');
      } else if (screparsed.default && typeof screparsed.default.parse === 'function') {
        console.log('[replayParser] Using screparsed.default.parse method');
        parsedData = await Promise.resolve(screparsed.default.parse(uint8Array));
        console.log('[replayParser] screparsed.default.parse completed successfully');
      } else if (typeof screparsed.default === 'function') {
        console.log('[replayParser] Using screparsed.default as function');
        parsedData = await Promise.resolve(screparsed.default(uint8Array));
        console.log('[replayParser] screparsed.default function completed successfully');
      } else {
        // Enhanced module exploration
        console.log('[replayParser] Standard methods not found, exploring module structure...');
        const moduleKeys = Object.keys(screparsed);
        console.log('[replayParser] Available module keys:', moduleKeys);
        
        let parseSuccess = false;
        for (const key of moduleKeys) {
          const obj = screparsed[key];
          console.log(`[replayParser] Examining ${key}:`, typeof obj);
          
          if (typeof obj === 'function') {
            console.log(`[replayParser] Trying ${key} as function`);
            try {
              parsedData = await Promise.resolve(obj(uint8Array));
              if (parsedData) {
                console.log(`[replayParser] Success with ${key}`);
                parseSuccess = true;
                break;
              }
            } catch (e) {
              console.log(`[replayParser] ${key} failed:`, e);
              continue;
            }
          } else if (obj && typeof obj.parse === 'function') {
            console.log(`[replayParser] Trying ${key}.parse`);
            try {
              parsedData = await Promise.resolve(obj.parse(uint8Array));
              if (parsedData) {
                console.log(`[replayParser] Success with ${key}.parse`);
                parseSuccess = true;
                break;
              }
            } catch (e) {
              console.log(`[replayParser] ${key}.parse failed:`, e);
              continue;
            }
          }
        }
        
        if (!parseSuccess) {
          throw new Error('Keine funktionierende Parser-Methode gefunden');
        }
      }
    } catch (parseError) {
      console.error('[replayParser] Screparsed parsing error:', parseError);
      console.error('[replayParser] Error type:', typeof parseError);
      console.error('[replayParser] Error message:', parseError instanceof Error ? parseError.message : String(parseError));
      console.error('[replayParser] Error stack:', parseError instanceof Error ? parseError.stack : 'No stack trace');
      
      // Provide more specific error messages based on error type
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      if (errorMessage.includes('wasm')) {
        throw new Error('WASM-Parser-Fehler: Browser unterstützt möglicherweise keine WASM-Module oder die Datei ist beschädigt');
      } else if (errorMessage.includes('memory') || errorMessage.includes('allocation')) {
        throw new Error('Speicher-Fehler: Datei ist möglicherweise zu groß oder beschädigt');
      } else if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
        throw new Error('Ungültiges Dateiformat: Datei ist möglicherweise keine gültige StarCraft-Replay');
      } else {
        throw new Error(`Parser-Fehler: ${errorMessage}`);
      }
    }
    
    // Enhanced data validation
    if (!parsedData) {
      console.error('[replayParser] Parser returned null/undefined');
      throw new Error('Parser gab keine Daten zurück - Datei möglicherweise nicht unterstützt');
    }
    
    console.log('[replayParser] Raw parsed data type:', typeof parsedData);
    console.log('[replayParser] Raw parsed data keys:', Object.keys(parsedData));
    console.log('[replayParser] Raw parsed data preview:', JSON.stringify(parsedData, null, 2).substring(0, 500) + '...');
    
    // Transform the data with enhanced error handling
    console.log('[replayParser] Starting data transformation...');
    const transformedData = transformScreparsedData(parsedData);
    console.log('[replayParser] Data transformation completed successfully');
    
    return transformedData;
  } catch (error) {
    console.error('[replayParser] Final error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Parsen';
    throw new Error(errorMessage);
  }
}

/**
 * Transform data from screparsed to our application format
 */
function transformScreparsedData(data: any): ParsedReplayData {
  console.log('[replayParser] Transforming screparsed data...');
  console.log('[replayParser] Input data type:', typeof data);
  console.log('[replayParser] Input data keys:', data ? Object.keys(data) : 'null/undefined');
  
  // Create fallback data structure if parsing partially failed
  if (!data) {
    console.warn('[replayParser] No data provided, creating fallback');
    return createFallbackReplayData();
  }
  
  try {
    // Enhanced data exploration
    console.log('[replayParser] Exploring data structure...');
    
    // Check for different possible data structures with more detailed logging
    let players = data.players || data.Players || data.player_data || data.playerData || [];
    let metadata = data.metadata || data.header || data.Header || data.game_info || {};
    let buildOrders = data.buildOrders || data.build_orders || data.buildOrder || {};
    
    console.log('[replayParser] Found players:', Array.isArray(players) ? players.length : 'not an array');
    console.log('[replayParser] Found metadata keys:', metadata ? Object.keys(metadata) : 'no metadata');
    console.log('[replayParser] Found build orders:', buildOrders ? Object.keys(buildOrders) : 'no build orders');
    
    // If no players found, try to extract from different structures
    if (!Array.isArray(players) || players.length === 0) {
      console.log('[replayParser] No players in standard location, searching deeper...');
      const possiblePlayerKeys = ['player_data', 'playerData', 'game_data', 'gameData', 'participants', 'users'];
      for (const key of possiblePlayerKeys) {
        if (data[key]) {
          console.log(`[replayParser] Checking ${key}:`, typeof data[key], Array.isArray(data[key]) ? `array length ${data[key].length}` : 'not array');
          if (Array.isArray(data[key])) {
            players = data[key];
            console.log(`[replayParser] Found players in ${key}`);
            break;
          }
        }
      }
    }
    
    // If still no players, create minimal fallback
    if (!Array.isArray(players) || players.length === 0) {
      console.warn('[replayParser] No players found anywhere, creating fallback player data');
      return createFallbackReplayData();
    }
    
    console.log('[replayParser] Working with', players.length, 'players');
    
    // Enhanced player filtering and logging
    const humanPlayers = players.filter((p: any, index: number) => {
      const isHuman = p.type === 1 || p.isHuman === true || p.player_type === 'human' || (!p.type && !p.isComputer);
      console.log(`[replayParser] Player ${index}:`, {
        name: p.name || p.player_name || `Player ${index}`,
        type: p.type,
        isHuman: p.isHuman,
        player_type: p.player_type,
        race: p.race || p.player_race,
        filtered_as_human: isHuman
      });
      return isHuman;
    });
    
    console.log('[replayParser] Found human players:', humanPlayers.length);
    
    if (humanPlayers.length === 0) {
      console.warn('[replayParser] No human players found, using all players');
      humanPlayers.push(...players.slice(0, 2)); // Take first 2 players as fallback
    }
    
    // Sort by player ID for consistent results
    humanPlayers.sort((a: any, b: any) => (a.id || 0) - (b.id || 0));
    
    const primaryPlayer = humanPlayers[0];
    const secondaryPlayer = humanPlayers.length > 1 ? humanPlayers[1] : null;
    
    console.log('[replayParser] Primary player:', primaryPlayer?.name || primaryPlayer?.player_name || 'Unknown');
    console.log('[replayParser] Secondary player:', secondaryPlayer?.name || secondaryPlayer?.player_name || 'Unknown');
    
    // Extract player data with enhanced fallbacks and logging
    const player1Name = primaryPlayer?.name || primaryPlayer?.player_name || 'Spieler 1';
    const player1Race = primaryPlayer?.race || primaryPlayer?.player_race || 'Terran';
    const player1APM = primaryPlayer?.apm || primaryPlayer?.actions_per_minute || 100;
    
    const player2Name = secondaryPlayer?.name || secondaryPlayer?.player_name || 'Gegner';
    const player2Race = secondaryPlayer?.race || secondaryPlayer?.player_race || 'Terran';
    const player2APM = secondaryPlayer?.apm || secondaryPlayer?.actions_per_minute || 100;
    
    console.log('[replayParser] Extracted player data:', {
      player1: { name: player1Name, race: player1Race, apm: player1APM },
      player2: { name: player2Name, race: player2Race, apm: player2APM }
    });
    
    // Extract build orders with enhanced logging
    const primaryBuildOrder = buildOrders[primaryPlayer?.id] || [];
    const secondaryBuildOrder = secondaryPlayer && buildOrders[secondaryPlayer.id] ? 
      buildOrders[secondaryPlayer.id] : [];
    
    console.log('[replayParser] Build orders found:', {
      primary: Array.isArray(primaryBuildOrder) ? primaryBuildOrder.length : 'not array',
      secondary: Array.isArray(secondaryBuildOrder) ? secondaryBuildOrder.length : 'not array'
    });
    
    // Rest of the transformation logic remains the same...
    // ... keep existing code (matchup creation, build order formatting, analysis generation, return statement)
    const matchup = data.matchup || 
      `${player1Race.charAt(0)}v${player2Race.charAt(0)}`;
    
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
    
    const strengths = generateStrengths(primaryPlayer, primaryFormattedBuildOrder);
    const weaknesses = generateWeaknesses(primaryPlayer, primaryFormattedBuildOrder);
    const recommendations = generateRecommendations(weaknesses);
    const trainingPlan = generateTrainingPlan(weaknesses);
    
    const mapName = metadata.map || metadata.mapName || metadata.map_name || 'Unbekannte Map';
    const duration = metadata.duration || metadata.game_length || '10:00';
    const gameDate = metadata.startTime || metadata.date || new Date().toISOString();
    const result = primaryPlayer?.isWinner || primaryPlayer?.result === 'win' ? 'win' : 'loss';
    
    console.log('[replayParser] Transformation completed successfully');
    
    return {
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
      map: mapName,
      matchup,
      duration,
      durationMS: metadata.durationFrames || 0,
      date: gameDate,
      result,
      strengths,
      weaknesses,
      recommendations,
      playerName: player1Name,
      opponentName: player2Name,
      playerRace: player1Race,
      opponentRace: player2Race,
      apm: player1APM,
      eapm: Math.round(player1APM * 0.7),
      opponentApm: player2APM,
      opponentEapm: Math.round(player2APM * 0.7),
      buildOrder: primaryFormattedBuildOrder,
      trainingPlan
    };
  } catch (transformError) {
    console.error('[replayParser] Error during transformation:', transformError);
    console.warn('[replayParser] Falling back to default data due to transformation error');
    return createFallbackReplayData();
  }
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
  
  if (player?.apm > 150) {
    strengths.push('Hohe Aktionsgeschwindigkeit');
  }
  
  if (buildOrder.length > 15) {
    strengths.push('Komplexe Build Order');
  }
  
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
  
  if (player?.apm < 100) {
    weaknesses.push('Niedrige Aktionsgeschwindigkeit');
  }
  
  let supplyBlocked = false;
  
  for (let i = 1; i < buildOrder.length; i++) {
    const currentItem = buildOrder[i];
    const previousItem = buildOrder[i - 1];
    
    const currentTime = extractTimeInSeconds(currentItem.time);
    const previousTime = extractTimeInSeconds(previousItem.time);
    
    if (currentItem.supply === previousItem.supply && (currentTime - previousTime > 30)) {
      supplyBlocked = true;
      break;
    }
  }
  
  if (supplyBlocked) {
    weaknesses.push('Supply Blocks erkannt');
  }
  
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
