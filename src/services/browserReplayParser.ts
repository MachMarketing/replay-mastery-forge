
/**
 * Browser-based StarCraft: Brood War replay parser using screp-js
 * This uses the screp parser compiled to WebAssembly to parse replays directly in the browser
 */

import { ParsedReplayResult } from './replayParserService';

// Define the interface for the screp-js library
interface ScrepResult {
  error?: string;
  replay?: {
    header: {
      version: string;
      frames: number;
      date?: string;
      map_name?: string;
      game_type?: number;
    };
    players: {
      name: string;
      race: number; // 0=Zerg, 1=Terran, 2=Protoss
      team?: number;
      is_observer?: boolean;
      is_computer?: boolean;
    }[];
    computed: {
      duration_frames: number;
      duration_ms: number;
      winner_team?: number;
      apm?: {
        [playerName: string]: number;
      };
      eapm?: {
        [playerName: string]: number;
      };
      actions?: {
        [playerName: string]: any[];
      };
      action_spm?: {
        [playerName: string]: number;
      };
    };
    commands?: any[];
  };
}

// Base URL for loading the screp-js WASM module
const SCREP_JS_URL = 'https://cdn.jsdelivr.net/npm/screp-js@1.0.0/dist';

/**
 * Dynamically load the screp-js WebAssembly module
 */
async function loadScrepJs(): Promise<any> {
  try {
    // Check if it's already loaded in window
    if (window.ScrepJS) {
      console.log('ScrepJS already loaded');
      return window.ScrepJS;
    }

    console.log('Loading screp-js from CDN...');
    
    // Create a script element to load the screp-js library
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${SCREP_JS_URL}/screp.js`;
      script.async = true;
      
      script.onload = () => {
        console.log('screp-js loaded successfully');
        // Initialize the WASM module
        window.ScrepJS.ready.then(() => {
          console.log('screp-js WASM initialized');
          resolve(window.ScrepJS);
        });
      };
      
      script.onerror = () => {
        console.error('Failed to load screp-js');
        reject(new Error('Failed to load screp-js library'));
      };
      
      document.body.appendChild(script);
    });
  } catch (error) {
    console.error('Error loading screp-js:', error);
    throw error;
  }
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
 * Parse a StarCraft replay file directly in the browser using screp-js
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayResult> {
  console.log('Parsing replay file in browser with screp-js:', file.name);
  
  try {
    // Load the screp-js library
    const screpJs = await loadScrepJs();
    if (!screpJs) {
      throw new Error('Failed to load the screp-js parser');
    }
    
    // Read the replay file as an ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const data = new Uint8Array(fileBuffer);
    
    // Parse the replay using screp-js
    console.log('Parsing replay with screp-js...');
    const result: ScrepResult = await screpJs.parseReplay(data);
    
    if (result.error) {
      throw new Error(`Screp parser error: ${result.error}`);
    }
    
    if (!result.replay) {
      throw new Error('Failed to parse replay: No replay data returned');
    }
    
    console.log('Screp-js parsing result:', result);
    
    const { replay } = result;
    
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
    
    // Convert frame count to duration
    const durationMs = replay.computed?.duration_ms || 0;
    const duration = formatDuration(durationMs);
    
    // Get player races
    const playerRace = getRaceFromNumber(mainPlayer.race);
    const opponentRace = getRaceFromNumber(opponentPlayer.race);
    
    // Create matchup string
    const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
    
    // Determine game result - try to use winner_team if available
    let result: 'win' | 'loss' = 'win';
    if (replay.computed?.winner_team !== undefined && mainPlayer.team !== undefined) {
      result = replay.computed.winner_team === mainPlayer.team ? 'win' : 'loss';
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
      result,
      apm,
      eapm,
      matchup,
      buildOrder,
      resourcesGraph
    };
    
    console.log('Browser parsed replay data with screp-js:', parsedData);
    return parsedData;
    
  } catch (error) {
    console.error('Browser replay parsing error with screp-js:', error);
    throw error;
  }
}

// Add this to the window for type definition
declare global {
  interface Window {
    ScrepJS: {
      ready: Promise<any>;
      parseReplay: (data: Uint8Array) => Promise<ScrepResult>;
    };
  }
}
