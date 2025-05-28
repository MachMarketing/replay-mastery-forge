/**
 * StarCraft: Brood War constants and data structures
 */

// Race constants
export const RACES = {
  0: 'Zerg',
  1: 'Terran', 
  2: 'Protoss',
  6: 'Random'
} as const;

// Command type constants
export const COMMAND_TYPES = {
  0x09: 'SELECT',
  0x0A: 'SHIFT_SELECT',
  0x0B: 'SHIFT_DESELECT',
  0x0C: 'BUILD',
  0x0D: 'VISION',
  0x0E: 'ALLIANCE',
  0x13: 'HOTKEY',
  0x14: 'MOVE',
  0x15: 'ATTACK',
  0x16: 'CANCEL',
  0x17: 'CANCEL_HATCH',
  0x18: 'STOP',
  0x19: 'CARRIER_STOP',
  0x1A: 'REAVER_STOP',
  0x1B: 'ORDER_NOTHING',
  0x1C: 'RETURN_CARGO',
  0x1D: 'TRAIN',
  0x1E: 'CANCEL_TRAIN',
  0x1F: 'CLOAK',
  0x20: 'DECLOAK',
  0x21: 'UNIT_MORPH',
  0x23: 'UNSIEGE',
  0x24: 'SIEGE',
  0x25: 'TRAIN_FIGHTER',
  0x27: 'UNLOAD_ALL',
  0x28: 'UNLOAD',
  0x29: 'MERGE_ARCHON',
  0x2A: 'HOLD_POSITION',
  0x2B: 'BURROW',
  0x2C: 'UNBURROW',
  0x2D: 'CANCEL_NUKE',
  0x2E: 'LIFT',
  0x2F: 'RESEARCH',
  0x30: 'CANCEL_RESEARCH',
  0x31: 'UPGRADE',
  0x32: 'CANCEL_UPGRADE',
  0x33: 'CANCEL_ADDON',
  0x34: 'BUILDING_MORPH',
  0x35: 'STIM',
  0x36: 'SYNCHRONIZE',
  0x37: 'VOICE_ENABLE1',
  0x38: 'VOICE_ENABLE2',
  0x39: 'VOICE_SQUELCH1',
  0x3A: 'VOICE_SQUELCH2',
  0x3B: 'START_GAME',
  0x3C: 'DOWNLOAD_PERCENTAGE',
  0x3D: 'CHANGE_GAME_SLOT',
  0x3E: 'NEW_NET_PLAYER',
  0x3F: 'JOINED_GAME',
  0x40: 'CHANGE_RACE',
  0x41: 'TEAM_GAME_TEAM',
  0x42: 'UMS_TEAM',
  0x43: 'MELEE_TEAM',
  0x44: 'SWAP_PLAYERS',
  0x45: 'SAVED_DATA',
  0x48: 'LOAD_GAME'
} as const;

// Unit IDs for build order analysis
export const UNIT_IDS = {
  // Terran
  60: 'SCV',
  61: 'Marine',
  62: 'Firebat',
  63: 'Medic',
  64: 'Ghost',
  65: 'Vulture',
  66: 'Siege Tank',
  67: 'Goliath',
  68: 'Wraith',
  69: 'Dropship',
  70: 'Battlecruiser',
  71: 'Valkyrie',
  
  // Protoss
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
  75: 'Dark Archon',
  76: 'Probe',
  77: 'Corsair',
  78: 'Reaver',
  
  // Zerg
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
  50: 'Infested Terran',
  51: 'Infested Kerrigan',
  52: 'Unclean One',
  53: 'Hunter Killer',
  54: 'Devouring One',
  55: 'Kukulza Mutalisk',
  56: 'Kukulza Guardian',
  57: 'Yggdrasill',
  58: 'Mature Chrysalis',
  59: 'Cerebrate',
  60: 'Cerebrate Daggoth',
  61: 'Infested Duran'
} as const;

// Building IDs
export const BUILDING_IDS = {
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

// Game speed constants (frames per second)
export const GAME_SPEED = {
  SLOWEST: 8.33,
  SLOWER: 10.71,
  SLOW: 14.29,
  NORMAL: 20,
  FAST: 24,
  FASTER: 28.57,
  FASTEST: 42.86
} as const;

// Default to fastest for APM calculations
export const DEFAULT_FPS = GAME_SPEED.FASTEST;

// Header constants
export const REPLAY_HEADER_SIZE = 633;
export const REPLAY_MAGIC = 'Repl';
