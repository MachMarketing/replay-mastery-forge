
// Service for parsing StarCraft: Brood War replay files using browser-based parsing

import { parseReplayInBrowser } from './browserReplayParser';
import { analyzeReplayData } from './replayParser/analyzer';

export interface ParsedReplayResult {
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
  buildOrder: { time: string; supply: number; action: string }[];
  resourcesGraph?: { time: string; minerals: number; gas: number }[];
}

export interface AnalyzedReplayResult extends ParsedReplayResult {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan?: {
    day: number;
    focus: string;
    drill: string;
  }[];
}

/**
 * Parse a StarCraft: Brood War replay file using browser-based parsing
 * This now analyzes actual binary data from the replay file to extract information
 * 
 * @param file The replay file to parse
 * @returns The parsed replay data with analysis
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('Parsing replay file in browser with real data extraction:', file.name);
  
  try {
    // Use the enhanced browser-based parser that extracts real data from the file
    const parsedData = await parseReplayInBrowser(file);
    console.log('Parsed replay data from real file analysis:', parsedData);
    
    // Analyze the replay data to generate insights
    const analysis = await analyzeReplayData(parsedData);
    console.log('Generated analysis based on parsed data:', analysis);
    
    // Return combined result with parsing and analysis
    return {
      ...parsedData,
      ...analysis
    };
    
  } catch (error) {
    console.error('Error during replay parsing:', error);
    throw error; // Re-throw to let the calling code handle it
  }
}
