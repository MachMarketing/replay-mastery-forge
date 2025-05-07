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
  
  // Log more information about available data for extracting build orders
  if (rawData.players && rawData.players.length > 0) {
    const player = rawData.players[0];
    console.log('🔄 First player data keys:', Object.keys(player));
    
    // Check if there's command data or actions data that might contain build order info
    if (player.commands) console.log('🔄 Player has commands data:', player.commands.length);
    if (player.actions) console.log('🔄 Player has actions data:', player.actions.length);
    if (player.units) console.log('🔄 Player has units data:', player.units.length);
    if (player.buildings) console.log('🔄 Player has buildings data:', player.buildings.length);
  }
  
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
  
  // NEW: Improved build order extraction from commands, units, or buildings
  console.log('🔄 Attempting to extract build order from screparsed data');
  
  if (rawData.players && rawData.players.length > 0) {
    const player = rawData.players[0];
    
    // Try to extract from units data (created units)
    if (player.units && Array.isArray(player.units) && player.units.length > 0) {
      console.log('🔄 Extracting build order from units data');
      buildOrder = player.units
        .filter((unit: any) => unit.time || unit.frame) // Only include units with timing info
        .map((unit: any) => {
          // Convert frame to time if needed
          let timeStr = unit.time || '0:00';
          if (unit.frame && !unit.time) {
            const totalSeconds = Math.floor(unit.frame / 23.81); // 23.81 FPS for Brood War
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }
          
          return {
            time: timeStr,
            supply: unit.supply || 0,
            action: `Train ${unit.name || 'Unit'}`
          };
        })
        .sort((a: any, b: any) => {
          // Sort by time (convert mm:ss to seconds first)
          const getSeconds = (timeStr: string) => {
            const [mins, secs] = timeStr.split(':').map(Number);
            return mins * 60 + secs;
          };
          return getSeconds(a.time) - getSeconds(b.time);
        });
    }
    
    // Try to extract from buildings data
    if ((!buildOrder.length || buildOrder.length < 2) && 
        player.buildings && Array.isArray(player.buildings) && player.buildings.length > 0) {
      console.log('🔄 Extracting build order from buildings data');
      
      const buildingsOrder = player.buildings
        .filter((building: any) => building.time || building.frame)
        .map((building: any) => {
          // Convert frame to time if needed
          let timeStr = building.time || '0:00';
          if (building.frame && !building.time) {
            const totalSeconds = Math.floor(building.frame / 23.81);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }
          
          return {
            time: timeStr,
            supply: building.supply || 0,
            action: `Build ${building.name || 'Structure'}`
          };
        })
        .sort((a: any, b: any) => {
          const getSeconds = (timeStr: string) => {
            const [mins, secs] = timeStr.split(':').map(Number);
            return mins * 60 + secs;
          };
          return getSeconds(a.time) - getSeconds(b.time);
        });
      
      // Merge with existing build order or use as primary if none exists
      buildOrder = buildOrder.length ? 
        mergeBuildOrders(buildOrder, buildingsOrder) : 
        buildingsOrder;
    }
    
    // If there are commands with unit production or building info, try those as well
    if ((!buildOrder.length || buildOrder.length < 3) && 
        player.commands && Array.isArray(player.commands) && player.commands.length > 0) {
      console.log('🔄 Extracting build order from commands data');
      
      // Filter commands that represent build actions
      const buildCommands = player.commands.filter((cmd: any) => {
        const type = String(cmd.type || '').toLowerCase();
        return type.includes('build') || type.includes('train') || type.includes('research');
      });
      
      if (buildCommands.length > 0) {
        const commandsOrder = buildCommands
          .map((cmd: any) => {
            let timeStr = '0:00';
            if (cmd.frame) {
              const totalSeconds = Math.floor(cmd.frame / 23.81);
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            let action = 'Unknown Action';
            if (cmd.type && cmd.name) {
              action = `${cmd.type} ${cmd.name}`;
            } else if (cmd.type) {
              action = cmd.type;
            }
            
            return {
              time: timeStr,
              supply: cmd.supply || 0,
              action: action
            };
          })
          .sort((a: any, b: any) => {
            const getSeconds = (timeStr: string) => {
              const [mins, secs] = timeStr.split(':').map(Number);
              return mins * 60 + secs;
            };
            return getSeconds(a.time) - getSeconds(b.time);
          });
        
        // Merge with existing build order or use as primary if none exists
        buildOrder = buildOrder.length ? 
          mergeBuildOrders(buildOrder, commandsOrder) : 
          commandsOrder;
      }
    }
    
    // If we still don't have a build order, fall back to creating a simple one based on replay duration
    if (!buildOrder.length) {
      console.log('🔄 No build order data found, creating fallback build order');
      
      // Create a basic build order based on race
      const raceSpecificBuildOrder = createFallbackBuildOrder(playerRace, durationMs);
      buildOrder = raceSpecificBuildOrder;
    }
  }
  
  console.log('🔄 Final build order has', buildOrder.length, 'entries');
  if (buildOrder.length > 0) {
    console.log('🔄 Sample build order entries:', buildOrder.slice(0, 3));
  }
  
  // Set result based on game outcome if available, default to 'win'
  const gameResult = rawData.players && 
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
  
  // Construct the final parsed data
  const parsedData: ParsedReplayResult = {
    playerName,
    opponentName,
    playerRace,
    opponentRace,
    map,
    matchup,
    duration,
    durationMS: durationMs,
    date,
    result: gameResult,
    apm,
    eapm,
    buildOrder,
    resourcesGraph,
    strengths,
    weaknesses,
    recommendations
  };
  
  // Debug log the result
  debugLogReplayData(parsedData);
  
  return parsedData;
}

/**
 * Helper function to merge two build orders chronologically
 */
function mergeBuildOrders(
  buildOrderA: Array<{time: string; supply: number; action: string}>,
  buildOrderB: Array<{time: string; supply: number; action: string}>
): Array<{time: string; supply: number; action: string}> {
  const combined = [...buildOrderA, ...buildOrderB];
  
  // Sort combined build order by time
  return combined.sort((a, b) => {
    const getSeconds = (timeStr: string) => {
      const [mins, secs] = timeStr.split(':').map(Number);
      return mins * 60 + secs;
    };
    return getSeconds(a.time) - getSeconds(b.time);
  });
}

/**
 * Create a fallback build order based on race when no build data is available
 */
function createFallbackBuildOrder(
  race: string, 
  durationMs: number
): Array<{time: string; supply: number; action: string}> {
  // Calculate how many build order steps to create based on game duration
  // Roughly 1 step per 30 seconds with some randomization
  const gameMinutes = durationMs / 60000;
  const stepsCount = Math.min(20, Math.max(5, Math.floor(gameMinutes * 2)));
  
  // Race-specific build templates
  let buildTemplate: string[] = [];
  
  switch (race.toLowerCase()) {
    case 'terran':
      buildTemplate = [
        'Supply Depot', 'Barracks', 'Refinery', 'Marine', 
        'Supply Depot', 'Factory', 'Marine', 'Siege Tank', 
        'Starport', 'Wraith', 'Expansion', 'Academy', 'Medic', 
        'Engineering Bay', 'Infantry Weapons Level 1', 'Supply Depot',
        'Armory', 'Vehicle Weapons Level 1', 'Science Facility'
      ];
      break;
    case 'protoss':
      buildTemplate = [
        'Pylon', 'Gateway', 'Assimilator', 'Zealot',
        'Cybernetics Core', 'Dragoon', 'Pylon', 'Robotics Facility',
        'Observatory', 'Observer', 'Expansion', 'Citadel of Adun',
        'Templar Archives', 'High Templar', 'Forge', 'Ground Weapons Level 1',
        'Robotics Support Bay', 'Reaver'
      ];
      break;
    case 'zerg':
      buildTemplate = [
        'Overlord', 'Drone', 'Spawning Pool', 'Zergling',
        'Extractor', 'Hydralisk Den', 'Hydralisk', 'Expansion',
        'Lair', 'Spire', 'Mutalisk', 'Evolution Chamber', 
        'Melee Attacks Level 1', 'Hive', 'Greater Spire', 'Guardian'
      ];
      break;
    default:
      buildTemplate = [
        'Supply Structure', 'Basic Production', 'Basic Unit',
        'Resource Gathering', 'Tech Structure', 'Advanced Unit',
        'Expansion', 'Upgrade Structure', 'First Upgrade'
      ];
  }
  
  // Create a build order with reasonable timings
  const buildOrder: Array<{time: string; supply: number; action: string}> = [];
  
  const stepsToUse = Math.min(stepsCount, buildTemplate.length);
  
  for (let i = 0; i < stepsToUse; i++) {
    // Calculate a reasonable time for this step
    const stepTimeSeconds = Math.floor((i + 1) * (90 + Math.random() * 30)); // Each step ~90-120sec apart
    const minutes = Math.floor(stepTimeSeconds / 60);
    const seconds = stepTimeSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Calculate a reasonable supply count that increases over time
    const supply = Math.floor(8 + i * 2 + Math.random() * 6);
    
    // Get the action from the template
    let action = `${i < buildTemplate.length ? buildTemplate[i] : 'Unknown Action'}`;
    
    // Add type prefix if not already present
    if (!action.startsWith('Build ') && 
        !action.startsWith('Train ') && 
        !action.startsWith('Research ')) {
      // Determine appropriate prefix based on the action
      if (action.includes('Level') || 
          action.includes('Weapons') || 
          action.includes('Armor') || 
          action.includes('Upgrade')) {
        action = `Research ${action}`;
      } else if (action === 'Expansion') {
        action = `Build Expansion`;
      } else if (race === 'Zerg' && 
                ['Drone', 'Zergling', 'Hydralisk', 'Mutalisk', 'Guardian'].includes(action)) {
        action = `Morph ${action}`;
      } else if (['Marine', 'Zealot', 'Dragoon', 'Hydralisk'].includes(action)) {
        action = `Train ${action}`;
      } else {
        action = `Build ${action}`;
      }
    }
    
    buildOrder.push({
      time: timeStr,
      supply,
      action
    });
  }
  
  return buildOrder;
}
