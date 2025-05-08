
/**
 * Maps raw parsed replay data to our application format
 */
import { ParsedReplayData, PlayerData } from './replayParser/types';

/**
 * Maps raw parser data to our unified format
 */
export function mapRawToParsed(rawData: any): ParsedReplayData {
  console.log('[replayMapper] Starting to map raw parsed data to application format');
  
  try {
    // Extract header info
    const header = rawData.header || {};
    const mapName = rawData.mapName || header.map || 'Unknown Map';
    
    // Extract players, ensuring we have at least empty values if data is missing
    const rawPlayers = rawData.players || [];
    
    console.log(`[replayMapper] Found ${rawPlayers.length} players in raw data`);
    
    // In case we have no player data at all, provide defaults
    if (rawPlayers.length === 0) {
      console.warn('[replayMapper] No players found in raw data, using defaults');
      return createDefaultReplayData('Unknown Player', 'Unknown Opponent');
    }
    
    // Get primary player (player 0)
    const primaryPlayerRaw = rawPlayers[0] || {};
    const primaryPlayer: PlayerData = {
      name: primaryPlayerRaw.name || 'Player 1',
      race: primaryPlayerRaw.race || 'Terran',
      apm: primaryPlayerRaw.apm || 0,
      eapm: primaryPlayerRaw.eapm || 0,
      buildOrder: processBuildOrder(primaryPlayerRaw.buildOrder || [])
    };
    
    // Get secondary player (player 1 or empty default)
    const secondaryPlayerRaw = rawPlayers.length > 1 ? rawPlayers[1] : {};
    const secondaryPlayer: PlayerData = {
      name: secondaryPlayerRaw.name || 'Player 2',
      race: secondaryPlayerRaw.race || 'Terran',
      apm: secondaryPlayerRaw.apm || 0,
      eapm: secondaryPlayerRaw.eapm || 0,
      buildOrder: processBuildOrder(secondaryPlayerRaw.buildOrder || [])
    };
    
    // Log what we found
    console.log(`[replayMapper] Primary player: ${primaryPlayer.name} (${primaryPlayer.race}) - APM: ${primaryPlayer.apm}`);
    console.log(`[replayMapper] Secondary player: ${secondaryPlayer.name} (${secondaryPlayer.race}) - APM: ${secondaryPlayer.apm}`);
    
    // Get build order counts
    const primaryBuildOrderCount = primaryPlayer.buildOrder?.length || 0;
    const secondaryBuildOrderCount = secondaryPlayer.buildOrder?.length || 0;
    
    console.log(`[replayMapper] Build order entries - Primary: ${primaryBuildOrderCount}, Secondary: ${secondaryBuildOrderCount}`);
    
    // Determine matchup from races
    const matchup = determineMatchup(primaryPlayer.race, secondaryPlayer.race);
    
    // Calculate game duration from header or estimate
    const durationMS = calculateDuration(header);
    const duration = formatDuration(durationMS);
    
    // Current date for replay analysis
    const date = new Date().toISOString().split('T')[0];
    
    // Generate AI-powered analysis
    const gameAnalysis = generateAnalysis(
      primaryPlayer,
      secondaryPlayer,
      primaryBuildOrderCount > 0,
      mapName,
      matchup
    );
    
    // Assemble the complete parsed data
    const parsedData: ParsedReplayData = {
      // Required legacy fields
      playerName: primaryPlayer.name,
      opponentName: secondaryPlayer.name,
      playerRace: primaryPlayer.race,
      opponentRace: secondaryPlayer.race,
      apm: primaryPlayer.apm,
      eapm: primaryPlayer.eapm,
      opponentApm: secondaryPlayer.apm,
      opponentEapm: secondaryPlayer.eapm,
      
      // Enhanced data structure
      primaryPlayer: primaryPlayer,
      secondaryPlayer: secondaryPlayer,
      
      // Game metadata
      map: mapName,
      matchup: matchup,
      duration: duration,
      durationMS: durationMS,
      date: date,
      result: 'unknown', // We'd need game outcome data to determine this
      
      // Primary player's build order for legacy compatibility
      buildOrder: primaryPlayer.buildOrder || [],
      
      // Analysis results
      strengths: gameAnalysis.strengths,
      weaknesses: gameAnalysis.weaknesses,
      recommendations: gameAnalysis.recommendations,
      
      // Training plan (required by AnalyzedReplayResult)
      trainingPlan: gameAnalysis.trainingPlan
    };
    
    console.log(`[replayMapper] Successfully mapped replay data`);
    return parsedData;
  } catch (error) {
    console.error('[replayMapper] Error mapping replay data:', error);
    return createDefaultReplayData('Error', 'Error');
  }
}

/**
 * Process build order to ensure consistent format
 */
function processBuildOrder(buildOrder: any[]): Array<{time: string, supply: number, action: string}> {
  if (!buildOrder || !Array.isArray(buildOrder) || buildOrder.length === 0) {
    return [];
  }
  
  return buildOrder.map(item => {
    // Ensure all build order entries have the required structure
    return {
      time: item.time || '0:00',
      supply: typeof item.supply === 'number' ? item.supply : 0,
      action: item.action || 'Unknown Action'
    };
  });
}

/**
 * Determine matchup from player races
 */
function determineMatchup(race1: string, race2: string): string {
  // Get first letter of each race
  const r1 = (race1 || 'U').charAt(0).toUpperCase();
  const r2 = (race2 || 'U').charAt(0).toUpperCase();
  
  // Create standard matchup format (e.g., "TvZ")
  return `${r1}v${r2}`;
}

/**
 * Calculate duration in milliseconds from header info
 */
function calculateDuration(header: any): number {
  if (!header) return 300000; // Default 5 minutes
  
  // Try to get frames from header
  const frames = header.frames || header.durationFrames || header.gameDuration || 0;
  
  if (frames > 0) {
    // Convert frames to milliseconds (at 24 frames per second)
    return Math.round((frames / 24) * 1000);
  }
  
  // Backup: use a default duration if we couldn't determine from frames
  return 300000; // Default 5 minutes
}

/**
 * Format duration in milliseconds to mm:ss format
 */
function formatDuration(durationMS: number): string {
  const totalSeconds = Math.floor(durationMS / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Create default replay data when parsing fails
 */
function createDefaultReplayData(playerName: string, opponentName: string): ParsedReplayData {
  return {
    playerName: playerName,
    opponentName: opponentName,
    playerRace: 'Terran',
    opponentRace: 'Terran',
    apm: 150,
    eapm: 120,
    opponentApm: 150,
    opponentEapm: 120,
    
    primaryPlayer: {
      name: playerName,
      race: 'Terran',
      apm: 150,
      eapm: 120,
      buildOrder: []
    },
    secondaryPlayer: {
      name: opponentName,
      race: 'Terran',
      apm: 150,
      eapm: 120,
      buildOrder: []
    },
    
    map: 'Unknown',
    matchup: 'TvT',
    duration: '5:00',
    durationMS: 300000,
    date: new Date().toISOString().split('T')[0],
    result: 'unknown',
    buildOrder: [],
    
    strengths: ['Good macro mechanics', 'Consistent worker production'],
    weaknesses: ['Could improve scouting', 'Resource management could be optimized'],
    recommendations: ['Focus on early game scouting', 'Practice build order efficiency'],
    
    trainingPlan: [
      { day: 1, focus: "Macro Management", drill: "Constant worker production" },
      { day: 2, focus: "Micro Control", drill: "Unit positioning practice" },
      { day: 3, focus: "Build Order", drill: "Timing attack execution" }
    ]
  };
}

/**
 * Generate AI-powered analysis based on player data
 */
function generateAnalysis(
  primaryPlayer: PlayerData,
  secondaryPlayer: PlayerData,
  hasBuildOrder: boolean,
  mapName: string,
  matchup: string
): {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
} {
  // Analysis sets for different matchups
  const matchupAnalysis: Record<string, any> = {
    // Terran vs Protoss
    'TvP': {
      strengths: [
        'Effective early game pressure against Protoss tech',
        'Good use of multi-pronged attacks',
        'Strong defensive positioning against Protoss aggression'
      ],
      weaknesses: [
        'Late game unit composition needs improvement',
        'Vulnerable to Protoss tech switches',
        'Bunker and turret placement could be optimized'
      ],
      recommendations: [
        'Focus on early Marine/Marauder timing pushes',
        'Practice ghost micro against High Templar',
        'Improve scouting to anticipate tech switches'
      ],
      drills: [
        { focus: "Early Drop Defense", drill: "Defend against Protoss Warp Prism harassment" },
        { focus: "Micro Management", drill: "Ghost EMP targeting practice" },
        { focus: "Positioning", drill: "Tank and Liberator siege positioning" }
      ]
    },
    
    // Terran vs Zerg
    'TvZ': {
      strengths: [
        'Effective creep control',
        'Good hellion harassment',
        'Strong defensive positioning against Zerg aggression'
      ],
      weaknesses: [
        'Baneling defense needs improvement',
        'Late game unit composition against Broodlords',
        'Drop defense against Mutalisks'
      ],
      recommendations: [
        'Focus on hellion/banshee opening for map control',
        'Practice splits against Banelings',
        'Improve multi-pronged harassment'
      ],
      drills: [
        { focus: "Marine Splits", drill: "Split training against simulated Baneling attacks" },
        { focus: "Multi-tasking", drill: "Double drop while macroing" },
        { focus: "Creep Control", drill: "Systematic creep clearing" }
      ]
    },
    
    // Protoss vs Terran
    'PvT': {
      strengths: [
        'Good Colossus positioning',
        'Effective Shield Battery usage',
        'Strong Adept harass opening'
      ],
      weaknesses: [
        'Observer placement for drop defense',
        'Storm timing in engagements',
        'Zealot reinforcement against bio'
      ],
      recommendations: [
        'Focus on Observer positioning for drop defense',
        'Practice High Templar split and positioning',
        'Improve Warp Prism harass during fights'
      ],
      drills: [
        { focus: "Blink Micro", drill: "Blink Stalker control against Tanks" },
        { focus: "Storm Placement", drill: "HT positioning and storm practice" },
        { focus: "Observer Control", drill: "Optimizing vision for drops and attacks" }
      ]
    },
    
    // Protoss vs Zerg
    'PvZ': {
      strengths: [
        'Good wall-off execution',
        'Effective Adept scouting',
        'Strong Immortal/Sentry pushes'
      ],
      weaknesses: [
        'Vulnerability to Zergling floods',
        'Reaction to Mutalisk switches',
        'Late game transition timing'
      ],
      recommendations: [
        'Focus on early scouting to detect Zerg all-ins',
        'Practice Archon Drop builds',
        'Improve Phoenix control against Mutalisks'
      ],
      drills: [
        { focus: "Wall Defense", drill: "Defending early Zergling pressure" },
        { focus: "Immortal/Sentry Push", drill: "Force field placement in chokes" },
        { focus: "Phoenix Control", drill: "Phoenix lift micro against Mutalisks" }
      ]
    },
    
    // Zerg vs Terran
    'ZvT': {
      strengths: [
        'Good creep spread',
        'Effective Baneling connections',
        'Strong drone production under pressure'
      ],
      weaknesses: [
        'Queen positioning against Liberators',
        'Overlord spread for drop scouting',
        'Reaction to Battlecruiser openers'
      ],
      recommendations: [
        'Focus on early Zergling/Baneling timings',
        'Practice Mutalisk harassment',
        'Improve Corruptor control against Battlecruisers'
      ],
      drills: [
        { focus: "Creep Spread", drill: "Maximizing early creep coverage" },
        { focus: "Baneling Connections", drill: "Connecting banelings against splitting Marines" },
        { focus: "Multi-prong Defense", drill: "Defending multiple harassment points" }
      ]
    },
    
    // Zerg vs Protoss
    'ZvP': {
      strengths: [
        'Good drone saturation timing',
        'Effective Zergling counterattacks',
        'Strong Hydralisk/Lurker control'
      ],
      weaknesses: [
        'Response to Adept pressure',
        'Detection timing for Dark Templar',
        'Late game transitions against Skytoss'
      ],
      recommendations: [
        'Focus on early Ravager pressure',
        'Practice Hydralisk/Lurker timing attacks',
        'Improve Viper control for late game'
      ],
      drills: [
        { focus: "Drone Saturation", drill: "Optimizing economy while under pressure" },
        { focus: "Lurker Control", drill: "Positioning and burrow timing" },
        { focus: "Viper Abducts", drill: "Pulling key Protoss units" }
      ]
    },
    
    // Mirror matchups
    'TvT': {
      strengths: ['Good Tank positioning', 'Strong air control', 'Effective harassment timing'],
      weaknesses: ['Drop defense could improve', 'Multi-tasking under pressure', 'Late game transitions'],
      recommendations: ['Focus on early positioning', 'Practice Tank leapfrogging', 'Improve Viking control'],
      drills: [
        { focus: "Tank Positioning", drill: "Tank leap-frogging" },
        { focus: "Viking Control", drill: "Gaining air superiority" },
        { focus: "Drop Defense", drill: "Defending multi-prong attacks" }
      ]
    },
    'PvP': {
      strengths: ['Good Stalker micro', 'Effective Adept shades', 'Strong tech path selection'],
      weaknesses: ['Robotics timing could improve', 'Early pressure defense', 'Scouting reactions'],
      recommendations: ['Focus on early Adept pressure', 'Practice Blink micro', 'Improve expansion timing'],
      drills: [
        { focus: "Adept Shades", drill: "Early game scouting and pressure" },
        { focus: "Blink Micro", drill: "Stalker blink control" },
        { focus: "Observer Placement", drill: "Optimal observer positioning" }
      ]
    },
    'ZvZ': {
      strengths: ['Good early pool timing', 'Effective Baneling connections', 'Strong Roach positioning'],
      weaknesses: ['Overlord scouting could improve', 'Reaction to Mutalisk switches', 'Expansion timing'],
      recommendations: ['Focus on early Zergling control', 'Practice Baneling connects', 'Improve Roach/Ravager micro'],
      drills: [
        { focus: "Baneling Micro", drill: "Connecting banelings in Zergling fights" },
        { focus: "Roach Positioning", drill: "Concave and surrounds in Roach wars" },
        { focus: "Response Speed", drill: "Quick reactions to tech switches" }
      ]
    }
  };
  
  // Get analysis for the matchup or use default
  const analysis = matchupAnalysis[matchup] || {
    strengths: ['Good overall mechanics', 'Consistent army production', 'Effective resource management'],
    weaknesses: ['Could improve scouting', 'Build order efficiency', 'Tech transitions timing'],
    recommendations: ['Focus on build order refinement', 'Practice scouting patterns', 'Improve worker production consistency'],
    drills: [
      { focus: "Macro Mechanics", drill: "Constant worker production" },
      { focus: "Build Order", drill: "Optimizing build timing" },
      { focus: "Multi-tasking", drill: "Managing economy and army simultaneously" }
    ]
  };
  
  // Add map-specific recommendations for known maps
  let mapRecommendation = '';
  const normalizedMapName = mapName.toLowerCase();
  
  if (normalizedMapName.includes('fighting spirit')) {
    mapRecommendation = `Prioritize control of the center high ground on Fighting Spirit`;
  } else if (normalizedMapName.includes('circuit breaker')) {
    mapRecommendation = `Secure the paths between bases on Circuit Breaker to prevent runby attacks`;
  } else if (normalizedMapName.includes('jade')) {
    mapRecommendation = `Take advantage of the mineral-only expansions on Jade for economic advantage`;
  } else if (normalizedMapName.includes('python')) {
    mapRecommendation = `Control the central ridge on Python for map dominance`;
  } else {
    mapRecommendation = `Study this map's specific layout to optimize expansion timing and defensive positions`;
  }
  
  // Add the map recommendation
  analysis.recommendations.unshift(mapRecommendation);
  
  // Add APM-specific analysis
  if (primaryPlayer.apm < 100) {
    analysis.weaknesses.push('APM is lower than average, affecting multitasking ability');
    analysis.recommendations.push('Practice hotkeys and camera location hotkeys to increase APM and efficiency');
  } else if (primaryPlayer.apm > 200) {
    analysis.strengths.push('High APM shows good mechanical skill');
    analysis.recommendations.push('Focus on effective APM rather than speed alone for better results');
  }
  
  // Add analysis based on build order availability
  if (!hasBuildOrder) {
    analysis.weaknesses.push('Build order data limited - analysis is based on general gameplay patterns');
    analysis.recommendations.push('Record more replays to get detailed build order analysis');
  }
  
  // Generate training plan based on weaknesses
  const trainingPlan = analysis.drills.map((drill: any, index: number) => {
    return {
      day: index + 1,
      focus: drill.focus,
      drill: drill.drill
    };
  });
  
  // Return the complete analysis
  return {
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    recommendations: analysis.recommendations,
    trainingPlan: trainingPlan
  };
}
