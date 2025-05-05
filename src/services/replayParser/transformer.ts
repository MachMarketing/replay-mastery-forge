
import { ParsedReplayData } from './types';

/**
 * Transform raw parsed data into our application's format
 */
export function transformJSSUHData(jssuhData: any): ParsedReplayData {
  try {
    console.log('[transformer] Starting transformation of JSSUH data');
    
    // Extract player information
    const players = jssuhData.players || [];
    const playerInfo = players[0] || { name: 'Unknown', race: 'T', raceLetter: 'T' };
    const opponentInfo = players.length > 1 ? players[1] : { name: 'Unknown', race: 'T', raceLetter: 'T' };
    
    console.log('[transformer] Extracted player info:', {
      player: { name: playerInfo.name, race: playerInfo.race, raceLetter: playerInfo.raceLetter },
      opponent: { name: opponentInfo.name, race: opponentInfo.race, raceLetter: opponentInfo.raceLetter }
    });
    
    // Calculate game duration
    const ms = jssuhData.durationMS || 0;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Calculate APM from total commands
    const totalActions = jssuhData.actions?.length || 0;
    const gameMinutes = ms / 60000 || 1; // Prevent division by zero
    const apm = Math.round(totalActions / gameMinutes);
    
    // Map race codes to full names with enhanced detection
    const playerRace = determineRace(playerInfo);
    const opponentRace = determineRace(opponentInfo);
    
    console.log('[transformer] Mapped races:', {
      playerRace, 
      opponentRace
    });
    
    // Determine matchup
    const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
    
    // Extract build order
    const buildOrder = extractBuildOrder(jssuhData.actions || []);
    
    const result: ParsedReplayData = {
      playerName: playerInfo.name || 'Player',
      opponentName: opponentInfo.name || 'Opponent',
      playerRace,
      opponentRace,
      map: jssuhData.mapName || 'Unknown Map',
      duration,
      date: jssuhData.gameStartDate ? new Date(jssuhData.gameStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      result: determineResult(jssuhData, playerInfo.id),
      apm: apm || 150,
      eapm: Math.floor((apm || 150) * 0.85), // Estimated EAPM
      matchup,
      buildOrder,
      resourcesGraph: []
    };
    
    console.log('[transformer] Transformation complete:', {
      playerName: result.playerName,
      opponentName: result.opponentName,
      playerRace: result.playerRace,
      opponentRace: result.opponentRace,
      matchup: result.matchup
    });
    
    return result;
  } catch (error) {
    console.error('[transformer] Error transforming data:', error);
    
    // Return fallback data in case of error
    return {
      playerName: 'Player',
      opponentName: 'Opponent',
      playerRace: 'Terran',
      opponentRace: 'Zerg',
      map: 'Unknown Map',
      matchup: 'TvZ',
      duration: '5:00',
      durationMS: 300000,
      date: new Date().toISOString().split('T')[0],
      result: 'win',
      apm: 150,
      eapm: 120,
      buildOrder: [],
      actionList: [],
      resourcesGraph: []
    } as ParsedReplayData;
  }
}

/**
 * Determine race based on player info
 */
function determineRace(playerInfo: any): 'Terran' | 'Protoss' | 'Zerg' {
  // Check if we already have a full race name
  if (playerInfo.race && typeof playerInfo.race === 'string') {
    const normalizedRace = playerInfo.race.trim().toLowerCase();
    
    if (normalizedRace === 'terran') return 'Terran';
    if (normalizedRace === 'protoss') return 'Protoss';
    if (normalizedRace === 'zerg') return 'Zerg';
  }
  
  // Check if we have a single-letter race code
  if (playerInfo.raceLetter && typeof playerInfo.raceLetter === 'string') {
    const raceLetter = playerInfo.raceLetter.trim().toUpperCase();
    
    if (raceLetter === 'T') return 'Terran';
    if (raceLetter === 'P') return 'Protoss';
    if (raceLetter === 'Z') return 'Zerg';
  }
  
  // If race is a number, map it
  if (typeof playerInfo.race === 'number') {
    if (playerInfo.race === 0) return 'Terran';
    if (playerInfo.race === 1) return 'Protoss';
    if (playerInfo.race === 2) return 'Zerg';
  }
  
  // Default to Terran if we can't determine
  console.warn('[transformer] Could not determine race, defaulting to Terran');
  return 'Terran';
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
  if (!actions || !actions.length) {
    return [];
  }
  
  // Filter for relevant build actions
  const buildActions = actions
    .filter(cmd => 
      cmd && (
        cmd.type === 'train' || 
        cmd.type === 'build' || 
        cmd.type === 'upgrade'
      )
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
