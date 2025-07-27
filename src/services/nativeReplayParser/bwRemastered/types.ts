
/**
 * StarCraft: Brood War Remastered specific types
 * Updated with correct field definitions
 */

export interface BWReplayHeader {
  version: string;
  seed: number;
  totalFrames: number;
  mapName: string;
  playerCount: number;
  gameType: number;
  gameSubType: number;
  saveTime: number;
}

export interface BWPlayer {
  id: number;
  name: string;
  race: number;
  raceString: 'Zerg' | 'Terran' | 'Protoss' | 'Random' | 'Unknown';
  slotId: number;
  team: number;
  color: number;
  apm: number;
  eapm: number;
}

export interface BWCommand {
  frame: number;
  userId: number;
  type: number;
  typeString: string;
  data: Uint8Array;
  parameters: any; // Added parameters property to match BWAPICommand
}

export interface BWBuildOrderItem {
  frame: number;
  timestamp: string;
  supply: number;
  action: 'Build' | 'Train' | 'Research' | 'Upgrade';
  unitName: string;
  unitId: number;
  playerId: number;
}

export interface BWReplayData {
  mapName: string;
  totalFrames: number;
  duration: string;
  durationSeconds: number;
  players: BWPlayer[];
  commands: BWCommand[];
  gameType: string;
  buildOrders: Record<number, BWBuildOrderItem[]>;
}
