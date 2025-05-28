
/**
 * StarCraft: Brood War Remastered constants
 * Based on icza/screp and BWAPI specification
 */

export const RACE_MAPPING = {
  0: 'Zerg',
  1: 'Terran',
  2: 'Protoss',
  3: 'Random',
  6: 'Random'
} as const;

export const COMMAND_MAPPING = {
  0x09: 'Select',
  0x0A: 'Shift Select',
  0x0B: 'Shift Deselect',
  0x0C: 'Build',
  0x0D: 'Vision',
  0x0E: 'Alliance',
  0x13: 'Hotkey',
  0x14: 'Move',
  0x15: 'Attack',
  0x16: 'Cancel',
  0x17: 'Cancel Hatch',
  0x18: 'Stop',
  0x19: 'Carrier Stop',
  0x1A: 'Reaver Stop',
  0x1B: 'Order Nothing',
  0x1C: 'Return Cargo',
  0x1D: 'Train',
  0x1E: 'Cancel Train',
  0x1F: 'Cloak',
  0x20: 'Decloak',
  0x21: 'Unit Morph',
  0x23: 'Unsiege',
  0x24: 'Siege',
  0x25: 'Train Fighter',
  0x27: 'Unload All',
  0x28: 'Unload',
  0x29: 'Merge Archon',
  0x2A: 'Hold Position',
  0x2B: 'Burrow',
  0x2C: 'Unburrow',
  0x2D: 'Cancel Nuke',
  0x2E: 'Lift',
  0x2F: 'Research',
  0x30: 'Cancel Research',
  0x31: 'Upgrade',
  0x32: 'Cancel Upgrade',
  0x33: 'Cancel Addon',
  0x34: 'Building Morph',
  0x35: 'Stim',
  0x36: 'Synchronize',
  0x37: 'Voice Enable1',
  0x38: 'Voice Enable2',
  0x39: 'Voice Squelch1',
  0x3A: 'Voice Squelch2',
  0x3B: 'Start Game',
  0x3C: 'Download Percentage',
  0x3D: 'Change Game Slot',
  0x3E: 'New Net Player',
  0x3F: 'Joined Game',
  0x40: 'Change Race',
  0x41: 'Team Game Team',
  0x42: 'UMS Team',
  0x43: 'Melee Team',
  0x44: 'Swap Players',
  0x45: 'Saved Data',
  0x48: 'Load Game'
} as const;

export const GAME_TYPE_MAPPING = {
  0x02: 'Melee',
  0x03: 'Free For All',
  0x04: 'One on One',
  0x0F: 'Use Map Settings',
  0x10: 'Team Melee',
  0x20: 'Team Free For All'
} as const;

// Frame rate for APM calculation (Brood War runs at ~42.86 FPS on Fastest, but we use 24 for compatibility)
export const FRAMES_PER_SECOND = 24;

// Unit and building IDs for build order analysis
export const UNIT_NAMES = {
  // Terran Units
  0: 'Marine',
  1: 'Ghost', 
  2: 'Vulture',
  3: 'Goliath',
  5: 'Siege Tank',
  7: 'SCV',
  8: 'Wraith',
  11: 'Dropship',
  12: 'Battlecruiser',
  32: 'Firebat',
  34: 'Medic',
  58: 'Valkyrie',
  
  // Protoss Units
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
  61: 'Dark Templar',
  63: 'Dark Archon',
  77: 'Corsair',
  83: 'Reaver',
  
  // Zerg Units
  37: 'Larva',
  38: 'Egg',
  39: 'Zergling',
  40: 'Hydralisk',
  41: 'Ultralisk',
  42: 'Broodling',
  43: 'Drone',
  44: 'Overlord',
  45: 'Mutalisk',
  46: 'Guardian',
  47: 'Queen',
  48: 'Defiler',
  49: 'Scourge',
  50: 'Infested Terran'
} as const;

export const BUILDING_NAMES = {
  // Terran Buildings
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
  
  // Protoss Buildings
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
  169: 'Shield Battery',
  
  // Zerg Buildings
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
  146: 'Extractor'
} as const;
