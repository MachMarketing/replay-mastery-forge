
/**
 * StarCraft: Brood War Remastered constants
 * Complete mappings based on icza/screp specification
 */

export const RACE_MAPPING = {
  0: 'Zerg',
  1: 'Terran',
  2: 'Protoss',
  3: 'Random',
  6: 'Random'
} as const;

export const COMMAND_MAPPING = {
  0x05: 'Keep Alive',
  0x06: 'Save Game',
  0x07: 'Load Game',
  0x08: 'Restart Game',
  0x09: 'Select',
  0x0A: 'Shift Select',
  0x0B: 'Shift Deselect',
  0x0C: 'Build',
  0x0D: 'Vision',
  0x0E: 'Alliance',
  0x0F: 'Game Speed',
  0x10: 'Pause',
  0x11: 'Resume',
  0x12: 'Cheat',
  0x13: 'Hotkey',
  0x14: 'Right Click',
  0x15: 'Targeted Order',
  0x18: 'Cancel Build',
  0x19: 'Cancel Morph',
  0x1A: 'Stop',
  0x1B: 'Carrier Stop',
  0x1C: 'Reaver Stop',
  0x1D: 'Order Nothing',
  0x1E: 'Return Cargo',
  0x1F: 'Train',
  0x20: 'Cancel Train',
  0x21: 'Cloak',
  0x22: 'Decloak',
  0x23: 'Unit Morph',
  0x25: 'Unsiege',
  0x26: 'Siege',
  0x27: 'Train Fighter',
  0x28: 'Unload All',
  0x29: 'Unload',
  0x2A: 'Merge Archon',
  0x2B: 'Hold Position',
  0x2C: 'Burrow',
  0x2D: 'Unburrow',
  0x2E: 'Cancel Nuke',
  0x2F: 'Lift Off',
  0x30: 'Research',
  0x31: 'Cancel Research',
  0x32: 'Upgrade',
  0x33: 'Cancel Upgrade',
  0x34: 'Cancel Addon',
  0x35: 'Building Morph',
  0x36: 'Stim',
  0x37: 'Sync',
  0x38: 'Voice Enable',
  0x39: 'Voice Disable',
  0x3A: 'Voice Squelch',
  0x3B: 'Voice Unsquelch',
  0x3C: 'Start Game',
  0x3D: 'Download Percentage',
  0x3E: 'Change Game Slot',
  0x3F: 'New Net Player',
  0x40: 'Joined Game',
  0x41: 'Change Race',
  0x42: 'Team Game Team',
  0x43: 'UMS Team',
  0x44: 'Melee Team',
  0x45: 'Swap Players',
  0x48: 'Saved Data',
  0x54: 'Briefing Start',
  0x55: 'Latency',
  0x56: 'Replay Speed',
  0x57: 'Leave Game',
  0x58: 'Minimap Ping',
  0x5A: 'Merge Dark Archon',
  0x5B: 'Make Game Public',
  0x5C: 'Chat',
  0x60: 'Right Click (121)',
  0x61: 'Targeted Order (121)',
  0x62: 'Unload (121)',
  0x63: 'Select (121)',
  0x64: 'Select Add (121)',
  0x65: 'Select Remove (121)',
  0xFE: 'Land'
} as const;

export const GAME_TYPE_MAPPING = {
  0x02: 'Melee',
  0x03: 'Free For All',
  0x04: 'One on One',
  0x0F: 'Use Map Settings',
  0x10: 'Team Melee',
  0x20: 'Team Free For All'
} as const;

export const FRAMES_PER_SECOND = 23.81; // Accurate SC:R frame rate

// Complete Unit Names mapping from icza/screp
export const UNIT_NAMES = {
  // Terran Units
  0x00: 'Marine',
  0x01: 'Ghost',
  0x02: 'Vulture',
  0x03: 'Goliath',
  0x04: 'Goliath Turret',
  0x05: 'Siege Tank (Tank Mode)',
  0x06: 'Siege Tank Turret (Tank Mode)',
  0x07: 'SCV',
  0x08: 'Wraith',
  0x09: 'Science Vessel',
  0x0A: 'Gui Motang (Firebat)',
  0x0B: 'Dropship',
  0x0C: 'Battlecruiser',
  0x0D: 'Spider Mine',
  0x0E: 'Nuclear Missile',
  0x0F: 'Terran Civilian',
  0x1E: 'Terran Siege Tank (Siege Mode)',
  0x1F: 'Siege Tank Turret (Siege Mode)',
  0x20: 'Firebat',
  0x21: 'Scanner Sweep',
  0x22: 'Medic',
  0x3A: 'Valkyrie',

  // Zerg Units
  0x23: 'Larva',
  0x24: 'Egg',
  0x25: 'Zergling',
  0x26: 'Hydralisk',
  0x27: 'Ultralisk',
  0x29: 'Drone',
  0x2A: 'Overlord',
  0x2B: 'Mutalisk',
  0x2C: 'Guardian',
  0x2D: 'Queen',
  0x2E: 'Defiler',
  0x2F: 'Scourge',
  0x32: 'Infested Terran',
  0x3B: 'Mutalisk Cocoon',
  0x3E: 'Devourer',
  0x61: 'Lurker Egg',
  0x67: 'Lurker',

  // Protoss Units
  0x3C: 'Corsair',
  0x3D: 'Dark Templar',
  0x3F: 'Dark Archon',
  0x40: 'Probe',
  0x41: 'Zealot',
  0x42: 'Dragoon',
  0x43: 'High Templar',
  0x44: 'Archon',
  0x45: 'Shuttle',
  0x46: 'Scout',
  0x47: 'Arbiter',
  0x48: 'Carrier',
  0x49: 'Interceptor',
  0x53: 'Reaver',
  0x54: 'Observer',
  0x55: 'Scarab',

  // Terran Buildings
  0x6A: 'Command Center',
  0x6B: 'ComSat',
  0x6C: 'Nuclear Silo',
  0x6D: 'Supply Depot',
  0x6E: 'Refinery',
  0x6F: 'Barracks',
  0x70: 'Academy',
  0x71: 'Factory',
  0x72: 'Starport',
  0x73: 'Control Tower',
  0x74: 'Science Facility',
  0x75: 'Covert Ops',
  0x76: 'Physics Lab',
  0x78: 'Machine Shop',
  0x79: 'Repair Bay (Unused)',
  0x7A: 'Engineering Bay',
  0x7B: 'Armory',
  0x7C: 'Missile Turret',
  0x7D: 'Bunker',
  0x82: 'Infested CC',

  // Zerg Buildings
  0x83: 'Hatchery',
  0x84: 'Lair',
  0x85: 'Hive',
  0x86: 'Nydus Canal',
  0x87: 'Hydralisk Den',
  0x88: 'Defiler Mound',
  0x89: 'Greater Spire',
  0x8A: 'Queens Nest',
  0x8B: 'Evolution Chamber',
  0x8C: 'Ultralisk Cavern',
  0x8D: 'Spire',
  0x8E: 'Spawning Pool',
  0x8F: 'Creep Colony',
  0x90: 'Spore Colony',
  0x92: 'Sunken Colony',
  0x95: 'Extractor',

  // Protoss Buildings
  0x9A: 'Nexus',
  0x9B: 'Robotics Facility',
  0x9C: 'Pylon',
  0x9D: 'Assimilator',
  0x9F: 'Observatory',
  0xA0: 'Gateway',
  0xA2: 'Photon Cannon',
  0xA3: 'Citadel of Adun',
  0xA4: 'Cybernetics Core',
  0xA5: 'Templar Archives',
  0xA6: 'Forge',
  0xA7: 'Stargate',
  0xA9: 'Fleet Beacon',
  0xAA: 'Arbiter Tribunal',
  0xAB: 'Robotics Support Bay',
  0xAC: 'Shield Battery',

  // Resources
  0xB0: 'Mineral Field (Type 1)',
  0xB1: 'Mineral Field (Type 2)',
  0xB2: 'Mineral Field (Type 3)',
  0xBC: 'Vespene Geyser',

  // Special
  0xE4: 'None'
} as const;

// Unit costs and properties for enhanced analysis
export const UNIT_COSTS = {
  // Terran Units
  0x00: { minerals: 50, gas: 0, supply: 1, buildTime: 24 }, // Marine
  0x01: { minerals: 25, gas: 75, supply: 1, buildTime: 50 }, // Ghost
  0x02: { minerals: 75, gas: 0, supply: 2, buildTime: 30 }, // Vulture
  0x03: { minerals: 100, gas: 50, supply: 2, buildTime: 40 }, // Goliath
  0x05: { minerals: 150, gas: 100, supply: 2, buildTime: 50 }, // Siege Tank
  0x07: { minerals: 50, gas: 0, supply: 1, buildTime: 20 }, // SCV
  0x08: { minerals: 150, gas: 100, supply: 2, buildTime: 60 }, // Wraith
  0x09: { minerals: 100, gas: 225, supply: 2, buildTime: 80 }, // Science Vessel
  0x0B: { minerals: 100, gas: 100, supply: 2, buildTime: 50 }, // Dropship
  0x0C: { minerals: 400, gas: 300, supply: 6, buildTime: 133 }, // Battlecruiser
  0x20: { minerals: 50, gas: 25, supply: 1, buildTime: 24 }, // Firebat
  0x22: { minerals: 50, gas: 25, supply: 1, buildTime: 30 }, // Medic
  0x3A: { minerals: 250, gas: 125, supply: 3, buildTime: 50 }, // Valkyrie

  // Zerg Units
  0x23: { minerals: 0, gas: 0, supply: 0, buildTime: 0 }, // Larva
  0x25: { minerals: 25, gas: 0, supply: 0.5, buildTime: 28 }, // Zergling
  0x26: { minerals: 75, gas: 25, supply: 1, buildTime: 28 }, // Hydralisk
  0x27: { minerals: 200, gas: 200, supply: 4, buildTime: 60 }, // Ultralisk
  0x29: { minerals: 50, gas: 0, supply: 1, buildTime: 20 }, // Drone
  0x2A: { minerals: 100, gas: 0, supply: 0, buildTime: 40 }, // Overlord
  0x2B: { minerals: 100, gas: 100, supply: 2, buildTime: 40 }, // Mutalisk
  0x2C: { minerals: 50, gas: 100, supply: 2, buildTime: 40 }, // Guardian (morph)
  0x2D: { minerals: 100, gas: 100, supply: 2, buildTime: 50 }, // Queen
  0x2E: { minerals: 50, gas: 150, supply: 2, buildTime: 50 }, // Defiler
  0x2F: { minerals: 12, gas: 38, supply: 0.5, buildTime: 30 }, // Scourge
  0x67: { minerals: 50, gas: 100, supply: 2, buildTime: 40 }, // Lurker

  // Protoss Units
  0x3C: { minerals: 150, gas: 100, supply: 2, buildTime: 40 }, // Corsair
  0x3D: { minerals: 125, gas: 100, supply: 2, buildTime: 50 }, // Dark Templar
  0x3F: { minerals: 0, gas: 0, supply: 4, buildTime: 20 }, // Dark Archon (merge)
  0x40: { minerals: 50, gas: 0, supply: 1, buildTime: 20 }, // Probe
  0x41: { minerals: 100, gas: 0, supply: 2, buildTime: 40 }, // Zealot
  0x42: { minerals: 125, gas: 50, supply: 2, buildTime: 50 }, // Dragoon
  0x43: { minerals: 50, gas: 150, supply: 2, buildTime: 50 }, // High Templar
  0x44: { minerals: 0, gas: 0, supply: 4, buildTime: 20 }, // Archon (merge)
  0x45: { minerals: 200, gas: 0, supply: 2, buildTime: 60 }, // Shuttle
  0x46: { minerals: 275, gas: 125, supply: 3, buildTime: 80 }, // Scout
  0x47: { minerals: 100, gas: 350, supply: 4, buildTime: 160 }, // Arbiter
  0x48: { minerals: 350, gas: 250, supply: 6, buildTime: 140 }, // Carrier
  0x53: { minerals: 200, gas: 100, supply: 4, buildTime: 70 }, // Reaver
  0x54: { minerals: 25, gas: 75, supply: 1, buildTime: 40 }, // Observer

  // Building costs
  0x6A: { minerals: 400, gas: 0, supply: 0, buildTime: 120 }, // Command Center
  0x6D: { minerals: 100, gas: 0, supply: 0, buildTime: 40 }, // Supply Depot
  0x6E: { minerals: 100, gas: 0, supply: 0, buildTime: 40 }, // Refinery
  0x6F: { minerals: 150, gas: 0, supply: 0, buildTime: 80 }, // Barracks
  0x70: { minerals: 150, gas: 0, supply: 0, buildTime: 80 }, // Academy
  0x71: { minerals: 200, gas: 100, supply: 0, buildTime: 80 }, // Factory
  0x72: { minerals: 150, gas: 100, supply: 0, buildTime: 70 }, // Starport
  0x7A: { minerals: 125, gas: 0, supply: 0, buildTime: 35 }, // Engineering Bay

  0x83: { minerals: 300, gas: 0, supply: 0, buildTime: 120 }, // Hatchery
  0x8E: { minerals: 200, gas: 0, supply: 0, buildTime: 80 }, // Spawning Pool
  0x8B: { minerals: 75, gas: 0, supply: 0, buildTime: 40 }, // Evolution Chamber
  0x87: { minerals: 100, gas: 50, supply: 0, buildTime: 40 }, // Hydralisk Den
  0x8D: { minerals: 200, gas: 150, supply: 0, buildTime: 120 }, // Spire
  0x95: { minerals: 50, gas: 0, supply: 0, buildTime: 40 }, // Extractor

  0x9A: { minerals: 400, gas: 0, supply: 0, buildTime: 120 }, // Nexus
  0x9C: { minerals: 100, gas: 0, supply: 0, buildTime: 30 }, // Pylon
  0x9D: { minerals: 100, gas: 0, supply: 0, buildTime: 40 }, // Assimilator
  0xA0: { minerals: 150, gas: 0, supply: 0, buildTime: 60 }, // Gateway
  0xA6: { minerals: 150, gas: 0, supply: 0, buildTime: 40 }, // Forge
  0xA4: { minerals: 200, gas: 0, supply: 0, buildTime: 60 }, // Cybernetics Core
} as const;

// Tech and Upgrade mappings
export const TECH_NAMES = {
  0x00: 'Stim Packs',
  0x01: 'Lockdown',
  0x02: 'EMP Shockwave',
  0x03: 'Spider Mines',
  0x04: 'Scanner Sweep',
  0x05: 'Tank Siege Mode',
  0x06: 'Defensive Matrix',
  0x07: 'Irradiate',
  0x08: 'Yamato Gun',
  0x09: 'Cloaking Field',
  0x0A: 'Personnel Cloaking',
  0x0B: 'Burrowing',
  0x0C: 'Infestation',
  0x0D: 'Spawn Broodlings',
  0x0E: 'Dark Swarm',
  0x0F: 'Plague',
  0x10: 'Consume',
  0x11: 'Ensnare',
  0x12: 'Parasite',
  0x13: 'Psionic Storm',
  0x14: 'Hallucination',
  0x15: 'Recall',
  0x16: 'Stasis Field',
  0x17: 'Archon Warp',
  0x18: 'Restoration',
  0x19: 'Disruption Web',
  0x1A: 'Mind Control',
  0x1B: 'Dark Archon Meld',
  0x1C: 'Feedback',
  0x1D: 'Optical Flare',
  0x1E: 'Maelstrom',
  0x1F: 'Lurker Aspect'
} as const;

export const UPGRADE_NAMES = {
  0x00: 'Terran Infantry Armor',
  0x01: 'Terran Vehicle Plating',
  0x02: 'Terran Ship Plating',
  0x03: 'Zerg Carapace',
  0x04: 'Zerg Flyer Carapace',
  0x05: 'Protoss Ground Armor',
  0x06: 'Protoss Air Armor',
  0x07: 'Terran Infantry Weapons',
  0x08: 'Terran Vehicle Weapons',
  0x09: 'Terran Ship Weapons',
  0x0A: 'Zerg Melee Attacks',
  0x0B: 'Zerg Missile Attacks',
  0x0C: 'Zerg Flyer Attacks',
  0x0D: 'Protoss Ground Weapons',
  0x0E: 'Protoss Air Weapons',
  0x0F: 'Protoss Plasma Shields',
  0x10: 'U-238 Shells (Marine Range)',
  0x11: 'Ion Thrusters (Vulture Speed)',
  0x13: 'Titan Reactor (Science Vessel Energy)',
  0x14: 'Ocular Implants (Ghost Sight)',
  0x15: 'Moebius Reactor (Ghost Energy)',
  0x16: 'Apollo Reactor (Wraith Energy)',
  0x17: 'Colossus Reactor (Battle Cruiser Energy)',
  0x18: 'Ventral Sacs (Overlord Transport)',
  0x19: 'Antennae (Overlord Sight)',
  0x1A: 'Pneumatized Carapace (Overlord Speed)',
  0x1B: 'Metabolic Boost (Zergling Speed)',
  0x1C: 'Adrenal Glands (Zergling Attack)',
  0x1D: 'Muscular Augments (Hydralisk Speed)',
  0x1E: 'Grooved Spines (Hydralisk Range)',
  0x1F: 'Gamete Meiosis (Queen Energy)',
  0x20: 'Defiler Energy',
  0x21: 'Singularity Charge (Dragoon Range)',
  0x22: 'Leg Enhancement (Zealot Speed)',
  0x23: 'Scarab Damage',
  0x24: 'Reaver Capacity',
  0x25: 'Gravitic Drive (Shuttle Speed)',
  0x26: 'Sensor Array (Observer Sight)',
  0x27: 'Gravitic Booster (Observer Speed)',
  0x28: 'Khaydarin Amulet (Templar Energy)',
  0x29: 'Apial Sensors (Scout Sight)',
  0x2A: 'Gravitic Thrusters (Scout Speed)',
  0x2B: 'Carrier Capacity',
  0x2C: 'Khaydarin Core (Arbiter Energy)',
  0x2F: 'Argus Jewel (Corsair Energy)',
  0x31: 'Argus Talisman (Dark Archon Energy)',
  0x33: 'Caduceus Reactor (Medic Energy)',
  0x34: 'Chitinous Plating (Ultralisk Armor)',
  0x35: 'Anabolic Synthesis (Ultralisk Speed)',
  0x36: 'Charon Boosters (Goliath Range)'
} as const;

// Race mappings for units
export const UNIT_RACE_MAPPING = {
  // Terran range
  ...Object.fromEntries(Array.from({length: 0x40}, (_, i) => [i, 'Terran'])),
  // Zerg range  
  ...Object.fromEntries(Array.from({length: 0x40}, (_, i) => [i + 0x23, 'Zerg'])),
  // Protoss range
  ...Object.fromEntries(Array.from({length: 0x20}, (_, i) => [i + 0x40, 'Protoss'])),
  // Buildings follow similar pattern but shifted
} as const;
