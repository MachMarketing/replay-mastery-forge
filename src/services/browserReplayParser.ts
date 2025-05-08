
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
  const rawData = await parseReplayWithBrowserSafeParser(new Uint8Array(fileBuffer));
  
  if (!rawData) {
    throw new Error('Parser returned no data');
  }
  
  console.log('[browserReplayParser] Raw parsed data:', rawData);
  
  // Check if we have a valid structure from screparsed
  // If the _gameInfo property is present, it means we got the raw replay object
  // rather than the parsed version - we need to handle this differently
  if (rawData._gameInfo && !rawData.header && !rawData.players && !rawData.commands) {
    console.log('[browserReplayParser] Got raw game info object, creating basic parsed structure');
    // Create a minimal viable structure for this case
    const parsedData = {
      header: {
        map: 'Unknown Map',
        duration: 600, // Default 10 minutes
        startTime: new Date().toISOString()
      },
      players: [
        { id: 0, name: 'Player 1', race: 2 }, // 2 = Protoss
        { id: 1, name: 'Player 2', race: 2 }  // 2 = Protoss
      ],
      commands: [],
      mapData: { name: 'Unknown Map' }
    };
    
    // Try to extract some info from the raw data if possible
    if (rawData._gameInfo && rawData._gameInfo.value && rawData._gameInfo.value.length > 100) {
      // Look for player names in the byte array
      // This is very basic extraction just to get something
      try {
        const dataArray = rawData._gameInfo.value;
        // Try to find strings that look like player names
        const textChunks = [];
        let currentChunk = '';
        
        // Scan through the data looking for readable text
        for (let i = 0; i < dataArray.length; i++) {
          const byte = dataArray[i];
          // If it's a printable ASCII character
          if (byte >= 32 && byte <= 126) {
            currentChunk += String.fromCharCode(byte);
          } else if (currentChunk.length > 3) {
            // If we have a chunk of reasonable length, save it
            textChunks.push(currentChunk);
            currentChunk = '';
          } else {
            currentChunk = '';
          }
        }
        
        // Find chunks that might be player names (not too long, no special chars)
        const possibleNames = textChunks.filter(chunk => 
          chunk.length > 2 && 
          chunk.length < 16 && 
          /^[a-zA-Z0-9_\-\s]+$/.test(chunk)
        );
        
        if (possibleNames.length >= 2) {
          parsedData.players[0].name = possibleNames[0];
          parsedData.players[1].name = possibleNames[1];
          console.log('[browserReplayParser] Extracted possible player names:', possibleNames.slice(0, 2));
        }
      } catch (e) {
        console.error('[browserReplayParser] Error extracting data from raw bytes:', e);
      }
    }
    
    return transformParsedData(parsedData);
  }
  
  // Extract relevant data from screparsed output format
  // Carefully check for undefined properties
  const header = rawData.header || {};
  const commands = Array.isArray(rawData.commands) ? rawData.commands : [];
  const mapData = rawData.mapData || {};
  
  // Extract player data safely
  const playerInfos = [];
  // Extract player data
  if (rawData.players && Array.isArray(rawData.players)) {
    playerInfos.push(...rawData.players);
  } else if (header.players && Array.isArray(header.players)) {
    playerInfos.push(...header.players);
  }
  
  // If we still don't have enough player data, create placeholder players
  if (playerInfos.length < 2) {
    console.log('[browserReplayParser] Not enough player data found, creating placeholders');
    playerInfos.push(
      { id: 0, name: 'Player 1', race: 2 }, // 2 = Protoss
      { id: 1, name: 'Player 2', race: 2 }  // 2 = Protoss
    );
  }
  
  return transformParsedData({
    header,
    commands,
    mapData,
    players: playerInfos
  });
}

/**
 * Transform the parsed data into our application's expected format
 */
function transformParsedData(parsedData: any): ParsedReplayData {
  const { header = {}, commands = [], mapData = {}, players = [] } = parsedData;
  
  // Ensure we have at least 2 players
  while (players.length < 2) {
    players.push({ id: players.length, name: `Player ${players.length + 1}`, race: 2 });
  }
  
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
