/**
 * Types for the native replay parser
 */

export interface ReplayHeader {
  magic: string;
  version: number;
  frames: number;
  mapName: string;
  playerCount: number;
  players: PlayerInfo[];
  gameType: number;
  gameSubType: number;
}

export interface PlayerInfo {
  id: number;
  name: string;
  race: number;
  raceString: string;
  team: number;
  color: number;
}

export interface Command {
  frame: number;
  playerId: number;
  type: number;
  typeString: string;
  data: Uint8Array;
  parameters?: any;
}

export interface ParsedCommand extends Command {
  timestamp: number;
  timestampString: string;
  category: 'macro' | 'micro' | 'other';
  cmdId: number;
  unitName?: string;
}

export interface APMData {
  total: number;
  effective: number;
  byMinute: number[];
  effectiveByMinute: number[];
}

export interface BuildOrderEntry {
  frame: number;
  timestamp: number;
  timestampString: string;
  supply: number;
  unitId: number;
  unitName: string;
  buildingId?: number;
  buildingName?: string;
  playerId: number;
}

export interface ResourceData {
  minerals: Array<{ frame: number; value: number }>;
  gas: Array<{ frame: number; value: number }>;
  unspentMinerals: Array<{ frame: number; value: number }>;
  unspentGas: Array<{ frame: number; value: number }>;
}

export interface SupplyData {
  usage: Array<{
    frame: number;
    used: number;
    total: number;
    percentage: number;
  }>;
  blocks: Array<{
    startFrame: number;
    endFrame: number;
    duration: number;
  }>;
}

export interface HotkeyUsage {
  total: number;
  distribution: Record<string, number>;
  actionsPerMinute: number;
}

export interface ActionDistribution {
  total: number;
  macro: number;
  micro: number;
  other: number;
  macroPercentage: number;
  microPercentage: number;
  otherPercentage: number;
}

export interface PlayerAnalysis {
  playerId: number;
  name: string;
  race: string;
  apm: APMData;
  buildOrder: BuildOrderEntry[];
  resources: ResourceData;
  supply: SupplyData;
  hotkeys: HotkeyUsage;
  actions: ActionDistribution;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface NativeReplayData {
  header: ReplayHeader;
  commands: ParsedCommand[];
  players: PlayerAnalysis[];
  gameLength: number;
  gameLengthString: string;
  map: string;
  matchup: string;
  date: string;
}

// Types for DirectReplayParser
export interface BuildOrderItem {
  frame: number;
  timestamp: string;
  action: string;
  supply: number;
}

export interface DirectParserResult {
  success: boolean;
  commands: ParsedCommand[];
  playerActions: Record<number, ParsedCommand[]>;
  apm: number[];
  eapm: number[];
  buildOrders: BuildOrderItem[][];
  totalFrames: number;
  debugInfo?: {
    commandsExtracted: number;
    firstCommands: Record<number, string[]>;
    firstUnits: Record<number, string[]>;
    playerActionCounts: Record<number, number>;
    apmBreakdown: Record<number, { build: number, train: number, select: number, move: number }>;
  };
  error?: string;
}
