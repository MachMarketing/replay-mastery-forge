
import { parseReplayWithBrowserSafeParser, initBrowserSafeParser } from './replayParser/browserSafeParser';
import { transformJSSUHData } from './replayParser/transformer';
import { normalizeBuildOrder, debugReplayData } from './replayParser/index';
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
  const parsedData = await parseReplayWithBrowserSafeParser(new Uint8Array(fileBuffer));
  
  if (!parsedData) {
    throw new Error('Parser returned no data');
  }
  
  console.log('[browserReplayParser] Raw parsed data:', parsedData);
  
  // Extract relevant data from screparsed output format
  const header = parsedData.header || {};
  const commands = parsedData.commands || [];
  const mapData = parsedData.mapData || {};
  
  const playerInfos = [];
  // Extract player data
  if (parsedData.players && Array.isArray(parsedData.players)) {
    playerInfos.push(...parsedData.players);
  } else if (header.players && Array.isArray(header.players)) {
    playerInfos.push(...header.players);
  }
  
  if (playerInfos.length < 2) {
    throw new Error('Could not find enough player data in replay');
  }
  
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
  
  // Extract basic player info
  const player1 = playerInfos[0];
  const player2 = playerInfos[1];
  
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
  
  // Debug the final parsed data
  debugReplayData(transformedData);
  
  return transformedData;
}
