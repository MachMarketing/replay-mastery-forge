
import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War replay file using screparsed (browser-based)
 * This supports both Classic and Remastered replay formats
 * Works entirely in the browser without requiring any local services
 */
export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting to parse replay file with screparsed:', file.name);
  console.log('[replayParser] File size:', file.size, 'bytes');
  
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
  
  // Read file as ArrayBuffer for screparsed
  console.log('[replayParser] Reading file as ArrayBuffer...');
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
    console.log('[replayParser] Successfully read ArrayBuffer, size:', arrayBuffer.byteLength);
  } catch (fileError) {
    console.error('[replayParser] Failed to read file:', fileError);
    throw new Error('Konnte Datei nicht lesen - möglicherweise beschädigt');
  }
  
  // Parse with screparsed (browser-based)
  console.log('[replayParser] Parsing with screparsed...');
  try {
    // Simplify parser initialization: use ReplayParser instance parse()
    const { ReplayParser } = await import('screparsed');
    const parser = ReplayParser.fromArrayBuffer(arrayBuffer);
    const screparsedResult = await parser.parse();
    
    if (!screparsedResult) {
      throw new Error('Screparsed konnte keine gültigen Daten extrahieren');
    }
    console.log('[replayParser] Successfully parsed with screparsed');
    console.log('[replayParser] Full screparsed result structure:', {
      keys: Object.keys(screparsedResult),
      hasPlayers: !!screparsedResult.players,
      playersCount: screparsedResult.players?.length || 0,
      hasDurationMs: !!screparsedResult.durationMs,
      hasFrames: !!screparsedResult.frames,
      hasMapName: !!screparsedResult.mapName,
      hasCommands: !!screparsedResult.commands,
      commandsLength: screparsedResult.commands?.length || 0
    });
    
    // Log detailed player information from screparsed
    if (screparsedResult.players) {
      console.log('[replayParser] Detailed player data from screparsed:');
      screparsedResult.players.forEach((player: any, index: number) => {
        console.log(`[replayParser] Player ${index}:`, {
          allProperties: Object.keys(player),
          name: player.name,
          race: player.race,
          type: player.type,
          id: player.id || player.ID,
          slotID: player.slotID,
          apm: player.apm,
          eapm: player.eapm,
          team: player.team,
          color: player.color
        });
      });
    }
    
    return transformScreparsedResponse(screparsedResult, file.name);
  } catch (screparsedError) {
    console.error('[replayParser] Screparsed failed:', screparsedError);
    throw new Error(`Replay-Parsing fehlgeschlagen: ${screparsedError instanceof Error ? screparsedError.message : 'Unbekannter Fehler'}`);
  }
}

/**
 * Transform screparsed response to our format
 */
function transformScreparsedResponse(data: any, filename: string): ParsedReplayData {
  const players = data.players || [];
  const commands = data.commands || [];
  
  console.log('[replayParser] Transforming data with players:', players);
  console.log('[replayParser] Available data keys:', Object.keys(data));
  console.log('[replayParser] Commands length:', commands.length);
  console.log('[replayParser] Data structure check:', {
    durationMs: data.durationMs,
    frames: data.frames,
    mapName: data.mapName,
    map: data.map
  });
  
  if (players.length < 2) {
    throw new Error('Nicht genügend Spieler in der Replay-Datei gefunden (mindestens 2 erforderlich)');
  }
  
  // Find human players - try multiple type patterns
  let humanPlayers = players.filter((p: any) => {
    // Try different possible type values
    const isHuman = p.type === 'Human' || 
                   p.type === 1 || 
                   p.type === 'human' ||
                   p.playerType === 'Human' ||
                   p.playerType === 1 ||
                   !p.isComputer;
    
    console.log('[replayParser] Player check:', {
      name: p.name,
      type: p.type,
      typeOf: typeof p.type,
      playerType: p.playerType,
      isComputer: p.isComputer,
      isHuman
    });
    
    return isHuman;
  });
  
  // If no human players found with strict filtering, take first two players
  if (humanPlayers.length < 2) {
    console.log('[replayParser] Insufficient human players, using first two players');
    humanPlayers = players.slice(0, 2);
  }
  
  if (humanPlayers.length < 2) {
    throw new Error('Nicht genügend Spieler für eine 1v1 Analyse gefunden');
  }
  
  const player1 = humanPlayers[0];
  const player2 = humanPlayers[1];
  
  if (!player1.name || player1.name.trim() === '') {
    throw new Error('Ungültige Spielerdaten: Spieler 1 Name fehlt');
  }
  
  if (!player2.name || player2.name.trim() === '') {
    throw new Error('Ungültige Spielerdaten: Spieler 2 Name fehlt');
  }
  
  // Extract real APM values from screparsed data
  const player1APM = player1.apm || 0;
  const player2APM = player2.apm || 0;
  const player1EAPM = player1.eapm || Math.round(player1APM * 0.7);
  const player2EAPM = player2.eapm || Math.round(player2APM * 0.7);
  
  console.log('[replayParser] Extracted APM values:', {
    player1: { name: player1.name, apm: player1APM, eapm: player1EAPM },
    player2: { name: player2.name, apm: player2APM, eapm: player2EAPM }
  });
  
  // Extract build orders from commands data
  const player1ID = player1.id || player1.ID || player1.slotID || 0;
  const player2ID = player2.id || player2.ID || player2.slotID || 1;
  
  console.log('[replayParser] Player IDs for build order extraction:', {
    player1ID,
    player2ID,
    commandsAvailable: commands.length
  });
  
  const player1BuildOrder = extractBuildOrderFromCommands(commands, player1ID);
  const player2BuildOrder = extractBuildOrderFromCommands(commands, player2ID);
  
  console.log('[replayParser] Build orders extracted:', {
    player1Items: player1BuildOrder.length,
    player2Items: player2BuildOrder.length
  });
  
  // Extract game duration and map info - use correct property names
  const frames = data.frames || 0;
  const durationMs = data.durationMs || 0;
  const mapName = data.mapName || data.map || 'Unknown Map';
  
  console.log('[replayParser] Game metadata:', {
    frames,
    durationMs,
    mapName,
    duration: formatDuration(frames)
  });
  
  const primaryPlayer = {
    name: player1.name,
    race: normalizeRaceName(player1.race),
    apm: player1APM,
    eapm: player1EAPM,
    buildOrder: player1BuildOrder,
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  const secondaryPlayer = {
    name: player2.name,
    race: normalizeRaceName(player2.race),
    apm: player2APM,
    eapm: player2EAPM,
    buildOrder: player2BuildOrder,
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  const matchup = `${getRaceShortName(primaryPlayer.race)}v${getRaceShortName(secondaryPlayer.race)}`;
  
  // Generate analysis based on real data
  const analysis = generateAnalysis(primaryPlayer, secondaryPlayer, { frames, mapName });
  
  return {
    primaryPlayer: { ...primaryPlayer, ...analysis.primaryAnalysis },
    secondaryPlayer,
    map: mapName,
    matchup,
    duration: formatDuration(frames),
    durationMS: durationMs || frames * (1000/24), // fallback calculation
    date: new Date().toISOString(),
    result: determineResult(player1, player2),
    strengths: analysis.primaryAnalysis.strengths,
    weaknesses: analysis.primaryAnalysis.weaknesses,
    recommendations: analysis.primaryAnalysis.recommendations,
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
 * Calculate APM from command data
 */
function calculateAPMFromCommands(commands: any[], playerId: number, totalFrames: number): number {
  if (!commands || commands.length === 0 || totalFrames === 0) return 0;
  
  const playerCommands = commands.filter(cmd => cmd.playerId === playerId);
  const minutes = totalFrames / (24 * 60); // 24 frames per second
  
  return minutes > 0 ? Math.round(playerCommands.length / minutes) : 0;
}

/**
 * Extract build order from commands
 */
function extractBuildOrderFromCommands(commands: any[], playerId: number): Array<{time: string; supply: number; action: string}> {
  if (!commands || commands.length === 0) {
    console.log('[replayParser] No commands available for build order extraction');
    return [];
  }
  
  console.log('[replayParser] Extracting build order for player ID:', playerId);
  console.log('[replayParser] Sample commands:', commands.slice(0, 5).map(cmd => ({
    type: cmd.type,
    player: cmd.player || cmd.playerId || cmd.playerID,
    frame: cmd.frame,
    data: cmd.data
  })));
  
  const playerCommands = commands
    .filter(cmd => {
      const cmdPlayerId = cmd.player || cmd.playerId || cmd.playerID;
      return cmdPlayerId === playerId;
    })
    .filter(cmd => isBuildCommand(cmd))
    .slice(0, 30) // Limit to first 30 build actions
    .map((cmd, index) => ({
      time: formatDuration(cmd.frame || 0),
      supply: Math.min(4 + index * 2, 200), // Estimate supply progression
      action: getActionName(cmd)
    }));
    
  console.log('[replayParser] Extracted build order items:', playerCommands.length);
  return playerCommands;
}

/**
 * Check if command is a build command
 */
function isBuildCommand(cmd: any): boolean {
  if (!cmd.type && !cmd.action && !cmd.command) return false;
  
  // Common build command types in StarCraft
  const buildCommandTypes = [
    'Build', 'Train', 'Research', 'Upgrade',
    'BuildUnit', 'BuildBuilding', 'TrainUnit',
    'build', 'train', 'research', 'upgrade'
  ];
  
  const cmdType = cmd.type || cmd.action || cmd.command || '';
  return buildCommandTypes.some(type => 
    cmdType.toString().toLowerCase().includes(type.toLowerCase())
  );
}

/**
 * Get action name from command
 */
function getActionName(cmd: any): string {
  if (cmd.unitType) return cmd.unitType;
  if (cmd.buildingType) return cmd.buildingType;
  if (cmd.upgrade) return cmd.upgrade;
  if (cmd.action) return cmd.action;
  if (cmd.type) return cmd.type;
  if (cmd.data && cmd.data.unitType) return cmd.data.unitType;
  if (cmd.data && cmd.data.buildingType) return cmd.data.buildingType;
  return 'Unknown Action';
}

/**
 * Format duration from frames
 */
function formatDuration(frames: number): string {
  const seconds = Math.floor(frames / 24);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Determine game result
 */
function determineResult(player1: any, player2: any): 'win' | 'loss' | 'unknown' {
  if (player1.isWinner === true) return 'win';
  if (player1.isWinner === false) return 'loss';
  return 'unknown';
}

/**
 * Generate analysis based on real player data
 */
function generateAnalysis(player1: any, player2: any, gameInfo: any): {
  primaryAnalysis: { strengths: string[]; weaknesses: string[]; recommendations: string[] };
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
} {
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];
  
  // APM analysis
  if (player1.apm > 150) {
    strengths.push(`Hohe APM (${player1.apm})`);
  } else if (player1.apm < 100 && player1.apm > 0) {
    weaknesses.push(`Niedrige APM (${player1.apm})`);
    recommendations.push('APM durch Hotkey-Training verbessern');
  } else if (player1.apm > 0) {
    strengths.push(`Solide APM (${player1.apm})`);
  } else {
    weaknesses.push('APM-Daten nicht verfügbar');
    recommendations.push('Spiele länger für bessere APM-Messung');
  }
  
  // Build order analysis
  if (player1.buildOrder && player1.buildOrder.length > 10) {
    strengths.push('Detaillierte Build Order verfügbar');
  } else if (player1.buildOrder && player1.buildOrder.length > 0) {
    weaknesses.push('Kurze Build Order - längere Spiele empfohlen');
    recommendations.push('Längere Spiele für bessere Analyse spielen');
  } else {
    weaknesses.push('Keine Build Order Daten verfügbar');
    recommendations.push('Commands-Daten für detaillierte Analyse benötigt');
  }
  
  // Race-specific analysis
  if (player1.race === 'Terran') {
    strengths.push('Terran Mechanik');
    recommendations.push('Marine/Tank Kontrolle üben');
  } else if (player1.race === 'Protoss') {
    strengths.push('Protoss Technologie');
    recommendations.push('Zealot/Dragoon Balance optimieren');
  } else if (player1.race === 'Zerg') {
    strengths.push('Zerg Expansion');
    recommendations.push('Creep Spread verbessern');
  }
  
  // APM comparison
  if (player1.apm > 0 && player2.apm > 0) {
    if (player1.apm > player2.apm + 20) {
      strengths.push('Höhere APM als Gegner');
    } else if (player1.apm < player2.apm - 20) {
      weaknesses.push('Niedrigere APM als Gegner');
      recommendations.push('Geschwindigkeit trainieren');
    }
  }
  
  const trainingPlan = [
    { day: 1, focus: "APM Training", drill: `${player1.race} Hotkeys üben` },
    { day: 2, focus: "Build Order", drill: `Standard ${player1.race} Build perfektionieren` },
    { day: 3, focus: "Makro", drill: "Kontinuierliche Produktion" },
    { day: 4, focus: "Mikro", drill: `${player1.race} Einheiten-Kontrolle` },
    { day: 5, focus: "Strategie", drill: `${player1.race} vs ${player2.race} Matchup` }
  ];
  
  return {
    primaryAnalysis: { strengths, weaknesses, recommendations },
    trainingPlan
  };
}

function getRaceShortName(race: string): string {
  const raceStr = String(race).toLowerCase();
  if (raceStr.includes('terran') || raceStr.includes('t')) return 'T';
  if (raceStr.includes('protoss') || raceStr.includes('p')) return 'P';
  if (raceStr.includes('zerg') || raceStr.includes('z')) return 'Z';
  return 'T';
}

function normalizeRaceName(race: any): string {
  const raceStr = String(race).toLowerCase();
  if (raceStr.includes('terran') || raceStr.includes('t')) return 'Terran';
  if (raceStr.includes('protoss') || raceStr.includes('p')) return 'Protoss';
  if (raceStr.includes('zerg') || raceStr.includes('z')) return 'Zerg';
  return 'Terran';
}
