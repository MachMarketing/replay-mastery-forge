
/**
 * Type definitions for the replay parser
 */

// The parsed replay data structure we use in our application
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
