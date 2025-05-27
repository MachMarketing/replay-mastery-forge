
import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War replay file using screparsed
 * Clean implementation based on actual screparsed API
 */
export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting screparsed parsing for:', file.name);
  console.log('[replayParser] File size:', file.size, 'bytes');
  
  // Basic file validation
  if (!file || file.size === 0) {
    throw new Error('Datei ist leer oder ungültig');
  }
  
  if (file.size < 1024) {
    throw new Error('Datei ist zu klein für eine gültige Replay-Datei');
  }
  
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Datei ist zu groß (Maximum: 10MB)');
  }
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'rep') {
    throw new Error('Nur .rep Dateien werden unterstützt');
  }
  
  // Read file as ArrayBuffer
  console.log('[replayParser] Reading file as ArrayBuffer...');
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
    console.log('[replayParser] File read successfully, size:', arrayBuffer.byteLength);
  } catch (error) {
    console.error('[replayParser] Failed to read file:', error);
    throw new Error('Konnte Datei nicht lesen');
  }
  
  // Parse with screparsed
  console.log('[replayParser] Parsing with screparsed...');
  try {
    const { ReplayParser } = await import('screparsed');
    const parser = ReplayParser.fromArrayBuffer(arrayBuffer);
    const replayData = await parser.parse();
    
    if (!replayData) {
      throw new Error('Screparsed konnte keine Daten extrahieren');
    }
    
    console.log('[replayParser] Screparsed parsing successful!');
    console.log('[replayParser] Available properties:', Object.keys(replayData));
    
    // Log the actual structure we get from screparsed
    logScreparsedStructure(replayData);
    
    return transformScreparsedData(replayData, file.name);
    
  } catch (error) {
    console.error('[replayParser] Screparsed parsing failed:', error);
    throw new Error(`Replay-Parsing fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}

/**
 * Log the actual structure we get from screparsed to understand the API
 */
function logScreparsedStructure(data: any): void {
  console.log('[replayParser] 🔍 Screparsed Data Structure Analysis:');
  console.log('[replayParser] Top-level keys:', Object.keys(data));
  
  // Check for players
  if (data.players) {
    console.log('[replayParser] Players found:', data.players.length);
    data.players.forEach((player: any, index: number) => {
      console.log(`[replayParser] Player ${index}:`, {
        name: player.name,
        race: player.race,
        type: player.type,
        id: player.id,
        apm: player.apm,
        eapm: player.eapm,
        allKeys: Object.keys(player)
      });
    });
  }
  
  // Check for game metadata
  console.log('[replayParser] Game metadata:', {
    frames: data.frames,
    durationMs: data.durationMs,
    mapName: data.mapName,
    mapWidth: data.mapWidth,
    mapHeight: data.mapHeight
  });
  
  // Check for commands
  if (data.commands) {
    console.log('[replayParser] Commands found:', data.commands.length);
    if (data.commands.length > 0) {
      console.log('[replayParser] Sample command:', data.commands[0]);
    }
  }
  
  // Check for any build order data
  if (data.buildOrders) {
    console.log('[replayParser] Build orders found:', data.buildOrders);
  }
  
  // Log all available properties for debugging
  console.log('[replayParser] All data properties:', JSON.stringify(Object.keys(data), null, 2));
}

/**
 * Transform screparsed data to our application format
 */
function transformScreparsedData(data: any, filename: string): ParsedReplayData {
  console.log('[replayParser] Transforming screparsed data...');
  
  // Extract players
  const players = data.players || [];
  console.log('[replayParser] Processing players:', players.length);
  
  if (players.length < 2) {
    throw new Error('Nicht genügend Spieler gefunden (mindestens 2 erforderlich)');
  }
  
  // Get first two players (assuming 1v1)
  const player1 = players[0];
  const player2 = players[1];
  
  // Validate player data
  if (!player1?.name || !player2?.name) {
    throw new Error('Ungültige Spielerdaten - Spielernamen fehlen');
  }
  
  // Extract game metadata
  const gameFrames = data.frames || 0;
  const gameDurationMs = data.durationMs || (gameFrames * (1000/24)); // 24 FPS
  const mapName = data.mapName || 'Unbekannte Karte';
  
  console.log('[replayParser] Game info:', {
    frames: gameFrames,
    durationMs: gameDurationMs,
    mapName: mapName,
    formattedDuration: formatDuration(gameFrames)
  });
  
  // Extract APM data
  const player1APM = player1.apm || 0;
  const player2APM = player2.apm || 0;
  const player1EAPM = player1.eapm || Math.round(player1APM * 0.7);
  const player2EAPM = player2.eapm || Math.round(player2APM * 0.7);
  
  console.log('[replayParser] APM data:', {
    player1: { name: player1.name, apm: player1APM, eapm: player1EAPM },
    player2: { name: player2.name, apm: player2APM, eapm: player2EAPM }
  });
  
  // Extract build orders from commands
  const player1BuildOrder = extractBuildOrder(data.commands, player1.id);
  const player2BuildOrder = extractBuildOrder(data.commands, player2.id);
  
  console.log('[replayParser] Build orders extracted:', {
    player1Items: player1BuildOrder.length,
    player2Items: player2BuildOrder.length
  });
  
  // Generate analysis
  const analysis = generateGameAnalysis(player1, player2, {
    frames: gameFrames,
    mapName: mapName,
    commands: data.commands || []
  });
  
  // Create primary player data
  const primaryPlayer = {
    name: player1.name,
    race: normalizeRace(player1.race),
    apm: player1APM,
    eapm: player1EAPM,
    buildOrder: player1BuildOrder,
    strengths: analysis.player1Analysis.strengths,
    weaknesses: analysis.player1Analysis.weaknesses,
    recommendations: analysis.player1Analysis.recommendations
  };
  
  // Create secondary player data
  const secondaryPlayer = {
    name: player2.name,
    race: normalizeRace(player2.race),
    apm: player2APM,
    eapm: player2EAPM,
    buildOrder: player2BuildOrder,
    strengths: analysis.player2Analysis.strengths,
    weaknesses: analysis.player2Analysis.weaknesses,
    recommendations: analysis.player2Analysis.recommendations
  };
  
  // Create matchup string
  const matchup = `${getRaceInitial(primaryPlayer.race)}v${getRaceInitial(secondaryPlayer.race)}`;
  
  // Return complete parsed data
  return {
    primaryPlayer,
    secondaryPlayer,
    map: mapName,
    matchup,
    duration: formatDuration(gameFrames),
    durationMS: gameDurationMs,
    date: new Date().toISOString(),
    result: determineGameResult(player1, player2),
    strengths: analysis.player1Analysis.strengths,
    weaknesses: analysis.player1Analysis.weaknesses,
    recommendations: analysis.player1Analysis.recommendations,
    
    // Legacy properties for backward compatibility
    playerName: primaryPlayer.name,
    opponentName: secondaryPlayer.name,
    playerRace: primaryPlayer.race,
    opponentRace: secondaryPlayer.race,
    apm: primaryPlayer.apm,
    eapm: primaryPlayer.eapm,
    opponentApm: secondaryPlayer.apm,
    opponentEapm: secondaryPlayer.eapm,
    buildOrder: primaryPlayer.buildOrder,
    
    trainingPlan: analysis.trainingPlan
  };
}

/**
 * Extract build order from replay commands
 */
function extractBuildOrder(commands: any[], playerId: number): Array<{time: string; supply: number; action: string}> {
  if (!commands || !Array.isArray(commands) || commands.length === 0) {
    console.log('[replayParser] No commands available for build order extraction');
    return [];
  }
  
  console.log('[replayParser] Extracting build order for player ID:', playerId);
  console.log('[replayParser] Total commands:', commands.length);
  
  const buildActions: Array<{time: string; supply: number; action: string}> = [];
  let currentSupply = 4; // Starting supply for most races
  
  // Filter commands for this player and build-related actions
  const playerCommands = commands
    .filter(cmd => cmd.playerId === playerId || cmd.player === playerId)
    .filter(cmd => isBuildCommand(cmd))
    .slice(0, 30); // Limit to first 30 build actions
  
  console.log('[replayParser] Filtered build commands for player:', playerCommands.length);
  
  playerCommands.forEach((cmd, index) => {
    const timeInFrames = cmd.frame || cmd.time || 0;
    const actionName = getBuildActionName(cmd);
    
    // Estimate supply progression
    if (actionName.toLowerCase().includes('worker') || 
        actionName.toLowerCase().includes('probe') ||
        actionName.toLowerCase().includes('scv') ||
        actionName.toLowerCase().includes('drone')) {
      currentSupply += 1;
    } else if (actionName.toLowerCase().includes('unit')) {
      currentSupply += 2;
    }
    
    buildActions.push({
      time: formatDuration(timeInFrames),
      supply: Math.min(currentSupply, 200),
      action: actionName
    });
  });
  
  return buildActions;
}

/**
 * Check if a command is a build-related command
 */
function isBuildCommand(cmd: any): boolean {
  if (!cmd) return false;
  
  // Check command type
  const cmdType = (cmd.type || '').toString().toLowerCase();
  const cmdName = (cmd.name || '').toString().toLowerCase();
  
  return cmdType.includes('build') ||
         cmdType.includes('train') ||
         cmdType.includes('research') ||
         cmdName.includes('build') ||
         cmdName.includes('train') ||
         cmdName.includes('research');
}

/**
 * Extract action name from build command
 */
function getBuildActionName(cmd: any): string {
  if (cmd.unitType) return cmd.unitType;
  if (cmd.buildingType) return cmd.buildingType;
  if (cmd.name) return cmd.name;
  if (cmd.action) return cmd.action;
  return 'Build Action';
}

/**
 * Format frames to time string (mm:ss)
 */
function formatDuration(frames: number): string {
  const seconds = Math.floor(frames / 24); // 24 FPS
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Normalize race name
 */
function normalizeRace(race: any): string {
  const raceStr = String(race || '').toLowerCase();
  if (raceStr.includes('protoss') || raceStr === 'p') return 'Protoss';
  if (raceStr.includes('terran') || raceStr === 't') return 'Terran';
  if (raceStr.includes('zerg') || raceStr === 'z') return 'Zerg';
  return 'Protoss'; // Default fallback
}

/**
 * Get race initial for matchup
 */
function getRaceInitial(race: string): string {
  return race.charAt(0).toUpperCase();
}

/**
 * Determine game result
 */
function determineGameResult(player1: any, player2: any): 'win' | 'loss' | 'unknown' {
  // screparsed might have winner information
  if (player1.isWinner === true) return 'win';
  if (player1.isWinner === false) return 'loss';
  return 'unknown';
}

/**
 * Generate comprehensive game analysis
 */
function generateGameAnalysis(player1: any, player2: any, gameData: any): {
  player1Analysis: { strengths: string[]; weaknesses: string[]; recommendations: string[] };
  player2Analysis: { strengths: string[]; weaknesses: string[]; recommendations: string[] };
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
} {
  const p1Analysis = analyzePlayer(player1, gameData);
  const p2Analysis = analyzePlayer(player2, gameData);
  const trainingPlan = generateTrainingPlan(player1, gameData);
  
  return {
    player1Analysis: p1Analysis,
    player2Analysis: p2Analysis,
    trainingPlan
  };
}

/**
 * Analyze individual player performance
 */
function analyzePlayer(player: any, gameData: any): { strengths: string[]; weaknesses: string[]; recommendations: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  // APM Analysis
  const apm = player.apm || 0;
  if (apm > 150) {
    strengths.push(`Hohe APM (${apm})`);
  } else if (apm < 80 && apm > 0) {
    weaknesses.push(`Niedrige APM (${apm})`);
    recommendations.push('APM durch Hotkey-Training verbessern');
  } else if (apm > 0) {
    strengths.push(`Solide APM (${apm})`);
  }
  
  // Race-specific analysis
  const race = normalizeRace(player.race);
  if (race === 'Protoss') {
    strengths.push('Protoss Technologie-Vorteile');
    recommendations.push('Zealot/Dragoon Balance optimieren');
  } else if (race === 'Terran') {
    strengths.push('Terran Vielseitigkeit');
    recommendations.push('Marine/Tank Kontrolle üben');
  } else if (race === 'Zerg') {
    strengths.push('Zerg Schwarm-Taktiken');
    recommendations.push('Creep Spread und Makro verbessern');
  }
  
  // Game length analysis
  const gameMinutes = (gameData.frames || 0) / (24 * 60);
  if (gameMinutes > 15) {
    strengths.push('Gute Ausdauer in langen Spielen');
  } else if (gameMinutes < 5) {
    recommendations.push('Defensive Strategien für frühe Angriffe entwickeln');
  }
  
  // Ensure minimum content
  if (strengths.length === 0) {
    strengths.push('Grundsolide Spielweise');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Weitere Analyse für detailliertere Schwächen erforderlich');
  }
  if (recommendations.length === 0) {
    recommendations.push('Build Order Timing optimieren');
  }
  
  return { strengths, weaknesses, recommendations };
}

/**
 * Generate personalized training plan
 */
function generateTrainingPlan(player: any, gameData: any): Array<{ day: number; focus: string; drill: string }> {
  const race = normalizeRace(player.race);
  const apm = player.apm || 0;
  
  const plan: Array<{ day: number; focus: string; drill: string }> = [];
  
  // Day 1: APM focused
  if (apm < 100) {
    plan.push({
      day: 1,
      focus: "APM Training",
      drill: `${race} Hotkey-Sequenzen 30 Minuten täglich üben`
    });
  } else {
    plan.push({
      day: 1,
      focus: "Präzision",
      drill: `${race} Build Order perfekt ausführen ohne Fehler`
    });
  }
  
  // Day 2: Race specific
  plan.push({
    day: 2,
    focus: "Rassen-Mechaniken",
    drill: race === 'Protoss' ? 'Pylon/Gateway Timing optimieren' :
           race === 'Terran' ? 'Supply Depot/Barracks Timing' :
           'Overlord/Spawning Pool Timing'
  });
  
  // Day 3: Macro focus
  plan.push({
    day: 3,
    focus: "Makromanagement",
    drill: "Konstante Arbeiterproduktion ohne Unterbrechung"
  });
  
  // Day 4: Micro practice
  plan.push({
    day: 4,
    focus: "Mikromanagement",
    drill: race === 'Protoss' ? 'Stalker Blink-Micro' :
           race === 'Terran' ? 'Marine Splitting' :
           'Zergling Surrounding'
  });
  
  // Day 5: Strategy
  plan.push({
    day: 5,
    focus: "Strategisches Denken",
    drill: `${race} Matchup-spezifische Build Orders studieren`
  });
  
  return plan;
}
