
import { ParsedReplayData } from './replayParser/types';
import { parseReplayWasm, initParserWasm } from './wasmLoader';
import { mapRawToParsed } from './replayMapper';

export interface ParsedReplayResult {
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
  map: string;
  matchup: string;
  duration: string;
  durationMS: number; // This field is required
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
 * IMPORTANT: This function must use mapRawToParsed to match browserReplayParser behavior
 */
export async function parseReplayFile(file: File): Promise<AnalyzedReplayResult> {
  console.log('[replayParserService] Starting to parse replay file');
  
  try {
    // Ensure parser is initialized
    await initParserWasm();
    
    // Ensure we have the file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);
    
    console.log('[replayParserService] File loaded as ArrayBuffer, size:', fileData.byteLength);
    
    // Parse the replay using our WASM parser
    const parsedRaw = await parseReplayWasm(fileData);
    
    if (!parsedRaw) {
      throw new Error('Failed to parse replay file');
    }
    
    console.log('[replayParserService] Raw parsed data:', parsedRaw);
    
    // CRITICAL: Transform the raw data using our mapper function to match browser parser
    const parsed = mapRawToParsed(parsedRaw);
    console.log('[replayParserService] Mapped parsed data:', parsed);
    
    // Return the analyzed data using the actual parsed data from the mapper
    // WITHOUT any mock/dummy data
    const analyzedData: AnalyzedReplayResult = {
      ...parsed,
      // Use actual data from parsed result, no mock data
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      recommendations: parsed.recommendations || []
    };
    
    return analyzedData;
  } catch (error) {
    console.error('[replayParserService] Error parsing replay:', error);
    throw error;
  }
}
