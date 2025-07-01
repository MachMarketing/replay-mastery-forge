
/**
 * screp Constants - EXAKT nach screp GitHub repo
 * https://github.com/icza/screp/blob/main/rep/repcore/
 */

export class ScrepConstants {
  
  // Command definitions - EXAKT aus screp repo
  private static readonly COMMAND_DEFINITIONS = {
    0x09: { name: 'Select', length: 2, effective: true },
    0x0A: { name: 'Shift Select', length: 2, effective: true },
    0x0B: { name: 'Shift Deselect', length: 2, effective: true },
    0x0C: { name: 'Build', length: 6, effective: true },
    0x0D: { name: 'Vision', length: 2, effective: false },
    0x0E: { name: 'Alliance', length: 4, effective: true },
    0x13: { name: 'Hotkey', length: 2, effective: true },
    0x14: { name: 'Move', length: 4, effective: true },
    0x15: { name: 'Attack', length: 6, effective: true },
    0x18: { name: 'Cancel', length: 0, effective: true },
    0x19: { name: 'Cancel Hatch', length: 0, effective: true },
    0x1A: { name: 'Stop', length: 0, effective: true },
    0x1B: { name: 'Carrier Stop', length: 0, effective: true },
    0x1C: { name: 'Reaver Stop', length: 0, effective: true },
    0x1D: { name: 'Return Cargo', length: 0, effective: true },
    0x1E: { name: 'Train', length: 2, effective: true },
    0x1F: { name: 'Cancel Train', length: 2, effective: true },
    0x20: { name: 'Cloak', length: 0, effective: true },
    0x21: { name: 'Decloak', length: 0, effective: true },
    0x22: { name: 'Unit Morph', length: 2, effective: true },
    0x23: { name: 'Unsiege', length: 0, effective: true },
    0x24: { name: 'Siege', length: 0, effective: true },
    0x25: { name: 'Train Fighter', length: 0, effective: true },
    0x27: { name: 'Unload All', length: 0, effective: true },
    0x28: { name: 'Unload', length: 2, effective: true },
    0x29: { name: 'Merge Archon', length: 0, effective: true },
    0x2A: { name: 'Hold Position', length: 0, effective: true },
    0x2B: { name: 'Burrow', length: 0, effective: true },
    0x2C: { name: 'Unburrow', length: 0, effective: true },
    0x2D: { name: 'Cancel Nuke', length: 0, effective: true },
    0x2E: { name: 'Lift', length: 4, effective: true },
    0x2F: { name: 'Tech', length: 2, effective: true },
    0x30: { name: 'Cancel Tech', length: 0, effective: true },
    0x31: { name: 'Upgrade', length: 2, effective: true },
    0x32: { name: 'Cancel Upgrade', length: 0, effective: true },
    0x33: { name: 'Cancel Addon', length: 0, effective: true },
    0x34: { name: 'Building Morph', length: 2, effective: true },
    0x35: { name: 'Stim', length: 0, effective: true },
    0x36: { name: 'Sync', length: 6, effective: false }
  };

  // Race definitions
  private static readonly RACE_NAMES: Record<number, string> = {
    0: 'Zerg',
    1: 'Terran',
    2: 'Protoss',
    3: 'Invalid',
    4: 'Random',
    5: 'Select'
  };

  // Unit definitions - kritische Units aus screp repo
  private static readonly UNIT_NAMES: Record<number, string> = {
    // Terran
    0: 'Marine',
    1: 'Ghost',
    2: 'Vulture',
    3: 'Goliath',
    5: 'Siege Tank',
    7: 'SCV',
    8: 'Wraith',
    12: 'Battlecruiser',
    
    // Zerg
    37: 'Zergling',
    38: 'Hydralisk',
    39: 'Ultralisk',
    41: 'Drone',
    42: 'Overlord',
    43: 'Mutalisk',
    44: 'Guardian',
    45: 'Queen',
    46: 'Defiler',
    47: 'Scourge',
    
    // Protoss
    60: 'Corsair',
    61: 'Dark Templar',
    63: 'Dark Archon',
    64: 'Probe',
    65: 'Zealot',
    66: 'Dragoon',
    67: 'High Templar',
    68: 'Archon',
    69: 'Shuttle',
    70: 'Scout',
    71: 'Arbiter',
    72: 'Carrier',
    
    // Buildings
    106: 'Command Center',
    109: 'Supply Depot',
    110: 'Refinery',
    111: 'Barracks',
    112: 'Academy',
    113: 'Factory',
    114: 'Starport',
    116: 'Science Facility',
    122: 'Engineering Bay',
    123: 'Armory',
    124: 'Missile Turret',
    125: 'Bunker',
    
    131: 'Hatchery',
    132: 'Lair',
    133: 'Hive',
    135: 'Hydralisk Den',
    139: 'Evolution Chamber',
    141: 'Spire',
    142: 'Spawning Pool',
    149: 'Extractor',
    
    154: 'Nexus',
    156: 'Pylon',
    157: 'Assimilator',
    160: 'Gateway',
    162: 'Photon Cannon',
    164: 'Cybernetics Core',
    166: 'Forge',
    167: 'Stargate'
  };

  // Tech definitions
  private static readonly TECH_NAMES: Record<number, string> = {
    0: 'Stim Packs',
    1: 'Lockdown',
    2: 'EMP Shockwave',
    3: 'Spider Mines',
    5: 'Tank Siege Mode',
    11: 'Burrowing',
    19: 'Psionic Storm',
    21: 'Recall',
    32: 'Lurker Aspect'
  };

  static getCommandDefinition(commandType: number) {
    return this.COMMAND_DEFINITIONS[commandType as keyof typeof this.COMMAND_DEFINITIONS];
  }

  static isValidCommandType(commandType: number): boolean {
    return commandType in this.COMMAND_DEFINITIONS;
  }

  static getRaceName(raceId: number): string {
    return this.RACE_NAMES[raceId] || 'Unknown';
  }

  static getUnitName(unitId: number): string {
    return this.UNIT_NAMES[unitId] || `Unit_${unitId}`;
  }

  static getTechName(techId: number): string {
    return this.TECH_NAMES[techId] || `Tech_${techId}`;
  }
}
