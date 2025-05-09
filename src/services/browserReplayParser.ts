
import { parseReplayWithBrowserSafeParser, initBrowserSafeParser } from './replayParser/browserSafeParser';
import { ParsedReplayData } from './replayParser/types';

// Import readFileAsArrayBuffer
import { readFileAsArrayBuffer } from '../services/fileReader';

// Track if the parser has been initialized
let parserInitialized = false;

/**
 * Initialize the browser replay parser
 */
async function ensureParserInitialized(): Promise<void> {
  if (!parserInitialized) {
    console.log('[browserReplayParser] Initializing parser');
    try {
      await initBrowserSafeParser();
      parserInitialized = true;
      console.log('[browserReplayParser] Parser initialized');
    } catch (error) {
      console.error('[browserReplayParser] Failed to initialize parser:', error);
      throw new Error('Failed to initialize replay parser');
    }
  }
}

/**
 * Parse replay file using the browser parser
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayData> {
  console.log('[browserReplayParser] Starting browser replay parsing for file:', file.name);
  
  // Make sure the parser is initialized
  await ensureParserInitialized();
  
  // Read file as ArrayBuffer
  const fileBuffer = await readFileAsArrayBuffer(file);
  
  console.log('[browserReplayParser] File read successfully, size:', fileBuffer.byteLength);
  
  // Parse the replay using the screparsed browser-safe parser
  let rawData;
  try {
    rawData = await parseReplayWithBrowserSafeParser(new Uint8Array(fileBuffer));
    console.log('[browserReplayParser] Raw parsed data structure:', 
      rawData ? Object.keys(rawData).join(', ') : 'null');
  } catch (error) {
    console.error('[browserReplayParser] Error during parsing:', error);
    // If parsing fails, create a minimal structure
    return createMinimalReplayData(file.name);
  }
  
  if (!rawData) {
    console.error('[browserReplayParser] Parser returned no data');
    return createMinimalReplayData(file.name);
  }
  
  try {
    // Handle the parsed data safely without assuming structure
    return transformParsedData(rawData, file.name);
  } catch (error) {
    console.error('[browserReplayParser] Error transforming parsed data:', error);
    return createMinimalReplayData(file.name);
  }
}

/**
 * Create a minimal replay data structure as a fallback
 */
function createMinimalReplayData(fileName: string): ParsedReplayData {
  console.log('[browserReplayParser] Creating minimal replay data for:', fileName);
  
  // Extract potential player names and matchup from filename
  const fileNameParts = fileName.split('.')[0].split(/\s+|_|vs|VS|Vs/);
  
  // Try to identify race letters in the filename (T, P, Z)
  const raceIdentifiers = fileName.match(/[TPZtpz]v[TPZtpz]/i);
  let matchup = 'PvP'; // Default matchup
  
  if (raceIdentifiers) {
    matchup = raceIdentifiers[0].toUpperCase();
  }
  
  // Map race letter to full name
  const mapRaceLetter = (letter: string): string => {
    letter = letter.toUpperCase();
    if (letter === 'T') return 'Terran';
    if (letter === 'Z') return 'Zerg';
    return 'Protoss';  // Default to Protoss
  };
  
  // Extract races from matchup
  let race1 = 'Protoss';
  let race2 = 'Protoss';
  
  if (matchup.length === 3) {
    race1 = mapRaceLetter(matchup[0]);
    race2 = mapRaceLetter(matchup[2]);
  }
  
  // Create minimal replay data structure
  const minimalData: ParsedReplayData = {
    primaryPlayer: {
      name: fileNameParts.length > 0 ? fileNameParts[0] : 'Player 1',
      race: race1,
      apm: 150,
      eapm: 105,
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    secondaryPlayer: {
      name: fileNameParts.length > 1 ? fileNameParts[1] : 'Player 2',
      race: race2,
      apm: 150,
      eapm: 105,
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    map: 'Unknown Map',
    matchup: matchup,
    duration: '10:00',
    durationMS: 600000,
    date: new Date().toISOString(),
    result: 'unknown',
    strengths: ['Replay analysis requires premium'],
    weaknesses: ['Replay analysis requires premium'],
    recommendations: ['Upgrade to premium for detailed analysis'],
    
    // Legacy properties
    playerName: fileNameParts.length > 0 ? fileNameParts[0] : 'Player 1',
    opponentName: fileNameParts.length > 1 ? fileNameParts[1] : 'Player 2',
    playerRace: race1,
    opponentRace: race2,
    apm: 150,
    eapm: 105,
    opponentApm: 150,
    opponentEapm: 105,
    buildOrder: []
  };
  
  return minimalData;
}

/**
 * Transform the parsed data into our application's expected format
 */
function transformParsedData(parsedData: any, fileName: string): ParsedReplayData {
  // First, log the structure to help with debugging
  console.log('[browserReplayParser] Transforming data with structure:', 
    typeof parsedData === 'object' ? Object.keys(parsedData) : typeof parsedData);
  
  // Extract the key data we need based on structure
  let players = [];
  let header = {};
  let commands = [];
  let mapName = 'Unknown Map';
  
  // Handle different structures based on what we received
  if (parsedData._gameInfo) {
    console.log('[browserReplayParser] Processing screparsed ParsedReplay structure');
    
    // Extract players from _gameInfo if available
    if (parsedData._gameInfo?.playerStructs) {
      try {
        console.log('[browserReplayParser] Found _gameInfo.playerStructs:', 
          Object.keys(parsedData._gameInfo.playerStructs).length, 'players');
        
        // Convert player structs into our player array
        players = Object.entries(parsedData._gameInfo.playerStructs).map(([id, player]: [string, any]) => ({
          id: Number(id),
          name: player.name || `Player ${Number(id) + 1}`,
          race: player.race || 2, // Default to Protoss (2)
          apm: 0 // Will be estimated later
        }));
      } catch (e) {
        console.error('[browserReplayParser] Error extracting players from _gameInfo:', e);
      }
    }
    
    // Extract map name if available
    if (parsedData._gameInfo?.mapName) {
      mapName = parsedData._gameInfo.mapName;
    }
    
    // Get header information
    header = {
      map: mapName,
      duration: parsedData._frames ? parsedData._frames.length / 24 : 600 // Estimate 10 min if unknown
    };
  } else if (parsedData.header) {
    // Structure seems to be from another parser implementation
    header = parsedData.header;
    players = parsedData.players || [];
    commands = parsedData.commands || [];
    mapName = parsedData.mapData?.name || header.map || 'Unknown Map';
  }
  
  // If still no players, extract from filename
  if (!players || players.length === 0) {
    console.log('[browserReplayParser] No player data found, extracting from filename');
    const fileNameParts = fileName.split('.')[0].split(/\s+|_|vs|VS|Vs/);
    players = [
      { id: 0, name: fileNameParts.length > 0 ? fileNameParts[0] : 'Player 1', race: 2 },
      { id: 1, name: fileNameParts.length > 1 ? fileNameParts[1] : 'Player 2', race: 2 }
    ];
  }
  
  // Ensure we have at least 2 players
  while (players.length < 2) {
    players.push({ 
      id: players.length, 
      name: `Player ${players.length + 1}`, 
      race: 2 
    });
  }
  
  // Extract player 1 and 2
  const player1 = players[0] || {};
  const player2 = players[1] || {};
  
  // Map player races based on screp format
  const mapRace = (raceVal: number | string): string => {
    if (typeof raceVal === 'string') {
      const race = String(raceVal).toLowerCase();
      if (race.includes('zerg')) return 'Zerg';
      if (race.includes('terran')) return 'Terran';
      if (race.includes('protoss')) return 'Protoss';
      return 'Unknown';
    }
    
    // Number-based race mapping from screp
    switch(Number(raceVal)) {
      case 0: return 'Zerg';
      case 1: return 'Terran';
      case 2: return 'Protoss';
      default: return 'Unknown';
    }
  };
  
  // Calculate APM from commands (or use default if not possible)
  const calculateAPM = (playerID: number): number => {
    if (!commands || !Array.isArray(commands)) return 150;
    
    let playerCommands = [];
    try {
      playerCommands = commands.filter(cmd => cmd.player === playerID);
    } catch (e) {
      console.warn('[browserReplayParser] Error filtering commands:', e);
      return 150;
    }
    
    const gameLengthMinutes = header.duration ? header.duration / 60 : 10;
    return Math.round(playerCommands.length / gameLengthMinutes);
  };
  
  const race1 = mapRace(player1.race);
  const race2 = mapRace(player2.race);
  
  // Create the transformed data structure
  const transformedData: ParsedReplayData = {
    primaryPlayer: {
      name: player1.name || 'Unknown Player',
      race: race1,
      apm: calculateAPM(player1.id || 0),
      eapm: Math.round(calculateAPM(player1.id || 0) * 0.7),
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    secondaryPlayer: {
      name: player2.name || 'Unknown Player',
      race: race2,
      apm: calculateAPM(player2.id || 1),
      eapm: Math.round(calculateAPM(player2.id || 1) * 0.7),
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    map: mapName,
    matchup: `${race1.charAt(0)}v${race2.charAt(0)}`,
    duration: typeof header.duration === 'number' ? 
      `${Math.floor(header.duration / 60)}:${String(Math.floor(header.duration % 60)).padStart(2, '0')}` : '10:00',
    durationMS: typeof header.duration === 'number' ? header.duration * 1000 : 600000,
    date: new Date().toISOString(),
    result: 'unknown',
    strengths: ['Replay analysis requires premium'],
    weaknesses: ['Replay analysis requires premium'],
    recommendations: ['Upgrade to premium for detailed analysis'],
    
    // Legacy properties
    playerName: player1.name || 'Unknown Player',
    opponentName: player2.name || 'Unknown Player',
    playerRace: race1,
    opponentRace: race2,
    apm: calculateAPM(player1.id || 0),
    eapm: Math.round(calculateAPM(player1.id || 0) * 0.7),
    opponentApm: calculateAPM(player2.id || 1),
    opponentEapm: Math.round(calculateAPM(player2.id || 1) * 0.7),
    buildOrder: []
  };
  
  console.log('[browserReplayParser] Transformed data:', 
    `${transformedData.primaryPlayer.name} (${transformedData.primaryPlayer.race}) vs ` +
    `${transformedData.secondaryPlayer.name} (${transformedData.secondaryPlayer.race})`);
  
  return transformedData;
}
