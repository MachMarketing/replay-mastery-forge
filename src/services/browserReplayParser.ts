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
    
    // According to screparsed, data should include players, header, etc.
    console.log('[browserReplayParser] Parsed data players:', rawData?.players ? 'Found' : 'Not found');
    console.log('[browserReplayParser] Parsed data header:', rawData?.header ? 'Found' : 'Not found');
    console.log('[browserReplayParser] Parsed data commands:', 
      rawData?.commands ? `Found - ${rawData.commands.length} commands` : 'Not found');
    
    // Log the first few commands if available
    if (rawData?.commands && Array.isArray(rawData.commands) && rawData.commands.length > 0) {
      console.log('[browserReplayParser] Sample commands:', rawData.commands.slice(0, 3));
    }
    
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
 * Extract build order information from raw data based on screparsed structure
 */
function extractBuildOrder(rawData: any): Array<{ time: string; supply: number; action: string }> {
  console.log('[browserReplayParser] Attempting to extract build order');
  const buildOrders = [];
  
  try {
    // Based on screparsed GitHub documentation, check for commands array
    if (rawData.commands && Array.isArray(rawData.commands)) {
      console.log('[browserReplayParser] Found commands array, length:', rawData.commands.length);
      
      // Filter for build-related commands
      const buildCommands = rawData.commands.filter((cmd: any) => {
        // Check for various command types that might indicate builds
        const isRelevant = 
          (cmd.type && (cmd.type === 'build' || cmd.type === 'train')) ||
          (cmd.name && (
            cmd.name.toLowerCase().includes('build') || 
            cmd.name.toLowerCase().includes('train') ||
            cmd.name.toLowerCase().includes('probe') ||
            cmd.name.toLowerCase().includes('scv') ||
            cmd.name.toLowerCase().includes('drone')
          ));
          
        return isRelevant;
      });
      
      if (buildCommands.length > 0) {
        console.log('[browserReplayParser] Found build commands:', buildCommands.length);
        return buildCommands.map((cmd: any) => ({
          time: formatGameTime(cmd.frame || 0),
          supply: cmd.supply || 0,
          action: cmd.name || 'Unknown Action'
        }));
      }
    }
    
    // Check for chatMessages as it might contain game events according to repo
    if (rawData.chatMessages && Array.isArray(rawData.chatMessages)) {
      console.log('[browserReplayParser] Found chatMessages, checking for game events');
    }
    
    // Check for players array which might contain build orders
    if (rawData.players && Array.isArray(rawData.players) && rawData.players.length > 0) {
      console.log('[browserReplayParser] Found players array, checking for build orders');
      
      for (const player of rawData.players) {
        if (player.buildOrder && Array.isArray(player.buildOrder) && player.buildOrder.length > 0) {
          console.log('[browserReplayParser] Found player build order:', player.buildOrder.length);
          return player.buildOrder.map((item: any) => ({
            time: formatGameTime(item.frame || 0),
            supply: item.supply || 0,
            action: item.name || 'Unknown Action'
          }));
        }
      }
    }
    
    // Check if we have a gameEvents array
    if (rawData.gameEvents && Array.isArray(rawData.gameEvents)) {
      console.log('[browserReplayParser] Found gameEvents array');
      
      const buildEvents = rawData.gameEvents.filter((event: any) => {
        return event.type === 'unit_born' || event.type === 'building_complete';
      });
      
      if (buildEvents.length > 0) {
        console.log('[browserReplayParser] Found build events:', buildEvents.length);
        return buildEvents.map((event: any) => ({
          time: formatGameTime(event.frame || 0),
          supply: event.supply || 0,
          action: event.name || event.unitType || 'Unknown Action'
        }));
      }
    }
    
    console.log('[browserReplayParser] No build order data found in standard locations');
    return [];
  } catch (error) {
    console.error('[browserReplayParser] Error extracting build order:', error);
    return [];
  }
}

/**
 * Format game time from frames to MM:SS
 */
function formatGameTime(frames: number): string {
  // BW runs at 24 frames per second
  const totalSeconds = Math.floor(frames / 24);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Transform the parsed data into our application's expected format
 * Based on the structure in screparsed GitHub repository
 */
function transformParsedData(parsedData: any, fileName: string): ParsedReplayData {
  // First, log the structure to help with debugging
  console.log('[browserReplayParser] Transforming data with structure:', 
    typeof parsedData === 'object' ? Object.keys(parsedData) : typeof parsedData);
  
  // According to screparsed docs, players should be in parsedData.players
  let players = [];
  
  if (parsedData.players && Array.isArray(parsedData.players)) {
    console.log('[browserReplayParser] Using parsedData.players array');
    players = parsedData.players.map((player: any) => ({
      name: player.name || `Player ${player.id || 'Unknown'}`,
      race: standardizeRaceName(player.race || 'Unknown'),
      apm: player.apm || 150,
      team: player.team || player.id || 0
    }));
  } else {
    console.log('[browserReplayParser] No players array found, using extractPlayerData');
    // Fall back to our extraction function
    players = extractPlayerData(parsedData);
  }
  
  // Extract map name using enhanced map extractor
  let mapName = extractMapName(parsedData);
  console.log('[browserReplayParser] Extracted map name:', mapName);
  
  let durationFrames = 0;
  
  // Get game duration from header or metadata
  if (parsedData.header) {
    console.log('[browserReplayParser] Using header for duration');
    durationFrames = parsedData.header.frames || parsedData.header.duration * 24 || 0;
  } else if (parsedData.metadata) {
    console.log('[browserReplayParser] Using metadata for duration');
    durationFrames = parsedData.metadata.frames || parsedData.metadata.duration * 24 || 0;
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
  const player1 = players[0];
  const player2 = players[1];
  
  // Standardize race names
  const race1 = standardizeRaceName(player1.race);
  const race2 = standardizeRaceName(player2.race);
  
  // Format player names
  const playerName = formatPlayerName(player1.name);
  const opponentName = formatPlayerName(player2.name);
  
  // Extract build orders using our enhanced function
  const buildOrders = extractBuildOrder(parsedData);
  console.log('[browserReplayParser] Extracted build orders:', buildOrders.length, 'items');
  
  // Determine result - ensure it's one of the allowed enum values
  let matchResult: 'win' | 'loss' | 'unknown' = 'unknown';
  
  // Create the transformed data structure
  const transformedData: ParsedReplayData = {
    primaryPlayer: {
      name: playerName,
      race: race1,
      apm: player1.apm || 150,
      eapm: Math.round((player1.apm || 150) * 0.7),
      buildOrder: buildOrders,
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
    buildOrder: buildOrders
  };
  
  console.log('[browserReplayParser] Transformed data:', 
    `${transformedData.primaryPlayer.name} (${transformedData.primaryPlayer.race}) vs ` +
    `${transformedData.secondaryPlayer.name} (${transformedData.secondaryPlayer.race}) on ${transformedData.map}`);
  console.log('[browserReplayParser] Build order items:', transformedData.buildOrder.length);
  
  return transformedData;
}
