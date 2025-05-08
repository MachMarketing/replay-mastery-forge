
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
  buildOrder: Array<{ time: string; supply: number; action: string }>;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
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
  
  // Game info
  map: string;
  matchup: string;
  duration: string;
  durationMS: number;
  date: string;
  result: 'win' | 'loss' | 'unknown';
  
  // Analysis results
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  
  // Legacy properties for backward compatibility
  playerName?: string;
  opponentName?: string;
  playerRace?: string;
  opponentRace?: string;
  apm?: number;
  eapm?: number;
  opponentApm?: number;
  opponentEapm?: number;
  buildOrder?: Array<{ time: string; supply: number; action: string }>;
  
  // Optional training plan
  trainingPlan?: Array<{ day: number; focus: string; drill: string }>;
}

/**
 * Mapped replay data with required fields guaranteed
 */
export interface ParsedReplayResult extends ParsedReplayData {
  // Required training plan
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
}
