
import { supabase } from '@/integrations/supabase/client';

// Structure of the parsed replay data
export interface ParsedReplayData {
  playerName: string;
  opponentName: string;
  playerRace: 'Terran' | 'Protoss' | 'Zerg';
  opponentRace: 'Terran' | 'Protoss' | 'Zerg';
  map: string;
  duration: string;
  date: string;
  result: 'win' | 'loss';
  apm: number;
  eapm?: number;
  matchup: string;
  buildOrder: {
    time: string;
    supply: number;
    action: string;
  }[];
  resourcesGraph?: {
    time: string;
    minerals: number;
    gas: number;
  }[];
}

// Analysis result structure
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
