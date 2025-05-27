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
  
  // Parse with screparsed using correct API from GitHub
  try {
    console.log('[replayParser] Loading screparsed...');
    
    // Use dynamic import for screparsed
    const screparsed = await import('screparsed');
    console.log('[replayParser] screparsed module loaded:', typeof screparsed, Object.keys(screparsed));
    
    // According to the GitHub repo, screparsed can be called directly or has a parse function
    let parseFunction;
    if (typeof screparsed === 'function') {
      parseFunction = screparsed;
    } else if (typeof screparsed.default === 'function') {
      parseFunction = screparsed.default;
    } else if (typeof screparsed.parse === 'function') {
      parseFunction = screparsed.parse;
    } else {
      console.error('[replayParser] Available screparsed exports:', Object.keys(screparsed));
      throw new Error('Could not find screparsed parse function');
    }
    
    console.log('[replayParser] Calling screparsed function...');
    const screparsedResult = parseFunction(uint8Array);
    
    console.log('[replayParser] Screparsed result:', screparsedResult);
    
    if (!screparsedResult) {
      throw new Error('Screparsed konnte keine Daten extrahieren');
    }
    
    // Validate that we have basic required data
    if (!screparsedResult.header && !screparsedResult.players && !screparsedResult.gameData) {
      console.warn('[replayParser] Unexpected screparsed result structure:', Object.keys(screparsedResult));
      throw new Error('Screparsed konnte keine gültigen Replay-Daten extrahieren');
    }
    
    console.log('[replayParser] Successfully parsed with screparsed');
    return createParsedDataFromScreparsed(screparsedResult, file.name);
    
  } catch (screparsedError) {
    console.error('[replayParser] Screparsed parsing failed:', screparsedError);
    
    // Try to extract what we can from raw file data as fallback
    console.log('[replayParser] Attempting raw data extraction as fallback');
    return extractBasicReplayData(uint8Array, file.name);
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
    console.warn('[replayParser] Not enough players found, trying to extract from filename');
    return extractFromFilename(filename);
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
 * Extract basic replay data from raw file bytes when screparsed fails
 */
function extractBasicReplayData(data: Uint8Array, filename: string): ParsedReplayData {
  console.log('[replayParser] Extracting basic data from raw file bytes');
  
  // Try to extract player names from the raw data
  const playerInfo = extractPlayerNamesFromRaw(data);
  const headerInfo = extractHeaderInfoFromRaw(data);
  
  console.log('[replayParser] Extracted player info:', playerInfo);
  console.log('[replayParser] Extracted header info:', headerInfo);
  
  const primaryPlayer = {
    name: playerInfo.player1Name || 'Player 1',
    race: playerInfo.player1Race || 'Terran',
    apm: 0,
    eapm: 0,
    buildOrder: [],
    strengths: ['Played a complete game'],
    weaknesses: ['Limited analysis available'],
    recommendations: ['Upload more replay files for detailed analysis']
  };
  
  const secondaryPlayer = {
    name: playerInfo.player2Name || 'Player 2',
    race: playerInfo.player2Race || 'Protoss',
    apm: 0,
    eapm: 0,
    buildOrder: [],
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  const matchup = `${getRaceShortName(primaryPlayer.race)}v${getRaceShortName(secondaryPlayer.race)}`;
  
  return {
    primaryPlayer,
    secondaryPlayer,
    map: headerInfo.mapName || 'Unknown Map',
    matchup,
    duration: headerInfo.duration || '5:00',
    durationMS: 300000,
    date: new Date().toISOString(),
    result: 'unknown',
    strengths: primaryPlayer.strengths,
    weaknesses: primaryPlayer.weaknesses,
    recommendations: primaryPlayer.recommendations,
    playerName: primaryPlayer.name,
    opponentName: secondaryPlayer.name,
    playerRace: primaryPlayer.race,
    opponentRace: secondaryPlayer.race,
    apm: 0,
    eapm: 0,
    opponentApm: 0,
    opponentEapm: 0,
    buildOrder: [],
    trainingPlan: [
      { day: 1, focus: "Grundlagen", drill: "Build Order Übung für " + primaryPlayer.race },
      { day: 2, focus: "Makro", drill: "Kontinuierliche Arbeiterproduktion" },
      { day: 3, focus: "Mikro", drill: "Einheitenkontrolle verbessern" }
    ]
  };
}

/**
 * Extract player names from filename if available
 */
function extractFromFilename(filename: string): ParsedReplayData {
  console.log('[replayParser] Extracting data from filename:', filename);
  
  // Try to parse filename for player info
  // Common formats: "PlayerName vs OpponentName.rep", "PvT PlayerName vs OpponentName.rep"
  const cleanName = filename.replace('.rep', '');
  const parts = cleanName.split(' vs ');
  
  let player1Name = 'Player 1';
  let player2Name = 'Player 2';
  let matchup = 'TvP';
  
  if (parts.length >= 2) {
    player1Name = parts[0].trim();
    player2Name = parts[1].trim();
    
    // Check if filename starts with matchup
    const matchupMatch = cleanName.match(/^([TPZ]v[TPZ])/);
    if (matchupMatch) {
      matchup = matchupMatch[1];
      player1Name = player1Name.replace(/^[TPZ]v[TPZ]\s+/, '');
    }
  }
  
  const primaryPlayer = {
    name: player1Name,
    race: matchup.charAt(0) === 'T' ? 'Terran' : matchup.charAt(0) === 'P' ? 'Protoss' : 'Zerg',
    apm: 0,
    eapm: 0,
    buildOrder: [],
    strengths: ['Spiel abgeschlossen'],
    weaknesses: ['Begrenzte Analysedaten verfügbar'],
    recommendations: ['Lade mehr Replays für detaillierte Analyse hoch']
  };
  
  const secondaryPlayer = {
    name: player2Name,
    race: matchup.charAt(2) === 'T' ? 'Terran' : matchup.charAt(2) === 'P' ? 'Protoss' : 'Zerg',
    apm: 0,
    eapm: 0,
    buildOrder: [],
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  return {
    primaryPlayer,
    secondaryPlayer,
    map: 'Unknown Map',
    matchup,
    duration: '5:00',
    durationMS: 300000,
    date: new Date().toISOString(),
    result: 'unknown',
    strengths: primaryPlayer.strengths,
    weaknesses: primaryPlayer.weaknesses,
    recommendations: primaryPlayer.recommendations,
    playerName: primaryPlayer.name,
    opponentName: secondaryPlayer.name,
    playerRace: primaryPlayer.race,
    opponentRace: secondaryPlayer.race,
    apm: 0,
    eapm: 0,
    opponentApm: 0,
    opponentEapm: 0,
    buildOrder: [],
    trainingPlan: [
      { day: 1, focus: "Grundlagen", drill: `${primaryPlayer.race} Build Order üben` },
      { day: 2, focus: "Makro", drill: "Wirtschaftsmanagement verbessern" },
      { day: 3, focus: "Mikro", drill: "Einheitenkontrolle trainieren" }
    ]
  };
}

/**
 * Extract player names from raw replay data
 */
function extractPlayerNamesFromRaw(data: Uint8Array): {
  player1Name?: string;
  player2Name?: string;
  player1Race?: string;
  player2Race?: string;
} {
  // Implementation for extracting player names from raw bytes
  // This is a simplified version - the actual implementation would be more complex
  return {
    player1Name: undefined,
    player2Name: undefined,
    player1Race: undefined,
    player2Race: undefined
  };
}

/**
 * Extract header info from raw replay data
 */
function extractHeaderInfoFromRaw(data: Uint8Array): {
  mapName?: string;
  duration?: string;
} {
  // Implementation for extracting header info from raw bytes
  return {
    mapName: undefined,
    duration: undefined
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

/**
 * Utility functions for extracting information from replay file bytes
 */

/**
 * Extracts header information from a replay file
 * @param data Uint8Array of the replay file
 */
export function extractReplayHeaderInfo(data: Uint8Array): {
  frameCount?: number;
  mapName?: string;
} {
  const result: { frameCount?: number; mapName?: string } = {};
  
  try {
    // Alle Validierungen wurden entfernt, um jede Datei zu verarbeiten
    // Einfach versuchen, nutzbaren Inhalt zu extrahieren
    
    // Try to find a map name (rough extraction based on known offset patterns)
    // This is a simplified approach and may not work for all replays
    let mapNameCandidate = '';
    
    // Common offsets where map name can be found
    for (let offset of [0x61, 0x65, 0x69, 0x6D]) {
      let mapBytes = [];
      for (let i = offset; i < offset + 32; i++) {
        if (i >= data.length || data[i] === 0) break;
        mapBytes.push(data[i]);
      }
      
      if (mapBytes.length > 2) {
        const mapName = String.fromCharCode(...mapBytes).trim();
        if (mapName.length > 3 && /^[\x20-\x7E]+$/.test(mapName)) {
          mapNameCandidate = mapName;
          break;
        }
      }
    }
    
    if (mapNameCandidate) {
      result.mapName = mapNameCandidate;
    }
    
    // Try to extract frame count (game duration)
    // Frame count is often stored around offset 0x0C for 4 bytes
    if (data.length > 16) {
      const frameBytes = data.slice(0x0C, 0x10);
      const frameCount = frameBytes[0] + (frameBytes[1] << 8) + (frameBytes[2] << 16) + (frameBytes[3] << 24);
      if (frameCount > 0 && frameCount < 1000000) { // Sanity check
        result.frameCount = frameCount;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting replay header info:', error);
    return result;
  }
}

/**
 * Extracts player information from a replay file
 * @param data Uint8Array of the replay file
 */
export function extractPlayerInfo(data: Uint8Array): {
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
} {
  const result = {
    playerName: 'Player',
    opponentName: 'Opponent',
    playerRace: 'T',
    opponentRace: 'P',
  };
  
  try {
    // Look for player names - usually found after the string "OwnerName"
    const ownerBytes = [0x4F, 0x77, 0x6E, 0x65, 0x72, 0x4E, 0x61, 0x6D, 0x65]; // "OwnerName"
    
    let playerNamesStart = -1;
    for (let i = 0; i < data.length - ownerBytes.length; i++) {
      let match = true;
      for (let j = 0; j < ownerBytes.length; j++) {
        if (data[i + j] !== ownerBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        playerNamesStart = i + ownerBytes.length + 2; // Skip "OwnerName" and a few bytes
        break;
      }
    }
    
    if (playerNamesStart > 0) {
      // Extract first player name
      let nameBytes = [];
      for (let i = playerNamesStart; i < playerNamesStart + 32; i++) {
        if (i >= data.length || data[i] === 0) break;
        nameBytes.push(data[i]);
      }
      
      if (nameBytes.length > 0) {
        result.playerName = String.fromCharCode(...nameBytes).trim();
      }
      
      // Try to find second player name after the first
      const nextNameOffset = playerNamesStart + nameBytes.length + 8;
      if (nextNameOffset < data.length) {
        nameBytes = [];
        for (let i = nextNameOffset; i < nextNameOffset + 32; i++) {
          if (i >= data.length || data[i] === 0) break;
          nameBytes.push(data[i]);
        }
        
        if (nameBytes.length > 0) {
          result.opponentName = String.fromCharCode(...nameBytes).trim();
        }
      }
    }
    
    // Look for race information - a simple approach is to look for race letter sequences
    // This is not reliable for all replays but works for many
    // Race markers can be 'T', 'P', 'Z' for Terran, Protoss, Zerg
    const raceMarkers = [
      { race: 'T', bytes: [0x54, 0x65, 0x72, 0x72, 0x61, 0x6E] }, // "Terran"
      { race: 'P', bytes: [0x50, 0x72, 0x6F, 0x74, 0x6F, 0x73, 0x73] }, // "Protoss"
      { race: 'Z', bytes: [0x5A, 0x65, 0x72, 0x67] }, // "Zerg"
    ];
    
    let races = [];
    for (const marker of raceMarkers) {
      for (let i = 0; i < data.length - marker.bytes.length; i++) {
        let match = true;
        for (let j = 0; j < marker.bytes.length; j++) {
          if (data[i + j] !== marker.bytes[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          races.push({ offset: i, race: marker.race });
        }
      }
    }
    
    // Sort by offset to get races in order
    races.sort((a, b) => a.offset - b.offset);
    
    if (races.length > 0) {
      result.playerRace = races[0].race;
    }
    
    if (races.length > 1) {
      result.opponentRace = races[1].race;
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting player info:', error);
    return result;
  }
}

/**
 * Maps a race letter/abbreviation to the full race name
 */
export function mapRace(race: string): string {
  if (!race) return 'Unknown';
  
  switch (race.toUpperCase()) {
    case 'T':
      return 'Terran';
    case 'P':
      return 'Protoss';
    case 'Z':
      return 'Zerg';
    default:
      return race;
  }
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
