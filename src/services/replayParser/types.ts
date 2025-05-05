
import { supabase } from '@/integrations/supabase/client';

// Structure for the raw replay parsing result from screp-js
export interface ScrepReplayResult {
  header: any;
  players: any[];
  computed: any;
  commands?: any[];
}

// Structure of the parsed replay data
export interface ParsedReplayData {
  playerName: string;
  opponentName: string;
  playerRace: 'Terran' | 'Protoss' | 'Zerg';
  opponentRace: 'Terran' | 'Protoss' | 'Zerg';
  map: string;
  duration: string;
  durationMS: number; // Added this field to fix the type error
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
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
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
