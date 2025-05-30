/**
 * Enhanced Constants using RepCore mappings
 * Replaces the old constants.ts with accurate repcore data
 */

import { 
  RaceByID, 
  GameTypeByID, 
  SpeedByID, 
  ColorByID, 
  PlayerTypeByID,
  TileSetByID,
  PlayerOwnerByID,
  PlayerSideByID 
} from './repcore/enums';
import { framesToTimeString, FRAMES_PER_SECOND } from './repcore/types';

// Export repcore functions for external use
export { 
  RaceByID, 
  GameTypeByID, 
  SpeedByID, 
  ColorByID, 
  PlayerTypeByID,
  TileSetByID,
  PlayerOwnerByID,
  PlayerSideByID,
  framesToTimeString,
  FRAMES_PER_SECOND
};

// Legacy mapping for backward compatibility
export const RACE_MAPPING = {
  0: 'Zerg',
  1: 'Terran', 
  2: 'Protoss',
  3: 'Random',
  6: 'Random'
} as const;

// Enhanced Race mapping using repcore
export function getRaceName(raceId: number): string {
  const race = RaceByID(raceId);
  return race.name;
}

// Enhanced GameType mapping using repcore
export function getGameTypeName(gameTypeId: number): string {
  const gameType = GameTypeByID(gameTypeId);
  return gameType.name;
}

// Enhanced Color mapping using repcore
export function getColorName(colorId: number): string {
  const color = ColorByID(colorId);
  return color.name;
}

// Enhanced Speed mapping using repcore
export function getSpeedName(speedId: number): string {
  const speed = SpeedByID(speedId);
  return speed.name;
}

// Enhanced PlayerType mapping using repcore
export function getPlayerTypeName(playerTypeId: number): string {
  const playerType = PlayerTypeByID(playerTypeId);
  return playerType.name;
}

// Legacy command mapping (keeping existing structure)
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

// Enhanced command name getter
export function getCommandName(commandId: number): string {
  return COMMAND_MAPPING[commandId as keyof typeof COMMAND_MAPPING] || `Unknown Command 0x${commandId.toString(16)}`;
}

// Keep existing unit names and costs for compatibility
export const UNIT_NAMES = {
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
  0xB0: 'Mineral Field (Type 1)',
  0xB1: 'Mineral Field (Type 2)',
  0xB2: 'Mineral Field (Type 3)',
  0xBC: 'Vespene Geyser',
  0xE4: 'None'
} as const;

export const UNIT_COSTS = {
  0x00: { minerals: 50, gas: 0, supply: 1, buildTime: 24 },
  0x01: { minerals: 25, gas: 75, supply: 1, buildTime: 50 },
  0x02: { minerals: 75, gas: 0, supply: 2, buildTime: 30 },
  0x03: { minerals: 100, gas: 50, supply: 2, buildTime: 40 },
  0x05: { minerals: 150, gas: 100, supply: 2, buildTime: 50 },
  0x07: { minerals: 50, gas: 0, supply: 1, buildTime: 20 },
  0x08: { minerals: 150, gas: 100, supply: 2, buildTime: 60 },
  0x09: { minerals: 100, gas: 225, supply: 2, buildTime: 80 },
  0x0B: { minerals: 100, gas: 100, supply: 2, buildTime: 50 },
  0x0C: { minerals: 400, gas: 300, supply: 6, buildTime: 133 },
  0x20: { minerals: 50, gas: 25, supply: 1, buildTime: 24 },
  0x22: { minerals: 50, gas: 25, supply: 1, buildTime: 30 },
  0x3A: { minerals: 250, gas: 125, supply: 3, buildTime: 50 },
  0x23: { minerals: 0, gas: 0, supply: 0, buildTime: 0 },
  0x25: { minerals: 25, gas: 0, supply: 0.5, buildTime: 28 },
  0x26: { minerals: 75, gas: 25, supply: 1, buildTime: 28 },
  0x27: { minerals: 200, gas: 200, supply: 4, buildTime: 60 },
  0x29: { minerals: 50, gas: 0, supply: 1, buildTime: 20 },
  0x2A: { minerals: 100, gas: 0, supply: 0, buildTime: 40 },
  0x2B: { minerals: 100, gas: 100, supply: 2, buildTime: 40 },
  0x2C: { minerals: 50, gas: 100, supply: 2, buildTime: 40 },
  0x2D: { minerals: 100, gas: 100, supply: 2, buildTime: 50 },
  0x2E: { minerals: 50, gas: 150, supply: 2, buildTime: 50 },
  0x2F: { minerals: 12, gas: 38, supply: 0.5, buildTime: 30 },
  0x67: { minerals: 50, gas: 100, supply: 2, buildTime: 40 },
  0x3C: { minerals: 150, gas: 100, supply: 2, buildTime: 40 },
  0x3D: { minerals: 125, gas: 100, supply: 2, buildTime: 50 },
  0x3F: { minerals: 0, gas: 0, supply: 4, buildTime: 20 },
  0x40: { minerals: 50, gas: 0, supply: 1, buildTime: 20 },
  0x41: { minerals: 100, gas: 0, supply: 2, buildTime: 40 },
  0x42: { minerals: 125, gas: 50, supply: 2, buildTime: 50 },
  0x43: { minerals: 50, gas: 150, supply: 2, buildTime: 50 },
  0x44: { minerals: 0, gas: 0, supply: 4, buildTime: 20 },
  0x45: { minerals: 200, gas: 0, supply: 2, buildTime: 60 },
  0x46: { minerals: 275, gas: 125, supply: 3, buildTime: 80 },
  0x47: { minerals: 100, gas: 350, supply: 4, buildTime: 160 },
  0x48: { minerals: 350, gas: 250, supply: 6, buildTime: 140 },
  0x53: { minerals: 200, gas: 100, supply: 4, buildTime: 70 },
  0x54: { minerals: 25, gas: 75, supply: 1, buildTime: 40 },
  0x6A: { minerals: 400, gas: 0, supply: 0, buildTime: 120 },
  0x6D: { minerals: 100, gas: 0, supply: 0, buildTime: 40 },
  0x6E: { minerals: 100, gas: 0, supply: 0, buildTime: 40 },
  0x6F: { minerals: 150, gas: 0, supply: 0, buildTime: 80 },
  0x70: { minerals: 150, gas: 0, supply: 0, buildTime: 80 },
  0x71: { minerals: 200, gas: 100, supply: 0, buildTime: 80 },
  0x72: { minerals: 150, gas: 100, supply: 0, buildTime: 70 },
  0x7A: { minerals: 125, gas: 0, supply: 0, buildTime: 35 },
  0x83: { minerals: 300, gas: 0, supply: 0, buildTime: 120 },
  0x8E: { minerals: 200, gas: 0, supply: 0, buildTime: 80 },
  0x8B: { minerals: 75, gas: 0, supply: 0, buildTime: 40 },
  0x87: { minerals: 100, gas: 50, supply: 0, buildTime: 40 },
  0x8D: { minerals: 200, gas: 150, supply: 0, buildTime: 120 },
  0x95: { minerals: 50, gas: 0, supply: 0, buildTime: 40 },
  0x9A: { minerals: 400, gas: 0, supply: 0, buildTime: 120 },
  0x9C: { minerals: 100, gas: 0, supply: 0, buildTime: 30 },
  0x9D: { minerals: 100, gas: 0, supply: 0, buildTime: 40 },
  0xA0: { minerals: 150, gas: 0, supply: 0, buildTime: 60 },
  0xA6: { minerals: 150, gas: 0, supply: 0, buildTime: 40 },
  0xA4: { minerals: 200, gas: 0, supply: 0, buildTime: 60 }
} as const;
