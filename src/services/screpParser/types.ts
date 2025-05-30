
/**
 * Types basierend auf screp GitHub repo
 */

export interface ReplayHeader {
  replayID: string;
  engine: number;
  frames: number;
  startTime: Date;
  mapName: string;
  gameType: number;
  duration: string;
}

export interface PlayerData {
  id: number;
  name: string;
  race: string;
  team: number;
  color: number;
}

export interface ComputedData {
  apm: number[];
  eapm: number[];
  buildOrders: any[][];
}
