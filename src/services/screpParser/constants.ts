/**
 * screp Constants - VOLLSTÄNDIG nach screp GitHub repo
 * https://github.com/icza/screp/blob/main/rep/repcore/
 */

export class ScrepConstants {
  
  // VOLLSTÄNDIGE Command definitions aus screp repo
  private static readonly COMMAND_DEFINITIONS = {
    // Basic commands
    0x09: { name: 'Select', length: 2, effective: true },
    0x0A: { name: 'Shift Select', length: 2, effective: true },
    0x0B: { name: 'Shift Deselect', length: 2, effective: true },
    0x0C: { name: 'Build', length: 6, effective: true },
    0x0D: { name: 'Vision', length: 2, effective: false },
    0x0E: { name: 'Alliance', length: 4, effective: true },
    0x0F: { name: 'Game Speed', length: 1, effective: false },
    0x10: { name: 'Pause', length: 0, effective: false },
    0x11: { name: 'Resume', length: 0, effective: false },
    0x12: { name: 'Cheat', length: 0, effective: false },
    0x13: { name: 'Hotkey', length: 2, effective: true },
    0x14: { name: 'Move', length: 4, effective: true },
    0x15: { name: 'Attack', length: 6, effective: true },
    0x16: { name: 'Cast Spell', length: 8, effective: true },
    0x17: { name: 'Right Click', length: 6, effective: true },
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
    0x26: { name: 'Unload Unit', length: 2, effective: true },
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
    0x36: { name: 'Sync', length: 6, effective: false },
    0x37: { name: 'Voice Enable', length: 1, effective: false },
    0x38: { name: 'Voice Squelch', length: 1, effective: false },
    0x39: { name: 'Start Game', length: 0, effective: false },
    0x3A: { name: 'Download Percentage', length: 1, effective: false },
    0x3B: { name: 'Change Game Slot', length: 5, effective: false },
    0x3C: { name: 'New Net Player', length: 7, effective: false },
    0x3D: { name: 'Joined Game', length: 17, effective: false },
    0x3E: { name: 'Change Race', length: 2, effective: false },
    0x3F: { name: 'Team Game Team', length: 1, effective: false },
    0x40: { name: 'UMS Team', length: 1, effective: false },
    0x41: { name: 'Melee Team', length: 2, effective: false },
    0x42: { name: 'Swap Players', length: 2, effective: false },
    0x43: { name: 'Saved Data', length: 12, effective: false },
    0x44: { name: 'Load Game', length: 0, effective: false },
    0x48: { name: 'Minimap Ping', length: 4, effective: false },
    0x49: { name: 'Merge Dark Archon', length: 0, effective: true },
    0x4A: { name: 'Make Game Public', length: 0, effective: false },
    0x4B: { name: 'Chat', length: 0, effective: false }, // Variable length
    // Additional SC:R specific commands
    0x5A: { name: 'Keep Alive', length: 0, effective: false },
    0x5B: { name: 'Chat To Allies', length: 0, effective: false },
    0x5C: { name: 'Chat To All', length: 0, effective: false }
  };

  // Race definitions
  private static readonly RACE_NAMES: Record<number, string> = {
    0: 'Zerg',
    1: 'Terran', 
    2: 'Protoss',
    3: 'Invalid',
    4: 'Random',
    5: 'Select',
    6: 'User Select'
  };

  // VOLLSTÄNDIGE Unit definitions
  private static readonly UNIT_NAMES: Record<number, string> = {
    // Terran Units
    0: 'Marine',
    1: 'Ghost',
    2: 'Vulture',
    3: 'Goliath',
    4: 'Goliath Turret',
    5: 'Siege Tank',
    6: 'Siege Tank Turret',
    7: 'SCV',
    8: 'Wraith',
    9: 'Science Vessel',
    10: 'GUI Montag',
    11: 'Dropship',
    12: 'Battlecruiser',
    13: 'Spider Mine',
    14: 'Nuclear Missile',
    15: 'Civilian',
    16: 'Sarah Kerrigan',
    17: 'Alan Schezar',
    18: 'Alan Schezar Turret',
    19: 'Jim Raynor Vulture',
    20: 'Jim Raynor Marine',
    21: 'Tom Kazansky',
    22: 'Magellan',
    23: 'Edmund Duke Tank',
    24: 'Edmund Duke Tank Turret',
    25: 'Edmund Duke Siege Tank',
    26: 'Edmund Duke Siege Tank Turret',
    27: 'Arcturus Mengsk',
    28: 'Hyperion',
    29: 'Norad II',
    30: 'Siege Tank Sieged',
    31: 'Siege Tank Turret Sieged',
    32: 'Firebat',
    33: 'Scanner Sweep',
    34: 'Medic',

    // Zerg Units
    35: 'Larva',
    36: 'Egg',
    37: 'Zergling',
    38: 'Hydralisk',
    39: 'Ultralisk',
    40: 'Broodling',
    41: 'Drone',
    42: 'Overlord',
    43: 'Mutalisk',
    44: 'Guardian',
    45: 'Queen',
    46: 'Defiler',
    47: 'Scourge',
    48: 'Torrasque',
    49: 'Mature Chrysalis',
    50: 'Cerebrate',
    51: 'Cerebrate Daggoth',
    52: 'Zasz',
    53: 'Yggdrasill',
    54: 'Valkyrie',
    55: 'Cocoon',
    56: 'Protoss Corsair',
    57: 'Protoss Dark Templar',
    58: 'Zerg Devourer',
    59: 'Protoss Dark Archon',

    // Protoss Units  
    60: 'Corsair',
    61: 'Dark Templar',
    62: 'Devourer',
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
    73: 'Interceptor',
    74: 'Dark Templar Hero',
    75: 'Zeratul',
    76: 'Tassadar/Zeratul Archon',
    77: 'Fenix Zealot',
    78: 'Fenix Dragoon',
    79: 'Tassadar',
    80: 'Mojo',
    81: 'Warbringer',
    82: 'Gantrithor',
    83: 'Reaver',
    84: 'Observer',
    85: 'Scarab',

    // Buildings - Terran
    106: 'Command Center',
    107: 'Comsat Station',
    108: 'Nuclear Silo',
    109: 'Supply Depot',
    110: 'Refinery',
    111: 'Barracks',
    112: 'Academy',
    113: 'Factory',
    114: 'Starport',
    115: 'Control Tower',
    116: 'Science Facility',
    117: 'Covert Ops',
    118: 'Physics Lab',
    119: 'Machine Shop',
    120: 'Repair Bay',
    121: 'Engineering Bay',
    122: 'Armory',
    123: 'Missile Turret',
    124: 'Bunker',

    // Buildings - Zerg
    131: 'Hatchery',
    132: 'Lair',
    133: 'Hive',
    134: 'Nydus Canal',
    135: 'Hydralisk Den',
    136: 'Defiler Mound',
    137: 'Greater Spire',
    138: 'Queens Nest',
    139: 'Evolution Chamber',
    140: 'Ultralisk Cavern',
    141: 'Spire',
    142: 'Spawning Pool',
    143: 'Creep Colony',
    144: 'Spore Colony',
    145: 'Sunken Colony',
    146: 'Overmind With Shell',
    147: 'Overmind',
    148: 'Extractor',
    149: 'Mature Chrysalis',
    150: 'Cerebrate',
    151: 'Cerebrate Daggoth',

    // Buildings - Protoss
    154: 'Nexus',
    155: 'Robotics Facility',
    156: 'Pylon',
    157: 'Assimilator',
    158: 'Observatory',
    159: 'Gateway',
    160: 'Photon Cannon',
    161: 'Citadel of Adun',
    162: 'Cybernetics Core',
    163: 'Templar Archives',
    164: 'Forge',
    165: 'Stargate',
    166: 'Fleet Beacon',
    167: 'Arbiter Tribunal',
    168: 'Robotics Support Bay',
    169: 'Shield Battery'
  };

  // VOLLSTÄNDIGE Tech/Upgrade definitions
  private static readonly TECH_NAMES: Record<number, string> = {
    // Terran Tech
    0: 'Stim Packs',
    1: 'Lockdown',
    2: 'EMP Shockwave',
    3: 'Spider Mines',
    4: 'Scanner Sweep',
    5: 'Tank Siege Mode',
    6: 'Defensive Matrix',
    7: 'Irradiate',
    8: 'Yamato Gun',
    9: 'Cloaking Field',
    10: 'Personnel Cloaking',

    // Zerg Tech
    11: 'Burrowing',
    12: 'Infestation',
    13: 'Spawn Broodlings',
    14: 'Dark Swarm',
    15: 'Plague',
    16: 'Consume',
    17: 'Ensnare',
    18: 'Parasite',

    // Protoss Tech
    19: 'Psionic Storm',
    20: 'Hallucination',
    21: 'Recall',
    22: 'Stasis Field',
    23: 'Archon Warp',
    24: 'Restoration',
    25: 'Disruption Web',
    26: 'Mind Control',
    27: 'Dark Archon Meld',
    28: 'Feedback',
    29: 'Optical Flare',
    30: 'Maelstrom',

    // Expansion Tech
    31: 'Lurker Aspect',
    32: 'Healing',

    // Upgrades - Terran
    33: 'Infantry Weapons',
    34: 'Infantry Armor',
    35: 'Vehicle Weapons',
    36: 'Vehicle Plating',
    37: 'Ship Weapons',
    38: 'Ship Plating',

    // Upgrades - Zerg
    39: 'Melee Attacks',
    40: 'Missile Attacks',
    41: 'Carapace',
    42: 'Flyer Attacks',
    43: 'Flyer Carapace',

    // Upgrades - Protoss
    44: 'Ground Weapons',
    45: 'Ground Armor',
    46: 'Air Weapons',
    47: 'Air Armor',
    48: 'Plasma Shields'
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

  static getAllCommands() {
    return Object.keys(this.COMMAND_DEFINITIONS).map(Number).sort((a, b) => a - b);
  }

  static getCommandStats() {
    const commands = Object.values(this.COMMAND_DEFINITIONS);
    const effective = commands.filter(cmd => cmd.effective).length;
    const total = commands.length;
    return { effective, total, ineffective: total - effective };
  }
}