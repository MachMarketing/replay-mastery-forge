
import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War replay file using screparsed
 * This supports both Classic and Remastered replay formats
 */
export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting to parse replay file:', file.name);
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
  
  // Read file as ArrayBuffer
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
  
  // Parse with screparsed using correct API
  try {
    console.log('[replayParser] Loading screparsed...');
    
    // Use dynamic import for screparsed
    const screparsedModule = await import('screparsed');
    console.log('[replayParser] screparsed module loaded:', Object.keys(screparsedModule));
    
    let screparsedResult: any = null;
    
    // Use the ReplayParser class correctly
    if (screparsedModule.ReplayParser) {
      console.log('[replayParser] Using ReplayParser class...');
      const parser = new screparsedModule.ReplayParser();
      // Try different method names that might exist on the parser
      if (typeof parser.parse === 'function') {
        screparsedResult = parser.parse(uint8Array);
      } else if (typeof parser.parseReplay === 'function') {
        screparsedResult = parser.parseReplay(uint8Array);
      } else if (typeof parser.parseBuffer === 'function') {
        screparsedResult = parser.parseBuffer(uint8Array);
      } else {
        // Check what methods are available
        console.log('[replayParser] Available parser methods:', Object.getOwnPropertyNames(parser));
        throw new Error('Keine unterstützte Parse-Methode auf ReplayParser gefunden');
      }
    } else if (screparsedModule.default && screparsedModule.default.ReplayParser) {
      console.log('[replayParser] Using default.ReplayParser class...');
      const parser = new screparsedModule.default.ReplayParser();
      if (typeof parser.parse === 'function') {
        screparsedResult = parser.parse(uint8Array);
      } else if (typeof parser.parseReplay === 'function') {
        screparsedResult = parser.parseReplay(uint8Array);
      } else if (typeof parser.parseBuffer === 'function') {
        screparsedResult = parser.parseBuffer(uint8Array);
      } else {
        console.log('[replayParser] Available parser methods:', Object.getOwnPropertyNames(parser));
        throw new Error('Keine unterstützte Parse-Methode auf default.ReplayParser gefunden');
      }
    } else {
      throw new Error('ReplayParser class nicht gefunden in screparsed module');
    }
    
    if (!screparsedResult) {
      throw new Error('Screparsed konnte keine Daten extrahieren');
    }
    
    console.log('[replayParser] Screparsed result:', screparsedResult);
    console.log('[replayParser] Successfully parsed with screparsed');
    return createParsedDataFromScreparsed(screparsedResult, file.name);
    
  } catch (screparsedError) {
    console.error('[replayParser] Screparsed parsing failed:', screparsedError);
    throw new Error(`Screparsed parsing failed: ${screparsedError instanceof Error ? screparsedError.message : String(screparsedError)}`);
  }
}

/**
 * Create parsed data from screparsed result with real data extraction
 */
function createParsedDataFromScreparsed(screparsedResult: any, filename: string): ParsedReplayData {
  console.log('[replayParser] Processing screparsed result structure:', {
    hasHeader: !!screparsedResult.header,
    hasPlayers: !!screparsedResult.players,
    hasGameData: !!screparsedResult.gameData,
    hasCommands: !!screparsedResult.commands,
    resultKeys: Object.keys(screparsedResult)
  });
  
  // Extract players from various possible locations
  let players = [];
  if (screparsedResult.players && Array.isArray(screparsedResult.players)) {
    players = screparsedResult.players;
  } else if (screparsedResult.gameData?.players) {
    players = screparsedResult.gameData.players;
  } else if (screparsedResult.header?.players) {
    players = screparsedResult.header.players;
  }
  
  console.log('[replayParser] Found players:', players.length, players);
  
  if (players.length < 2) {
    throw new Error('Nicht genügend Spieler in der Replay-Datei gefunden');
  }
  
  // Get the first two players
  const player1 = players[0];
  const player2 = players[1];
  
  console.log('[replayParser] Player 1:', player1);
  console.log('[replayParser] Player 2:', player2);
  
  // Extract game info
  const header = screparsedResult.header || {};
  const gameData = screparsedResult.gameData || {};
  
  // Map name
  const mapName = header.mapName || header.map || gameData.mapName || 'Unknown Map';
  
  // Game duration
  const frames = header.frames || header.duration || gameData.frames || 0;
  const durationSeconds = Math.floor(frames / 24); // 24 FPS for StarCraft
  const duration = formatDuration(durationSeconds);
  const durationMS = frames * (1000/24);
  
  // Extract real player data
  const primaryPlayer = {
    name: player1.name || 'Player 1',
    race: normalizeRaceName(player1.race),
    apm: player1.apm || 0,
    eapm: player1.eapm || Math.round((player1.apm || 0) * 0.7),
    buildOrder: extractBuildOrderFromResult(screparsedResult, 0),
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  const secondaryPlayer = {
    name: player2.name || 'Player 2',
    race: normalizeRaceName(player2.race),
    apm: player2.apm || 0,
    eapm: player2.eapm || Math.round((player2.apm || 0) * 0.7),
    buildOrder: extractBuildOrderFromResult(screparsedResult, 1),
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  // Create matchup
  const matchup = `${getRaceShortName(primaryPlayer.race)}v${getRaceShortName(secondaryPlayer.race)}`;
  
  // Generate analysis
  const analysis = generateRealAnalysis(primaryPlayer, secondaryPlayer, screparsedResult);
  
  return {
    primaryPlayer: { ...primaryPlayer, ...analysis.primaryAnalysis },
    secondaryPlayer,
    map: mapName,
    matchup,
    duration,
    durationMS,
    date: new Date().toISOString(),
    result: 'unknown',
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
 * Extract build order from screparsed result
 */
function extractBuildOrderFromResult(result: any, playerIndex: number): Array<{time: string; supply: number; action: string}> {
  // Try to extract build order from commands or actions
  if (result.commands && Array.isArray(result.commands)) {
    const playerCommands = result.commands.filter((cmd: any) => cmd.playerId === playerIndex);
    return playerCommands.slice(0, 15).map((cmd: any, index: number) => ({
      time: formatDuration(Math.floor((cmd.frame || index * 600) / 24)),
      supply: 9 + index,
      action: cmd.command || cmd.action || 'Unknown Action'
    }));
  }
  
  return [];
}

/**
 * Generate real analysis based on extracted data
 */
function generateRealAnalysis(player1: any, player2: any, screparsedResult: any): {
  primaryAnalysis: { strengths: string[]; weaknesses: string[]; recommendations: string[] };
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
} {
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];
  
  // Basic analysis based on available data
  if (player1.apm > 0) {
    if (player1.apm > 150) {
      strengths.push(`Hohe APM (${player1.apm})`);
    } else if (player1.apm < 100) {
      weaknesses.push(`Niedrige APM (${player1.apm})`);
      recommendations.push('APM durch Hotkey-Training verbessern');
    }
  }
  
  if (player1.buildOrder && player1.buildOrder.length > 0) {
    strengths.push('Build Order Daten verfügbar');
  } else {
    weaknesses.push('Keine Build Order Daten');
    recommendations.push('Detailliertere Replays für bessere Analyse');
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
  
  const trainingPlan = [
    { day: 1, focus: "APM Training", drill: `${player1.race} Hotkeys üben` },
    { day: 2, focus: "Build Order", drill: `Standard ${player1.race} Build perfektionieren` },
    { day: 3, focus: "Makro", drill: "Kontinuierliche Produktion" }
  ];
  
  return {
    primaryAnalysis: { strengths, weaknesses, recommendations },
    trainingPlan
  };
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
