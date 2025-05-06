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
    throw error;
  }
}

/**
 * Map data from the SCREP-WASM format (with Header, Commands, etc.)
 */
function mapScrepWasmFormat(rawData: any): ParsedReplayResult {
  // Debug the raw WASM data structure
  console.log('🔄 SCREP-WASM Header:', rawData.Header ? Object.keys(rawData.Header) : 'missing');
  
  // Add detailed debugging logs
  console.log('🔄 mapScrepWasmFormat received rawData keys:', Object.keys(rawData));
  console.log('🔄 mapScrepWasmFormat rawData.Commands:', rawData.Commands);
  console.log('🔄 mapScrepWasmFormat rawData.Commands is Array:', Array.isArray(rawData.Commands));
  
  // Add detailed logging of the Header structure
  console.log('💡 Full Header object:', rawData.Header);
  console.log('💡 Header.players array:', rawData.Header.Players || rawData.Header.players);
  
  console.log('🔄 SCREP-WASM MapData:', rawData.MapData ? Object.keys(rawData.MapData) : 'missing');
  console.log('🔄 SCREP-WASM Computed:', rawData.Computed ? Object.keys(rawData.Computed) : 'missing');
  console.log('🔄 SCREP-WASM Commands count:', rawData.Commands ? rawData.Commands.length : 'missing');
  
  // Log the first few commands to understand their structure
  if (rawData.Commands && rawData.Commands.length > 0) {
    console.log('💡 First 3 commands sample:', rawData.Commands.slice(0, 3));
  }
  
  // Extract players
  let playerName = 'Player';
  let opponentName = 'Opponent';
  let playerRace = 'Terran';
  let opponentRace = 'Protoss';
  
  if (rawData.Header?.Players && Array.isArray(rawData.Header.Players)) {
    // SCREP-WASM uses uppercase "Players" field
    const players = rawData.Header.Players;
    
    // Extract player info (first player in the array)
    if (players.length > 0) {
      const player = players[0];
      playerName = formatPlayerName(player.Name || '');
      playerRace = standardizeRaceName(player.Race?.Name || 'Unknown');
    }
    
    // Extract opponent info (second player in the array)
    if (players.length > 1) {
      const opponent = players[1];
      opponentName = formatPlayerName(opponent.Name || '');
      opponentRace = standardizeRaceName(opponent.Race?.Name || 'Unknown');
    }
    
    console.log(`🔄 Extracted players: ${playerName} (${playerRace}) vs ${opponentName} (${opponentRace})`);
  } else if (rawData.Header?.players && Array.isArray(rawData.Header.players)) {
    // Lowercase "players" field (alternative format)
    const players = rawData.Header.players;
    
    // Extract player info (first player in the array)
    if (players.length > 0) {
      const player = players[0];
      playerName = formatPlayerName(player.Name || player.name || '');
      playerRace = standardizeRaceName(
        player.Race?.Name || player.Race?.name || player.race || 'Unknown'
      );
    }
    
    // Extract opponent info (second player in the array)
    if (players.length > 1) {
      const opponent = players[1];
      opponentName = formatPlayerName(opponent.Name || opponent.name || '');
      opponentRace = standardizeRaceName(
        opponent.Race?.Name || opponent.Race?.name || opponent.race || 'Unknown'
      );
    }
    
    console.log(`🔄 Extracted players: ${playerName} (${playerRace}) vs ${opponentName} (${opponentRace})`);
  }
  
  // Extract map information
  let map = 'Unknown Map';
  if (rawData.Header?.Map) {
    map = rawData.Header.Map;
  } else if (rawData.Header?.map) {
    map = rawData.Header.map;
  } else if (rawData.Header?.mapName) {
    map = rawData.Header.mapName;
  } else if (rawData.MapData?.name) {
    map = rawData.MapData.name;
  }
  
  // Clean up map name by removing control characters
  map = map.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
  if (!map || map === '') {
    map = 'Unknown Map';
  }
  
  // Create matchup
  const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  
  // Extract duration
  let durationMs = 600000; // Default: 10 minutes
  let duration = '10:00';
  
  if (rawData.Header?.Frames) {
    const frames = rawData.Header.Frames;
    // Frames to MS (assuming 23.81 FPS for Brood War)
    durationMs = Math.round(frames / 23.81 * 1000);
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    console.log(`🔄 Duration: ${duration} (${durationMs}ms from ${frames} frames)`);
  } else if (rawData.Header?.durationFrames) {
    const frames = rawData.Header.durationFrames;
    // Frames to MS (assuming 23.81 FPS for Brood War)
    durationMs = Math.round(frames / 23.81 * 1000);
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Extract date
  let date = new Date().toISOString().split('T')[0];
  if (rawData.Header?.StartTime) {
    try {
      const startDate = new Date(rawData.Header.StartTime);
      date = startDate.toISOString().split('T')[0];
    } catch {
      console.warn('🔄 Could not parse StartTime:', rawData.Header.StartTime);
    }
  } else if (rawData.Header?.startTime) {
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
  
  // Enhanced build order extraction
  let buildOrder: Array<{time: string; supply: number; action: string}> = [];
  if (rawData.Commands && Array.isArray(rawData.Commands) && rawData.Commands.length > 0) {
    console.log('💡 Processing Commands for build order, commands count:', rawData.Commands.length);
    
    // Add the requested debug logs
    console.log('💡 First 5 Commands:', rawData.Commands.slice(0, 5));
    console.log('💡 Sample Command keys (first command):', rawData.Commands.length > 0 ? Object.keys(rawData.Commands[0]) : 'No commands');
    
    // Enhanced debug for Commands array structure
    if (rawData.Commands.length > 0) {
      const sampleCmd = rawData.Commands[0];
      console.log('💡 Detailed command structure of first command:', JSON.stringify(sampleCmd, null, 2));
      console.log('💡 Command properties:', {
        id: sampleCmd.id,
        type: sampleCmd.type,
        name: sampleCmd.name,
        action: sampleCmd.action,
        frame: sampleCmd.frame,
        player: sampleCmd.player
      });
    }
    
    // Look for build-related commands - need to handle different possible command structures
    const buildRelatedCommands = rawData.Commands.filter((cmd: any) => {
      // Check various command properties that might indicate building or training
      const isTrainOrBuild = cmd.type === 'build' || 
                            cmd.type === 'train' || 
                            cmd.name?.toLowerCase().includes('build') ||
                            cmd.name?.toLowerCase().includes('train') ||
                            cmd.action?.toLowerCase().includes('build') ||
                            cmd.action?.toLowerCase().includes('train') ||
                            // Building-specific commands
                            cmd.name?.includes('Gateway') ||
                            cmd.name?.includes('Nexus') ||
                            cmd.name?.includes('Pylon') ||
                            cmd.name?.includes('Barracks') ||
                            cmd.name?.includes('Factory') ||
                            cmd.name?.includes('Command Center') ||
                            cmd.name?.includes('Supply Depot') ||
                            cmd.name?.includes('Hatchery') ||
                            cmd.name?.includes('Spawning Pool') ||
                            cmd.name?.includes('Evolution Chamber') ||
                            // Check for explicit command IDs
                            cmd.id === 0xc || // Build (Protoss/Terran)
                            cmd.id === 0x0c || // Build (Protoss/Terran)
                            cmd.id === 0x1c || // Train unit
                            cmd.id === 0x1f || // Zerg build/morph
                            cmd.id === 0x23 || // Upgrade
                            cmd.id === 0x30 || // Technology research
                            cmd.id === 0x32;  // Build/morph structure
                            
      if (isTrainOrBuild) {
        console.log('💡 Found build command:', cmd);
      }
      
      return isTrainOrBuild;
    });
    
    console.log(`💡 Found ${buildRelatedCommands.length} build-related commands`);
    
    // Extract build info from the filtered commands
    buildOrder = buildRelatedCommands.map((cmd: any, index: number) => {
      // Convert frame to time display
      const frameTime = cmd.frame || cmd.Frame || 0;
      const seconds = Math.floor(frameTime / 23.81);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const timeString = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      
      // Get the supply value
      const supply = cmd.supply || cmd.Supply || index * 2 + 8; // Fallback to an estimated supply count
      
      // Extract the action name with fallbacks for different property names
      const action = cmd.name || cmd.Name || cmd.action || cmd.Action || 
                    (cmd.type ? `${cmd.type} ${cmd.unit || ''}` : 'Unknown Build Action');
      
      return {
        time: timeString,
        supply: typeof supply === 'number' ? supply : parseInt(supply, 10) || 0,
        action: action 
      };
    })
    .filter((item: any) => item.action && item.action !== 'Unknown Build Action')
    .slice(0, 30); // Limit to first 30 build actions
  }
  
  console.log(`🔄 Extracted build order items: ${buildOrder.length}`);
  
  // Create a basic resources graph from commands if available
  let resourcesGraph: Array<{time: string; minerals: number; gas: number}> = [];
  if (rawData.Commands && Array.isArray(rawData.Commands)) {
    // Try to find resource-related commands
    const resourceCommands = rawData.Commands.filter((cmd: any) => 
      cmd.minerals !== undefined || 
      cmd.Minerals !== undefined || 
      cmd.gas !== undefined || 
      cmd.Gas !== undefined ||
      cmd.Resources?.minerals !== undefined ||
      cmd.Resources?.gas !== undefined);
    
    if (resourceCommands.length > 0) {
      console.log(`💡 Found ${resourceCommands.length} resource-related commands`);
      
      // Sample at intervals
      const interval = Math.max(Math.floor(resourceCommands.length / 20), 1);
      resourcesGraph = resourceCommands
        .filter((_: any, i: number) => i % interval === 0)
        .map((cmd: any) => {
          const frameTime = cmd.frame || cmd.Frame || 0;
          const seconds = Math.floor(frameTime / 23.81);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          const timeString = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
          
          // Handle different resource property structures
          const minerals = cmd.minerals || cmd.Minerals || cmd.Resources?.minerals || 0;
          const gas = cmd.gas || cmd.Gas || cmd.Resources?.gas || 0;
          
          return {
            time: timeString,
            minerals: typeof minerals === 'number' ? minerals : parseInt(minerals, 10) || 0,
            gas: typeof gas === 'number' ? gas : parseInt(gas, 10) || 0
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
