
/**
 * Base player data interface
 */
export interface PlayerData {
  name: string;
  race: string;
  apm: number;
  eapm: number;
  buildOrder?: Array<{ time: string; supply: number; action: string }>;
  // Add additional player-specific fields as needed
}

/**
 * Unified format for parsed replay data
 */
export interface ParsedReplayData {
  // Player data
  primaryPlayer: PlayerData;
  secondaryPlayer: PlayerData;
  
  // Game metadata
  map: string;
  matchup: string;
  duration: string;
  durationMS: number;
  date: string;
  result: 'win' | 'loss' | 'unknown';
  
  // Legacy fields for backward compatibility
  playerName?: string;
  opponentName?: string;
  playerRace?: string;
  opponentRace?: string;
  apm?: number;
  eapm?: number;
  opponentApm?: number;
  opponentEapm?: number;
  
  // Game analysis
  buildOrder?: Array<{ time: string; supply: number; action: string }>;
  resourcesGraph?: any[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}
