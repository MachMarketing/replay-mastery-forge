
import { ParsedReplayData } from './types';

/**
 * Transform raw parsed data into our application's format
 */
export function transformJSSUHData(jssuhData: any): ParsedReplayData {
  try {
    console.log('[transformer] Starting transformation of JSSUH data');
    console.log('[transformer] Raw JSSUH data keys:', Object.keys(jssuhData));
    
    if (jssuhData.players) {
      console.log('[transformer] Player data available:', 
        jssuhData.players.map((p: any) => ({
          name: p.name,
          race: p.race,
          raceLetter: p.raceLetter,
          id: p.id
        }))
      );
    }
    
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
    const gameMinutes = ms / 60000;
    const apm = Math.round(totalActions / (gameMinutes || 1));
    
    // Map race codes to full names with enhanced detection
    // First check if we already have mapped race names
    const playerRace = playerInfo.race && typeof playerInfo.race === 'string' && 
                      (playerInfo.race.toLowerCase() === 'terran' ||
                       playerInfo.race.toLowerCase() === 'protoss' ||
                       playerInfo.race.toLowerCase() === 'zerg') 
                      ? playerInfo.race 
                      : mapRace(playerInfo.race || playerInfo.raceLetter);
                      
    const opponentRace = opponentInfo.race && typeof opponentInfo.race === 'string' && 
                        (opponentInfo.race.toLowerCase() === 'terran' ||
                         opponentInfo.race.toLowerCase() === 'protoss' ||
                         opponentInfo.race.toLowerCase() === 'zerg')
                        ? opponentInfo.race
                        : mapRace(opponentInfo.race || opponentInfo.raceLetter);
    
    console.log('[transformer] Mapped races:', {
      playerRace, 
      opponentRace
    });
    
    // Determine matchup
    const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
    
    // Extract build order
    const buildOrder = extractBuildOrder(jssuhData.actions || []);
    
    const result: ParsedReplayData = {
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
    
    console.log('[transformer] Transformation complete:', {
      playerName: result.playerName,
      opponentName: result.opponentName,
      playerRace: result.playerRace,
      opponentRace: result.opponentRace,
      matchup: result.matchup
    });
    
    return result;
  } catch (error) {
    console.error('[transformer] Error transforming jssuh data:', error);
    throw new Error('Failed to process replay data');
  }
}

/**
 * Map race codes to full names with enhanced detection
 */
function mapRace(race: string | undefined): 'Terran' | 'Protoss' | 'Zerg' {
  if (!race) {
    console.warn('[transformer] Empty race value, defaulting to Terran');
    return 'Terran';
  }
  
  console.log('[transformer] Mapping race:', race);
  
  // Ensure we're working with a string
  const raceStr = String(race).trim().toUpperCase();
  
  // Direct character/code matching
  switch (raceStr) {
    case 'T':
    case '0':
    case 'TERR':
    case 'TERRA':
    case 'TERRAN':
      return 'Terran';
    case 'P':
    case '1':
    case 'PROT':
    case 'PROTO':
    case 'PROTOS':
    case 'PROTOSS':
      return 'Protoss';
    case 'Z':
    case '2':
    case 'ZERG':
      return 'Zerg';
  }
  
  // Secondary check for substring matches
  if (raceStr.includes('T') || raceStr.includes('TERR')) {
    return 'Terran';
  } else if (raceStr.includes('P') || raceStr.includes('PROT')) {
    return 'Protoss';
  } else if (raceStr.includes('Z') || raceStr.includes('ZERG')) {
    return 'Zerg';
  }
  
  console.warn('[transformer] Unknown race format:', race, 'defaulting to Terran');
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
