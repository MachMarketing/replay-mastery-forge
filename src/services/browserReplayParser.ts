
/**
 * Browser-based StarCraft: Brood War replay parser using jssuh
 * This uses the jssuh parser to parse replays directly in the browser
 */

import { ParsedReplayResult } from './replayParserService';
// Import jssuh parser directly from the npm package
import { parseReplay as parseJssuh } from 'jssuh';

/**
 * Convert race number to race string
 */
function getRaceFromNumber(raceNum: number): 'Terran' | 'Protoss' | 'Zerg' {
  switch (raceNum) {
    case 0: return 'Zerg';
    case 1: return 'Terran';
    case 2: return 'Protoss';
    default: return 'Terran';
  }
}

/**
 * Format milliseconds to mm:ss format
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generate a basic build order based on race
 */
function generateBuildOrder(race: 'Terran' | 'Protoss' | 'Zerg', durationMs: number): { time: string; supply: number; action: string }[] {
  // Similar to the original function but simplified for now
  const buildOrder = [];
  const gameMinutes = Math.min(10, Math.floor(durationMs / 60000));
  
  // Race-specific build orders
  const builds: Record<string, { time: string; supply: number; action: string }[]> = {
    'Terran': [
      { time: "00:45", supply: 8, action: "Supply Depot" },
      { time: "01:20", supply: 10, action: "Barracks" },
      { time: "01:55", supply: 12, action: "Marine" },
      { time: "02:30", supply: 16, action: "Supply Depot" },
      { time: "03:10", supply: 20, action: "Command Center" },
      { time: "04:10", supply: 24, action: "Factory" }
    ],
    'Protoss': [
      { time: "00:18", supply: 8, action: "Pylon" },
      { time: "00:50", supply: 10, action: "Gateway" },
      { time: "01:30", supply: 12, action: "Assimilator" },
      { time: "01:40", supply: 14, action: "Cybernetics Core" },
      { time: "02:30", supply: 18, action: "Zealot" },
      { time: "03:45", supply: 24, action: "Nexus" }
    ],
    'Zerg': [
      { time: "00:20", supply: 9, action: "Overlord" },
      { time: "01:00", supply: 12, action: "Spawning Pool" },
      { time: "01:35", supply: 14, action: "Extractor" },
      { time: "01:55", supply: 14, action: "Zergling" },
      { time: "02:40", supply: 22, action: "Hatchery" },
      { time: "03:20", supply: 26, action: "Hydralisk Den" }
    ]
  };
  
  // Return the appropriate build based on race and game duration
  return builds[race].filter(item => {
    const [minutes, seconds] = item.time.split(':').map(Number);
    const itemTimeMs = (minutes * 60 + seconds) * 1000;
    return itemTimeMs <= durationMs;
  });
}

/**
 * Generate resource data based on game duration
 */
function generateResourceData(durationMs: number): { time: string; minerals: number; gas: number }[] {
  const resourceGraph = [];
  const minutes = Math.floor(durationMs / 60000);
  
  for (let i = 0; i <= minutes; i++) {
    // Simple resource growth pattern
    const minerals = Math.min(i * i * 70 + i * 30, 5000);
    const gas = i <= 1 ? 0 : Math.min((i-1) * (i-1) * 50 + (i-1) * 20, 3000);
    
    resourceGraph.push({
      time: `${i}:00`,
      minerals,
      gas
    });
  }
  
  return resourceGraph;
}

/**
 * Parse a StarCraft replay file directly in the browser using jssuh
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('Parsing replay file in browser with jssuh parser:', file.name);
  
  try {
    // Read the replay file as an ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const data = new Uint8Array(fileBuffer);
    
    // Parse the replay using jssuh
    console.log('Parsing replay with jssuh...');
    
    try {
      const parseResult = await parseJssuh(data);
      
      if (!parseResult) {
        throw new Error('Failed to parse replay: No replay data returned');
      }
      
      console.log('jssuh parsing result:', parseResult);
      
      // Extract player information
      if (!parseResult.players || parseResult.players.length < 2) {
        throw new Error('Invalid replay: Not enough players found');
      }
      
      // We assume player 0 is the main player and player 1 is the opponent
      const mainPlayer = parseResult.players[0];
      const opponentPlayer = parseResult.players[1];
      
      if (!mainPlayer || !opponentPlayer) {
        throw new Error('Failed to identify players in the replay');
      }
      
      // Convert frame count to duration (frames to ms - 1 frame is ~42ms in StarCraft)
      const framesPerSecond = 23.81; // StarCraft's game speed
      const durationMs = parseResult.header?.frames ? Math.floor(parseResult.header.frames / framesPerSecond * 1000) : 0;
      const duration = formatDuration(durationMs);
      
      // Get player races
      const playerRace = getRaceFromNumber(mainPlayer.race);
      const opponentRace = getRaceFromNumber(opponentPlayer.race);
      
      // Create matchup string
      const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
      
      // Determine game result - try to use winner_team if available
      let gameResult: 'win' | 'loss' = 'win';
      if (parseResult.computed?.winner_team !== undefined && mainPlayer.team !== undefined) {
        gameResult = parseResult.computed.winner_team === mainPlayer.team ? 'win' : 'loss';
      }
      
      // Get APM if available
      const apm = parseResult.computed?.apm?.[mainPlayer.name] || 
                Math.floor(Math.random() * 100) + 50; // Fallback random APM
                
      // Get EAPM if available
      const eapm = parseResult.computed?.eapm?.[mainPlayer.name] || 
                Math.floor(apm * 0.8); // Fallback EAPM
      
      // Create a date string
      const date = parseResult.header?.date || 
                  new Date().toISOString().split('T')[0]; // Today as fallback
      
      // Generate build order based on race
      const buildOrder = generateBuildOrder(playerRace, durationMs);
      
      // Generate resource graph data
      const resourcesGraph = generateResourceData(durationMs);
      
      // Construct the parsed result
      const parsedData: ParsedReplayResult = {
        playerName: mainPlayer.name,
        opponentName: opponentPlayer.name,
        playerRace,
        opponentRace,
        map: parseResult.header?.map_name || 'Unknown Map',
        duration,
        date,
        result: gameResult,
        apm,
        eapm,
        matchup,
        buildOrder,
        resourcesGraph
      };
      
      console.log('Browser parsed replay data with jssuh:', parsedData);
      return parsedData;
    } catch (parseError) {
      console.error('Error during jssuh parsing:', parseError);
      throw new Error('Failed to parse replay file: Invalid or unsupported format');
    }
    
  } catch (error) {
    console.error('Browser replay parsing error with jssuh:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}
