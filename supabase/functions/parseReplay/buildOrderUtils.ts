/**
 * Professional Build Order Analysis Utilities
 * Supporting functions for real-time build order extraction
 */

// Phase 2: Enhanced Unit Database and Analysis
export const PROFESSIONAL_UNIT_DATABASE = {
  // Protoss Units
  protoss: {
    // Workers & Basic
    'Probe': { cost: { minerals: 50, gas: 0, supply: 1 }, category: 'economy', buildTime: 20 },
    'Pylon': { cost: { minerals: 100, gas: 0, supply: 0 }, category: 'supply', buildTime: 25, provides: 8 },
    'Nexus': { cost: { minerals: 400, gas: 0, supply: 0 }, category: 'economy', buildTime: 120, provides: 9 },
    
    // Military Buildings
    'Gateway': { cost: { minerals: 150, gas: 0, supply: 0 }, category: 'military', buildTime: 60 },
    'Forge': { cost: { minerals: 150, gas: 0, supply: 0 }, category: 'tech', buildTime: 45 },
    'Cybernetics Core': { cost: { minerals: 200, gas: 0, supply: 0 }, category: 'tech', buildTime: 60 },
    'Stargate': { cost: { minerals: 150, gas: 150, supply: 0 }, category: 'military', buildTime: 70 },
    'Robotics Facility': { cost: { minerals: 200, gas: 200, supply: 0 }, category: 'military', buildTime: 70 },
    
    // Military Units
    'Zealot': { cost: { minerals: 100, gas: 0, supply: 2 }, category: 'military', buildTime: 40 },
    'Dragoon': { cost: { minerals: 125, gas: 50, supply: 2 }, category: 'military', buildTime: 60 },
    'Dark Templar': { cost: { minerals: 125, gas: 100, supply: 2 }, category: 'military', buildTime: 50 },
    'High Templar': { cost: { minerals: 50, gas: 150, supply: 2 }, category: 'military', buildTime: 50 },
    'Archon': { cost: { minerals: 175, gas: 250, supply: 4 }, category: 'military', buildTime: 20 },
    'Observer': { cost: { minerals: 25, gas: 75, supply: 1 }, category: 'military', buildTime: 40 },
    'Shuttle': { cost: { minerals: 200, gas: 0, supply: 2 }, category: 'military', buildTime: 60 },
    'Reaver': { cost: { minerals: 200, gas: 100, supply: 4 }, category: 'military', buildTime: 70 },
    'Carrier': { cost: { minerals: 350, gas: 250, supply: 6 }, category: 'military', buildTime: 140 },
    'Scout': { cost: { minerals: 275, gas: 125, supply: 3 }, category: 'military', buildTime: 80 },
    'Corsair': { cost: { minerals: 150, gas: 100, supply: 2 }, category: 'military', buildTime: 40 },
  },
  
  // Terran Units
  terran: {
    // Workers & Basic
    'SCV': { cost: { minerals: 50, gas: 0, supply: 1 }, category: 'economy', buildTime: 20 },
    'Supply Depot': { cost: { minerals: 100, gas: 0, supply: 0 }, category: 'supply', buildTime: 30, provides: 8 },
    'Command Center': { cost: { minerals: 400, gas: 0, supply: 0 }, category: 'economy', buildTime: 120, provides: 10 },
    
    // Military Buildings
    'Barracks': { cost: { minerals: 150, gas: 0, supply: 0 }, category: 'military', buildTime: 60 },
    'Factory': { cost: { minerals: 200, gas: 100, supply: 0 }, category: 'military', buildTime: 60 },
    'Starport': { cost: { minerals: 150, gas: 100, supply: 0 }, category: 'military', buildTime: 70 },
    'Academy': { cost: { minerals: 150, gas: 0, supply: 0 }, category: 'tech', buildTime: 60 },
    'Engineering Bay': { cost: { minerals: 125, gas: 0, supply: 0 }, category: 'tech', buildTime: 35 },
    
    // Military Units
    'Marine': { cost: { minerals: 50, gas: 0, supply: 1 }, category: 'military', buildTime: 24 },
    'Firebat': { cost: { minerals: 50, gas: 25, supply: 1 }, category: 'military', buildTime: 24 },
    'Medic': { cost: { minerals: 50, gas: 25, supply: 1 }, category: 'military', buildTime: 30 },
    'Vulture': { cost: { minerals: 75, gas: 0, supply: 2 }, category: 'military', buildTime: 30 },
    'Tank': { cost: { minerals: 150, gas: 100, supply: 2 }, category: 'military', buildTime: 45 },
    'Goliath': { cost: { minerals: 100, gas: 50, supply: 2 }, category: 'military', buildTime: 40 },
    'Wraith': { cost: { minerals: 150, gas: 100, supply: 2 }, category: 'military', buildTime: 60 },
    'Dropship': { cost: { minerals: 100, gas: 100, supply: 2 }, category: 'military', buildTime: 50 },
    'Battlecruiser': { cost: { minerals: 400, gas: 300, supply: 6 }, category: 'military', buildTime: 133 },
    'Valkyrie': { cost: { minerals: 250, gas: 125, supply: 3 }, category: 'military', buildTime: 50 },
  },
  
  // Zerg Units  
  zerg: {
    // Workers & Basic
    'Drone': { cost: { minerals: 50, gas: 0, supply: 1 }, category: 'economy', buildTime: 20 },
    'Overlord': { cost: { minerals: 100, gas: 0, supply: 0 }, category: 'supply', buildTime: 40, provides: 8 },
    'Hatchery': { cost: { minerals: 300, gas: 0, supply: 0 }, category: 'economy', buildTime: 120, provides: 1 },
    'Lair': { cost: { minerals: 150, gas: 100, supply: 0 }, category: 'economy', buildTime: 100 },
    'Hive': { cost: { minerals: 200, gas: 150, supply: 0 }, category: 'economy', buildTime: 120 },
    
    // Military Buildings
    'Spawning Pool': { cost: { minerals: 200, gas: 0, supply: 0 }, category: 'military', buildTime: 65 },
    'Hydralisk Den': { cost: { minerals: 100, gas: 50, supply: 0 }, category: 'military', buildTime: 40 },
    'Spire': { cost: { minerals: 200, gas: 150, supply: 0 }, category: 'military', buildTime: 100 },
    'Greater Spire': { cost: { minerals: 100, gas: 150, supply: 0 }, category: 'military', buildTime: 100 },
    'Evolution Chamber': { cost: { minerals: 75, gas: 0, supply: 0 }, category: 'tech', buildTime: 40 },
    
    // Military Units
    'Zergling': { cost: { minerals: 50, gas: 0, supply: 1 }, category: 'military', buildTime: 28 },
    'Hydralisk': { cost: { minerals: 75, gas: 25, supply: 1 }, category: 'military', buildTime: 28 },
    'Mutalisk': { cost: { minerals: 100, gas: 100, supply: 2 }, category: 'military', buildTime: 40 },
    'Scourge': { cost: { minerals: 25, gas: 75, supply: 1 }, category: 'military', buildTime: 30 },
    'Lurker': { cost: { minerals: 50, gas: 100, supply: 2 }, category: 'military', buildTime: 40 },
    'Guardian': { cost: { minerals: 50, gas: 100, supply: 2 }, category: 'military', buildTime: 40 },
    'Devourer': { cost: { minerals: 50, gas: 100, supply: 2 }, category: 'military', buildTime: 40 },
    'Ultralisk': { cost: { minerals: 200, gas: 200, supply: 4 }, category: 'military', buildTime: 60 },
    'Defiler': { cost: { minerals: 50, gas: 150, supply: 2 }, category: 'military', buildTime: 50 },
    'Queen': { cost: { minerals: 100, gas: 100, supply: 2 }, category: 'military', buildTime: 50 },
  }
};

export function extractUnitNameFromCommand(command: any, race: string): string {
  // Phase 1: Direct unit extraction from command data
  if (command.data?.unit) {
    return command.data.unit;
  }
  
  if (command.data?.unitType) {
    return mapUnitTypeToName(command.data.unitType, race);
  }
  
  // Command ID based inference
  if (command.commandID) {
    return inferUnitFromCommandID(command.commandID, race, command.frame);
  }
  
  // Fallback to generic unit
  return getGenericUnitForRace(race);
}

export function inferActionFromCommand(command: any): string {
  if (command.data?.order) {
    if (command.data.order === 30) return 'Build';
    if ([4, 5, 6, 10, 11, 12].includes(command.data.order)) return 'Train';
    if ([25, 26, 27, 28, 29].includes(command.data.order)) return 'Research';
  }
  
  if (command.type?.toLowerCase().includes('train')) return 'Train';
  if (command.type?.toLowerCase().includes('build')) return 'Build';
  if (command.type?.toLowerCase().includes('research')) return 'Research';
  
  return 'Build'; // Default
}

export function categorizeUnit(unitName: string, actionType: string): string {
  const raceData = Object.values(PROFESSIONAL_UNIT_DATABASE).flat();
  
  for (const race of Object.values(PROFESSIONAL_UNIT_DATABASE)) {
    if (race[unitName]) {
      return race[unitName].category;
    }
  }
  
  // Fallback categorization
  if (actionType === 'Research' || actionType === 'Upgrade') return 'tech';
  if (unitName.toLowerCase().includes('depot') || 
      unitName.toLowerCase().includes('pylon') || 
      unitName.toLowerCase().includes('overlord')) return 'supply';
  
  return 'military';
}

export function getUnitCost(unitName: string, race: string): { minerals: number; gas: number; supply: number } {
  const raceData = PROFESSIONAL_UNIT_DATABASE[race.toLowerCase()];
  
  if (raceData && raceData[unitName]) {
    return raceData[unitName].cost;
  }
  
  // Fallback costs
  return { minerals: 100, gas: 0, supply: 1 };
}

export function calculateBuildEfficiency(frame: number, unitName: string, race: string): number {
  const gameMinutes = frame / (24 * 60);
  const raceData = PROFESSIONAL_UNIT_DATABASE[race.toLowerCase()];
  
  if (!raceData || !raceData[unitName]) return 75;
  
  const unitData = raceData[unitName];
  
  // Efficiency based on timing benchmarks
  if (unitData.category === 'economy') {
    // Workers should be constant
    if (gameMinutes < 1) return 95;
    if (gameMinutes < 3) return 90;
    return 85;
  }
  
  if (unitData.category === 'supply') {
    // Supply providers should be early
    if (gameMinutes < 2) return 95;
    if (gameMinutes < 5) return 85;
    return 70;
  }
  
  if (unitData.category === 'military') {
    // Military units timing varies
    if (gameMinutes < 4) return 80; // Early aggression
    if (gameMinutes < 8) return 90; // Mid game
    return 85; // Late game
  }
  
  return 80; // Tech/other
}

export function getStartingSupplyForRace(race: string): number {
  switch (race.toLowerCase()) {
    case 'protoss': return 9;
    case 'terran': return 10;
    case 'zerg': return 9;
    default: return 9;
  }
}

export function getStartingSupplyUsedForRace(race: string): number {
  return 4; // All races start with 4 workers
}

export function isSupplyProvider(unitName: string): boolean {
  const supplyProviders = ['Pylon', 'Supply Depot', 'Overlord'];
  return supplyProviders.includes(unitName);
}

export function getSupplyProvided(unitName: string): number {
  if (unitName === 'Pylon' || unitName === 'Supply Depot' || unitName === 'Overlord') {
    return 8;
  }
  if (unitName === 'Nexus') return 9;
  if (unitName === 'Command Center') return 10;
  if (unitName === 'Hatchery') return 1;
  return 0;
}

export function getTimingPhase(frame: number): string {
  const minutes = frame / (24 * 60);
  if (minutes < 2) return 'opening';
  if (minutes < 5) return 'early';
  if (minutes < 10) return 'mid';
  return 'late';
}

export function getStrategicPriority(unitName: string, category: string): string {
  if (category === 'economy' || isSupplyProvider(unitName)) return 'essential';
  if (category === 'military') return 'important';
  if (category === 'tech') return 'situational';
  return 'important';
}

export function getUnitPurpose(unitName: string, category: string): string {
  switch (category) {
    case 'economy': return 'Economic development and resource gathering';
    case 'military': return 'Combat and territorial control';
    case 'tech': return 'Technology advancement and upgrades';
    case 'supply': return 'Population capacity management';
    case 'defense': return 'Base protection and security';
    default: return 'Strategic development';
  }
}

// Helper functions for command parsing
function mapUnitTypeToName(unitType: number, race: string): string {
  // Unit type ID mapping - would need to be expanded with real SC:R data
  const unitMappings = {
    protoss: {
      64: 'Probe',
      65: 'Zealot',
      66: 'Dragoon',
      67: 'High Templar',
      68: 'Archon',
      69: 'Shuttle',
      70: 'Scout',
      71: 'Arbiter',
      72: 'Carrier',
      73: 'Interceptor',
      74: 'Dark Templar',
      75: 'Reaver',
      76: 'Observer',
      77: 'Scarab',
      78: 'Corsair'
    },
    terran: {
      0: 'Marine',
      1: 'Ghost',
      2: 'Vulture', 
      3: 'Goliath',
      4: 'Tank',
      5: 'Wraith',
      6: 'Dropship',
      7: 'Battlecruiser',
      8: 'Nuclear Missile',
      9: 'Firebat',
      10: 'Science Vessel',
      11: 'Medic',
      12: 'Valkyrie'
    },
    zerg: {
      37: 'Zergling',
      38: 'Hydralisk',
      39: 'Ultralisk', 
      40: 'Broodling',
      41: 'Mutalisk',
      42: 'Guardian',
      43: 'Queen',
      44: 'Defiler',
      45: 'Scourge',
      46: 'Torrasque',
      47: 'Mature Chrysalis',
      48: 'Cerebrate',
      49: 'Daggoth',
      50: 'Overlord',
      51: 'Larva',
      52: 'Egg',
      53: 'Lurker',
      54: 'Lurker Egg'
    }
  };
  
  const raceMapping = unitMappings[race.toLowerCase()];
  if (raceMapping && raceMapping[unitType]) {
    return raceMapping[unitType];
  }
  
  return `Unit_${unitType}`;
}

function inferUnitFromCommandID(commandID: number, race: string, frame: number): string {
  // Basic command ID inference - would need expansion with real data
  const gameMinutes = frame / (24 * 60);
  
  // Early game units by race
  if (gameMinutes < 3) {
    switch (race.toLowerCase()) {
      case 'protoss': return ['Probe', 'Pylon', 'Gateway'][commandID % 3];
      case 'terran': return ['SCV', 'Supply Depot', 'Barracks'][commandID % 3];
      case 'zerg': return ['Drone', 'Overlord', 'Spawning Pool'][commandID % 3];
    }
  }
  
  return getGenericUnitForRace(race);
}

function getGenericUnitForRace(race: string): string {
  switch (race.toLowerCase()) {
    case 'protoss': return 'Zealot';
    case 'terran': return 'Marine';
    case 'zerg': return 'Zergling';
    default: return 'Unit';
  }
}