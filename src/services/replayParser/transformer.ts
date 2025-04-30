
import { ParsedReplayData } from './types';

/**
 * Transform raw parsed data into our application's format
 */
export function transformJSSUHData(jssuhData: any): ParsedReplayData {
  try {
    // Extract player information
    const players = jssuhData.players || [];
    const playerInfo = players[0] || { name: 'Unknown', race: 'T' };
    const opponentInfo = players.length > 1 ? players[1] : { name: 'Unknown', race: 'T' };
    
    // Calculate game duration
    const ms = jssuhData.durationMS || 0;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Calculate APM from total commands
    const totalActions = jssuhData.actions?.length || 0;
    const gameMinutes = ms / 60000;
    const apm = Math.round(totalActions / (gameMinutes || 1));
    
    // Map race codes to full names
    const playerRace = mapRace(playerInfo.race);
    const opponentRace = mapRace(opponentInfo.race);
    
    // Determine matchup
    const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
    
    // Extract build order
    const buildOrder = extractBuildOrder(jssuhData.actions || []);
    
    return {
      playerName: playerInfo.name,
      opponentName: opponentInfo.name,
      playerRace,
      opponentRace,
      map: jssuhData.mapName || 'Unknown Map',
      duration,
      date: jssuhData.gameStartDate ? new Date(jssuhData.gameStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      result: determineResult(jssuhData, playerInfo.id),
      apm,
      eapm: Math.floor(apm * 0.85), // Estimated EAPM
      matchup,
      buildOrder,
      resourcesGraph: []
    };
  } catch (error) {
    console.error('Error transforming jssuh data:', error);
    throw new Error('Failed to process replay data');
  }
}

/**
 * Map race codes to full names
 */
function mapRace(race: string): 'Terran' | 'Protoss' | 'Zerg' {
  if (!race) return 'Terran';
  switch (race.toUpperCase()) {
    case 'T': return 'Terran';
    case 'P': return 'Protoss';
    case 'Z': return 'Zerg';
    default: return 'Terran';
  }
}

/**
 * Determine the game result for the player
 */
function determineResult(jssuhData: any, playerId: string): 'win' | 'loss' {
  // In absence of clear winner info from jssuh, 
  // we'll default to win but could be improved later
  return 'win';
}

/**
 * Extract build order from commands
 */
function extractBuildOrder(actions: any[]): { time: string; supply: number; action: string }[] {
  // Filter for relevant build actions from jssuh data
  const buildActions = actions
    .filter(cmd => 
      cmd.type === 'train' || 
      cmd.type === 'build' || 
      cmd.type === 'upgrade'
    )
    .slice(0, 20);
  
  return buildActions.map(cmd => {
    // Convert frames to ms (StarCraft runs at 24fps)
    const timeMs = (cmd.frame || 0) * (1000 / 24);
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    
    return {
      time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      supply: cmd.supply || 0,
      action: cmd.unit || cmd.building || cmd.upgrade || 'Unknown Action'
    };
  });
}
