
/**
 * TypeScript definitions for replay parser data
 */

/**
 * Player data in a parsed replay
 */
export interface PlayerData {
  name: string;
  race: string;
  apm: number;
  eapm: number;
  buildOrder?: Array<{ time: string; supply: number; action: string }>;
}

/**
 * Main replay analysis interface - contains all structured data from a parsed replay
 */
export interface ReplayAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
}

/**
 * Raw parsed replay data structure
 */
export interface ParsedReplayData {
  // Primary data structure
  primaryPlayer: PlayerData;
  secondaryPlayer: PlayerData;
  
  // Legacy fields (for backwards compatibility)
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
  apm: number;
  eapm: number;
  opponentApm: number;
  opponentEapm: number;
  
  // Game info
  map: string;
  matchup: string;
  duration: string;
  durationMS: number;
  date: string;
  result: 'win' | 'loss' | 'unknown';
  
  // Build order data
  buildOrder: Array<{ time: string; supply: number; action: string }>;
  
  // Analysis results
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}
