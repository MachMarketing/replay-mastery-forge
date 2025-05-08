
/**
 * Base player data interface
 */
export interface PlayerData {
  name: string;
  race: string;
  apm: number;
  eapm: number;
  buildOrder?: Array<{ time: string; supply: number; action: string }>;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  // Add additional player-specific fields as needed
}

/**
 * Interface for replay analysis results
 */
export interface ReplayAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan?: Array<{ day: number; focus: string; drill: string }>;
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
