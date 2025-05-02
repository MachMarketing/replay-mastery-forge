
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
 * Validate that the analysis result has all required fields
 */
function validateAnalysisResult(result: AnalyzedReplayResult): boolean {
  if (!result) return false;
  
  const requiredStringFields = ['playerName', 'opponentName', 'map', 'duration', 'date'];
  for (const field of requiredStringFields) {
    if (!result[field as keyof AnalyzedReplayResult]) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  const requiredArrayFields = ['strengths', 'weaknesses', 'recommendations', 'buildOrder'];
  for (const field of requiredArrayFields) {
    const array = result[field as keyof AnalyzedReplayResult] as any[];
    if (!array || !Array.isArray(array) || array.length === 0) {
      console.error(`Missing required array field or empty array: ${field}`);
      return false;
    }
  }
  
  return true;
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
    console.log('🔍 [replayParserService] Successfully parsed replay data with keys:', Object.keys(parsedData));
    
    // Validate parsed data before analyzing
    if (!parsedData || !parsedData.playerName) {
      throw new Error('Parser hat unvollständige oder ungültige Daten zurückgegeben');
    }
    
    // Analyze the replay data to generate insights
    console.log('🔍 [replayParserService] Starting analysis...');
    const analysis = await analyzeReplayData(parsedData);
    console.log('🔍 [replayParserService] Generated analysis with:',
      analysis.strengths.length, 'strengths,',
      analysis.weaknesses.length, 'weaknesses,',
      analysis.recommendations.length, 'recommendations');
    
    // Validate analysis data
    if (!analysis || !analysis.strengths || analysis.strengths.length === 0) {
      console.error('🔍 [replayParserService] Analysis returned incomplete data:', analysis);
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
    
    // Final validation of the complete result
    if (!validateAnalysisResult(result)) {
      console.error('🔍 [replayParserService] Final validation failed for:', result);
      throw new Error('Analyse-Ergebnis ist unvollständig');
    }
    
    console.log('🔍 [replayParserService] Final analysis result keys:', Object.keys(result));
    return result;
  } catch (error) {
    console.error('❌ [replayParserService] Error during replay parsing:', error);
    
    const errorMessage = error instanceof Error ? 
      error.message : 
      'Fehler beim Parsen der Replay-Datei';
      
    throw new Error(`Parsing-Fehler: ${errorMessage}`);
  }
}
