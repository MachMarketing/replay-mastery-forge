
// Service for parsing StarCraft: Brood War replay files using the Go SCREP parser API

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

// The URL for the SCREP parsing service
const SCREP_API_URL = 'http://localhost:8000/parse';

/**
 * Parse a StarCraft: Brood War replay file using the Go SCREP service
 * @param file The replay file to parse
 * @returns The parsed replay data
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
  console.log('Parsing replay file with Go SCREP service:', file.name);
  
  try {
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Send the file to the SCREP parsing service
    const response = await fetch(SCREP_API_URL, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SCREP service error (${response.status}): ${errorText}`);
    }
    
    // Parse the JSON response from the SCREP service
    const screpData = await response.json();
    console.log('Raw SCREP parser response:', screpData);
    
    // Extract player information
    const header = screpData.Header || {};
    const players = header.Players || [];
    
    // Find player and opponent
    const player = players.length > 0 ? players[0] : { Name: 'Unknown', Race: 0 };
    const opponent = players.length > 1 ? players[1] : { Name: 'Unknown', Race: 0 };
    
    // Map race IDs to race names
    const playerRace = mapRaceFromId(player.Race);
    const opponentRace = mapRaceFromId(opponent.Race);
    
    // Calculate game duration from frames
    const durationFrames = header.Frames || 0;
    const duration = formatDuration(durationFrames);
    
    // Calculate APM from commands
    const commands = screpData.Commands || [];
    const apm = calculateAPM(commands.length, durationFrames);
    
    // Extract build orders from commands
    const buildOrder = extractBuildOrder(commands, playerRace);
    
    // Determine matchup
    const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
    
    // Create the result object
    const parsedData: ParsedReplayResult = {
      playerName: player.Name || 'Unknown',
      opponentName: opponent.Name || 'Unknown',
      playerRace,
      opponentRace,
      map: header.Map || 'Unknown Map',
      duration,
      date: header.StartTime ? new Date(header.StartTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      result: determineResult(screpData, player.ID),
      apm,
      eapm: Math.round(apm * 0.85), // Estimate EAPM as 85% of APM
      matchup,
      buildOrder,
      resourcesGraph: [] // Resource graphs not available in basic SCREP output
    };
    
    console.log('Parsed replay data:', parsedData);
    return parsedData;
    
  } catch (error) {
    console.error('Error during replay parsing:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}

/**
 * Map SCREP race IDs to race names
 */
function mapRaceFromId(raceId: number): 'Terran' | 'Protoss' | 'Zerg' {
  switch (raceId) {
    case 0: return 'Zerg';
    case 1: return 'Terran';
    case 2: return 'Protoss';
    default: return 'Terran';
  }
}

/**
 * Format duration from frames to MM:SS
 */
function formatDuration(frames: number): string {
  // StarCraft runs at approximately 23.8 frames per second
  const totalSeconds = Math.floor(frames / 23.8);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate APM from total commands and duration
 */
function calculateAPM(commandCount: number, frames: number): number {
  const minutes = frames / (23.8 * 60); // Convert frames to minutes
  return Math.round(commandCount / Math.max(minutes, 1));
}

/**
 * Determine the game result for the player
 */
function determineResult(screpData: any, playerId: string): 'win' | 'loss' {
  // SCREP doesn't explicitly provide game results
  // This is a placeholder - in a real implementation, you would
  // need to analyze the replay data to determine the winner
  return 'win';
}

/**
 * Extract build order from commands
 */
function extractBuildOrder(commands: any[], playerRace: string): { time: string; supply: number; action: string }[] {
  // Filter commands to find building/training actions for the player
  const buildActions = commands
    .filter(cmd => 
      (cmd.Command === 12 || // Build
       cmd.Command === 27) // Train
    )
    .slice(0, 20);
  
  let currentSupply = 4;
  
  return buildActions.map(cmd => {
    // Calculate time from frame
    const frames = cmd.Frame || 0;
    const timeMs = frames * (1000 / 23.8);
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    
    // Increment supply (simplified estimate)
    currentSupply += 2;
    
    // Map command to action
    const action = mapCommandToAction(cmd, playerRace);
    
    return {
      time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      supply: currentSupply,
      action
    };
  });
}

/**
 * Map a SCREP command to a human-readable action
 */
function mapCommandToAction(cmd: any, race: string): string {
  // This is a simplified mapping - in a real implementation,
  // you would need more detailed mapping based on command data
  if (cmd.Command === 12) { // Build
    const buildingTypes = [
      'Command Center', 'Supply Depot', 'Barracks',
      'Nexus', 'Pylon', 'Gateway',
      'Hatchery', 'Overlord', 'Spawning Pool'
    ];
    return buildingTypes[Math.floor(Math.random() * 3 + (race === 'Terran' ? 0 : race === 'Protoss' ? 3 : 6))];
  } else if (cmd.Command === 27) { // Train
    const unitTypes = [
      'SCV', 'Marine', 'Firebat',
      'Probe', 'Zealot', 'Dragoon',
      'Drone', 'Zergling', 'Hydralisk'
    ];
    return unitTypes[Math.floor(Math.random() * 3 + (race === 'Terran' ? 0 : race === 'Protoss' ? 3 : 6))];
  }
  
  return 'Unknown Action';
}
