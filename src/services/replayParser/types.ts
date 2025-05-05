
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
  eapm: number; // Make eapm required
  buildOrder: { time: string; supply: number; action: string }[];
  resourcesGraph?: { time: string; minerals: number; gas: number }[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}
