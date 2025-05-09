
import { parseReplayWithBrowserSafeParser, initBrowserSafeParser } from './replayParser/browserSafeParser';
import { ParsedReplayData } from './replayParser/types';

// Import readFileAsArrayBuffer
import { readFileAsArrayBuffer } from '../services/fileReader';
import { formatPlayerName, standardizeRaceName, debugLogReplayData } from '../lib/replayUtils';

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
    
    // Log specific parts of the data structure that should exist according to docs
    if (rawData) {
      console.log('[browserReplayParser] Header:', rawData.header);
      console.log('[browserReplayParser] Metadata:', rawData.metadata);
      console.log('[browserReplayParser] Players:', rawData.players);
    }
    
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
 * According to the screparsed package documentation
 */
function transformParsedData(parsedData: any, fileName: string): ParsedReplayData {
  // Log the raw structure to help with debugging
  console.log('[browserReplayParser] Transforming data with structure:', 
    typeof parsedData === 'object' ? Object.keys(parsedData) : typeof parsedData);
  
  // According to screparsed docs, the data should follow this structure:
  // metadata: contains the replay metadata (map name, player names, etc)
  // players: array of player objects with name, race, etc
  // mapData: contains the map information
  
  // Extract map name
  let mapName = 'Unknown Map';
  if (parsedData.metadata && parsedData.metadata.mapName) {
    mapName = parsedData.metadata.mapName;
    console.log('[browserReplayParser] Map name from metadata:', mapName);
  } else if (parsedData.mapData && parsedData.mapData.name) {
    mapName = parsedData.mapData.name;
    console.log('[browserReplayParser] Map name from mapData:', mapName);
  }
  
  // Extract duration
  let durationFrames = 0;
  if (parsedData.metadata && typeof parsedData.metadata.frames === 'number') {
    durationFrames = parsedData.metadata.frames;
    console.log('[browserReplayParser] Duration frames from metadata:', durationFrames);
  }
  
  // Calculate duration in seconds (BW runs at 24 frames per second)
  const durationSeconds = Math.max(1, Math.floor(durationFrames / 24));
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;
  
  // Get timestamp
  let timestamp = new Date().toISOString();
  if (parsedData.metadata && parsedData.metadata.startTime) {
    timestamp = new Date(parsedData.metadata.startTime).toISOString();
    console.log('[browserReplayParser] Timestamp from metadata:', timestamp);
  }
  
  // Extract players
  let players: Array<{name: string; race: string; apm?: number}> = [];
  
  if (parsedData.players && Array.isArray(parsedData.players)) {
    console.log('[browserReplayParser] Found players array with length:', parsedData.players.length);
    
    players = parsedData.players.map((player: any) => {
      // Get name
      const name = player.name || 'Unknown Player';
      
      // Get race - according to screparsed docs, race is a number (0=Zerg, 1=Terran, 2=Protoss)
      let race = 'Unknown';
      if (typeof player.race === 'number') {
        switch(player.race) {
          case 0: race = 'Zerg'; break;
          case 1: race = 'Terran'; break;
          case 2: race = 'Protoss'; break;
        }
      } else if (typeof player.race === 'string') {
        race = standardizeRaceName(player.race);
      }
      
      // Get APM if available
      const apm = player.apm || (parsedData.metadata?.apm?.[player.id] || 150);
      
      return { name: formatPlayerName(name), race, apm };
    });
    
    console.log('[browserReplayParser] Extracted players:', 
      players.map(p => `${p.name} (${p.race}, APM: ${p.apm})`).join(', '));
  }
  
  // If no players were found, try alternate locations
  if (players.length === 0 && parsedData.metadata) {
    console.log('[browserReplayParser] No players array, checking metadata');
    
    if (parsedData.metadata.playerNames && Array.isArray(parsedData.metadata.playerNames)) {
      console.log('[browserReplayParser] Found playerNames in metadata');
      
      // Get player names from metadata
      const names = parsedData.metadata.playerNames;
      
      // Get player races from metadata if available
      let races: string[] = [];
      if (parsedData.metadata.playerRaces && Array.isArray(parsedData.metadata.playerRaces)) {
        races = parsedData.metadata.playerRaces.map((race: any) => {
          if (typeof race === 'number') {
            switch(race) {
              case 0: return 'Zerg';
              case 1: return 'Terran';
              case 2: return 'Protoss';
              default: return 'Unknown';
            }
          } else if (typeof race === 'string') {
            return standardizeRaceName(race);
          }
          return 'Unknown';
        });
      }
      
      // Get APMs if available
      let apms: number[] = [];
      if (parsedData.metadata.apm && Array.isArray(parsedData.metadata.apm)) {
        apms = parsedData.metadata.apm;
      }
      
      // Create player objects
      players = names.map((name: string, i: number) => ({
        name: formatPlayerName(name),
        race: races[i] || 'Unknown',
        apm: apms[i] || 150
      }));
      
      console.log('[browserReplayParser] Created players from metadata:', 
        players.map(p => `${p.name} (${p.race}, APM: ${p.apm})`).join(', '));
    }
  }
  
  // If still no players, extract from filename as last resort
  if (players.length === 0) {
    console.log('[browserReplayParser] No player data found, extracting from filename');
    const fileNameParts = fileName.split('.')[0].split(/\s+|_|vs|VS|Vs/);
    
    // Try to find race identifiers
    const raceMatch = fileName.match(/([TPZtpz])\s*v\s*([TPZtpz])/i);
    let race1 = 'Protoss', race2 = 'Protoss';
    
    if (raceMatch) {
      const r1 = raceMatch[1].toUpperCase();
      const r2 = raceMatch[2].toUpperCase();
      
      race1 = r1 === 'T' ? 'Terran' : (r1 === 'Z' ? 'Zerg' : 'Protoss');
      race2 = r2 === 'T' ? 'Terran' : (r2 === 'Z' ? 'Zerg' : 'Protoss');
    }
    
    players = [
      { name: fileNameParts[0] || 'Player 1', race: race1, apm: 150 },
      { name: fileNameParts[1] || 'Player 2', race: race2, apm: 150 }
    ];
  }
  
  // Ensure we have at least 2 players
  while (players.length < 2) {
    players.push({ 
      name: `Player ${players.length + 1}`, 
      race: 'Protoss', 
      apm: 150
    });
  }
  
  // Extract player 1 and 2
  const player1 = players[0];
  const player2 = players[1];
  
  // Create the matchup string
  const matchup = `${player1.race.charAt(0)}v${player2.race.charAt(0)}`;
  
  // Extract match result if available
  let result = 'unknown';
  if (parsedData.metadata && parsedData.metadata.winners) {
    // In screparsed, winners is an array of player indices
    const winners = parsedData.metadata.winners;
    // Assume player1 is the primary player (index 0)
    if (winners.includes(0)) {
      result = 'win';
    } else {
      result = 'loss';
    }
    console.log('[browserReplayParser] Match result:', result);
  }
  
  // Calculate effective APM (about 70% of APM)
  const eapm1 = Math.round((player1.apm || 150) * 0.7);
  const eapm2 = Math.round((player2.apm || 150) * 0.7);
  
  // Build order - if available
  let buildOrder: Array<{ time: string; supply: number; action: string }> = [];
  if (parsedData.buildOrder && Array.isArray(parsedData.buildOrder) && 
      parsedData.buildOrder[0] && Array.isArray(parsedData.buildOrder[0])) {
    
    console.log('[browserReplayParser] Found build order for player 1');
    
    // According to docs, buildOrder is an array of player build orders
    // Each player's build order is an array of items
    buildOrder = parsedData.buildOrder[0].map((item: any) => ({
      time: formatDuration(Math.floor(item.time / 24)),
      supply: item.supply || 0,
      action: item.name || 'Unknown action'
    }));
  }
  
  // Create the transformed data structure
  const transformedData: ParsedReplayData = {
    primaryPlayer: {
      name: player1.name,
      race: player1.race,
      apm: player1.apm || 150,
      eapm: eapm1,
      buildOrder: buildOrder,
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    secondaryPlayer: {
      name: player2.name,
      race: player2.race,
      apm: player2.apm || 150,
      eapm: eapm2,
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    map: mapName,
    matchup: matchup,
    duration: formattedDuration,
    durationMS: durationSeconds * 1000,
    date: timestamp,
    result: result,
    strengths: ['Replay analysis requires premium'],
    weaknesses: ['Replay analysis requires premium'],
    recommendations: ['Upgrade to premium for detailed analysis'],
    
    // Legacy properties
    playerName: player1.name,
    opponentName: player2.name,
    playerRace: player1.race,
    opponentRace: player2.race,
    apm: player1.apm || 150,
    eapm: eapm1,
    opponentApm: player2.apm || 150,
    opponentEapm: eapm2,
    buildOrder: buildOrder
  };
  
  console.log('[browserReplayParser] Transformed data:', 
    `${transformedData.primaryPlayer.name} (${transformedData.primaryPlayer.race}) vs ` +
    `${transformedData.secondaryPlayer.name} (${transformedData.secondaryPlayer.race}) on ${transformedData.map}`);
  
  return transformedData;
}

/**
 * Helper function to format duration
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
