
/**
 * RepCore Enums - Direct port from Go repcore package
 * Provides accurate mappings for all SC:R entities
 */

// Base Enum type
export interface Enum {
  name: string;
}

export function UnknownEnum(id: any): Enum {
  return { name: `Unknown 0x${id.toString(16)}` };
}

// Engine
export interface Engine extends Enum {
  id: number;
  shortName: string;
}

export const Engines: Engine[] = [
  { name: "StarCraft", id: 0x00, shortName: "SC" },
  { name: "Brood War", id: 0x01, shortName: "BW" }
];

export const EngineStarCraft = Engines[0];
export const EngineBroodWar = Engines[1];

export function EngineByID(id: number): Engine {
  return Engines[id] || { ...UnknownEnum(id), id, shortName: "Unk" };
}

// Speed
export interface Speed extends Enum {
  id: number;
}

export const Speeds: Speed[] = [
  { name: "Slowest", id: 0x00 },
  { name: "Slower", id: 0x01 },
  { name: "Slow", id: 0x02 },
  { name: "Normal", id: 0x03 },
  { name: "Fast", id: 0x04 },
  { name: "Faster", id: 0x05 },
  { name: "Fastest", id: 0x06 }
];

export function SpeedByID(id: number): Speed {
  return Speeds[id] || { ...UnknownEnum(id), id };
}

// GameType
export interface GameType extends Enum {
  id: number;
  shortName: string;
}

export const GameTypes: GameType[] = [
  { name: "None", id: 0x00, shortName: "None" },
  { name: "Custom", id: 0x01, shortName: "Custom" },
  { name: "Melee", id: 0x02, shortName: "Melee" },
  { name: "Free For All", id: 0x03, shortName: "FFA" },
  { name: "One on One", id: 0x04, shortName: "1on1" },
  { name: "Capture The Flag", id: 0x05, shortName: "CTF" },
  { name: "Greed", id: 0x06, shortName: "Greed" },
  { name: "Slaughter", id: 0x07, shortName: "Slaughter" },
  { name: "Sudden Death", id: 0x08, shortName: "Sudden Death" },
  { name: "Ladder", id: 0x09, shortName: "Ladder" },
  { name: "Use map settings", id: 0x0a, shortName: "UMS" },
  { name: "Team Melee", id: 0x0b, shortName: "Team Melee" },
  { name: "Team Free For All", id: 0x0c, shortName: "Team FFA" },
  { name: "Team Capture The Flag", id: 0x0d, shortName: "Team CTF" },
  { name: "Unknown 0xe", id: 0x0e, shortName: "Unk" },
  { name: "Top vs Bottom", id: 0x0f, shortName: "TvB" },
  { name: "Iron Man Ladder", id: 0x10, shortName: "Iron Man Ladder" }
];

export function GameTypeByID(id: number): GameType {
  return GameTypes[id] || { ...UnknownEnum(id), id, shortName: "Unk" };
}

// PlayerType
export interface PlayerType extends Enum {
  id: number;
}

export const PlayerTypes: PlayerType[] = [
  { name: "Inactive", id: 0x00 },
  { name: "Computer", id: 0x01 },
  { name: "Human", id: 0x02 },
  { name: "Rescue Passive", id: 0x03 },
  { name: "(Unused)", id: 0x04 },
  { name: "Computer Controlled", id: 0x05 },
  { name: "Open", id: 0x06 },
  { name: "Neutral", id: 0x07 },
  { name: "Closed", id: 0x08 }
];

export function PlayerTypeByID(id: number): PlayerType {
  return PlayerTypes[id] || { ...UnknownEnum(id), id };
}

// Race
export interface Race extends Enum {
  id: number;
  shortName: string;
  letter: string;
}

export const Races: Race[] = [
  { name: "Zerg", id: 0x00, shortName: "zerg", letter: "Z" },
  { name: "Terran", id: 0x01, shortName: "ran", letter: "T" },
  { name: "Protoss", id: 0x02, shortName: "toss", letter: "P" }
];

export const RaceZerg = Races[0];
export const RaceTerran = Races[1];
export const RaceProtoss = Races[2];

export function RaceByID(id: number): Race {
  return Races[id] || { ...UnknownEnum(id), id, shortName: "Unk", letter: "U" };
}

// Color
export interface Color extends Enum {
  id: number;
  rgb: number;
}

export const Colors: Color[] = [
  { name: "Red", id: 0x00, rgb: 0xf40404 },
  { name: "Blue", id: 0x01, rgb: 0x0c48cc },
  { name: "Teal", id: 0x02, rgb: 0x2cb494 },
  { name: "Purple", id: 0x03, rgb: 0x88409c },
  { name: "Orange", id: 0x04, rgb: 0xf88c14 },
  { name: "Brown", id: 0x05, rgb: 0x703014 },
  { name: "White", id: 0x06, rgb: 0xcce0d0 },
  { name: "Yellow", id: 0x07, rgb: 0xfcfc38 },
  { name: "Green", id: 0x08, rgb: 0x088008 },
  { name: "Pale Yellow", id: 0x09, rgb: 0xfcfc7c },
  { name: "Tan", id: 0x0a, rgb: 0xecc4b0 },
  { name: "Aqua", id: 0x0b, rgb: 0x4068d4 },
  { name: "Pale Green", id: 0x0c, rgb: 0x74a47c },
  { name: "Blueish Grey", id: 0x0d, rgb: 0x9090b8 },
  { name: "Pale Yellow2", id: 0x0e, rgb: 0xfcfc7c },
  { name: "Cyan", id: 0x0f, rgb: 0x00e4fc },
  { name: "Pink", id: 0x10, rgb: 0xffc4e4 },
  { name: "Olive", id: 0x11, rgb: 0x787800 },
  { name: "Lime", id: 0x12, rgb: 0xd2f53c },
  { name: "Navy", id: 0x13, rgb: 0x0000e6 },
  { name: "Dark Aqua", id: 0x14, rgb: 0x4068d4 },
  { name: "Magenta", id: 0x15, rgb: 0xf032e6 },
  { name: "Grey", id: 0x16, rgb: 0x808080 },
  { name: "Black", id: 0x17, rgb: 0x3c3c3c }
];

export function ColorByID(id: number): Color {
  return Colors[id] || { ...UnknownEnum(id), id, rgb: 0 };
}

// TileSet
export interface TileSet extends Enum {
  id: number;
}

export const TileSets: TileSet[] = [
  { name: "Badlands", id: 0x00 },
  { name: "Space Platform", id: 0x01 },
  { name: "Installation", id: 0x02 },
  { name: "Ashworld", id: 0x03 },
  { name: "Jungle", id: 0x04 },
  { name: "Desert", id: 0x05 },
  { name: "Arctic", id: 0x06 },
  { name: "Twilight", id: 0x07 }
];

export function TileSetByID(id: number): TileSet {
  return TileSets[id] || { ...UnknownEnum(id), id };
}

// PlayerOwner
export interface PlayerOwner extends Enum {
  id: number;
}

export const PlayerOwners: PlayerOwner[] = [
  { name: "Inactive", id: 0x00 },
  { name: "Computer (game)", id: 0x01 },
  { name: "Occupied by Human Player", id: 0x02 },
  { name: "Rescue Passive", id: 0x03 },
  { name: "Unused", id: 0x04 },
  { name: "Computer", id: 0x05 },
  { name: "Human (Open Slot)", id: 0x06 },
  { name: "Neutral", id: 0x07 },
  { name: "Closed slot", id: 0x08 }
];

export function PlayerOwnerByID(id: number): PlayerOwner {
  return PlayerOwners[id] || { ...UnknownEnum(id), id };
}

// PlayerSide (Race)
export interface PlayerSide extends Enum {
  id: number;
}

export const PlayerSides: PlayerSide[] = [
  { name: "Zerg", id: 0x00 },
  { name: "Terran", id: 0x01 },
  { name: "Protoss", id: 0x02 },
  { name: "Invalid (Independent)", id: 0x03 },
  { name: "Invalid (Neutral)", id: 0x04 },
  { name: "User Selectable", id: 0x05 },
  { name: "Random (Forced)", id: 0x06 },
  { name: "Inactive", id: 0x07 }
];

export function PlayerSideByID(id: number): PlayerSide {
  return PlayerSides[id] || { ...UnknownEnum(id), id };
}
