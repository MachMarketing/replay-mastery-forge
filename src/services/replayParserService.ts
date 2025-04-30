
import ScrepJS from 'screp-js';

export interface ParsedReplayResult {
  playerName: string;
  opponentName: string;
  playerRace: 'Terran' | 'Protoss' | 'Zerg';
  opponentRace: 'Terran' | 'Protoss' | 'Zerg';
  map: string;
  duration: string;
  date: string;
  result: 'win' | 'loss';
  apm: number;
  eapm?: number;
  matchup: string;
  buildOrder: { time: string; supply: number; action: string }[];
  resourcesGraph?: { time: string; minerals: number; gas: number }[];
}

export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
  console.log('Parsing replay file with screp-js:', file.name);
  
  try {
    // Convert file to array buffer for screp-js
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Parse with screp-js
    const result = ScrepJS.parseBuffer(uint8Array, {
      includeHeader: true,
      includeCommands: true
    });
    
    console.log('Raw screp-js parser response:', result);
    
    // Transform the raw parser data into our application format
    const parsedData: ParsedReplayResult = {
      playerName: result.header?.players?.[0]?.name || 'Unknown',
      opponentName: result.header?.players?.[1]?.name || 'Unknown',
      playerRace: mapRace(result.header?.players?.[0]?.race),
      opponentRace: mapRace(result.header?.players?.[1]?.race),
      map: result.header?.mapName || 'Unknown Map',
      duration: formatDuration(result.header?.durationFrames || 0),
      date: new Date().toISOString().split('T')[0], // Use current date as fallback
      result: 'win', // Default to win (you may need logic to determine the actual result)
      apm: calculateAPM(result.commands?.length || 0, result.header?.durationFrames || 0),
      matchup: getMatchup(result.header?.players || []),
      buildOrder: extractBuildOrder(result.commands || []),
      resourcesGraph: [] // This would need additional processing
    };
    
    console.log('Parsed replay data:', parsedData);
    return parsedData;
  } catch (error) {
    console.error('Error during replay parsing:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}

// Helper function to map race codes to full names
function mapRace(raceCode: string): 'Terran' | 'Protoss' | 'Zerg' {
  if (!raceCode) return 'Terran';
  switch (raceCode.toUpperCase()) {
    case 'T': case 'TERR': case 'TERRAN': return 'Terran';
    case 'P': case 'PROT': case 'PROTOSS': return 'Protoss';
    case 'Z': case 'ZERG': return 'Zerg';
    default: return 'Terran';
  }
}

// Helper function to format duration from frames to MM:SS
function formatDuration(frames: number): string {
  // StarCraft runs at approximately 23.8 frames per second
  const totalSeconds = Math.floor(frames / 23.8);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Calculate APM from total commands and duration
function calculateAPM(commandCount: number, frames: number): number {
  const minutes = frames / (23.8 * 60); // Convert frames to minutes
  return Math.round(commandCount / Math.max(minutes, 1));
}

// Get matchup string (e.g., "TvZ")
function getMatchup(players: any[]): string {
  if (players.length < 2) return 'UvU';
  const race1 = mapRace(players[0]?.race || '').charAt(0);
  const race2 = mapRace(players[1]?.race || '').charAt(0);
  return `${race1}v${race2}`;
}

// Extract build order from commands
function extractBuildOrder(commands: any[]): { time: string; supply: number; action: string }[] {
  const buildActions = commands
    .filter(cmd => 
      cmd.type === 'train' || 
      cmd.type === 'build' || 
      cmd.type === 'research'
    )
    .slice(0, 20);
  
  return buildActions.map(cmd => {
    const timeMs = (cmd.frame || 0) * (1000 / 23.8);
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    
    return {
      time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      supply: cmd.supply || 0,
      action: cmd.unit || cmd.building || cmd.upgrade || 'Unknown Action'
    };
  });
}
