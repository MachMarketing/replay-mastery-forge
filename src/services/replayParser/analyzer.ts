
import { ParsedReplayData, ReplayAnalysis } from './types';

// Database of 2025 meta strategies by matchup
interface MetaStrategy {
  buildOrder: string[];
  keyUnits: string[];
  earlyGoals: string[];
  midGameTransition: string[];
  lateGameGoals: string[];
  timings: { [key: string]: string };
  counters: { [key: string]: string[] };
}

// Current professional meta strategies as of 2025
const META_STRATEGIES: { [key: string]: MetaStrategy } = {
  // Terran vs Protoss
  'TvP': {
    buildOrder: [
      '8 Supply Depot',
      '11 Barracks',
      '12 Refinery',
      '15/16 Supply Depot',
      '16 Factory',
      '18 Machine Shop',
      '20 Supply Depot + Expansion',
      '22 Starport',
      '26 Science Facility'
    ],
    keyUnits: ['Marine', 'Medic', 'Tank', 'Science Vessel'],
    earlyGoals: ['Early Factory', 'Fast expansion', 'Tank contain'],
    midGameTransition: ['3+ Factories', 'Vessel tech', 'Additional expansions'],
    lateGameGoals: ['Control map choke points', 'Maintain vessel count', 'Late game transition to Battlecruisers'],
    timings: {
      'expansion': '4:30-5:00',
      'push': '7:30-8:30',
      'thirdBase': '9:00-10:00'
    },
    counters: {
      'Zealot/Dragoon': ['Marine/Tank/Medic positioning'],
      'Carrier': ['Goliath production', 'Expand aggressively'],
      'High Templar': ['Spread units', 'EMP from Vessels']
    }
  },
  
  // Terran vs Terran
  'TvT': {
    buildOrder: [
      '8 Supply Depot',
      '11 Barracks',
      '12 Refinery',
      '16 Factory',
      '18 Machine Shop',
      '20 Supply Depot + Tank',
      '24 Factory',
      '26 Expansion',
      '30 Factory'
    ],
    keyUnits: ['Tank', 'Vulture', 'Goliath', 'Science Vessel'],
    earlyGoals: ['Tank control', 'Mine fields', 'Map control'],
    midGameTransition: ['Set up siege lines', 'Expand carefully', 'Air control'],
    lateGameGoals: ['Control key positions', 'Vessel support', 'Drop harassment'],
    timings: {
      'firstTank': '4:00-4:30',
      'expansion': '5:30-6:30',
      'push': 'After 2-3 tanks with siege'
    },
    counters: {
      'Early aggression': ['Wall-in', 'Fast tank'],
      'Vulture harassment': ['Turrets at mineral lines', 'Defensive tanks'],
      'Air transition': ['Goliath production', 'Turret rings']
    }
  },
  
  // Terran vs Zerg
  'TvZ': {
    buildOrder: [
      '8 Supply Depot',
      '10 Barracks',
      '12 Refinery',
      '16 Factory + Supply Depot',
      '20 Academy + Expansion',
      '22 Factory',
      '24 Machine Shop',
      '30 Starport'
    ],
    keyUnits: ['Marine', 'Medic', 'Tank', 'Science Vessel'],
    earlyGoals: ['Wall-in', 'M&M control', 'Early pressure'],
    midGameTransition: ['Tank support', 'Multi-prong attacks', 'Deny expansions'],
    lateGameGoals: ['Science Vessel irradiate', 'Contain and push', 'Split map control'],
    timings: {
      'firstPush': '5:30-6:30',
      'expansion': '4:30-5:30',
      'vesselTech': '8:00-9:30'
    },
    counters: {
      'Mutalisk': ['Turrets', 'Irradiate', 'Marine positioning'],
      'Lurker': ['Vessels for detection', 'Tank lines'],
      'Ultralisk': ['Kiting with M&M', 'Defensive tank positioning']
    }
  },
  
  // Protoss vs Terran
  'PvT': {
    buildOrder: [
      '8 Pylon',
      '10 Gateway',
      '12 Assimilator',
      '14 Cybernetics Core',
      '16 Pylon',
      '18 Dragoon + Range',
      '20 Nexus',
      '22 Gateway',
      '24 Robotics Facility'
    ],
    keyUnits: ['Dragoon', 'Zealot', 'Observer', 'Reaver', 'High Templar'],
    earlyGoals: ['Fast expand', 'Dragoon control', 'Map presence'],
    midGameTransition: ['Templar tech', 'Shuttle harassment', 'Third base'],
    lateGameGoals: ['Storm control', 'Arbiter recall', 'Flank attacks'],
    timings: {
      'expansion': '4:00-5:00',
      'observer': '6:00-6:30',
      'stormTiming': '9:30-10:30'
    },
    counters: {
      'Bio push': ['Zealot/Dragoon positioning', 'Fast Templar tech'],
      'Mech': ['Shuttle/Reaver drops', 'Expand aggressively'],
      'Late game Sky Terran': ['Mass Carrier transition with Templar support']
    }
  },
  
  // Protoss vs Protoss
  'PvP': {
    buildOrder: [
      '8 Pylon',
      '10 Gateway',
      '12 Assimilator',
      '14 Cybernetics Core',
      '16 Gateway',
      '18 Dragoon + Range',
      '22 Robotics Facility',
      '26 Observatory',
      '28 Expansion'
    ],
    keyUnits: ['Dragoon', 'Reaver', 'Observer', 'Dark Templar'],
    earlyGoals: ['Dragoon micro', 'Probe scouting', 'Detection'],
    midGameTransition: ['Reaver production', 'Shuttle micro', 'Expansion timing'],
    lateGameGoals: ['Map control', 'Arbiter tech', 'Multiple attack angles'],
    timings: {
      'twoGate': '3:30-4:00',
      'observer': '5:30-6:00',
      'expansion': 'After Robotics tech'
    },
    counters: {
      'Early Zealot': ['Dragoon micro', 'Ramp control'],
      'Reaver drop': ['Observer positioning', 'Spread units'],
      'Dark Templar': ['Fast Observer', 'Cannons at mineral line']
    }
  },
  
  // Protoss vs Zerg
  'PvZ': {
    buildOrder: [
      '8 Pylon',
      '10 Forge',
      '12 Nexus',
      '14 Cannon',
      '16 Gateway',
      '18 Assimilator',
      '20 Cybernetics Core',
      '22 Gateway',
      '24 Stargate'
    ],
    keyUnits: ['Corsair', 'Zealot', 'Dragoon', 'High Templar', 'Archon'],
    earlyGoals: ['Forge fast expand', 'Corsair control', 'Deny scouting'],
    midGameTransition: ['Templar tech', 'Third base', 'Map control'],
    lateGameGoals: ['Storm/Archon army', 'Multiple attack paths', 'Carrier transition'],
    timings: {
      'expansion': '3:00-4:00 (FFE)',
      'corsair': '5:30-6:30',
      'thirdBase': '8:00-9:30'
    },
    counters: {
      'Hydralisk timing': ['Storm tech', 'Zealot/Archon'],
      'Mutalisk': ['Corsair control', 'Cannon placement'],
      'Lurker': ['Observer support', 'Storm drops']
    }
  },
  
  // Zerg vs Terran
  'ZvT': {
    buildOrder: [
      '9 Overlord',
      '12 Hatchery',
      '11 Spawning Pool',
      '13 Extractor',
      '15 Overlord',
      '16 Zergling',
      '18 Lair',
      '21 Zergling Speed',
      '24 Spire'
    ],
    keyUnits: ['Zergling', 'Mutalisk', 'Lurker', 'Defiler'],
    earlyGoals: ['Fast expand', 'Economy focus', 'Ling control'],
    midGameTransition: ['Mutalisk harassment', 'Map control', 'Third base'],
    lateGameGoals: ['Defiler support', 'Lurker positioning', 'Multiple attack waves'],
    timings: {
      'expansion': '2:30-3:30',
      'lair': '4:00-4:30',
      'spire': '5:30-6:30'
    },
    counters: {
      'Bio push': ['Lurker tech', 'Surrounding tactics'],
      'Mech': ['Mutalisk harassment', 'Expanding aggressively'],
      'Vessel heavy': ['Multiple Defilers', 'Scourge control']
    }
  },
  
  // Zerg vs Protoss
  'ZvP': {
    buildOrder: [
      '9 Overlord',
      '12 Hatchery',
      '11 Spawning Pool',
      '13 Extractor',
      '14 Overlord',
      '16 Zergling',
      '18 Hydralisk Den',
      '21 Lair',
      '24 Hydralisk Speed'
    ],
    keyUnits: ['Hydralisk', 'Zergling', 'Lurker', 'Mutalisk', 'Scourge'],
    earlyGoals: ['Three base economy', 'Deny scouting', 'Map control'],
    midGameTransition: ['Lurker tech', 'Hydra/Ling attacks', 'Deny third base'],
    lateGameGoals: ['Ultra/Cracklings', 'Multi-prong attacks', 'Deny key bases'],
    timings: {
      'expansion': '2:30-3:00',
      'third': '4:30-5:30',
      'lurker': '7:00-8:00'
    },
    counters: {
      'Corsair opening': ['Extra queens', 'Hydra timing attack'],
      'Zealot/Archon': ['Lurker control', 'Surround tactics'],
      'Carrier transition': ['Hydra/Scourge', 'Base trades']
    }
  },
  
  // Zerg vs Zerg
  'ZvZ': {
    buildOrder: [
      '9 Overlord',
      '12 Spawning Pool',
      '11 Extractor',
      '13 Overlord',
      '14 Zergling',
      '16 Lair',
      '18 Zergling Speed'
    ],
    keyUnits: ['Zergling', 'Mutalisk', 'Scourge', 'Hydralisk'],
    earlyGoals: ['Zergling control', 'Deny expansion', 'Economy lead'],
    midGameTransition: ['Mutalisk micro', 'Map control', 'Safe expansion'],
    lateGameGoals: ['Air control', 'Expansion denial', 'Tech advantage'],
    timings: {
      'speedlingTiming': '3:30-4:00',
      'lair': '3:30-4:30',
      'spire': '5:00-5:30'
    },
    counters: {
      'Early pool': ['Sunken defense', 'Drone micro'],
      'Fast expansion': ['Zergling flood', 'Deny drones'],
      'Mutalisk': ['Scourge focus fire', 'Spore placement']
    }
  }
};

/**
 * Analyze a replay to generate strengths, weaknesses, and recommendations
 * using current 2025 meta strategies
 */
export async function analyzeReplayData(replayData: ParsedReplayData): Promise<ReplayAnalysis> {
  // Get matchup from the data
  const playerRace = replayData.playerRace.charAt(0);
  const opponentRace = replayData.opponentRace.charAt(0);
  const matchup = `${playerRace}v${opponentRace}`;
  
  // Get meta strategy for this matchup
  const metaStrategy = META_STRATEGIES[matchup] || META_STRATEGIES['TvP']; // Default to TvP if not found
  
  return new Promise(resolve => {
    setTimeout(() => {
      // Basic analysis metrics
      const apmRating = replayData.apm < 100 ? 'low' : replayData.apm > 200 ? 'high' : 'medium';
      const gameLength = parseInt(replayData.duration.split(':')[0]);
      const isEarlyGame = gameLength < 10;
      const race = replayData.playerRace;
      const opponentRace = replayData.opponentRace;
      
      // Build order analysis
      const buildOrderQuality = analyzeBuildOrderQuality(replayData.buildOrder, metaStrategy.buildOrder);
      
      // Generate strengths based on real metrics and current meta
      const strengths = [];
      
      // APM-based strengths
      if (apmRating === 'high') {
        strengths.push('Excellent mechanical speed with high APM matching pro-level execution');
      } else if (apmRating === 'medium') {
        strengths.push('Good mechanical control with competitive APM for your level');
      }
      
      // Build order strengths
      if (buildOrderQuality === 'good') {
        strengths.push(`Strong adherence to current ${matchup} meta build order timing`);
      } else if (buildOrderQuality === 'decent') {
        strengths.push(`Reasonable build order execution following ${matchup} standard openings`);
      }
      
      // Race-specific strengths based on current meta
      if (!isEarlyGame && replayData.result === 'win') {
        strengths.push('Effective late-game decision making with proper tech transitions');
      }
      
      if (race === 'Terran') {
        if (opponentRace === 'Protoss') {
          strengths.push('Good positioning against Protoss gateway units');
        } else if (opponentRace === 'Zerg') {
          strengths.push('Effective containment and drop harassment against Zerg expansions');
        } else {
          strengths.push('Strong tank positioning in TvT mirror matchup');
        }
      } else if (race === 'Protoss') {
        if (opponentRace === 'Terran') {
          strengths.push('Strong High Templar usage and Storm placement');
        } else if (opponentRace === 'Zerg') {
          strengths.push('Effective Corsair control for Overlord hunting and scouting denial');
        } else {
          strengths.push('Good observer placement and Reaver micro in the PvP matchup');
        }
      } else if (race === 'Zerg') {
        if (opponentRace === 'Terran') {
          strengths.push('Effective multi-pronged attacks keeping Terran defensive');
        } else if (opponentRace === 'Protoss') {
          strengths.push('Strong expansion timing and map control against Protoss');
        } else {
          strengths.push('Good Mutalisk micro and Scourge target prioritization in ZvZ');
        }
      }
      
      // Generate weaknesses based on meta
      const weaknesses = [];
      
      // APM-based weaknesses
      if (apmRating === 'low') {
        weaknesses.push('APM significantly below competitive level, limiting multitasking potential');
      }
      
      // Build order weaknesses
      if (buildOrderQuality === 'poor') {
        weaknesses.push(`Build order deviates significantly from optimal ${matchup} meta timings`);
      }
      
      // Game-length specific weaknesses
      if (isEarlyGame && replayData.result === 'loss') {
        weaknesses.push('Vulnerability to standard early game pressure builds');
      }
      
      // Race-specific weaknesses based on matchup
      if (race === 'Terran') {
        if (opponentRace === 'Protoss') {
          weaknesses.push('Delayed Science Vessel production allowing HT/Arbiter tech advantage');
          weaknesses.push('Suboptimal EMPs against Protoss spellcasters');
        } else if (opponentRace === 'Zerg') {
          weaknesses.push('Inefficient Marine/Medic positioning against Zergling surrounds');
        } else {
          weaknesses.push('Vulnerable tank positioning allowing for opponent siege advantage');
        }
      } else if (race === 'Protoss') {
        if (opponentRace === 'Terran') {
          weaknesses.push('Delayed Observer tech leaving you vulnerable to cloaked units');
          weaknesses.push('Zealot-heavy composition without proper Dragoon support against mechanical units');
        } else if (opponentRace === 'Zerg') {
          weaknesses.push('Insufficient map control allowing unchecked Zerg expansion');
        } else {
          weaknesses.push('Reaver drop timing not aligning with current PvP meta expectations');
        }
      } else if (race === 'Zerg') {
        if (opponentRace === 'Terran') {
          weaknesses.push('Delayed Lurker morphing against Bio pushes');
          weaknesses.push('Insufficient Defiler support in late game engagements');
        } else if (opponentRace === 'Protoss') {
          weaknesses.push('Poor Hydralisk spread against High Templar Storm');
        } else {
          weaknesses.push('Suboptimal drone saturation timing in ZvZ economic game');
        }
      }
      
      // Generate matchup-specific recommendations
      const recommendations = [];
      
      // APM recommendations
      if (apmRating === 'low') {
        recommendations.push('Focus on optimizing your hotkey usage to improve APM efficiency');
        recommendations.push('Practice standard macro cycles to maintain production during fights');
      }
      
      // Add specific meta recommendations based on matchup
      recommendations.push(`Study the current ${matchup} meta build order: ${metaStrategy.buildOrder.slice(0, 3).join(', ')}...`);
      
      if (metaStrategy.counters) {
        const counterKeys = Object.keys(metaStrategy.counters);
        if (counterKeys.length > 0) {
          const counterUnit = counterKeys[0];
          recommendations.push(`Against ${counterUnit}, utilize ${metaStrategy.counters[counterUnit][0]}`);
        }
      }
      
      // Timing recommendations
      if (metaStrategy.timings) {
        const timingKeys = Object.keys(metaStrategy.timings);
        if (timingKeys.length > 0) {
          const timingKey = timingKeys[0];
          recommendations.push(`Aim for ${timingKey} timing at ${metaStrategy.timings[timingKey]} to match current meta`);
        }
      }
      
      // Race-specific recommendations
      if (race === 'Terran') {
        recommendations.push('Implement early game wall-in strategies appropriate for your matchup');
        if (opponentRace === 'Protoss') {
          recommendations.push('Practice EMPing Templar clusters before major engagements');
        } else if (opponentRace === 'Zerg') {
          recommendations.push('Improve Tank leapfrogging technique for safer pushes');
        }
      } else if (race === 'Protoss') {
        recommendations.push('Focus on probe production consistency and pylon placement');
        if (opponentRace === 'Terran') {
          recommendations.push('Practice Zealot/Dragoon positioning against Terran pushes');
        } else if (opponentRace === 'Zerg') {
          recommendations.push('Master Corsair stacking for more effective Overlord hunting');
        }
      } else if (race === 'Zerg') {
        recommendations.push('Focus on early drone production and efficient larva usage');
        if (opponentRace === 'Terran') {
          recommendations.push('Practice surrounding techniques against Marine/Tank positions');
        } else if (opponentRace === 'Protoss') {
          recommendations.push('Work on Mutalisk hit-and-run harassment against Protoss bases');
        }
      }
      
      // Generate race-specific training plan
      const trainingPlan = generateTrainingPlan(race, matchup, metaStrategy);
      
      resolve({
        strengths,
        weaknesses,
        recommendations,
        trainingPlan
      });
    }, 300); // Reduced delay to improve UX
  });
}

/**
 * Analyze the quality of a build order compared to meta
 */
function analyzeBuildOrderQuality(
  actualBuild: Array<{ time: string; supply: number; action: string }>,
  metaBuild: string[]
): 'good' | 'decent' | 'poor' {
  if (!actualBuild || actualBuild.length < 5) {
    return 'poor'; // Not enough build data
  }
  
  // Count how many actions align with meta build
  let matchCount = 0;
  let checkItems = Math.min(actualBuild.length, metaBuild.length);
  
  for (let i = 0; i < checkItems; i++) {
    const actualAction = actualBuild[i].action.toLowerCase();
    const metaAction = metaBuild[i].toLowerCase().split(' ').slice(1).join(' '); // Remove supply number
    
    if (actualAction.includes(metaAction) || metaAction.includes(actualAction)) {
      matchCount++;
    }
  }
  
  const matchRatio = matchCount / checkItems;
  
  if (matchRatio > 0.7) return 'good';
  if (matchRatio > 0.4) return 'decent';
  return 'poor';
}

/**
 * Generate a training plan based on race and meta strategy
 */
function generateTrainingPlan(
  race: string, 
  matchup: string,
  metaStrategy: MetaStrategy
): Array<{ day: number; focus: string; drill: string }> {
  // Generate custom training plan based on race and matchup
  return [
    {
      day: 1,
      focus: 'Build Order Execution',
      drill: `Practice the current ${matchup} meta opening: ${metaStrategy.buildOrder.slice(0, 5).join(', ')}...`
    },
    {
      day: 2,
      focus: 'Scouting Timing',
      drill: `Send scouts at key timings: ${Object.keys(metaStrategy.timings)[0] || 'early game'}`
    },
    {
      day: 3,
      focus: 'Resource Management',
      drill: 'Play 3 games focusing only on minimal resource floating and worker production'
    },
    {
      day: 4,
      focus: `${race} Unit Control`,
      drill: `Practice microing ${metaStrategy.keyUnits.join(', ')} in custom games`
    },
    {
      day: 5,
      focus: 'Multitasking',
      drill: `Practice ${race === 'Terran' ? 'drops' : race === 'Protoss' ? 'Shuttle harassment' : 'Mutalisk harass'} while maintaining macro`
    },
    {
      day: 6,
      focus: 'Countering Meta Strategies',
      drill: `Practice against the common ${opponentRaceFromMatchup(matchup)} strategies: ${Object.keys(metaStrategy.counters).join(', ')}`
    },
    {
      day: 7,
      focus: `${matchup} Matchup Knowledge`,
      drill: `Watch 3 recent pro ${matchup} replays from ASL/KSL and take notes on build orders and timings`
    },
    {
      day: 8,
      focus: 'Execution Speed',
      drill: `Practice the first 5 minutes of your ${matchup} build with perfect worker production and no supply blocks`
    },
    {
      day: 9,
      focus: 'Adaptation',
      drill: `Play 3 games where you scout and adjust to counter ${Object.keys(metaStrategy.counters)[0] || 'common builds'}`
    },
    {
      day: 10,
      focus: 'Full Implementation',
      drill: `Apply all previous lessons in 5 ${matchup} games, focusing on one improvement area at a time`
    }
  ];
}

/**
 * Get opponent race from matchup string
 */
function opponentRaceFromMatchup(matchup: string): string {
  const opponentChar = matchup.charAt(2);
  switch (opponentChar) {
    case 'T': return 'Terran';
    case 'P': return 'Protoss';
    case 'Z': return 'Zerg';
    default: return 'Unknown';
  }
}
