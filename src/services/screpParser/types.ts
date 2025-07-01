
/**
 * Types - EXAKT nach screp GitHub repo
 * https://github.com/icza/screp/blob/main/rep/repdecoder.go
 */

export interface ReplayHeader {
  replayID: string;        // 'reRS' oder 'seRS'
  engine: number;          // Engine version
  frames: number;          // Game frames
  startTime: Date;
  mapName: string;
  gameType: number;
  duration: string;
  gameId: number;          // Game ID from offset 0x00
}

export interface PlayerData {
  id: number;
  name: string;
  race: string;
  raceId: number;          // Raw race ID
  team: number;
  color: number;
  type: number;            // Player type
}

export interface Command {
  frame: number;
  type: number;
  playerID: number;
  typeString: string;
  parameters: any;
  effective: boolean;
  ineffKind: string;
  time: string;
  rawData?: Uint8Array;    // Raw command bytes for debugging
}

export interface ComputedData {
  apm: number[];
  eapm: number[];
  buildOrders: any[][];
  totalFrames: number;
  gameDurationSeconds: number;
}

export interface ScrepParseResult {
  header: ReplayHeader;
  players: PlayerData[];
  commands: Command[];
  computed: ComputedData;
  parseStats: {
    headerParsed: boolean;
    playersFound: number;
    commandsParsed: number;
    errors: string[];
  };
}
