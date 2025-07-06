/**
 * StarCraft: Remastered Unit Database
 * Complete mappings for unit IDs, names, costs, and build orders
 * Based on official StarCraft data and screp documentation
 */

export interface UnitData {
  id: number;
  name: string;
  race: 'Terran' | 'Protoss' | 'Zerg' | 'Neutral';
  type: 'unit' | 'building' | 'upgrade' | 'tech';
  cost: {
    minerals: number;
    gas: number;
    supply: number;
  };
  buildTime: number;
  prerequisites?: string[];
}

export interface CommandTypeData {
  id: number;
  name: string;
  effective: boolean;
  category: 'build' | 'train' | 'research' | 'upgrade' | 'move' | 'attack' | 'select' | 'other';
}

// StarCraft Command Types - Based on screp documentation
export const COMMAND_TYPES: Record<number, CommandTypeData> = {
  // Frame sync commands (not effective)
  0x00: { id: 0x00, name: 'Frame Sync', effective: false, category: 'other' },
  0x01: { id: 0x01, name: 'Frame Skip 1', effective: false, category: 'other' },
  0x02: { id: 0x02, name: 'Frame Skip 2', effective: false, category: 'other' },
  0x03: { id: 0x03, name: 'Frame Skip 4', effective: false, category: 'other' },

  // Selection commands
  0x09: { id: 0x09, name: 'Select', effective: true, category: 'select' },
  0x0A: { id: 0x0A, name: 'Shift Select', effective: true, category: 'select' },
  0x0B: { id: 0x0B, name: 'Shift Deselect', effective: true, category: 'select' },

  // Critical Build/Train commands
  0x0C: { id: 0x0C, name: 'Build', effective: true, category: 'build' },
  0x1E: { id: 0x1E, name: 'Train', effective: true, category: 'train' },
  0x2F: { id: 0x2F, name: 'Research', effective: true, category: 'research' },
  0x31: { id: 0x31, name: 'Upgrade', effective: true, category: 'upgrade' },

  // Movement and action commands
  0x14: { id: 0x14, name: 'Move', effective: true, category: 'move' },
  0x15: { id: 0x15, name: 'Attack', effective: true, category: 'attack' },
  0x17: { id: 0x17, name: 'Right Click', effective: false, category: 'other' },

  // Hotkey management
  0x13: { id: 0x13, name: 'Hotkey', effective: true, category: 'other' },

  // UI/Non-effective commands
  0x0D: { id: 0x0D, name: 'Vision', effective: false, category: 'other' },
  0x0F: { id: 0x0F, name: 'Game Speed', effective: false, category: 'other' },
  0x10: { id: 0x10, name: 'Pause', effective: false, category: 'other' },
  0x11: { id: 0x11, name: 'Resume', effective: false, category: 'other' },

  // Communication
  0x4B: { id: 0x4B, name: 'Chat', effective: false, category: 'other' },
  0x5B: { id: 0x5B, name: 'Chat To Allies', effective: false, category: 'other' },
  0x5C: { id: 0x5C, name: 'Chat To All', effective: false, category: 'other' },

  // Other commands
  0x36: { id: 0x36, name: 'Sync', effective: false, category: 'other' },
  0x48: { id: 0x48, name: 'Minimap Ping', effective: false, category: 'other' },
};

// Complete StarCraft Unit Database - Based on official data
export const STARCRAFT_UNITS: Record<number, UnitData> = {
  // === TERRAN UNITS ===
  0: { id: 0, name: 'Marine', race: 'Terran', type: 'unit', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 24 },
  1: { id: 1, name: 'Ghost', race: 'Terran', type: 'unit', cost: { minerals: 25, gas: 75, supply: 1 }, buildTime: 50 },
  2: { id: 2, name: 'Vulture', race: 'Terran', type: 'unit', cost: { minerals: 75, gas: 0, supply: 2 }, buildTime: 30 },
  3: { id: 3, name: 'Goliath', race: 'Terran', type: 'unit', cost: { minerals: 100, gas: 50, supply: 2 }, buildTime: 40 },
  5: { id: 5, name: 'Siege Tank', race: 'Terran', type: 'unit', cost: { minerals: 150, gas: 100, supply: 2 }, buildTime: 50 },
  7: { id: 7, name: 'SCV', race: 'Terran', type: 'unit', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 20 },
  8: { id: 8, name: 'Wraith', race: 'Terran', type: 'unit', cost: { minerals: 150, gas: 100, supply: 2 }, buildTime: 60 },
  9: { id: 9, name: 'Science Vessel', race: 'Terran', type: 'unit', cost: { minerals: 100, gas: 225, supply: 2 }, buildTime: 80 },
  11: { id: 11, name: 'Dropship', race: 'Terran', type: 'unit', cost: { minerals: 100, gas: 100, supply: 2 }, buildTime: 50 },
  12: { id: 12, name: 'Battlecruiser', race: 'Terran', type: 'unit', cost: { minerals: 400, gas: 300, supply: 6 }, buildTime: 133 },
  32: { id: 32, name: 'Firebat', race: 'Terran', type: 'unit', cost: { minerals: 50, gas: 25, supply: 1 }, buildTime: 24 },
  34: { id: 34, name: 'Medic', race: 'Terran', type: 'unit', cost: { minerals: 50, gas: 25, supply: 1 }, buildTime: 30 },
  58: { id: 58, name: 'Valkyrie', race: 'Terran', type: 'unit', cost: { minerals: 250, gas: 125, supply: 3 }, buildTime: 50 },

  // === TERRAN BUILDINGS ===
  106: { id: 106, name: 'Command Center', race: 'Terran', type: 'building', cost: { minerals: 400, gas: 0, supply: 0 }, buildTime: 120 },
  107: { id: 107, name: 'Comsat Station', race: 'Terran', type: 'building', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 40 },
  108: { id: 108, name: 'Nuclear Silo', race: 'Terran', type: 'building', cost: { minerals: 100, gas: 100, supply: 0 }, buildTime: 60 },
  109: { id: 109, name: 'Supply Depot', race: 'Terran', type: 'building', cost: { minerals: 100, gas: 0, supply: -8 }, buildTime: 40 },
  110: { id: 110, name: 'Refinery', race: 'Terran', type: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 30 },
  111: { id: 111, name: 'Barracks', race: 'Terran', type: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 80 },
  112: { id: 112, name: 'Academy', race: 'Terran', type: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 80 },
  113: { id: 113, name: 'Factory', race: 'Terran', type: 'building', cost: { minerals: 200, gas: 100, supply: 0 }, buildTime: 80 },
  114: { id: 114, name: 'Starport', race: 'Terran', type: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 70 },
  115: { id: 115, name: 'Control Tower', race: 'Terran', type: 'building', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 40 },
  116: { id: 116, name: 'Science Facility', race: 'Terran', type: 'building', cost: { minerals: 100, gas: 150, supply: 0 }, buildTime: 60 },
  117: { id: 117, name: 'Covert Ops', race: 'Terran', type: 'building', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 40 },
  118: { id: 118, name: 'Physics Lab', race: 'Terran', type: 'building', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 40 },
  120: { id: 120, name: 'Machine Shop', race: 'Terran', type: 'building', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 40 },
  125: { id: 125, name: 'Engineering Bay', race: 'Terran', type: 'building', cost: { minerals: 125, gas: 0, supply: 0 }, buildTime: 35 },
  124: { id: 124, name: 'Armory', race: 'Terran', type: 'building', cost: { minerals: 100, gas: 50, supply: 0 }, buildTime: 65 },
  123: { id: 123, name: 'Missile Turret', race: 'Terran', type: 'building', cost: { minerals: 75, gas: 0, supply: 0 }, buildTime: 30 },
  122: { id: 122, name: 'Bunker', race: 'Terran', type: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 30 },

  // === PROTOSS UNITS ===
  64: { id: 64, name: 'Probe', race: 'Protoss', type: 'unit', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 20 },
  65: { id: 65, name: 'Zealot', race: 'Protoss', type: 'unit', cost: { minerals: 100, gas: 0, supply: 2 }, buildTime: 40 },
  66: { id: 66, name: 'Dragoon', race: 'Protoss', type: 'unit', cost: { minerals: 125, gas: 50, supply: 2 }, buildTime: 50 },
  67: { id: 67, name: 'High Templar', race: 'Protoss', type: 'unit', cost: { minerals: 50, gas: 150, supply: 2 }, buildTime: 50 },
  61: { id: 61, name: 'Dark Templar', race: 'Protoss', type: 'unit', cost: { minerals: 125, gas: 100, supply: 2 }, buildTime: 50 },
  69: { id: 69, name: 'Scout', race: 'Protoss', type: 'unit', cost: { minerals: 275, gas: 125, supply: 3 }, buildTime: 80 },
  70: { id: 70, name: 'Arbiter', race: 'Protoss', type: 'unit', cost: { minerals: 100, gas: 350, supply: 4 }, buildTime: 160 },
  71: { id: 71, name: 'Carrier', race: 'Protoss', type: 'unit', cost: { minerals: 350, gas: 250, supply: 6 }, buildTime: 140 },
  68: { id: 68, name: 'Archon', race: 'Protoss', type: 'unit', cost: { minerals: 0, gas: 0, supply: 0 }, buildTime: 20 },
  63: { id: 63, name: 'Dark Archon', race: 'Protoss', type: 'unit', cost: { minerals: 0, gas: 0, supply: 0 }, buildTime: 20 },
  83: { id: 83, name: 'Reaver', race: 'Protoss', type: 'unit', cost: { minerals: 200, gas: 100, supply: 4 }, buildTime: 70 },
  84: { id: 84, name: 'Observer', race: 'Protoss', type: 'unit', cost: { minerals: 25, gas: 75, supply: 1 }, buildTime: 40 },
  81: { id: 81, name: 'Shuttle', race: 'Protoss', type: 'unit', cost: { minerals: 200, gas: 0, supply: 2 }, buildTime: 60 },
  77: { id: 77, name: 'Corsair', race: 'Protoss', type: 'unit', cost: { minerals: 150, gas: 100, supply: 2 }, buildTime: 40 },

  // === PROTOSS BUILDINGS ===
  154: { id: 154, name: 'Nexus', race: 'Protoss', type: 'building', cost: { minerals: 400, gas: 0, supply: 0 }, buildTime: 120 },
  155: { id: 155, name: 'Robotics Facility', race: 'Protoss', type: 'building', cost: { minerals: 200, gas: 200, supply: 0 }, buildTime: 65 },
  156: { id: 156, name: 'Pylon', race: 'Protoss', type: 'building', cost: { minerals: 100, gas: 0, supply: -8 }, buildTime: 30 },
  157: { id: 157, name: 'Assimilator', race: 'Protoss', type: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 40 },
  159: { id: 159, name: 'Gateway', race: 'Protoss', type: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 60 },
  160: { id: 160, name: 'Photon Cannon', race: 'Protoss', type: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 50 },
  161: { id: 161, name: 'Citadel of Adun', race: 'Protoss', type: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 60 },
  162: { id: 162, name: 'Cybernetics Core', race: 'Protoss', type: 'building', cost: { minerals: 200, gas: 0, supply: 0 }, buildTime: 60 },
  163: { id: 163, name: 'Templar Archives', race: 'Protoss', type: 'building', cost: { minerals: 150, gas: 200, supply: 0 }, buildTime: 60 },
  164: { id: 164, name: 'Forge', race: 'Protoss', type: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 40 },
  165: { id: 165, name: 'Stargate', race: 'Protoss', type: 'building', cost: { minerals: 150, gas: 150, supply: 0 }, buildTime: 70 },
  167: { id: 167, name: 'Fleet Beacon', race: 'Protoss', type: 'building', cost: { minerals: 300, gas: 200, supply: 0 }, buildTime: 60 },
  168: { id: 168, name: 'Arbiter Tribunal', race: 'Protoss', type: 'building', cost: { minerals: 200, gas: 150, supply: 0 }, buildTime: 60 },
  169: { id: 169, name: 'Robotics Support Bay', race: 'Protoss', type: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 40 },
  170: { id: 170, name: 'Shield Battery', race: 'Protoss', type: 'building', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 30 },

  // === ZERG UNITS ===
  41: { id: 41, name: 'Drone', race: 'Zerg', type: 'unit', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 20 },
  42: { id: 42, name: 'Zergling', race: 'Zerg', type: 'unit', cost: { minerals: 25, gas: 0, supply: 0.5 }, buildTime: 28 },
  43: { id: 43, name: 'Hydralisk', race: 'Zerg', type: 'unit', cost: { minerals: 75, gas: 25, supply: 1 }, buildTime: 28 },
  44: { id: 44, name: 'Ultralisk', race: 'Zerg', type: 'unit', cost: { minerals: 200, gas: 200, supply: 4 }, buildTime: 60 },
  45: { id: 45, name: 'Broodling', race: 'Zerg', type: 'unit', cost: { minerals: 0, gas: 0, supply: 0 }, buildTime: 0 },
  46: { id: 46, name: 'Infested Terran', race: 'Zerg', type: 'unit', cost: { minerals: 100, gas: 50, supply: 1 }, buildTime: 40 },
  47: { id: 47, name: 'Scourge', race: 'Zerg', type: 'unit', cost: { minerals: 12, gas: 38, supply: 0.5 }, buildTime: 30 },
  48: { id: 48, name: 'Queen', race: 'Zerg', type: 'unit', cost: { minerals: 100, gas: 100, supply: 2 }, buildTime: 50 },
  49: { id: 49, name: 'Overlord', race: 'Zerg', type: 'unit', cost: { minerals: 100, gas: 0, supply: -8 }, buildTime: 40 },
  50: { id: 50, name: 'Mutalisk', race: 'Zerg', type: 'unit', cost: { minerals: 100, gas: 100, supply: 2 }, buildTime: 40 },
  51: { id: 51, name: 'Guardian', race: 'Zerg', type: 'unit', cost: { minerals: 50, gas: 100, supply: 0 }, buildTime: 40 },
  52: { id: 52, name: 'Devourer', race: 'Zerg', type: 'unit', cost: { minerals: 150, gas: 50, supply: 0 }, buildTime: 40 },
  103: { id: 103, name: 'Lurker', race: 'Zerg', type: 'unit', cost: { minerals: 50, gas: 100, supply: 0 }, buildTime: 40 },
  53: { id: 53, name: 'Defiler', race: 'Zerg', type: 'unit', cost: { minerals: 50, gas: 150, supply: 2 }, buildTime: 50 },

  // === ZERG BUILDINGS ===
  131: { id: 131, name: 'Hatchery', race: 'Zerg', type: 'building', cost: { minerals: 300, gas: 0, supply: 0 }, buildTime: 120 },
  132: { id: 132, name: 'Lair', race: 'Zerg', type: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 100 },
  133: { id: 133, name: 'Hive', race: 'Zerg', type: 'building', cost: { minerals: 200, gas: 150, supply: 0 }, buildTime: 120 },
  142: { id: 142, name: 'Spawning Pool', race: 'Zerg', type: 'building', cost: { minerals: 200, gas: 0, supply: 0 }, buildTime: 80 },
  143: { id: 143, name: 'Evolution Chamber', race: 'Zerg', type: 'building', cost: { minerals: 75, gas: 0, supply: 0 }, buildTime: 40 },
  144: { id: 144, name: 'Hydralisk Den', race: 'Zerg', type: 'building', cost: { minerals: 100, gas: 50, supply: 0 }, buildTime: 40 },
  145: { id: 145, name: 'Defiler Mound', race: 'Zerg', type: 'building', cost: { minerals: 100, gas: 100, supply: 0 }, buildTime: 60 },
  146: { id: 146, name: 'Greater Spire', race: 'Zerg', type: 'building', cost: { minerals: 100, gas: 150, supply: 0 }, buildTime: 120 },
  147: { id: 147, name: 'Queens Nest', race: 'Zerg', type: 'building', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 60 },
  148: { id: 148, name: 'Nydus Canal', race: 'Zerg', type: 'building', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 40 },
  149: { id: 149, name: 'Ultralisk Cavern', race: 'Zerg', type: 'building', cost: { minerals: 150, gas: 200, supply: 0 }, buildTime: 80 },
  150: { id: 150, name: 'Extractor', race: 'Zerg', type: 'building', cost: { minerals: 50, gas: 0, supply: 0 }, buildTime: 40 },
  141: { id: 141, name: 'Spire', race: 'Zerg', type: 'building', cost: { minerals: 200, gas: 150, supply: 0 }, buildTime: 120 },
  140: { id: 140, name: 'Sunken Colony', race: 'Zerg', type: 'building', cost: { minerals: 50, gas: 0, supply: 0 }, buildTime: 20 },
  139: { id: 139, name: 'Spore Colony', race: 'Zerg', type: 'building', cost: { minerals: 50, gas: 0, supply: 0 }, buildTime: 20 },
  138: { id: 138, name: 'Creep Colony', race: 'Zerg', type: 'building', cost: { minerals: 75, gas: 0, supply: 0 }, buildTime: 20 },
};

export class ScUnitDatabase {
  /**
   * Get unit data by ID
   */
  static getUnit(unitId: number): UnitData | null {
    return STARCRAFT_UNITS[unitId] || null;
  }

  /**
   * Get command type data by ID
   */
  static getCommandType(commandId: number): CommandTypeData | null {
    return COMMAND_TYPES[commandId] || null;
  }

  /**
   * Check if command ID is a build-related command
   */
  static isBuildCommand(commandId: number): boolean {
    const cmd = COMMAND_TYPES[commandId];
    return cmd ? ['build', 'train', 'research', 'upgrade'].includes(cmd.category) : false;
  }

  /**
   * Check if command is effective (not spam)
   */
  static isEffectiveCommand(commandId: number): boolean {
    const cmd = COMMAND_TYPES[commandId];
    return cmd ? cmd.effective : false;
  }

  /**
   * Get all units for a specific race
   */
  static getUnitsForRace(race: 'Terran' | 'Protoss' | 'Zerg'): UnitData[] {
    return Object.values(STARCRAFT_UNITS).filter(unit => unit.race === race);
  }

  /**
   * Get all building units
   */
  static getBuildings(): UnitData[] {
    return Object.values(STARCRAFT_UNITS).filter(unit => unit.type === 'building');
  }

  /**
   * Get all combat units
   */
  static getCombatUnits(): UnitData[] {
    return Object.values(STARCRAFT_UNITS).filter(unit => unit.type === 'unit');
  }

  /**
   * Smart unit name detection from various input formats
   */
  static findUnitByName(name: string): UnitData | null {
    if (!name) return null;
    
    const searchName = name.toLowerCase().trim();
    
    // Direct name match
    for (const unit of Object.values(STARCRAFT_UNITS)) {
      if (unit.name.toLowerCase() === searchName) {
        return unit;
      }
    }
    
    // Partial name match
    for (const unit of Object.values(STARCRAFT_UNITS)) {
      if (unit.name.toLowerCase().includes(searchName) || searchName.includes(unit.name.toLowerCase())) {
        return unit;
      }
    }
    
    return null;
  }

  /**
   * Calculate supply cost/benefit for unit
   */
  static getSupplyImpact(unitId: number): number {
    const unit = STARCRAFT_UNITS[unitId];
    return unit ? unit.cost.supply : 0;
  }

  /**
   * Get total mineral/gas cost for unit
   */
  static getTotalCost(unitId: number): { minerals: number; gas: number } {
    const unit = STARCRAFT_UNITS[unitId];
    return unit ? { minerals: unit.cost.minerals, gas: unit.cost.gas } : { minerals: 0, gas: 0 };
  }
}
