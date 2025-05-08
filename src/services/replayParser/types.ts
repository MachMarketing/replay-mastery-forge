
/**
 * Type definitions for the replay parser
 */

// Player data structure
export interface PlayerData {
  name: string;
  race: string;
  apm: number;
  eapm: number;
}

// The parsed replay data structure we use in our application
export interface ParsedReplayData {
  // Primary player (the one being analyzed)
  primaryPlayer: PlayerData;
  // Secondary player (the opponent)
  secondaryPlayer: PlayerData;
  
  // Backward compatibility fields for existing code
  // These are optional in the ParsedReplayData but required in ParsedReplayResult
  playerName?: string;
  opponentName?: string;
  playerRace?: string;
  opponentRace?: string;
  apm?: number;
  eapm?: number;
  opponentApm?: number;
  opponentEapm?: number;
  
  map: string;
  matchup: string;
  duration: string;
  durationMS: number;
  date: string;
  result: 'win' | 'loss';
  buildOrder: Array<{ time: string; supply: number; action: string }>;
  resourcesGraph?: Array<{ time: string; minerals: number; gas: number }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan?: Array<{ day: number; focus: string; drill: string }>;
}

// The analyzed replay data
export interface ReplayAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan?: Array<{ day: number; focus: string; drill: string }>;
}
