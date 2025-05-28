
/**
 * Complete Command ID to Unit/Building Name Mapping for all three races
 * Based on StarCraft: Brood War unit/building IDs
 */

export interface UnitInfo {
  name: string;
  race: 'Protoss' | 'Terran' | 'Zerg';
  type: 'unit' | 'building' | 'tech' | 'upgrade';
  supplyCost?: number;
  mineralCost?: number;
  gasCost?: number;
}

export const commandIdToUnitInfo: Record<number, UnitInfo> = {
  // Protoss Units
  64: { name: "Probe", race: "Protoss", type: "unit", supplyCost: 1, mineralCost: 50 },
  65: { name: "Zealot", race: "Protoss", type: "unit", supplyCost: 2, mineralCost: 100 },
  66: { name: "Dragoon", race: "Protoss", type: "unit", supplyCost: 2, mineralCost: 125, gasCost: 50 },
  67: { name: "High Templar", race: "Protoss", type: "unit", supplyCost: 2, mineralCost: 50, gasCost: 150 },
  68: { name: "Dark Templar", race: "Protoss", type: "unit", supplyCost: 2, mineralCost: 125, gasCost: 100 },
  69: { name: "Archon", race: "Protoss", type: "unit", supplyCost: 4, mineralCost: 0 },
  70: { name: "Shuttle", race: "Protoss", type: "unit", supplyCost: 2, mineralCost: 200 },
  71: { name: "Scout", race: "Protoss", type: "unit", supplyCost: 3, mineralCost: 275, gasCost: 125 },
  72: { name: "Arbiter", race: "Protoss", type: "unit", supplyCost: 4, mineralCost: 100, gasCost: 350 },
  73: { name: "Carrier", race: "Protoss", type: "unit", supplyCost: 6, mineralCost: 350, gasCost: 250 },
  74: { name: "Interceptor", race: "Protoss", type: "unit", supplyCost: 0, mineralCost: 25 },
  75: { name: "Reaver", race: "Protoss", type: "unit", supplyCost: 4, mineralCost: 200, gasCost: 100 },
  80: { name: "Observer", race: "Protoss", type: "unit", supplyCost: 1, mineralCost: 25, gasCost: 75 },
  81: { name: "Corsair", race: "Protoss", type: "unit", supplyCost: 2, mineralCost: 150, gasCost: 100 },

  // Protoss Buildings
  154: { name: "Nexus", race: "Protoss", type: "building", mineralCost: 400 },
  155: { name: "Robotics Facility", race: "Protoss", type: "building", mineralCost: 200, gasCost: 200 },
  156: { name: "Pylon", race: "Protoss", type: "building", mineralCost: 100 },
  157: { name: "Assimilator", race: "Protoss", type: "building", mineralCost: 100 },
  158: { name: "Observatory", race: "Protoss", type: "building", mineralCost: 50, gasCost: 100 },
  159: { name: "Gateway", race: "Protoss", type: "building", mineralCost: 150 },
  160: { name: "Photon Cannon", race: "Protoss", type: "building", mineralCost: 150 },
  161: { name: "Citadel of Adun", race: "Protoss", type: "building", mineralCost: 150, gasCost: 100 },
  162: { name: "Cybernetics Core", race: "Protoss", type: "building", mineralCost: 200 },
  163: { name: "Templar Archives", race: "Protoss", type: "building", mineralCost: 150, gasCost: 200 },
  164: { name: "Forge", race: "Protoss", type: "building", mineralCost: 150 },
  165: { name: "Stargate", race: "Protoss", type: "building", mineralCost: 150, gasCost: 150 },
  166: { name: "Fleet Beacon", race: "Protoss", type: "building", mineralCost: 300, gasCost: 200 },
  167: { name: "Arbiter Tribunal", race: "Protoss", type: "building", mineralCost: 200, gasCost: 150 },
  168: { name: "Robotics Support Bay", race: "Protoss", type: "building", mineralCost: 150, gasCost: 100 },
  169: { name: "Shield Battery", race: "Protoss", type: "building", mineralCost: 100 },

  // Terran Units  
  0: { name: "Marine", race: "Terran", type: "unit", supplyCost: 1, mineralCost: 50 },
  1: { name: "Ghost", race: "Terran", type: "unit", supplyCost: 1, mineralCost: 25, gasCost: 75 },
  2: { name: "Vulture", race: "Terran", type: "unit", supplyCost: 2, mineralCost: 75 },
  3: { name: "Goliath", race: "Terran", type: "unit", supplyCost: 2, mineralCost: 100, gasCost: 50 },
  4: { name: "Goliath Turret", race: "Terran", type: "unit", supplyCost: 0 },
  5: { name: "Siege Tank", race: "Terran", type: "unit", supplyCost: 2, mineralCost: 150, gasCost: 100 },
  6: { name: "Siege Tank Turret", race: "Terran", type: "unit", supplyCost: 0 },
  7: { name: "SCV", race: "Terran", type: "unit", supplyCost: 1, mineralCost: 50 },
  8: { name: "Wraith", race: "Terran", type: "unit", supplyCost: 2, mineralCost: 150, gasCost: 100 },
  9: { name: "Science Vessel", race: "Terran", type: "unit", supplyCost: 2, mineralCost: 100, gasCost: 225 },
  11: { name: "Dropship", race: "Terran", type: "unit", supplyCost: 2, mineralCost: 100, gasCost: 100 },
  12: { name: "Battlecruiser", race: "Terran", type: "unit", supplyCost: 6, mineralCost: 400, gasCost: 300 },
  32: { name: "Firebat", race: "Terran", type: "unit", supplyCost: 1, mineralCost: 50, gasCost: 25 },
  58: { name: "Valkyrie", race: "Terran", type: "unit", supplyCost: 3, mineralCost: 250, gasCost: 125 },
  34: { name: "Medic", race: "Terran", type: "unit", supplyCost: 1, mineralCost: 50, gasCost: 25 },

  // Terran Buildings
  106: { name: "Command Center", race: "Terran", type: "building", mineralCost: 400 },
  107: { name: "Comsat Station", race: "Terran", type: "building", mineralCost: 50, gasCost: 50 },
  108: { name: "Nuclear Silo", race: "Terran", type: "building", mineralCost: 100, gasCost: 100 },
  109: { name: "Supply Depot", race: "Terran", type: "building", mineralCost: 100 },
  110: { name: "Refinery", race: "Terran", type: "building", mineralCost: 100 },
  111: { name: "Barracks", race: "Terran", type: "building", mineralCost: 150 },
  112: { name: "Academy", race: "Terran", type: "building", mineralCost: 150 },
  113: { name: "Factory", race: "Terran", type: "building", mineralCost: 200, gasCost: 100 },
  114: { name: "Starport", race: "Terran", type: "building", mineralCost: 150, gasCost: 100 },
  115: { name: "Control Tower", race: "Terran", type: "building", mineralCost: 50, gasCost: 50 },
  116: { name: "Science Facility", race: "Terran", type: "building", mineralCost: 100, gasCost: 150 },
  117: { name: "Covert Ops", race: "Terran", type: "building", mineralCost: 50, gasCost: 50 },
  118: { name: "Physics Lab", race: "Terran", type: "building", mineralCost: 50, gasCost: 50 },
  119: { name: "Machine Shop", race: "Terran", type: "building", mineralCost: 50, gasCost: 50 },
  120: { name: "Repair Bay", race: "Terran", type: "building", mineralCost: 100, gasCost: 100 },
  125: { name: "Engineering Bay", race: "Terran", type: "building", mineralCost: 125 },
  126: { name: "Armory", race: "Terran", type: "building", mineralCost: 100, gasCost: 50 },
  127: { name: "Missile Turret", race: "Terran", type: "building", mineralCost: 100 },
  128: { name: "Bunker", race: "Terran", type: "building", mineralCost: 100 },

  // Zerg Units
  37: { name: "Zergling", race: "Zerg", type: "unit", supplyCost: 1, mineralCost: 50 },
  38: { name: "Hydralisk", race: "Zerg", type: "unit", supplyCost: 1, mineralCost: 75, gasCost: 25 },
  39: { name: "Ultralisk", race: "Zerg", type: "unit", supplyCost: 4, mineralCost: 200, gasCost: 200 },
  40: { name: "Broodling", race: "Zerg", type: "unit", supplyCost: 0 },
  41: { name: "Mutalisk", race: "Zerg", type: "unit", supplyCost: 2, mineralCost: 100, gasCost: 100 },
  42: { name: "Guardian", race: "Zerg", type: "unit", supplyCost: 2, mineralCost: 50, gasCost: 100 },
  43: { name: "Queen", race: "Zerg", type: "unit", supplyCost: 2, mineralCost: 100, gasCost: 100 },
  44: { name: "Defiler", race: "Zerg", type: "unit", supplyCost: 2, mineralCost: 50, gasCost: 150 },
  45: { name: "Scourge", race: "Zerg", type: "unit", supplyCost: 1, mineralCost: 25, gasCost: 75 },
  46: { name: "Drone", race: "Zerg", type: "unit", supplyCost: 1, mineralCost: 50 },
  47: { name: "Overlord", race: "Zerg", type: "unit", supplyCost: 0, mineralCost: 100 },
  48: { name: "Larva", race: "Zerg", type: "unit", supplyCost: 0 },
  103: { name: "Lurker", race: "Zerg", type: "unit", supplyCost: 2, mineralCost: 0, gasCost: 50 },
  62: { name: "Devourer", race: "Zerg", type: "unit", supplyCost: 2, mineralCost: 150, gasCost: 50 },

  // Zerg Buildings
  131: { name: "Hatchery", race: "Zerg", type: "building", mineralCost: 300 },
  132: { name: "Lair", race: "Zerg", type: "building", mineralCost: 150, gasCost: 100 },
  133: { name: "Hive", race: "Zerg", type: "building", mineralCost: 200, gasCost: 150 },
  134: { name: "Nydus Canal", race: "Zerg", type: "building", mineralCost: 150 },
  135: { name: "Hydralisk Den", race: "Zerg", type: "building", mineralCost: 100, gasCost: 50 },
  136: { name: "Defiler Mound", race: "Zerg", type: "building", mineralCost: 100, gasCost: 100 },
  137: { name: "Greater Spire", race: "Zerg", type: "building", mineralCost: 100, gasCost: 150 },
  138: { name: "Queen's Nest", race: "Zerg", type: "building", mineralCost: 150, gasCost: 100 },
  139: { name: "Evolution Chamber", race: "Zerg", type: "building", mineralCost: 75 },
  140: { name: "Ultralisk Cavern", race: "Zerg", type: "building", mineralCost: 150, gasCost: 200 },
  141: { name: "Spire", race: "Zerg", type: "building", mineralCost: 200, gasCost: 150 },
  142: { name: "Spawning Pool", race: "Zerg", type: "building", mineralCost: 200 },
  143: { name: "Creep Colony", race: "Zerg", type: "building", mineralCost: 75 },
  144: { name: "Spore Colony", race: "Zerg", type: "building", mineralCost: 50 },
  145: { name: "Sunken Colony", race: "Zerg", type: "building", mineralCost: 50 },
  149: { name: "Extractor", race: "Zerg", type: "building", mineralCost: 50 }
};

export const commandIdToUnitName: Record<number, string> = Object.fromEntries(
  Object.entries(commandIdToUnitInfo).map(([id, info]) => [id, info.name])
);

export function getUnitInfo(unitId: number): UnitInfo | null {
  return commandIdToUnitInfo[unitId] || null;
}

export function getUnitName(unitId: number): string {
  return commandIdToUnitName[unitId] || `Unit_${unitId}`;
}

export function detectRaceFromBuildOrder(actions: any[]): 'Protoss' | 'Terran' | 'Zerg' | 'Unknown' {
  const raceIndicators = new Map<string, number>();
  
  for (const action of actions.slice(0, 10)) {
    if (action.parameters?.unitTypeId) {
      const unitInfo = getUnitInfo(action.parameters.unitTypeId);
      if (unitInfo) {
        raceIndicators.set(unitInfo.race, (raceIndicators.get(unitInfo.race) || 0) + 1);
      }
    }
  }
  
  let maxCount = 0;
  let detectedRace: 'Protoss' | 'Terran' | 'Zerg' | 'Unknown' = 'Unknown';
  
  for (const [race, count] of raceIndicators) {
    if (count > maxCount) {
      maxCount = count;
      detectedRace = race as 'Protoss' | 'Terran' | 'Zerg';
    }
  }
  
  return detectedRace;
}

export function categorizeAction(commandType: number, unitId?: number): 'build' | 'train' | 'tech' | 'micro' | 'macro' | 'other' {
  // Build commands
  if ([0x0C, 0x34].includes(commandType)) {
    return 'build';
  }
  
  // Train commands
  if ([0x1D, 0x21].includes(commandType)) {
    return 'train';
  }
  
  // Tech/Research commands
  if ([0x2F, 0x31].includes(commandType)) {
    return 'tech';
  }
  
  // Micro commands
  if ([0x14, 0x15, 0x18, 0x2A, 0x2B, 0x2C].includes(commandType)) {
    return 'micro';
  }
  
  // Macro selection/hotkeys
  if ([0x09, 0x0A, 0x13].includes(commandType)) {
    return 'macro';
  }
  
  return 'other';
}
