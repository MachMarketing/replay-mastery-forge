
import { parseReplayWithBrowserSafeParser, initBrowserSafeParser } from './replayParser/browserSafeParser';
import { transformJSSUHData } from './replayParser/transformer';
import { normalizeBuildOrder, debugReplayData } from './replayParser/index';
import { ParsedReplayData } from './replayParser/types';

// Import readFileAsArrayBuffer
import { readFileAsArrayBuffer } from '../services/fileReader';

// Track if the parser has been initialized
let parserInitialized = false;

/**
 * Initialize the browser replay parser
 */
async function ensureParserInitialized(): Promise<void> {
  if (!parserInitialized) {
    console.log('[browserReplayParser] Initializing parser');
    try {
      await initBrowserSafeParser();
      parserInitialized = true;
      console.log('[browserReplayParser] Parser initialized');
    } catch (error) {
      console.error('[browserReplayParser] Failed to initialize parser:', error);
      throw error;
    }
  }
}

/**
 * Parse replay file using the browser parser
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayData> {
  console.log('[browserReplayParser] Starting browser replay parsing for file:', file.name);
  
  // Make sure the parser is initialized
  await ensureParserInitialized();
  
  try {
    // Read file as ArrayBuffer
    const fileBuffer = await readFileAsArrayBuffer(file);
    
    console.log('[browserReplayParser] File read successfully, size:', fileBuffer.byteLength);
    
    // Parse the replay using the screparsed browser-safe parser
    const parsedData = await parseReplayWithBrowserSafeParser(new Uint8Array(fileBuffer));
    
    if (!parsedData) {
      throw new Error('No data returned from parser');
    }
    
    console.log('[browserReplayParser] Raw parsed data:', parsedData);
    
    // Transform the data into our application format
    const transformedData: ParsedReplayData = {
      primaryPlayer: {
        name: parsedData.players?.[0]?.name || 'Player 1',
        race: parsedData.players?.[0]?.race || 'Terran',
        apm: parsedData.players?.[0]?.apm || 0,
        eapm: parsedData.players?.[0]?.eapm || 0,
        buildOrder: parsedData.players?.[0]?.buildOrder || [],
        strengths: [],
        weaknesses: [],
        recommendations: []
      },
      secondaryPlayer: {
        name: parsedData.players?.[1]?.name || 'Player 2',
        race: parsedData.players?.[1]?.race || 'Terran',
        apm: parsedData.players?.[1]?.apm || 0,
        eapm: parsedData.players?.[1]?.eapm || 0,
        buildOrder: parsedData.players?.[1]?.buildOrder || [],
        strengths: [],
        weaknesses: [],
        recommendations: []
      },
      map: parsedData.map || 'Unknown Map',
      matchup: parsedData.matchup || 'TvT',
      duration: parsedData.duration || '0:00',
      durationMS: parsedData.durationMS || 0,
      date: parsedData.date || new Date().toISOString(),
      result: parsedData.result || 'unknown',
      strengths: ['Good resource management', 'Effective scouting'],
      weaknesses: ['Slow building placement', 'Delayed expansion'],
      recommendations: ['Focus on faster expansions', 'Improve unit micro'],
      
      // Legacy properties
      playerName: parsedData.players?.[0]?.name || 'Player 1',
      opponentName: parsedData.players?.[1]?.name || 'Player 2',
      playerRace: parsedData.players?.[0]?.race || 'Terran',
      opponentRace: parsedData.players?.[1]?.race || 'Terran',
      apm: parsedData.players?.[0]?.apm || 0,
      eapm: parsedData.players?.[0]?.eapm || 0,
      opponentApm: parsedData.players?.[1]?.apm || 0,
      opponentEapm: parsedData.players?.[1]?.eapm || 0,
      buildOrder: parsedData.players?.[0]?.buildOrder || []
    };
    
    // Normalize build orders for both players
    transformedData.primaryPlayer.buildOrder = normalizeBuildOrder(transformedData.primaryPlayer.buildOrder);
    transformedData.secondaryPlayer.buildOrder = normalizeBuildOrder(transformedData.secondaryPlayer.buildOrder);
    transformedData.buildOrder = transformedData.primaryPlayer.buildOrder;
    
    // Add analysis data to player objects for component compatibility
    transformedData.primaryPlayer.strengths = transformedData.strengths;
    transformedData.primaryPlayer.weaknesses = transformedData.weaknesses;
    transformedData.primaryPlayer.recommendations = transformedData.recommendations;
    
    transformedData.secondaryPlayer.strengths = transformedData.strengths;
    transformedData.secondaryPlayer.weaknesses = transformedData.weaknesses;
    transformedData.secondaryPlayer.recommendations = transformedData.recommendations;
    
    // Debug the final parsed data
    debugReplayData(transformedData);
    
    return transformedData;
  } catch (error) {
    console.error('[browserReplayParser] Error parsing replay:', error);
    throw error;
  }
}
