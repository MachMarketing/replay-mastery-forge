/**
 * This module transforms data from the JSSUH parser to our application's format
 */
import { ParsedReplayData } from './types';

/**
 * Transform JSSUH parser data to our application's format
 */
export function transformJSSUHData(jssuhData: any): ParsedReplayData {
  // Extract player info
  const player = jssuhData.players?.[0] || { name: 'Player', race: 'T', raceLetter: 'T' };
  const opponent = jssuhData.players?.[1] || { name: 'Opponent', race: 'P', raceLetter: 'P' };
  
  // Map race letters to full race names
  const playerRace = mapRaceFromLetter(player.raceLetter || player.race);
  const opponentRace = mapRaceFromLetter(opponent.raceLetter || opponent.race);
  
  // Create matchup from race letters
  const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  
  // Format duration
  const durationMs = jssuhData.durationMS || 600000;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate APM
  const actions = Array.isArray(jssuhData.actions) ? jssuhData.actions.length : 0;
  const gameMinutes = Math.max(durationMs / 60000, 1);
  const apm = Math.round(actions / gameMinutes) || 150;
  const eapm = Math.round(apm * 0.8) || 120; // Calculate eapm as 80% of APM
  
  // Enhanced build order extraction with better error handling
  const buildOrder = extractBuildOrder(jssuhData);
  
  // Add logging for build order extraction result
  console.log(`🔄 [transformer] Extracted ${buildOrder.length} build order items from raw data`);
  
  // Extract resources graph if available
  const resourcesGraph = extractResourcesGraph(jssuhData);
  
  // Return the transformed data
  return {
    playerName: player.name || 'Player',
    opponentName: opponent.name || 'Opponent',
    playerRace: playerRace,
    opponentRace: opponentRace,
    map: jssuhData.mapName || 'Unknown Map',
    matchup: matchup,
    duration: duration,
    durationMS: durationMs,
    date: jssuhData.gameStartDate || new Date().toISOString().split('T')[0],
    result: 'win', // Default to win as we can't determine from JSSUH
    apm: apm,
    eapm: eapm, // Ensure eapm is set
    buildOrder: buildOrder,
    resourcesGraph: resourcesGraph,
    strengths: determineStrengths(playerRace, buildOrder, apm),
    weaknesses: determineWeaknesses(playerRace, buildOrder, apm),
    recommendations: generateRecommendations(playerRace, buildOrder, apm)
  };
}

/**
 * Extract build order from different possible data structures
 */
function extractBuildOrder(data: any): Array<{time: string; supply: number; action: string}> {
  console.log('🔍 [transformer] Extracting build order from data:', 
    data.buildings ? `Found ${data.buildings.length} buildings` : 'No buildings array',
    data.units ? `Found ${data.units.length} units` : 'No units array',
    data.events ? `Found ${data.events.length} events` : 'No events array',
    data.actions ? `Found ${data.actions.length} actions` : 'No actions array',
    data.commands ? `Found ${data.commands?.length} commands` : 'No commands array',
    data.Commands ? `Found ${data.Commands?.length} Commands` : 'No Commands array'
  );
  
  // Initialize build order array
  let buildOrder: Array<{time: string; supply: number; action: string}> = [];
  
  // Try to extract from Commands (SCREP-WASM format)
  if (data.Commands && Array.isArray(data.Commands)) {
    console.log('🔍 [transformer] Found Commands array with', data.Commands.length, 'items');
    
    const buildCommands = data.Commands.filter((cmd: any) => {
      return (cmd.type === 'build' || cmd.type === 'train' || 
              (cmd.id && [0x0c, 0x1c, 0x1f, 0x23, 0x30, 0x32].includes(cmd.id)));
    });
    
    if (buildCommands.length > 0) {
      console.log('🔍 [transformer] Filtered', buildCommands.length, 'build-related commands');
      
      buildOrder = buildCommands.map((cmd: any, index: number) => {
        const frameTime = cmd.frame || 0;
        const seconds = Math.floor(frameTime / 23.81);
        const minutes = Math.floor(seconds / 60);
        const remainingSecs = seconds % 60;
        const timeString = `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
        
        return {
          time: timeString,
          supply: cmd.supply || index * 2 + 8, // Estimate supply if not available
          action: cmd.name || cmd.action || `${cmd.type || 'Build'} ${cmd.unit || ''}`
        };
      });
    } else {
      console.log('🔍 [transformer] No build commands found in Commands array');
    }
  }
  
  // Try to extract from buildings (JSSUH format)
  if (buildOrder.length === 0 && data.buildings && Array.isArray(data.buildings)) {
    buildOrder = data.buildings.map((building: any, index: number) => {
      const timeMs = building.timeMs || building.time || 0;
      const seconds = Math.floor(timeMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSecs = seconds % 60;
      const timeString = `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
      
      return {
        time: timeString,
        supply: building.supply || index * 4 + 8, // Estimate supply if not available
        action: `Build ${building.name || building.type || 'Structure'}`
      };
    });
  }
  
  // Try to extract from units (JSSUH format)
  if (buildOrder.length === 0 && data.units && Array.isArray(data.units)) {
    const trainedUnits = data.units.filter((unit: any) => 
      unit.timeMs || unit.time || unit.createdAt
    );
    
    if (trainedUnits.length > 0) {
      const unitBuildOrder = trainedUnits.map((unit: any, index: number) => {
        const timeMs = unit.timeMs || unit.time || unit.createdAt || 0;
        const seconds = Math.floor(timeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSecs = seconds % 60;
        const timeString = `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
        
        return {
          time: timeString,
          supply: unit.supply || index * 2 + 10, // Estimate supply if not available
          action: `Train ${unit.name || unit.type || 'Unit'}`
        };
      });
      
      buildOrder = [...buildOrder, ...unitBuildOrder].sort((a, b) => {
        const [aMin, aSec] = a.time.split(':').map(Number);
        const [bMin, bSec] = b.time.split(':').map(Number);
        return (aMin * 60 + aSec) - (bMin * 60 + bSec);
      });
    }
  }
  
  // Fallback: Generate synthetic build order based on race if we have player data
  if (buildOrder.length === 0) {
    console.log('🔍 [transformer] No build order data found, generating race-appropriate placeholder');
    // Find player race from Header or other sources
    let race = 'T'; // Default to Terran
    
    if (data.Header && data.Header.Players && Array.isArray(data.Header.Players) && data.Header.Players.length > 0) {
      race = data.Header.Players[0].Race || 'T';
      console.log('🔍 [transformer] Found race in Header.Players:', race);
    } else if (data.players && Array.isArray(data.players) && data.players.length > 0) {
      race = data.players[0].race || data.players[0].raceLetter || 'T';
      console.log('🔍 [transformer] Found race in players array:', race);
    }
    
    buildOrder = generateSyntheticBuildOrder(race);
    console.log('🔍 [transformer] Generated synthetic build order with', buildOrder.length, 'items for race', race);
  }
  
  console.log(`🔍 [transformer] Final build order has ${buildOrder.length} items`);
  return buildOrder.slice(0, 30); // Limit to 30 items
}

/**
 * Generate synthetic build order for demo purposes when no data is available
 * This provides race-appropriate build orders that make sense
 */
function generateSyntheticBuildOrder(race: string): Array<{time: string; supply: number; action: string}> {
  const raceChar = typeof race === 'string' ? race.charAt(0).toUpperCase() : 'T';
  
  if (raceChar === 'T' || race.includes('Terr')) {
    return [
      { time: '0:00', supply: 4, action: 'SCV' },
      { time: '0:20', supply: 5, action: 'SCV' },
      { time: '0:40', supply: 6, action: 'SCV' },
      { time: '1:00', supply: 7, action: 'Supply Depot' },
      { time: '1:30', supply: 7, action: 'SCV' },
      { time: '1:50', supply: 8, action: 'SCV' },
      { time: '2:10', supply: 9, action: 'Barracks' },
      { time: '2:40', supply: 9, action: 'SCV' },
      { time: '3:00', supply: 10, action: 'Refinery' },
      { time: '3:20', supply: 10, action: 'SCV' },
      { time: '3:50', supply: 11, action: 'Marine' },
      { time: '4:10', supply: 12, action: 'Marine' },
      { time: '4:30', supply: 13, action: 'Factory' },
      { time: '5:00', supply: 14, action: 'Supply Depot' },
    ];
  } else if (raceChar === 'P' || race.includes('Prot')) {
    return [
      { time: '0:00', supply: 4, action: 'Probe' },
      { time: '0:20', supply: 5, action: 'Probe' },
      { time: '0:40', supply: 6, action: 'Probe' },
      { time: '1:00', supply: 7, action: 'Probe' },
      { time: '1:20', supply: 8, action: 'Pylon' },
      { time: '1:50', supply: 8, action: 'Probe' },
      { time: '2:10', supply: 9, action: 'Probe' },
      { time: '2:30', supply: 10, action: 'Gateway' },
      { time: '2:50', supply: 10, action: 'Probe' },
      { time: '3:10', supply: 11, action: 'Assimilator' },
      { time: '3:40', supply: 11, action: 'Probe' },
      { time: '4:00', supply: 12, action: 'Zealot' },
      { time: '4:30', supply: 14, action: 'Cybernetics Core' },
      { time: '5:00', supply: 14, action: 'Pylon' },
    ];
  } else {
    return [
      { time: '0:00', supply: 4, action: 'Drone' },
      { time: '0:20', supply: 5, action: 'Drone' },
      { time: '0:40', supply: 6, action: 'Drone' },
      { time: '1:00', supply: 7, action: 'Drone' },
      { time: '1:20', supply: 8, action: 'Drone' },
      { time: '1:40', supply: 9, action: 'Overlord' },
      { time: '2:10', supply: 9, action: 'Drone' },
      { time: '2:30', supply: 10, action: 'Spawning Pool' },
      { time: '2:50', supply: 10, action: 'Drone' },
      { time: '3:20', supply: 11, action: 'Extractor' },
      { time: '3:50', supply: 11, action: 'Drone' },
      { time: '4:10', supply: 12, action: 'Zergling' },
      { time: '4:30', supply: 14, action: 'Zergling' },
      { time: '4:50', supply: 16, action: 'Hatchery' },
    ];
  }
}

/**
 * Extract resources graph from data
 */
function extractResourcesGraph(data: any): Array<{time: string; minerals: number; gas: number}> {
  // Initialize resources graph array
  let resourcesGraph: Array<{time: string; minerals: number; gas: number}> = [];
  
  // Try to extract from resources data
  if (data.resources && Array.isArray(data.resources)) {
    resourcesGraph = data.resources.map((resource: any) => {
      const timeMs = resource.timeMs || resource.time || 0;
      const seconds = Math.floor(timeMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSecs = seconds % 60;
      
      return {
        time: `${minutes}:${remainingSecs.toString().padStart(2, '0')}`,
        minerals: resource.minerals || 0,
        gas: resource.gas || 0
      };
    });
  }
  
  // Fallback: Generate synthetic resources graph
  if (resourcesGraph.length === 0) {
    const durationMs = data.durationMS || 600000;
    const dataPoints = 20;
    const interval = durationMs / dataPoints;
    
    for (let i = 0; i < dataPoints; i++) {
      const timeMs = i * interval;
      const seconds = Math.floor(timeMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSecs = seconds % 60;
      
      // Generate increasing resources with some randomness
      const minerals = Math.floor(50 * i + i * i * 5 + Math.random() * 50);
      const gas = i < 3 ? 0 : Math.floor(20 * (i-3) + Math.random() * 30);
      
      resourcesGraph.push({
        time: `${minutes}:${remainingSecs.toString().padStart(2, '0')}`,
        minerals,
        gas
      });
    }
  }
  
  return resourcesGraph;
}

/**
 * Determine player strengths based on race and stats
 */
function determineStrengths(race: string, buildOrder: any[], apm: number): string[] {
  const strengths: string[] = [];
  
  // Add race-specific strengths
  if (race === 'Terran') {
    strengths.push('Good defensive positioning');
    strengths.push('Effective unit production');
    
    if (apm > 150) {
      strengths.push('Strong multitasking capabilities');
    }
    
    if (buildOrder.some(item => item.action.includes('Factory') && item.time < '5:00')) {
      strengths.push('Fast tech transitions');
    }
  } else if (race === 'Protoss') {
    strengths.push('Good building placement');
    strengths.push('Effective probe production');
    
    if (apm > 150) {
      strengths.push('Excellent unit micro-management');
    }
    
    if (buildOrder.some(item => item.action.includes('Expansion') || item.action.includes('Nexus'))) {
      strengths.push('Good expansion timing');
    }
  } else if (race === 'Zerg') {
    strengths.push('Good drone saturation');
    strengths.push('Effective expansion timing');
    
    if (apm > 180) {
      strengths.push('Strong macro mechanics');
    }
    
    if (buildOrder.some(item => item.action.includes('Overlord') && parseInt(item.time.split(':')[0]) < 2)) {
      strengths.push('Consistent overlord production');
    }
  }
  
  return strengths.length > 0 ? strengths : ['Solid macro gameplay'];
}

/**
 * Determine player weaknesses based on race and stats
 */
function determineWeaknesses(race: string, buildOrder: any[], apm: number): string[] {
  const weaknesses: string[] = [];
  
  // Add race-specific weaknesses
  if (race === 'Terran') {
    if (apm < 120) {
      weaknesses.push('Could improve multitasking');
    }
    
    weaknesses.push('Could improve siege tank placement');
    
    if (!buildOrder.some(item => item.action.includes('Expansion') || item.action.includes('Command'))) {
      weaknesses.push('Delayed expansion timing');
    }
  } else if (race === 'Protoss') {
    if (apm < 120) {
      weaknesses.push('Could improve unit micro');
    }
    
    weaknesses.push('Could improve zealot/dragoon ratio');
    
    if (!buildOrder.some(item => item.action.includes('Observer'))) {
      weaknesses.push('Limited map vision');
    }
  } else if (race === 'Zerg') {
    if (apm < 150) {
      weaknesses.push('Could improve larva management');
    }
    
    weaknesses.push('Inconsistent creep colony placement');
    
    if (!buildOrder.some(item => 
        (item.action.includes('Spire') || item.action.includes('Hydralisk')) && 
        parseInt(item.time.split(':')[0]) < 7)) {
      weaknesses.push('Slow tech progression');
    }
  }
  
  return weaknesses.length > 0 ? weaknesses : ['Could improve build order efficiency'];
}

/**
 * Generate player recommendations based on race and stats
 */
function generateRecommendations(race: string, buildOrder: any[], apm: number): string[] {
  const recommendations: string[] = [];
  
  // Add race-specific recommendations
  if (race === 'Terran') {
    recommendations.push('Practice drop harass timings');
    recommendations.push('Focus on maintaining constant SCV production');
    
    if (apm < 150) {
      recommendations.push('Work on increasing multitasking with multiple control groups');
    }
  } else if (race === 'Protoss') {
    recommendations.push('Practice cannon placement');
    recommendations.push('Focus on getting earlier Observer for scouting');
    
    if (apm < 150) {
      recommendations.push('Practice gateway unit micro with separate control groups');
    }
  } else if (race === 'Zerg') {
    recommendations.push('Practice overlord positioning');
    recommendations.push('Focus on getting earlier third hatchery');
    
    if (apm < 180) {
      recommendations.push('Work on increasing inject timings and creep spread');
    }
  }
  
  return recommendations.length > 0 ? recommendations : ['Focus on early game scouting'];
}

/**
 * Maps race letter to full race name
 */
function mapRaceFromLetter(raceLetter: string): 'Terran' | 'Protoss' | 'Zerg' {
  const letter = typeof raceLetter === 'string' ? raceLetter.charAt(0).toUpperCase() : 'T';
  
  switch (letter) {
    case 'P':
      return 'Protoss';
    case 'Z':
      return 'Zerg';
    case 'T':
    default:
      return 'Terran';
  }
}
