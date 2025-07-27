/**
 * StarCraft: Remastered Unit Database
 * Vollständige Mapping von Unit-IDs zu echten SC-Einheiten
 */

export interface SCUnit {
  id: number;
  name: string;
  race: 'protoss' | 'terran' | 'zerg';
  category: 'building' | 'unit' | 'upgrade' | 'tech';
  cost: {
    minerals: number;
    gas: number;
    supply: number;
  };
  buildTime: number; // in frames
  requiresBuilding?: string[];
}

// StarCraft: Remastered Unit Database
export const SC_UNITS: Record<number, SCUnit> = {
  // TERRAN BUILDINGS
  0x6A: { id: 0x6A, name: 'Command Center', race: 'terran', category: 'building', cost: { minerals: 400, gas: 0, supply: 0 }, buildTime: 1800 },
  0x6B: { id: 0x6B, name: 'Supply Depot', race: 'terran', category: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 600 },
  0x6C: { id: 0x6C, name: 'Refinery', race: 'terran', category: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 600 },
  0x6D: { id: 0x6D, name: 'Barracks', race: 'terran', category: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 1200 },
  0x6E: { id: 0x6E, name: 'Academy', race: 'terran', category: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 1200 },
  0x6F: { id: 0x6F, name: 'Factory', race: 'terran', category: 'building', cost: { minerals: 200, gas: 100, supply: 0 }, buildTime: 1200 },
  0x70: { id: 0x70, name: 'Starport', race: 'terran', category: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 1050 },
  0x71: { id: 0x71, name: 'Control Tower', race: 'terran', category: 'building', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 600 },
  0x72: { id: 0x72, name: 'Science Facility', race: 'terran', category: 'building', cost: { minerals: 100, gas: 150, supply: 0 }, buildTime: 900 },
  0x73: { id: 0x73, name: 'Covert Ops', race: 'terran', category: 'building', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 600 },
  0x74: { id: 0x74, name: 'Physics Lab', race: 'terran', category: 'building', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 600 },
  0x75: { id: 0x75, name: 'Machine Shop', race: 'terran', category: 'building', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 600 },
  0x76: { id: 0x76, name: 'Engineering Bay', race: 'terran', category: 'building', cost: { minerals: 125, gas: 0, supply: 0 }, buildTime: 900 },
  0x77: { id: 0x77, name: 'Armory', race: 'terran', category: 'building', cost: { minerals: 100, gas: 50, supply: 0 }, buildTime: 900 },
  0x78: { id: 0x78, name: 'Missile Turret', race: 'terran', category: 'building', cost: { minerals: 75, gas: 0, supply: 0 }, buildTime: 450 },
  0x79: { id: 0x79, name: 'Bunker', race: 'terran', category: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 450 },

  // TERRAN UNITS
  0x00: { id: 0x00, name: 'Marine', race: 'terran', category: 'unit', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 360 },
  0x01: { id: 0x01, name: 'Ghost', race: 'terran', category: 'unit', cost: { minerals: 25, gas: 75, supply: 1 }, buildTime: 750 },
  0x02: { id: 0x02, name: 'Vulture', race: 'terran', category: 'unit', cost: { minerals: 75, gas: 0, supply: 2 }, buildTime: 450 },
  0x03: { id: 0x03, name: 'Goliath', race: 'terran', category: 'unit', cost: { minerals: 100, gas: 50, supply: 2 }, buildTime: 600 },
  0x05: { id: 0x05, name: 'Siege Tank', race: 'terran', category: 'unit', cost: { minerals: 150, gas: 100, supply: 2 }, buildTime: 750 },
  0x07: { id: 0x07, name: 'SCV', race: 'terran', category: 'unit', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 300 },
  0x08: { id: 0x08, name: 'Wraith', race: 'terran', category: 'unit', cost: { minerals: 150, gas: 100, supply: 2 }, buildTime: 900 },
  0x09: { id: 0x09, name: 'Science Vessel', race: 'terran', category: 'unit', cost: { minerals: 100, gas: 225, supply: 2 }, buildTime: 1200 },
  0x0B: { id: 0x0B, name: 'Dropship', race: 'terran', category: 'unit', cost: { minerals: 100, gas: 100, supply: 2 }, buildTime: 750 },
  0x0C: { id: 0x0C, name: 'Battlecruiser', race: 'terran', category: 'unit', cost: { minerals: 400, gas: 300, supply: 6 }, buildTime: 2000 },
  0x20: { id: 0x20, name: 'Firebat', race: 'terran', category: 'unit', cost: { minerals: 50, gas: 25, supply: 1 }, buildTime: 360 },
  0x21: { id: 0x21, name: 'Medic', race: 'terran', category: 'unit', cost: { minerals: 50, gas: 25, supply: 1 }, buildTime: 450 },
  0x22: { id: 0x22, name: 'Valkyrie', race: 'terran', category: 'unit', cost: { minerals: 250, gas: 125, supply: 3 }, buildTime: 750 },

  // PROTOSS BUILDINGS
  0x9A: { id: 0x9A, name: 'Nexus', race: 'protoss', category: 'building', cost: { minerals: 400, gas: 0, supply: 0 }, buildTime: 1800 },
  0x9B: { id: 0x9B, name: 'Robotics Facility', race: 'protoss', category: 'building', cost: { minerals: 200, gas: 200, supply: 0 }, buildTime: 1200 },
  0x9C: { id: 0x9C, name: 'Pylon', race: 'protoss', category: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 450 },
  0x9D: { id: 0x9D, name: 'Assimilator', race: 'protoss', category: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 600 },
  0x9E: { id: 0x9E, name: 'Observatory', race: 'protoss', category: 'building', cost: { minerals: 50, gas: 100, supply: 0 }, buildTime: 450 },
  0x9F: { id: 0x9F, name: 'Gateway', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 900 },
  0xA0: { id: 0xA0, name: 'Photon Cannon', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 750 },
  0xA1: { id: 0xA1, name: 'Citadel of Adun', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 900 },
  0xA2: { id: 0xA2, name: 'Cybernetics Core', race: 'protoss', category: 'building', cost: { minerals: 200, gas: 0, supply: 0 }, buildTime: 750 },
  0xA3: { id: 0xA3, name: 'Templar Archives', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 200, supply: 0 }, buildTime: 900 },
  0xA4: { id: 0xA4, name: 'Forge', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 600 },
  0xA5: { id: 0xA5, name: 'Stargate', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 150, supply: 0 }, buildTime: 1050 },
  0xA7: { id: 0xA7, name: 'Fleet Beacon', race: 'protoss', category: 'building', cost: { minerals: 300, gas: 200, supply: 0 }, buildTime: 900 },
  0xA8: { id: 0xA8, name: 'Arbiter Tribunal', race: 'protoss', category: 'building', cost: { minerals: 200, gas: 150, supply: 0 }, buildTime: 900 },
  0xA9: { id: 0xA9, name: 'Robotics Support Bay', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 450 },
  0xAA: { id: 0xAA, name: 'Shield Battery', race: 'protoss', category: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 450 },

  // PROTOSS UNITS
  0x40: { id: 0x40, name: 'Probe', race: 'protoss', category: 'unit', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 300 },
  0x41: { id: 0x41, name: 'Zealot', race: 'protoss', category: 'unit', cost: { minerals: 100, gas: 0, supply: 2 }, buildTime: 600 },
  0x42: { id: 0x42, name: 'Dragoon', race: 'protoss', category: 'unit', cost: { minerals: 125, gas: 50, supply: 2 }, buildTime: 750 },
  0x43: { id: 0x43, name: 'High Templar', race: 'protoss', category: 'unit', cost: { minerals: 50, gas: 150, supply: 2 }, buildTime: 750 },
  0x44: { id: 0x44, name: 'Archon', race: 'protoss', category: 'unit', cost: { minerals: 0, gas: 0, supply: 4 }, buildTime: 300 },
  0x45: { id: 0x45, name: 'Shuttle', race: 'protoss', category: 'unit', cost: { minerals: 200, gas: 0, supply: 2 }, buildTime: 900 },
  0x46: { id: 0x46, name: 'Scout', race: 'protoss', category: 'unit', cost: { minerals: 275, gas: 125, supply: 3 }, buildTime: 1200 },
  0x47: { id: 0x47, name: 'Arbiter', race: 'protoss', category: 'unit', cost: { minerals: 100, gas: 350, supply: 4 }, buildTime: 2400 },
  0x48: { id: 0x48, name: 'Carrier', race: 'protoss', category: 'unit', cost: { minerals: 350, gas: 250, supply: 6 }, buildTime: 2100 },
  0x53: { id: 0x53, name: 'Reaver', race: 'protoss', category: 'unit', cost: { minerals: 200, gas: 100, supply: 4 }, buildTime: 1050 },
  0x54: { id: 0x54, name: 'Observer', race: 'protoss', category: 'unit', cost: { minerals: 25, gas: 75, supply: 1 }, buildTime: 600 },
  0x61: { id: 0x61, name: 'Dark Templar', race: 'protoss', category: 'unit', cost: { minerals: 125, gas: 100, supply: 2 }, buildTime: 750 },
  0x63: { id: 0x63, name: 'Dark Archon', race: 'protoss', category: 'unit', cost: { minerals: 0, gas: 0, supply: 4 }, buildTime: 300 },
  0x64: { id: 0x64, name: 'Corsair', race: 'protoss', category: 'unit', cost: { minerals: 150, gas: 100, supply: 2 }, buildTime: 600 },

  // ZERG BUILDINGS
  0x82: { id: 0x82, name: 'Hatchery', race: 'zerg', category: 'building', cost: { minerals: 300, gas: 0, supply: 0 }, buildTime: 1800 },
  0x83: { id: 0x83, name: 'Lair', race: 'zerg', category: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 1500 },
  0x84: { id: 0x84, name: 'Hive', race: 'zerg', category: 'building', cost: { minerals: 200, gas: 150, supply: 0 }, buildTime: 1800 },
  0x85: { id: 0x85, name: 'Nydus Canal', race: 'zerg', category: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 600 },
  0x86: { id: 0x86, name: 'Hydralisk Den', race: 'zerg', category: 'building', cost: { minerals: 100, gas: 50, supply: 0 }, buildTime: 600 },
  0x87: { id: 0x87, name: 'Defiler Mound', race: 'zerg', category: 'building', cost: { minerals: 100, gas: 100, supply: 0 }, buildTime: 900 },
  0x88: { id: 0x88, name: 'Greater Spire', race: 'zerg', category: 'building', cost: { minerals: 100, gas: 150, supply: 0 }, buildTime: 1800 },
  0x89: { id: 0x89, name: "Queen's Nest", race: 'zerg', category: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 900 },
  0x8A: { id: 0x8A, name: 'Evolution Chamber', race: 'zerg', category: 'building', cost: { minerals: 75, gas: 0, supply: 0 }, buildTime: 600 },
  0x8B: { id: 0x8B, name: 'Ultralisk Cavern', race: 'zerg', category: 'building', cost: { minerals: 150, gas: 200, supply: 0 }, buildTime: 1200 },
  0x8C: { id: 0x8C, name: 'Spire', race: 'zerg', category: 'building', cost: { minerals: 200, gas: 150, supply: 0 }, buildTime: 1800 },
  0x8D: { id: 0x8D, name: 'Spawning Pool', race: 'zerg', category: 'building', cost: { minerals: 200, gas: 0, supply: 0 }, buildTime: 1200 },
  0x8E: { id: 0x8E, name: 'Creep Colony', race: 'zerg', category: 'building', cost: { minerals: 75, gas: 0, supply: 0 }, buildTime: 300 },
  0x8F: { id: 0x8F, name: 'Spore Colony', race: 'zerg', category: 'building', cost: { minerals: 50, gas: 0, supply: 0 }, buildTime: 450 },
  0x90: { id: 0x90, name: 'Sunken Colony', race: 'zerg', category: 'building', cost: { minerals: 50, gas: 0, supply: 0 }, buildTime: 450 },
  0x91: { id: 0x91, name: 'Extractor', race: 'zerg', category: 'building', cost: { minerals: 50, gas: 0, supply: 0 }, buildTime: 600 },

  // ZERG UNITS
  0x25: { id: 0x25, name: 'Drone', race: 'zerg', category: 'unit', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 300 },
  0x26: { id: 0x26, name: 'Zergling', race: 'zerg', category: 'unit', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 420 },
  0x27: { id: 0x27, name: 'Hydralisk', race: 'zerg', category: 'unit', cost: { minerals: 75, gas: 25, supply: 1 }, buildTime: 420 },
  0x28: { id: 0x28, name: 'Ultralisk', race: 'zerg', category: 'unit', cost: { minerals: 200, gas: 200, supply: 4 }, buildTime: 900 },
  0x29: { id: 0x29, name: 'Broodling', race: 'zerg', category: 'unit', cost: { minerals: 0, gas: 0, supply: 0 }, buildTime: 0 },
  0x2A: { id: 0x2A, name: 'Overlord', race: 'zerg', category: 'unit', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 600 },
  0x2B: { id: 0x2B, name: 'Mutalisk', race: 'zerg', category: 'unit', cost: { minerals: 100, gas: 100, supply: 2 }, buildTime: 600 },
  0x2C: { id: 0x2C, name: 'Guardian', race: 'zerg', category: 'unit', cost: { minerals: 50, gas: 100, supply: 2 }, buildTime: 600 },
  0x2D: { id: 0x2D, name: 'Queen', race: 'zerg', category: 'unit', cost: { minerals: 100, gas: 100, supply: 2 }, buildTime: 750 },
  0x2E: { id: 0x2E, name: 'Defiler', race: 'zerg', category: 'unit', cost: { minerals: 50, gas: 150, supply: 2 }, buildTime: 750 },
  0x2F: { id: 0x2F, name: 'Scourge', race: 'zerg', category: 'unit', cost: { minerals: 25, gas: 75, supply: 1 }, buildTime: 450 },
  0x67: { id: 0x67, name: 'Lurker', race: 'zerg', category: 'unit', cost: { minerals: 50, gas: 100, supply: 2 }, buildTime: 600 },
  0x68: { id: 0x68, name: 'Devourer', race: 'zerg', category: 'unit', cost: { minerals: 50, gas: 100, supply: 2 }, buildTime: 600 }
};

// Command Type Mappings
export const COMMAND_TYPES: Record<string, string> = {
  'TypeIDSelect121': 'Select',
  'TypeIDTrain122': 'Train',
  'TypeIDBuild123': 'Build',
  'TypeIDStop124': 'Stop',
  'TypeIDMove125': 'Move',
  'TypeIDAttack126': 'Attack',
  'TypeIDAttackMove127': 'Attack Move',
  'TypeIDAttackUnit128': 'Attack Unit',
  'TypeIDRightClick129': 'Right Click',
  'TypeIDHoldPosition130': 'Hold Position',
  'TypeIDPatrol131': 'Patrol',
  'TypeIDReturn132': 'Return Cargo',
  'TypeIDResearch133': 'Research',
  'TypeIDUpgrade134': 'Upgrade',
  'TypeIDCancel135': 'Cancel',
  'TypeIDCancelTrain136': 'Cancel Train',
  'TypeIDCancelUpgrade137': 'Cancel Upgrade',
  'TypeIDCancelResearch138': 'Cancel Research',
  'TypeIDCancelAddon139': 'Cancel Addon',
  'TypeIDCancelConstruction140': 'Cancel Construction',
  'TypeIDUnloadAll141': 'Unload All',
  'TypeIDUnload142': 'Unload',
  'TypeIDMergeArchon143': 'Merge Archon',
  'TypeIDUseStimPack144': 'Stim Pack',
  'TypeIDSiegeTank145': 'Siege Mode',
  'TypeIDDefensiveMatrix146': 'Defensive Matrix',
  'TypeIDIrradiate147': 'Irradiate',
  'TypeIDYamatoGun148': 'Yamato Gun',
  'TypeIDCloakingField149': 'Cloaking Field',
  'TypeIDPersonnelCloaking150': 'Personnel Cloaking',
  'TypeIDBurrowing151': 'Burrow',
  'TypeIDUnburrowing152': 'Unburrow',
  'TypeIDCancelNuke153': 'Cancel Nuke',
  'TypeIDLiftOff154': 'Lift Off',
  'TypeIDLanding155': 'Land',
  'TypeIDLoadUnit156': 'Load',
  'TypeIDSetRallyPoint157': 'Set Rally Point',
  'TypeIDSetRallyUnit158': 'Set Rally Unit',
  'TypeIDRepair159': 'Repair',
  'TypeIDFollow160': 'Follow',
  'TypeIDGather161': 'Gather',
  'TypeIDReturnCargo162': 'Return Cargo',
  'TypeIDUseTech163': 'Use Tech',
  'TypeIDOrderNothing164': 'Order Nothing'
};

export function getUnitById(unitId: number): SCUnit | undefined {
  return SC_UNITS[unitId];
}

export function getUnitsByRace(race: 'protoss' | 'terran' | 'zerg'): SCUnit[] {
  return Object.values(SC_UNITS).filter(unit => unit.race === race);
}

export function getCommandTypeName(typeName: string): string {
  return COMMAND_TYPES[typeName] || typeName || 'Unknown';
}