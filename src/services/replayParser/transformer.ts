
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
    
    // Log the full commands for debugging
    if (commands && commands.length > 0) {
      console.log('[transformer] Detailed commands sample:',
        commands.slice(0, 20).map((cmd: any) => ({
          frame: cmd.frame,
          type: cmd.type,
          name: cmd.name,
          player: cmd.player,
          // Include any other relevant command fields
        }))
      );
    }
    
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
    
    // Extract build order from commands if available with improved logging
    const buildOrder = extractBuildOrderFromCommands(commands);
    
    console.log('[transformer] Build order extracted:', buildOrder.length, 'entries');
    if (buildOrder.length > 0) {
      console.log('[transformer] Build order preview:', buildOrder.slice(0, 10));
    }
    
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
 * Extract build order from commands array with improved detection and logging
 */
function extractBuildOrderFromCommands(commands: any[]): Array<{ time: string; supply: number; action: string }> {
  if (!commands || commands.length === 0) {
    console.log('[transformer] No commands available for build order extraction');
    return [];
  }
  
  const buildOrder: Array<{ time: string; supply: number; action: string }> = [];
  
  try {
    console.log('[transformer] Extracting build order from', commands.length, 'commands');
    
    // Log all command types for better understanding
    const commandTypes = new Set<string>();
    commands.forEach((cmd: any) => {
      if (cmd.type) commandTypes.add(cmd.type);
    });
    console.log('[transformer] Available command types:', Array.from(commandTypes));
    
    // Sample some commands to see what we're working with
    console.log('[transformer] Command sample:', commands.slice(0, 3));
    
    // Filter out commands that represent unit construction, building construction, tech research
    // Erweiterte Filterung basierend auf JSSUH-Kommandotypen
    const buildCommands = commands.filter((cmd: any) => {
      // Verbesserte Filterung für JSSUH-Befehle
      const type = (cmd.type || '').toLowerCase();
      const name = (cmd.name || '').toLowerCase();
      
      return (
        // Gebäude und Einheiten
        type.includes('train') || 
        type.includes('build') || 
        type.includes('unit') ||
        // Technologien und Upgrades
        type.includes('research') || 
        type.includes('upgrade') || 
        type.includes('tech') ||
        // Spezifische Gebäudenamen in Kommando-Namen
        name.includes('command') || 
        name.includes('center') ||
        name.includes('barracks') ||
        name.includes('factory') ||
        name.includes('starport') ||
        name.includes('nexus') ||
        name.includes('gateway') ||
        name.includes('hatchery')
      );
    });
    
    console.log('[transformer] Filtered', buildCommands.length, 'build-related commands');
    
    // Log the filtered build commands
    if (buildCommands.length > 0) {
      console.log('[transformer] Build commands sample:', 
        buildCommands.slice(0, 5).map(cmd => ({
          frame: cmd.frame,
          type: cmd.type,
          name: cmd.name
        }))
      );
    }
    
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
      
      // Verbesserte Aktionsbeschreibung
      let actionName = 'Unknown Action';
      
      if (cmd.name) {
        actionName = cmd.name;
      } else if (cmd.type) {
        if (cmd.type.toLowerCase() === 'train') {
          actionName = `Train ${cmd.unit || 'Unit'}`;
        } else if (cmd.type.toLowerCase() === 'build') {
          actionName = `Build ${cmd.building || 'Structure'}`;
        } else if (cmd.type.toLowerCase() === 'research') {
          actionName = `Research ${cmd.tech || 'Technology'}`;
        } else {
          actionName = cmd.type;
        }
      }
      
      buildOrder.push({
        time: timeStr,
        supply: supply,
        action: actionName
      });
    });
    
    console.log('[transformer] Final build order has', buildOrder.length, 'entries');
    return buildOrder;
  } catch (error) {
    console.error('[transformer] Error extracting build order:', error);
    return []; // Return empty array on error
  }
}
