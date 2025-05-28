
/**
 * StarCraft: Brood War Remastered specific types
 */

export interface BWReplayHeader {
  version: string;
  seed: number;
  totalFrames: number;
  mapName: string;
  playerCount: number;
  gameType: number;
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
  data?: any;
}

export interface BWReplayData {
  mapName: string;
  totalFrames: number;
  duration: string;
  players: BWPlayer[];
  commands: BWCommand[];
  gameType: string;
}
