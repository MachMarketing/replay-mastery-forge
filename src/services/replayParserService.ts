
import { ParsedReplayData } from './replayParser/types';
import { parseReplayWasm, initParserWasm } from './wasmLoader';

export interface ParsedReplayResult {
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
  map: string;
  matchup: string;
  duration: string;
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

export interface AnalyzedReplayResult extends ParsedReplayResult {
  // All properties are now inherited from ParsedReplayResult
}

/**
 * Initialize the replay parser
 */
export async function initParser(): Promise<void> {
  console.log('[replayParserService] Initializing parser');
  try {
    await initParserWasm();
    console.log('[replayParserService] Parser initialized successfully');
  } catch (error) {
    console.error('[replayParserService] Failed to initialize parser:', error);
    throw new Error('Failed to initialize parser');
  }
}

/**
 * Parse a replay file and return the parsed data
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('[replayParserService] Starting to parse replay file');
  
  try {
    // Ensure we have the file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);
    
    console.log('[replayParserService] File loaded as ArrayBuffer, size:', fileData.byteLength);
    
    // Parse the replay using our WASM parser
    const parsedData = await parseReplayWasm(fileData);
    
    if (!parsedData) {
      throw new Error('Failed to parse replay file');
    }
    
    console.log('[replayParserService] Parsed data:', parsedData);
    
    // Add dummy analysis data (this would be replaced with real analysis)
    const analyzedData: AnalyzedReplayResult = {
      ...parsedData,
      // Default empty arrays if not present
      strengths: parsedData.strengths || [],
      weaknesses: parsedData.weaknesses || [],
      recommendations: parsedData.recommendations || [],
      buildOrder: parsedData.buildOrder || []
    };
    
    return analyzedData;
  } catch (error) {
    console.error('[replayParserService] Error parsing replay:', error);
    throw error;
  }
}
