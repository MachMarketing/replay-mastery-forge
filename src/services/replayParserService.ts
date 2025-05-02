
// Service for parsing StarCraft: Brood War replay files

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
 * Parse a StarCraft: Brood War replay file using browser-based parsing with screp-js
 * This analyzes actual binary data from the replay file to extract information
 * 
 * @param file The replay file to parse
 * @returns The parsed replay data with analysis
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('🔍 [replayParserService] Parsing replay file:', file.name, 'size:', file.size);
  
  try {
    // Validate input file
    if (!file || file.size === 0) {
      throw new Error('Ungültige oder leere Replay-Datei');
    }
    
    // Use the browser-based parser to extract data from the file
    console.log('🔍 [replayParserService] Starting browser parsing...');
    const parsedData = await parseReplayInBrowser(file);
    console.log('🔍 [replayParserService] Successfully parsed replay data:', parsedData);
    
    // Validate parsed data before analyzing
    if (!parsedData || !parsedData.playerName) {
      throw new Error('Parser hat unvollständige oder ungültige Daten zurückgegeben');
    }
    
    // Analyze the replay data to generate insights
    console.log('🔍 [replayParserService] Starting analysis...');
    const analysis = await analyzeReplayData(parsedData);
    console.log('🔍 [replayParserService] Generated analysis based on parsed data:', analysis);
    
    // Validate analysis data
    if (!analysis || !analysis.strengths) {
      throw new Error('Analyse hat unvollständige Daten zurückgegeben');
    }
    
    // Return combined result with parsing and analysis
    const result: AnalyzedReplayResult = {
      ...parsedData,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      trainingPlan: analysis.trainingPlan
    };
    
    return result;
  } catch (error) {
    console.error('❌ [replayParserService] Error during replay parsing:', error);
    
    const errorMessage = error instanceof Error ? 
      error.message : 
      'Fehler beim Parsen der Replay-Datei';
      
    throw new Error(`Parsing-Fehler: ${errorMessage}`);
  }
}
