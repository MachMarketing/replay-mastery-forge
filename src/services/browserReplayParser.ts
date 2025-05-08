
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
    // Based on screparsed documentation, the structure should have:
    // header, commands, mapData and players fields
    const parsedData = {
      header: rawData.header || {},
      commands: Array.isArray(rawData.commands) ? rawData.commands : [],
      mapData: rawData.mapData || { name: 'Unknown Map' },
      players: Array.isArray(rawData.players) ? rawData.players : []
    };
    
    // Handle special case where we got a raw game info object
    if (!parsedData.players.length && rawData._gameInfo) {
      console.log('[browserReplayParser] Using raw game info to extract players');
      
      // Try to extract player data from _gameInfo
      if (rawData._gameInfo.playerStructs && typeof rawData._gameInfo.playerStructs === 'object') {
        try {
          Object.keys(rawData._gameInfo.playerStructs).forEach(key => {
            const playerStruct = rawData._gameInfo.playerStructs[key];
            if (playerStruct) {
              parsedData.players.push({
                id: Number(key),
                name: playerStruct.name || `Player ${Number(key) + 1}`,
                race: playerStruct.race || 2
              });
            }
          });
        } catch (e) {
          console.error('[browserReplayParser] Error extracting from playerStructs:', e);
        }
      }
    }
    
    // If we still don't have player data, use filename to guess
    if (!parsedData.players.length) {
      console.log('[browserReplayParser] No player data found, extracting from filename');
      const fileNameParts = file.name.split('.')[0].split(/\s+|_|vs|VS|Vs/);
      parsedData.players = [
        { id: 0, name: fileNameParts.length > 0 ? fileNameParts[0] : 'Player 1', race: 2 },
        { id: 1, name: fileNameParts.length > 1 ? fileNameParts[1] : 'Player 2', race: 2 }
      ];
    }
    
    // Ensure we have at least 2 players
    while (parsedData.players.length < 2) {
      parsedData.players.push({ 
        id: parsedData.players.length, 
        name: `Player ${parsedData.players.length + 1}`, 
        race: 2 
      });
    }
    
    return transformParsedData(parsedData);
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
function transformParsedData(parsedData: any): ParsedReplayData {
  const { header = {}, commands = [], mapData = {}, players = [] } = parsedData;
  
  // Extract basic player info
  const player1 = players[0];
  const player2 = players[1];
  
  // Map player races based on screp format
  const mapRace = (raceVal: number | string): string => {
    if (typeof raceVal === 'string') {
      const race = raceVal.toLowerCase();
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
  
  // Calculate APM from commands
  const calculateAPM = (playerID: number): number => {
    if (!commands || !Array.isArray(commands)) return 150;
    
    const playerCommands = commands.filter(cmd => cmd.player === playerID);
    const gameLengthMinutes = header.duration ? header.duration / 60 : 10;
    return Math.round(playerCommands.length / gameLengthMinutes);
  };
  
  const transformedData: ParsedReplayData = {
    primaryPlayer: {
      name: player1.name || 'Unknown Player',
      race: mapRace(player1.race),
      apm: calculateAPM(player1.id || 0),
      eapm: Math.round(calculateAPM(player1.id || 0) * 0.7),
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    secondaryPlayer: {
      name: player2.name || 'Unknown Player',
      race: mapRace(player2.race),
      apm: calculateAPM(player2.id || 1),
      eapm: Math.round(calculateAPM(player2.id || 1) * 0.7),
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    map: mapData.name || header.map || 'Unknown Map',
    matchup: `${mapRace(player1.race).charAt(0)}v${mapRace(player2.race).charAt(0)}`,
    duration: header.duration ? `${Math.floor(header.duration / 60)}:${String(Math.floor(header.duration % 60)).padStart(2, '0')}` : '0:00',
    durationMS: header.duration ? header.duration * 1000 : 0,
    date: header.startTime ? new Date(header.startTime).toISOString() : new Date().toISOString(),
    result: 'unknown',
    strengths: ['Replay analysis requires premium'],
    weaknesses: ['Replay analysis requires premium'],
    recommendations: ['Upgrade to premium for detailed analysis'],
    
    // Legacy properties
    playerName: player1.name || 'Unknown Player',
    opponentName: player2.name || 'Unknown Player',
    playerRace: mapRace(player1.race),
    opponentRace: mapRace(player2.race),
    apm: calculateAPM(player1.id || 0),
    eapm: Math.round(calculateAPM(player1.id || 0) * 0.7),
    opponentApm: calculateAPM(player2.id || 1),
    opponentEapm: Math.round(calculateAPM(player2.id || 1) * 0.7),
    buildOrder: []
  };
  
  console.log('[browserReplayParser] Transformed data:', transformedData);
  
  return transformedData;
}
