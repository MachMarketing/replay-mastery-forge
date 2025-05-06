
/**
 * Maps raw parser data to our application's format
 */
import { ParsedReplayResult } from './replayParserService';
import { standardizeRaceName, formatPlayerName, debugLogReplayData } from '@/lib/replayUtils';

/**
 * Transform WASM parser raw data to our application's format
 */
export function mapRawToParsed(rawData: any): ParsedReplayResult {
  if (!rawData) {
    throw new Error('Invalid parser data');
  }
  
  console.log('🔄 mapRawToParsed keys:', Object.keys(rawData));
  
  try {
    // Check if we're dealing with SCREP-WASM format (has Header property)
    if (rawData.Header) {
      console.log('🔄 Handling SCREP-WASM format with Header');
      return mapScrepWasmFormat(rawData);
    }
    
    // Check if data is already in our format
    if (
      typeof rawData.playerName === 'string' &&
      typeof rawData.opponentName === 'string' &&
      typeof rawData.playerRace === 'string'
    ) {
      return {
        playerName: rawData.playerName,
        opponentName: rawData.opponentName,
        playerRace: standardizeRaceName(rawData.playerRace),
        opponentRace: standardizeRaceName(rawData.opponentRace),
        map: rawData.map,
        matchup: rawData.matchup || `${rawData.playerRace[0]}v${rawData.opponentRace[0]}`,
        duration: rawData.duration || '0:00',
        durationMS: rawData.durationMS || 0,
        date: rawData.date,
        result: rawData.result || 'win',
        apm: rawData.apm || 0,
        eapm: rawData.eapm ?? rawData.apm,
        buildOrder: rawData.buildOrder || [],
        resourcesGraph: rawData.resourcesGraph || [],
        strengths: rawData.strengths || ['Solid macro gameplay'],
        weaknesses: rawData.weaknesses || ['Could improve build order efficiency'],
        recommendations: rawData.recommendations || ['Focus on early game scouting'],
        trainingPlan: rawData.trainingPlan
      };
    }
    
    // Legacy format handling (keeping the original implementation)
    // Extract basic info
    const playerName = rawData.playerName || 'Player';
    const opponentName = rawData.opponentName || 'Opponent';
    const playerRace = standardizeRaceName(rawData.playerRace || 'Terran');
    const opponentRace = standardizeRaceName(rawData.opponentRace || 'Zerg');
    const map = rawData.map || 'Unknown Map';
    const matchup = rawData.matchup || `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
    
    // Format duration
    const durationMs = rawData.durationMS || 600000;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Ensure arrays
    const buildOrder = Array.isArray(rawData.buildOrder) ? rawData.buildOrder : [];
    const resourcesGraph = Array.isArray(rawData.resourcesGraph) ? rawData.resourcesGraph : [];
    const strengths = Array.isArray(rawData.strengths) ? rawData.strengths : ['Solid macro gameplay'];
    const weaknesses = Array.isArray(rawData.weaknesses) ? rawData.weaknesses : ['Could improve build order efficiency'];
    const recommendations = Array.isArray(rawData.recommendations) ? rawData.recommendations : ['Focus on early game scouting'];
    
    // Return the parsed data
    return {
      playerName,
      opponentName,
      playerRace,
      opponentRace,
      map,
      matchup,
      duration,
      durationMS: durationMs,
      date: rawData.date || new Date().toISOString().split('T')[0],
      result: rawData.result || 'win',
      apm: rawData.apm || 150,
      eapm: rawData.eapm || 120,
      buildOrder,
      resourcesGraph,
      strengths,
      weaknesses,
      recommendations,
      trainingPlan: rawData.trainingPlan || undefined
    };
  } catch (error) {
    console.error('[replayMapper] Error mapping data:', error);
    
    // Return minimal data if mapping fails
    return {
      playerName: 'Player',
      opponentName: 'Opponent',
      playerRace: 'Terran',
      opponentRace: 'Protoss',
      map: 'Unknown Map',
      matchup: 'TvP',
      duration: '10:00',
      durationMS: 600000,
      date: new Date().toISOString().split('T')[0],
      result: 'win',
      apm: 150,
      eapm: 120,
      buildOrder: [],
      resourcesGraph: [],
      strengths: ['Solid macro gameplay'],
      weaknesses: ['Could improve build order efficiency'],
      recommendations: ['Focus on early game scouting']
    };
  }
}

/**
 * Map data from the SCREP-WASM format (with Header, Commands, etc.)
 */
function mapScrepWasmFormat(rawData: any): ParsedReplayResult {
  // Debug the raw WASM data structure
  console.log('🔄 SCREP-WASM Header:', rawData.Header ? Object.keys(rawData.Header) : 'missing');
  console.log('🔄 SCREP-WASM MapData:', rawData.MapData ? Object.keys(rawData.MapData) : 'missing');
  console.log('🔄 SCREP-WASM Computed:', rawData.Computed ? Object.keys(rawData.Computed) : 'missing');
  console.log('🔄 SCREP-WASM Commands count:', rawData.Commands ? rawData.Commands.length : 'missing');
  
  // Extract players
  let playerName = 'Player';
  let opponentName = 'Opponent';
  let playerRace = 'Terran';
  let opponentRace = 'Protoss';
  
  if (rawData.Header?.players && Array.isArray(rawData.Header.players)) {
    // Extract player info
    if (rawData.Header.players.length > 0) {
      const player = rawData.Header.players[0];
      playerName = formatPlayerName(player.name);
      playerRace = standardizeRaceName(player.race);
    }
    
    // Extract opponent info
    if (rawData.Header.players.length > 1) {
      const opponent = rawData.Header.players[1];
      opponentName = formatPlayerName(opponent.name);
      opponentRace = standardizeRaceName(opponent.race);
    }
    
    console.log(`🔄 Extracted players: ${playerName} (${playerRace}) vs ${opponentName} (${opponentRace})`);
  }
  
  // Extract map information
  let map = 'Unknown Map';
  if (rawData.Header?.mapName) {
    map = rawData.Header.mapName;
  } else if (rawData.MapData?.name) {
    map = rawData.MapData.name;
  }
  
  // Create matchup
  const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  
  // Extract duration
  let durationMs = 600000; // Default: 10 minutes
  let duration = '10:00';
  
  if (rawData.Header?.durationFrames) {
    const frames = rawData.Header.durationFrames;
    // Frames to MS (assuming 23.81 FPS for Brood War)
    durationMs = Math.round(frames / 23.81 * 1000);
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    console.log(`🔄 Duration: ${duration} (${durationMs}ms from ${frames} frames)`);
  }
  
  // Extract date
  let date = new Date().toISOString().split('T')[0];
  if (rawData.Header?.startTime) {
    try {
      const startDate = new Date(rawData.Header.startTime);
      date = startDate.toISOString().split('T')[0];
    } catch {
      console.warn('🔄 Could not parse startTime:', rawData.Header.startTime);
    }
  }
  
  // Calculate APM and EAPM
  let apm = 150; // Default
  let eapm = 120; // Default
  
  if (rawData.Computed?.apm) {
    apm = Math.round(rawData.Computed.apm);
    eapm = Math.round(rawData.Computed.eapm || apm * 0.8);
  } else if (rawData.Commands && Array.isArray(rawData.Commands)) {
    const durationMinutes = Math.max(durationMs / 60000, 1);
    apm = Math.round(rawData.Commands.length / durationMinutes);
    eapm = Math.round(apm * 0.8); // Estimate EAPM as 80% of APM
  }
  
  // Extract build order
  let buildOrder: Array<{time: string; supply: number; action: string}> = [];
  if (rawData.Commands && Array.isArray(rawData.Commands)) {
    // Filter for build commands
    buildOrder = rawData.Commands
      .filter((cmd: any) => cmd.type === 'build' || cmd.type === 'train' || cmd.name?.includes('build'))
      .map((cmd: any) => {
        // Convert frame to time display
        const frameTime = cmd.frame || 0;
        const seconds = Math.floor(frameTime / 23.81);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeString = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        return {
          time: timeString,
          supply: cmd.supply || 0,
          action: cmd.name || 'Unknown Structure'
        };
      })
      .slice(0, 30); // Limit to first 30 build actions
  }
  
  console.log(`🔄 Extracted build order items: ${buildOrder.length}`);
  
  // Create a basic resources graph from commands if available
  let resourcesGraph: Array<{time: string; minerals: number; gas: number}> = [];
  if (rawData.Commands && Array.isArray(rawData.Commands)) {
    // Sample resource points at regular intervals
    const resourceCommands = rawData.Commands.filter((cmd: any) => 
      cmd.minerals !== undefined || cmd.gas !== undefined);
    
    if (resourceCommands.length > 0) {
      // Sample at intervals
      const interval = Math.max(Math.floor(resourceCommands.length / 20), 1);
      resourcesGraph = resourceCommands
        .filter((_: any, i: number) => i % interval === 0)
        .map((cmd: any) => {
          const frameTime = cmd.frame || 0;
          const seconds = Math.floor(frameTime / 23.81);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          const timeString = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
          
          return {
            time: timeString,
            minerals: cmd.minerals || 0,
            gas: cmd.gas || 0
          };
        });
    }
  }
  
  // Default strengths and recommendations based on player race
  let strengths = ['Solid macro gameplay'];
  let weaknesses = ['Could improve build order efficiency'];
  let recommendations = ['Focus on early game scouting'];
  
  // Create race-specific default feedback
  if (playerRace === 'Terran') {
    strengths = ['Good defensive positioning', 'Effective unit production'];
    weaknesses = ['Could improve siege tank placement', 'Slow tech transitions'];
    recommendations = ['Practice drop harass timings', 'Focus on maintaining constant SCV production'];
  } else if (playerRace === 'Protoss') {
    strengths = ['Good building placement', 'Effective probe production'];
    weaknesses = ['Could improve zealot/dragoon ratio', 'Late Templar Archives'];
    recommendations = ['Practice cannon placement', 'Focus on getting earlier Observer for scouting'];
  } else if (playerRace === 'Zerg') {
    strengths = ['Good drone saturation', 'Effective expansion timing'];
    weaknesses = ['Inconsistent creep colony placement', 'Late lair tech'];
    recommendations = ['Practice overlord positioning', 'Focus on getting earlier third hatchery'];
  }
  
  // Construct the final result
  const result: ParsedReplayResult = {
    playerName,
    opponentName,
    playerRace,
    opponentRace,
    map,
    matchup,
    duration,
    durationMS: durationMs,
    date,
    result: 'win', // Default to win as we can't determine from SCREP data
    apm,
    eapm,
    buildOrder,
    resourcesGraph,
    strengths,
    weaknesses,
    recommendations
  };
  
  // Debug log the result
  debugLogReplayData(result, 'SCREP-WASM mapper');
  
  return result;
}

/**
 * Standardize race names to ensure consistent formatting
 */
function standardizeRaceName(race: string): string {
  if (!race) return 'Terran';
  
  const normalized = race.toLowerCase().trim();
  
  if (normalized.startsWith('t') || normalized.includes('terran')) {
    return 'Terran';
  } else if (normalized.startsWith('p') || normalized.includes('protoss')) {
    return 'Protoss';
  } else if (normalized.startsWith('z') || normalized.includes('zerg')) {
    return 'Zerg';
  }
  
  return 'Terran'; // Default
}

