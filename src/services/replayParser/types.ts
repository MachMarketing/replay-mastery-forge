
/**
 * Type definitions for the replay parser
 */

export interface ParsedReplayData {
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
  map: string;
  matchup: string;
  duration: string;
  durationMS: number;
  date: string;
  result: 'win' | 'loss';
  apm: number;
  eapm: number;
  buildOrder: { time: string; supply: number; action: string }[];
  resourcesGraph?: { time: string; minerals: number; gas: number }[];
  strengths: string[]; // Changed from optional to required
  weaknesses: string[]; // Changed from optional to required
  recommendations: string[]; // Changed from optional to required
  trainingPlan?: {
    day: number;
    focus: string;
    drill: string;
  }[];
}

/**
 * Type for replay analysis results
 */
export interface ReplayAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan?: {
    day: number;
    focus: string;
    drill: string;
  }[];
}
