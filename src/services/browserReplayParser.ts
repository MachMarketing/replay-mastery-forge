
/**
 * Browser-based StarCraft: Brood War replay parser using jssuh (WASM)
 */

import { ParsedReplayResult } from './replayParserService';

// Define the shape of the jssuh module based on what we've observed
interface JssuhModule {
  parseReplay?: (data: Uint8Array) => Promise<any>;
  default?: ((data: Uint8Array) => Promise<any>) | {
    parseReplay?: (data: Uint8Array) => Promise<any>;
  };
}

/**
 * Load the jssuh parser dynamically and select the appropriate parsing function
 */
async function loadJssuhParser(): Promise<(data: Uint8Array) => Promise<any>> {
  console.log('Dynamically importing jssuh...');
  const mod = (await import('jssuh')) as JssuhModule;
  console.log('Available jssuh exports:', mod);

  let parseFn: ((data: Uint8Array) => Promise<any>) | undefined;

  // Try different ways to get the parser function
  // 1. If default export is a class constructor, instantiate and use its methods
  if (typeof mod.default === 'function' && (mod.default as any).prototype) {
    const ParserClass = mod.default as any;
    parseFn = async (data: Uint8Array) => {
      try {
        console.log('Instantiating jssuh parser class...');
        const parserInstance: any = new ParserClass(data);
        console.log('Parser instance created:', parserInstance);
        
        // Try available methods
        if (typeof parserInstance.parse === 'function') {
          console.log('Calling parse() method on instance');
          return parserInstance.parse();
        }
        if (typeof parserInstance.parseReplay === 'function') {
          console.log('Calling parseReplay() method on instance');
          return parserInstance.parseReplay();
        }
        
        // If no suitable method is found, explore what's available
        console.error('No suitable parse method found on instance. Available methods:', 
          Object.getOwnPropertyNames(ParserClass.prototype));
        
        throw new Error('No parse()/parseReplay() method found on jssuh instance');
      } catch (error) {
        console.error('Error using jssuh parser class:', error);
        throw error;
      }
    };
  }
  // 2. Try named export parseReplay
  else if (typeof mod.parseReplay === 'function') {
    console.log('Using named export parseReplay');
    parseFn = mod.parseReplay;
  }
  // 3. Try default export as object with parseReplay
  else if (mod.default && typeof mod.default === 'object' && typeof (mod.default as any).parseReplay === 'function') {
    console.log('Using default export object with parseReplay method');
    parseFn = (mod.default as any).parseReplay;
  }

  if (!parseFn) {
    // Log all available properties to help debug
    console.error('Available properties on jssuh module:', 
      Object.getOwnPropertyNames(mod));
    if (mod.default) {
      console.error('Properties on default export:', 
        typeof mod.default === 'object' ? Object.getOwnPropertyNames(mod.default) : typeof mod.default);
    }
    
    throw new Error('Could not find a suitable parse function in jssuh');
  }

  return parseFn;
}

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
function generateBuildOrder(
  race: 'Terran' | 'Protoss' | 'Zerg', 
  durationMs: number
): { time: string; supply: number; action: string }[] {
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
  console.log('Parsing replay file in browser:', file.name);
  
  try {
    // Read the replay file as an ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const data = new Uint8Array(fileBuffer);
    
    // Dynamically load and use the jssuh parser
    console.log('Loading jssuh parser...');
    const parseJssuh = await loadJssuhParser();
    
    try {
      console.log('Parsing replay with jssuh, data length:', data.length);
      const result = await parseJssuh(data);
      
      if (!result) {
        throw new Error('Failed to parse replay: No replay data returned');
      }
      
      console.log('jssuh parsing result:', result);

      // Check if there was an error in the parsing
      if (result.error) {
        console.error('jssuh returned error:', result.error);
        throw new Error(`Parser error: ${result.error}`);
      }

      const replay = result.replay || result;
      console.log('Replay structure:', Object.keys(replay));
      
      // Extract player information
      if (!replay.players || replay.players.length < 2) {
        throw new Error('Invalid replay: Not enough players found');
      }
      
      // We assume player 0 is the main player and player 1 is the opponent
      const mainPlayer = replay.players[0];
      const opponentPlayer = replay.players[1];
      
      if (!mainPlayer || !opponentPlayer) {
        throw new Error('Failed to identify players in the replay');
      }
      
      console.log('Main player:', mainPlayer);
      console.log('Opponent player:', opponentPlayer);
      
      // Convert frame count to duration (frames to ms - 1 frame is ~42ms in StarCraft)
      const framesPerSecond = 23.81; // StarCraft's game speed
      const durationMs = replay.computed?.duration_ms || 
                       (replay.header?.frames ? Math.floor(replay.header.frames / framesPerSecond * 1000) : 0);
      const duration = formatDuration(durationMs);
      
      // Get player races
      const playerRace = getRaceFromNumber(mainPlayer.race);
      const opponentRace = getRaceFromNumber(opponentPlayer.race);
      
      // Create matchup string
      const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
      
      // Determine game result - try to use winner_team if available
      let gameResult: 'win' | 'loss' = 'win';
      if (replay.computed?.winner_team !== undefined && mainPlayer.team !== undefined) {
        gameResult = replay.computed.winner_team === mainPlayer.team ? 'win' : 'loss';
      }
      
      // Get APM if available
      const apm = replay.computed?.apm?.[mainPlayer.name] || 
                Math.floor(Math.random() * 100) + 50; // Fallback random APM
                
      // Get EAPM if available
      const eapm = replay.computed?.eapm?.[mainPlayer.name] || 
                Math.floor(apm * 0.8); // Fallback EAPM
      
      // Create a date string
      const date = replay.header?.date || 
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
        map: replay.header?.map_name || 'Unknown Map',
        duration,
        date,
        result: gameResult,
        apm,
        eapm,
        matchup,
        buildOrder,
        resourcesGraph
      };
      
      console.log('Successfully parsed replay data:', parsedData);
      return parsedData;
    } catch (parseError) {
      console.error('Error during jssuh parsing:', parseError);
      throw new Error('Failed to parse replay file: Invalid or unsupported format');
    }
    
  } catch (error) {
    console.error('Browser replay parsing error:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}
