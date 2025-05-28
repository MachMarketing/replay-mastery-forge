
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
  name: string;
  race: number;
  raceString: 'Zerg' | 'Terran' | 'Protoss' | 'Random' | 'Unknown';
  slotId: number;
  team: number;
  color: number;
}

export interface BWCommand {
  frame: number;
  userId: number;
  type: number;
  typeString: string;
  data: Uint8Array;
  parameters: any; // Added parameters property to match BWAPICommand
}

export interface BWReplayData {
  mapName: string;
  totalFrames: number;
  duration: string;
  players: BWPlayer[];
  commands: BWCommand[];
  gameType: string;
}
