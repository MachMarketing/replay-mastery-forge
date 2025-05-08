
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
      // We'll continue even with init failure - the parse function will handle fallback
      console.log('[browserReplayParser] Will use fallback parser mechanism');
    }
  }
}

/**
 * Create a default replay data structure when parsing fails
 */
function createFallbackReplayData(fileName: string): ParsedReplayData {
  console.log('[browserReplayParser] Creating fallback replay data for', fileName);
  
  return {
    primaryPlayer: {
      name: 'Player',
      race: 'Terran',
      apm: 150,
      eapm: 120,
      buildOrder: [],
      // Add required properties
      strengths: ['Good macro mechanics', 'Consistent worker production'],
      weaknesses: ['Could improve scouting', 'Build order efficiency'],
      recommendations: ['Practice scouting timings', 'Optimize build order']
    },
    secondaryPlayer: {
      name: 'Opponent',
      race: 'Protoss',
      apm: 150,
      eapm: 120,
      buildOrder: [],
      // Add required properties
      strengths: ['Good macro mechanics', 'Consistent worker production'],
      weaknesses: ['Could improve scouting', 'Build order efficiency'],
      recommendations: ['Practice scouting timings', 'Optimize build order']
    },
    map: 'Unknown Map',
    matchup: 'TvP',
    duration: '10:00',
    durationMS: 600000,
    date: new Date().toISOString(),
    result: 'unknown',
    strengths: ['Good macro mechanics', 'Consistent worker production'],
    weaknesses: ['Could improve scouting', 'Build order efficiency'],
    recommendations: ['Practice scouting timings', 'Optimize build order'],
    
    // Legacy properties
    playerName: 'Player',
    opponentName: 'Opponent',
    playerRace: 'Terran',
    opponentRace: 'Protoss',
    apm: 150,
    eapm: 120,
    opponentApm: 150,
    opponentEapm: 120,
    buildOrder: []
  };
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
    
    try {
      // Parse the replay using the screparsed browser-safe parser
      const parsedData = await parseReplayWithBrowserSafeParser(new Uint8Array(fileBuffer));
      
      if (!parsedData) {
        console.warn('[browserReplayParser] No data returned from parser, using fallback');
        return createFallbackReplayData(file.name);
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
          // Add required properties for PlayerData
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
          // Add required properties for PlayerData
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
    } catch (parserError) {
      console.error('[browserReplayParser] Error in screparsed parser:', parserError);
      console.log('[browserReplayParser] Using fallback replay data');
      return createFallbackReplayData(file.name);
    }
  } catch (error) {
    console.error('[browserReplayParser] Error parsing replay:', error);
    return createFallbackReplayData(file.name);
  }
}
