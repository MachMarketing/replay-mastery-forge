
/**
 * Browser-based StarCraft: Brood War replay parser using screp-js (WASM) loaded from CDN
 */

import { ParsedReplayResult } from './replayParserService';

/**
 * Loads screp-js from CDN as <script> and initializes WASM.
 */
async function loadScrepJs(): Promise<void> {
  // If already loaded (ready-Promise exists), just wait on it
  if (typeof (window as any).parseReplay === 'function'
      && (window as any).ready?.then) {
    return (window as any).ready;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Correct URL via unpkg
    script.src = 'https://unpkg.com/screp-js@0.3.0/dist/index.umd.js';
    script.async = true;
    script.onload = () => {
      // The UMD build attaches two globals:
      //   window.parseReplay(data: Uint8Array) => Promise<ReplayResult>
      //   window.ready: Promise<void>
      console.log('screp-js UMD script loaded from CDN');
      if (typeof (window as any).parseReplay !== 'function'
          || !(window as any).ready?.then) {
        console.error('screp-js UMD global API not found');
        return reject(new Error('screp-js UMD global API not found'));
      }
      (window as any).ready
        .then(() => {
          console.log('screp-js WASM initialized successfully');
          resolve();
        })
        .catch((e: any) => {
          console.error('Failed to load screp-js WASM:', e);
          reject(e);
        });
    };
    script.onerror = () => {
      console.error('Failed to load screp-js script from CDN');
      reject(new Error('Failed to load screp-js from CDN'));
    };
    document.body.appendChild(script);
  });
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
 * Parse a StarCraft replay file directly in the browser using screp-js WASM loaded from CDN
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('Parsing replay file in browser:', file.name);
  
  try {
    // 1) Load screp-js UMD from CDN and initialize WASM
    console.log('Loading screp-js from CDN...');
    await loadScrepJs();
    console.log('screp-js loaded and WASM initialized');
    
    // 2) Use global parseReplay and ready
    const parseReplay = (window as any).parseReplay as (data: Uint8Array) => Promise<any>;
    
    if (typeof parseReplay !== 'function') {
      throw new Error('screp-js parseReplay is not available');
    }
    
    // 3) Read file into Uint8Array
    const fileBuffer = await file.arrayBuffer();
    const data = new Uint8Array(fileBuffer);
    console.log('File read as Uint8Array, length:', data.length);
    
    // 4) Parse the replay
    console.log('Parsing replay with screp-js UMD...');
    let result: any;
    try {
      result = await parseReplay(data);
    } catch (e) {
      console.error('screp-js parse error:', e);
      throw new Error('Failed to parse replay file: ' + (e instanceof Error ? e.message : String(e)));
    }
    
    console.log('screp-js parsing result:', result);

    // 5) Validation
    if (result.error) {
      console.error('screp-js returned error:', result.error);
      throw new Error(`Parser error: ${result.error}`);
    }

    if (!result.replay) {
      throw new Error('No replay data returned from parser');
    }

    // 6) Map to ParsedReplayResult
    const { replay } = result;
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
    
    // Convert frame count to duration
    const durationMs = replay.computed?.duration_ms || 0;
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
    const apm = replay.computed?.apm?.[mainPlayer.name] ?? 0;
    
    // Get EAPM if available
    const eapm = replay.computed?.eapm?.[mainPlayer.name] ?? 0;
    
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
    
  } catch (error) {
    console.error('Browser replay parsing error:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}
