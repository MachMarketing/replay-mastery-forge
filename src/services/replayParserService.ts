
export interface ParsedReplayResult {
  // adjust these fields to match your Go service output
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
  const form = new FormData();
  form.append('file', file);
  
  console.log('Sending replay file to parser service:', file.name);
  
  try {
    const res = await fetch('/api/parse', {
      method: 'POST',
      body: form,
    });
    
    if (!res.ok) {
      const txt = await res.text();
      console.error('Parser service error:', res.status, txt);
      throw new Error(`Parser error ${res.status}: ${txt}`);
    }
    
    const rawData = await res.json();
    console.log('Raw parser response:', rawData);
    
    // Transform the raw Go parser data into our application format
    // This is a simplified transformation - adjust according to the actual response format
    const parsedData: ParsedReplayResult = {
      playerName: rawData.header?.players?.[0]?.name || 'Unknown',
      opponentName: rawData.header?.players?.[1]?.name || 'Unknown',
      playerRace: mapRace(rawData.header?.players?.[0]?.race),
      opponentRace: mapRace(rawData.header?.players?.[1]?.race),
      map: rawData.header?.mapName || 'Unknown Map',
      duration: formatDuration(rawData.header?.durationFrames || 0),
      date: new Date().toISOString().split('T')[0], // Use current date as fallback
      result: 'win', // Default to win (you may need logic to determine the actual result)
      apm: calculateAPM(rawData.commands?.length || 0, rawData.header?.durationFrames || 0),
      matchup: getMatchup(rawData.header?.players || []),
      buildOrder: extractBuildOrder(rawData.commands || []),
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
