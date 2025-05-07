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
    // Check if we're dealing with screparsed format (has gameInfo property)
    if (rawData.header && typeof rawData.header === 'object') {
      console.log('🔄 Handling screparsed format with gameInfo');
      return mapScreparsedFormat(rawData);
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
    throw error;
  }
}

/**
 * Map data from the screparsed format with gameInfo, players, etc.
 */
function mapScreparsedFormat(rawData: any): ParsedReplayResult {
  // Debug the raw structure
  console.log('🔄 screparsed header:', rawData.header ? Object.keys(rawData.header) : 'missing');
  console.log('🔄 screparsed players:', rawData.players ? rawData.players.length : 'missing');
  
  // Extract players
  let playerName = 'Player';
  let opponentName = 'Opponent';
  let playerRace = 'Terran';
  let opponentRace = 'Protoss';
  
  if (rawData.players && Array.isArray(rawData.players) && rawData.players.length > 0) {
    // Extract player info (first player in the array)
    if (rawData.players.length > 0) {
      const player = rawData.players[0];
      playerName = formatPlayerName(player.name || '');
      playerRace = standardizeRaceName(player.race || 'Unknown');
      
      console.log(`🔄 Player 1: ${playerName} (${playerRace})`);
    }
    
    // Extract opponent info (second player in the array)
    if (rawData.players.length > 1) {
      const opponent = rawData.players[1];
      opponentName = formatPlayerName(opponent.name || '');
      opponentRace = standardizeRaceName(opponent.race || 'Unknown');
      
      console.log(`🔄 Player 2: ${opponentName} (${opponentRace})`);
    }
  }
  
  // Extract map information
  let map = 'Unknown Map';
  if (rawData.header?.map) {
    map = rawData.header.map;
  } else if (rawData.mapName) {
    map = rawData.mapName;
  }
  
  // Clean up map name by removing control characters
  map = map.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
  if (!map || map === '') {
    map = 'Unknown Map';
  }
  
  // Create matchup
  const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  
  // Extract duration from frames
  let durationMs = 600000; // Default: 10 minutes
  let duration = '10:00';
  
  const gameInfo = rawData.header;
  if (gameInfo && gameInfo.frames) {
    // Frames to MS (assuming 23.81 FPS for Brood War)
    const frames = gameInfo.frames;
    durationMs = Math.round(frames / 23.81 * 1000);
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    console.log(`🔄 Duration: ${duration} (${durationMs}ms from ${frames} frames)`);
  }
  
  // Extract date
  let date = new Date().toISOString().split('T')[0];
  if (gameInfo && gameInfo.startTime) {
    try {
      const startDate = new Date(gameInfo.startTime);
      date = startDate.toISOString().split('T')[0];
    } catch {
      console.warn('🔄 Could not parse startTime:', gameInfo.startTime);
    }
  }
  
  // Calculate APM from players data
  let apm = 150; // Default
  let eapm = 120; // Default
  
  // Use the first player's APM if available
  if (rawData.players && rawData.players.length > 0 && rawData.players[0].apm) {
    apm = Math.round(rawData.players[0].apm);
    eapm = Math.round(rawData.players[0].eapm || apm * 0.8);
  }
  
  // Process chat messages if available
  let chatMessages: string[] = [];
  if (rawData.chat && Array.isArray(rawData.chat) && rawData.chat.length > 0) {
    chatMessages = rawData.chat.map((chat: any) => {
      const sender = chat.sender?.name || 'Unknown';
      return `${sender}: ${chat.message}`;
    });
  }
  
  // Enhanced build order extraction based on screparsed format
  let buildOrder: Array<{time: string; supply: number; action: string}> = [];
  
  // Assuming screparsed provides some sort of command or action history
  // We'll need to adjust this based on what's actually in the data
  
  // Try to derive build order from players' buildOrder if available
  if (rawData.players && rawData.players.length > 0 && rawData.players[0].buildOrder) {
    buildOrder = rawData.players[0].buildOrder.map((item: any, index: number) => {
      return {
        time: item.time || `${Math.floor(index * 30 / 60)}:${(index * 30 % 60).toString().padStart(2, '0')}`,
        supply: item.supply || index * 2 + 8,
        action: item.action || item.unit || 'Unknown Action'
      };
    });
  }
  
  // Set result based on game outcome if available, default to 'win'
  const result = rawData.players && 
                rawData.players.length > 0 && 
                rawData.players[0].result === 'loss' ? 'loss' : 'win';
  
  // Create a basic resources graph if available
  let resourcesGraph: Array<{time: string; minerals: number; gas: number}> = [];
  
  // Try to derive resources from players' resources if available
  if (rawData.players && rawData.players.length > 0 && rawData.players[0].resourceHistory) {
    resourcesGraph = rawData.players[0].resourceHistory.map((item: any) => {
      return {
        time: item.time || '0:00',
        minerals: item.minerals || 0,
        gas: item.gas || 0
      };
    });
  }
  
  // Default strengths and recommendations based on player race
  let strengths = ['Solid macro gameplay'];
  let weaknesses = ['Could improve build order efficiency'];
  let recommendations = ['Focus on early game scouting'];
  
  // Create race-specific default feedback based on the player's race
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
    result: result,
    apm,
    eapm,
    buildOrder,
    resourcesGraph,
    strengths,
    weaknesses,
    recommendations
  };
  
  // Debug log the result
  debugLogReplayData(result);
  
  return result;
}
