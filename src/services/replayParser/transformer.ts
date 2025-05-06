
/**
 * Transforms raw parsed data from various parser formats to our unified format
 */
import { ParsedReplayData } from './types';

/**
 * Transform JSSUH parsed data to our application format
 */
export function transformJSSUHData(jssuhData: any): Partial<ParsedReplayData> {
  console.log('[transformer] Transforming JSSUH data');
  
  try {
    if (!jssuhData) {
      throw new Error('No data provided to transformer');
    }
    
    const { players, actions, commands, mapName, durationMS } = jssuhData;
    
    // Ensure we have at least one player
    if (!players || players.length === 0) {
      console.warn('[transformer] No players found in JSSUH data');
    }
    
    // Log what we're working with
    console.log('[transformer] JSSUH Data:',
      `Map: ${mapName || 'Unknown'}`,
      `Players: ${players?.length || 0}`,
      `Actions: ${actions?.length || 0}`,
      `Commands: ${commands?.length || 0}`,
      `Duration: ${durationMS}ms`
    );
    
    // Find main player and opponent (simple approach: player 0 vs player 1)
    const player = players && players.length > 0 ? players[0] : { name: 'Player', race: 'U' };
    const opponent = players && players.length > 1 ? players[1] : { name: 'Opponent', race: 'U' };
    
    // Calculate APM if we have actions and duration
    let apm = 0;
    let eapm = 0;
    
    if (actions && actions.length > 0 && durationMS) {
      const minutes = durationMS / 60000;
      apm = Math.round(actions.length / minutes);
      // EAPM is typically 70-80% of APM (filtering spam clicks)
      eapm = Math.round(apm * 0.75);
    }
    
    // Format duration string
    const minutes = Math.floor(durationMS / 60000);
    const seconds = Math.floor((durationMS % 60000) / 1000);
    const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Extract build order from commands if available
    const buildOrder = extractBuildOrderFromCommands(commands);
    
    console.log('[transformer] Build order extracted:', buildOrder.length, 'entries');
    
    // Map race abbreviations to full names
    const mapRaceToFull = (race: string) => {
      if (!race) return 'Unknown';
      const r = race.toUpperCase();
      if (r === 'T' || r === 'TERRAN') return 'Terran';
      if (r === 'P' || r === 'PROTOSS') return 'Protoss';
      if (r === 'Z' || r === 'ZERG') return 'Zerg';
      return race;
    };
    
    const playerRace = mapRaceToFull(player.race);
    const opponentRace = mapRaceToFull(opponent.race);
    
    // Calculate matchup
    const matchup = `${playerRace[0]}v${opponentRace[0]}`;
    
    // Return transformed data
    const result: Partial<ParsedReplayData> = {
      playerName: player.name || 'Player',
      opponentName: opponent.name || 'Opponent',
      playerRace: playerRace,
      opponentRace: opponentRace,
      map: mapName || 'Unknown Map',
      matchup: matchup,
      duration: durationStr,
      durationMS: durationMS,
      date: new Date().toISOString().split('T')[0],
      result: 'win', // We assume a win for now
      apm: apm || 150, // Default if calculation failed
      eapm: eapm || 120, // Default if calculation failed
      buildOrder: buildOrder,
      
      // Default analysis results
      strengths: ['Solid macro gameplay', 'Good unit control'],
      weaknesses: ['Could improve scouting', 'Build order efficiency'],
      recommendations: ['Focus on early game scouting', 'Tighten build order timing']
    };
    
    console.log('[transformer] Transformation complete');
    return result;
  } catch (error) {
    console.error('[transformer] Error transforming JSSUH data:', error);
    return {}; // Return empty object on error
  }
}

/**
 * Extract build order from commands array
 */
function extractBuildOrderFromCommands(commands: any[]): Array<{ time: string; supply: number; action: string }> {
  if (!commands || commands.length === 0) {
    console.log('[transformer] No commands available for build order extraction');
    return [];
  }
  
  const buildOrder: Array<{ time: string; supply: number; action: string }> = [];
  
  try {
    console.log('[transformer] Extracting build order from', commands.length, 'commands');
    
    // Sample some commands to see what we're working with
    console.log('[transformer] Command sample:', commands.slice(0, 3));
    
    // Filter out commands that represent unit construction, building construction, tech research
    // This is a simplified approach, actual implementation would need more logic
    const buildCommands = commands.filter((cmd: any) => {
      // Check if this command represents a build or research action
      // This would need to be customized based on JSSUH's command structure
      return cmd.type === 'train' || cmd.type === 'build' || cmd.type === 'research';
    });
    
    console.log('[transformer] Filtered', buildCommands.length, 'build-related commands');
    
    // Transform into our build order format
    buildCommands.forEach((cmd: any, index: number) => {
      // Convert frame to time string (frames ÷ framerate = seconds)
      const seconds = Math.floor((cmd.frame || 0) / 24);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;
      
      // Estimate supply based on game progression (simplified)
      // In a real implementation, this would track supply changes based on all commands
      const supply = Math.min(200, 6 + Math.floor(seconds / 30));
      
      buildOrder.push({
        time: timeStr,
        supply: supply,
        action: cmd.name || cmd.type || `Unknown Command ${index + 1}`
      });
    });
    
    console.log('[transformer] Final build order has', buildOrder.length, 'entries');
    return buildOrder;
  } catch (error) {
    console.error('[transformer] Error extracting build order:', error);
    return []; // Return empty array on error
  }
}
