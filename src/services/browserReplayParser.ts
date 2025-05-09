
import { parseReplayWithBrowserSafeParser, initBrowserSafeParser } from './replayParser/browserSafeParser';
import { ParsedReplayData } from './replayParser/types';

// Import readFileAsArrayBuffer
import { readFileAsArrayBuffer } from '../services/fileReader';
import { formatPlayerName, standardizeRaceName, debugLogReplayData, getRaceFromId } from '../lib/replayUtils';

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
 * Based on the structure documented in screparsed package
 */
function transformParsedData(parsedData: any, fileName: string): ParsedReplayData {
  // First, log the structure to help with debugging
  console.log('[browserReplayParser] Transforming data with structure:', 
    typeof parsedData === 'object' ? Object.keys(parsedData) : typeof parsedData);
  
  // Extract players based on screparsed format (_gameInfo.playerStructs)
  let players: any[] = [];
  let mapName = 'Unknown Map';
  let durationFrames = 0;
  
  // Process screparsed structure based on the documentation
  if (parsedData._gameInfo) {
    console.log('[browserReplayParser] Processing screparsed native structure');
    
    // Get the map name
    mapName = parsedData._gameInfo.mapName || 'Unknown Map';
    console.log('[browserReplayParser] Map name:', mapName);
    
    // Get duration in frames (convert from frames to seconds later)
    if (parsedData._frames !== undefined) {
      durationFrames = Array.isArray(parsedData._frames) ? parsedData._frames.length : Number(parsedData._frames) || 0;
      console.log('[browserReplayParser] Duration frames:', durationFrames);
    }
    
    // Extract player data from playerStructs
    if (parsedData._gameInfo.playerStructs && typeof parsedData._gameInfo.playerStructs === 'object') {
      try {
        const playerEntries = Object.entries(parsedData._gameInfo.playerStructs);
        console.log('[browserReplayParser] Found player entries:', playerEntries.length);
        
        // Sort by ID to ensure consistent order
        playerEntries.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        
        players = playerEntries.map(([id, data]: [string, any]) => {
          const playerData = data || {};
          
          // Extract player name safely
          const name = typeof playerData.name === 'string' ? playerData.name.trim() : `Player ${parseInt(id) + 1}`;
          
          // Map race ID to race name (0=Zerg, 1=Terran, 2=Protoss)
          // Based on screparsed documentation
          let race = 'Unknown';
          if (playerData.race !== undefined) {
            race = getRaceFromId(Number(playerData.race));
          }
          
          console.log(`[browserReplayParser] Extracted player ${id}: ${name} (${race})`);
          
          return {
            id: parseInt(id),
            name,
            race,
            apm: 150, // Default APM, will be calculated later if possible
            team: playerData.team !== undefined ? Number(playerData.team) : 0
          };
        });
      } catch (e) {
        console.error('[browserReplayParser] Error extracting players from playerStructs:', e);
      }
    }
  }
  // Handle alternative structure if screparsed doesn't provide _gameInfo
  else if (parsedData.header) {
    console.log('[browserReplayParser] Processing alternative structure with header');
    
    // Get map name from the header structure
    mapName = parsedData.header.map || parsedData.mapData?.name || 'Unknown Map';
    
    // Extract players from the header
    if (parsedData.header && parsedData.header.players && Array.isArray(parsedData.header.players)) {
      players = parsedData.header.players.map((p: any, idx: number) => ({
        id: idx,
        name: p.name || `Player ${idx + 1}`,
        race: standardizeRaceName(p.race),
        apm: 150,
        team: p.team || 0
      }));
    }
    
    // Get duration if available
    if (parsedData.header && typeof parsedData.header.duration === 'number') {
      durationFrames = parsedData.header.duration * 24; // Convert seconds to frames
    }
  }
  // Try another common format with Header capitalized
  else if (parsedData.Header) {
    console.log('[browserReplayParser] Processing structure with capitalized Header');
    
    // Get map name
    mapName = parsedData.Header.Map || 'Unknown Map';
    
    // Extract players
    if (parsedData.Header.Players && Array.isArray(parsedData.Header.Players)) {
      players = parsedData.Header.Players.map((p: any, idx: number) => ({
        id: idx,
        name: p.Name || p.name || `Player ${idx + 1}`,
        race: standardizeRaceName(p.Race || p.race),
        apm: 150,
        team: p.Team || p.team || 0
      }));
    }
    
    // Get duration
    if (parsedData.Header.Duration && typeof parsedData.Header.Duration === 'number') {
      durationFrames = parsedData.Header.Duration * 24;
    }
  }
  
  // If still no players, try to find them in the raw structure
  if (!players || players.length === 0) {
    console.log('[browserReplayParser] No players found in standard locations, searching deeper');
    
    // Try to find any player-like objects in the parsed data
    for (const key in parsedData) {
      if (key.toLowerCase().includes('player') && Array.isArray(parsedData[key])) {
        console.log(`[browserReplayParser] Found potential player array in key: ${key}`);
        players = parsedData[key].map((p: any, idx: number) => {
          const name = p.name || p.Name || `Player ${idx + 1}`;
          const race = standardizeRaceName(p.race || p.Race);
          return { id: idx, name, race, apm: 150, team: p.team || p.Team || 0 };
        });
        break;
      }
    }
  }
  
  // If still no players, extract from filename as last resort
  if (!players || players.length === 0) {
    console.log('[browserReplayParser] No player data found, extracting from filename');
    const fileNameParts = fileName.split('.')[0].split(/\s+|_|vs|VS|Vs/);
    players = [
      { id: 0, name: fileNameParts.length > 0 ? fileNameParts[0].trim() : 'Player 1', race: 'Protoss', apm: 150, team: 0 },
      { id: 1, name: fileNameParts.length > 1 ? fileNameParts[1].trim() : 'Player 2', race: 'Protoss', apm: 150, team: 1 }
    ];
  }
  
  // Ensure we have at least 2 players
  while (players.length < 2) {
    players.push({ 
      id: players.length, 
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
    result: 'unknown',
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
    `${transformedData.secondaryPlayer.name} (${transformedData.secondaryPlayer.race})`);
  
  return transformedData;
}
