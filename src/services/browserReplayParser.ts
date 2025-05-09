
import { parseReplayWithBrowserSafeParser, initBrowserSafeParser } from './replayParser/browserSafeParser';
import { ParsedReplayData } from './replayParser/types';

// Import readFileAsArrayBuffer
import { readFileAsArrayBuffer } from '../services/fileReader';
import { 
  formatPlayerName, 
  standardizeRaceName, 
  debugLogReplayData, 
  getRaceFromId, 
  extractPlayerData, 
  extractMapName,
  deepAnalyzeReplayStructure,
  extractPlayersFromFilename 
} from '../lib/replayUtils';

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
    
    // Use our enhanced debug logging
    debugLogReplayData(rawData);
    // Use deeper analysis to try to find player information
    deepAnalyzeReplayStructure(rawData);
    
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
  
  // Extract potential player names and matchup from filename using the enhanced utility
  const { player1, player2, race1, race2 } = extractPlayersFromFilename(fileName);
  
  // Default races if not found in filename
  const defaultRace1 = race1 || 'Protoss';
  const defaultRace2 = race2 || 'Protoss';
  
  // Create matchup string
  const matchup = `${defaultRace1.charAt(0)}v${defaultRace2.charAt(0)}`;
  
  // Create minimal replay data structure
  const minimalData: ParsedReplayData = {
    primaryPlayer: {
      name: player1,
      race: defaultRace1,
      apm: 150,
      eapm: 105,
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    secondaryPlayer: {
      name: player2,
      race: defaultRace2,
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
    result: 'unknown' as 'unknown' | 'win' | 'loss',
    strengths: ['Replay analysis requires premium'],
    weaknesses: ['Replay analysis requires premium'],
    recommendations: ['Upgrade to premium for detailed analysis'],
    
    // Legacy properties
    playerName: player1,
    opponentName: player2,
    playerRace: defaultRace1,
    opponentRace: defaultRace2,
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
 * Based on the structure documented in screparsed package
 */
function transformParsedData(parsedData: any, fileName: string): ParsedReplayData {
  // First, log the structure to help with debugging
  console.log('[browserReplayParser] Transforming data with structure:', 
    typeof parsedData === 'object' ? Object.keys(parsedData) : typeof parsedData);
  
  // Extract players using our enhanced utility that tries different approaches
  let players = extractPlayerData(parsedData);
  
  // Extract map name using enhanced map extractor
  let mapName = extractMapName(parsedData);
  console.log('[browserReplayParser] Extracted map name:', mapName);
  
  let durationFrames = 0;
  
  // Process screparsed structure based on the documentation
  if (parsedData._gameInfo) {
    console.log('[browserReplayParser] Processing screparsed native structure');
    
    // If map name wasn't found, check again in _gameInfo
    if (mapName === 'Unknown Map' && parsedData._gameInfo.mapName) {
      mapName = parsedData._gameInfo.mapName;
      console.log('[browserReplayParser] Map name from _gameInfo:', mapName);
    }
    
    // Get duration in frames (convert from frames to seconds later)
    if (parsedData._frames !== undefined) {
      durationFrames = Array.isArray(parsedData._frames) ? parsedData._frames.length : Number(parsedData._frames) || 0;
      console.log('[browserReplayParser] Duration frames:', durationFrames);
    }
  }
  // Handle alternative structure if screparsed doesn't provide _gameInfo
  else if (parsedData.header) {
    console.log('[browserReplayParser] Processing alternative structure with header');
    
    // Get map name from the header structure if not already found
    if (mapName === 'Unknown Map') {
      mapName = parsedData.header.map || parsedData.mapData?.name || 'Unknown Map';
    }
    
    // Get duration if available
    if (parsedData.header && typeof parsedData.header.duration === 'number') {
      durationFrames = parsedData.header.duration * 24; // Convert seconds to frames
    }
  }
  // Try another common format with Header capitalized
  else if (parsedData.Header) {
    console.log('[browserReplayParser] Processing structure with capitalized Header');
    
    // Get map name if not already found
    if (mapName === 'Unknown Map') {
      mapName = parsedData.Header.Map || 'Unknown Map';
    }
    
    // Get duration
    if (parsedData.Header.Duration && typeof parsedData.Header.Duration === 'number') {
      durationFrames = parsedData.Header.Duration * 24;
    }
  }
  
  // If still no players, extract from filename as last resort
  if (!players || players.length === 0) {
    console.log('[browserReplayParser] No player data found, extracting from filename');
    const { player1, player2, race1, race2 } = extractPlayersFromFilename(fileName);
    
    players = [
      { 
        name: player1, 
        race: race1 || 'Protoss', 
        apm: 150, 
        team: 0 
      },
      { 
        name: player2, 
        race: race2 || 'Protoss', 
        apm: 150, 
        team: 1 
      }
    ];
  }
  
  // Ensure we have at least 2 players
  while (players.length < 2) {
    players.push({ 
      name: `Player ${players.length + 1}`, 
      race: 'Protoss', 
      apm: 150,
      team: players.length
    });
  }
  
  // Calculate duration in seconds (BW runs at 24 frames per second)
  const durationSeconds = Math.max(1, Math.floor(durationFrames / 24));
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;
  
  // Extract player 1 and 2
  const player1 = players[0] || { name: 'Player 1', race: 'Protoss', apm: 150, team: 0 };
  const player2 = players[1] || { name: 'Player 2', race: 'Protoss', apm: 150, team: 1 };
  
  // Standardize race names
  const race1 = standardizeRaceName(player1.race);
  const race2 = standardizeRaceName(player2.race);
  
  // Format player names
  const playerName = formatPlayerName(player1.name);
  const opponentName = formatPlayerName(player2.name);
  
  // Determine result - ensure it's one of the allowed enum values
  let matchResult: 'win' | 'loss' | 'unknown' = 'unknown';
  
  // Try to extract result from the parsed data
  if (parsedData._gameInfo && parsedData._gameInfo.winnerTeam !== undefined) {
    // If winner team matches player1's team, it's a win
    if (parsedData._gameInfo.winnerTeam === player1.team) {
      matchResult = 'win';
    } else {
      matchResult = 'loss';
    }
  } else if (parsedData.metadata && parsedData.metadata.winners) {
    // Use metadata.winners array if available
    const winners = parsedData.metadata.winners;
    // Assume player1 is the primary player (index 0)
    if (Array.isArray(winners) && winners.includes(0)) {
      matchResult = 'win';
    } else if (Array.isArray(winners)) {
      matchResult = 'loss';
    }
  }
  
  // Create the transformed data structure
  const transformedData: ParsedReplayData = {
    primaryPlayer: {
      name: playerName,
      race: race1,
      apm: player1.apm || 150,
      eapm: Math.round((player1.apm || 150) * 0.7),
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    secondaryPlayer: {
      name: opponentName,
      race: race2,
      apm: player2.apm || 150,
      eapm: Math.round((player2.apm || 150) * 0.7),
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    map: mapName,
    matchup: `${race1.charAt(0)}v${race2.charAt(0)}`,
    duration: formattedDuration,
    durationMS: durationSeconds * 1000,
    date: new Date().toISOString(),
    result: matchResult,
    strengths: ['Replay analysis requires premium'],
    weaknesses: ['Replay analysis requires premium'],
    recommendations: ['Upgrade to premium for detailed analysis'],
    
    // Legacy properties
    playerName,
    opponentName,
    playerRace: race1,
    opponentRace: race2,
    apm: player1.apm || 150,
    eapm: Math.round((player1.apm || 150) * 0.7),
    opponentApm: player2.apm || 150,
    opponentEapm: Math.round((player2.apm || 150) * 0.7),
    buildOrder: []
  };
  
  console.log('[browserReplayParser] Transformed data:', 
    `${transformedData.primaryPlayer.name} (${transformedData.primaryPlayer.race}) vs ` +
    `${transformedData.secondaryPlayer.name} (${transformedData.secondaryPlayer.race}) on ${transformedData.map}`);
  
  return transformedData;
}
