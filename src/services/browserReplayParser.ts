
import { parseReplayWithBrowserSafeParser, initBrowserSafeParser } from './replayParser/browserSafeParser';
import { transformJSSUHData } from './replayParser/transformer';
import { normalizeBuildOrder, debugReplayData } from './replayParser/index';
import { ParsedReplayData } from './replayParser/types';
import { readFileAsArrayBuffer } from './fileReader';

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
    
    // Parse the replay using the JSSUH browser-safe parser
    const jssuhData = await parseReplayWithBrowserSafeParser(new Uint8Array(fileBuffer));
    
    if (!jssuhData) {
      throw new Error('No data returned from parser');
    }
    
    // Transform the data into our application format
    const transformedData = transformJSSUHData(jssuhData);
    
    // Ensure the buildOrder is normalized for the primaryPlayer
    if (transformedData.primaryPlayer && transformedData.primaryPlayer.buildOrder) {
      transformedData.primaryPlayer.buildOrder = normalizeBuildOrder(transformedData.primaryPlayer.buildOrder);
      console.log('[browserReplayParser] Normalized primary player build order:', 
        transformedData.primaryPlayer.buildOrder.length, 'items');
    } else {
      console.log('[browserReplayParser] No build order found for primary player');
      transformedData.primaryPlayer = transformedData.primaryPlayer || { 
        name: 'Unknown', 
        race: 'Unknown', 
        apm: 0, 
        eapm: 0, 
        buildOrder: [] 
      };
    }
    
    // Ensure the buildOrder is normalized for the secondaryPlayer
    if (transformedData.secondaryPlayer && transformedData.secondaryPlayer.buildOrder) {
      transformedData.secondaryPlayer.buildOrder = normalizeBuildOrder(transformedData.secondaryPlayer.buildOrder);
      console.log('[browserReplayParser] Normalized secondary player build order:', 
        transformedData.secondaryPlayer.buildOrder.length, 'items');
    } else {
      console.log('[browserReplayParser] No build order found for secondary player');
      transformedData.secondaryPlayer = transformedData.secondaryPlayer || { 
        name: 'Unknown', 
        race: 'Unknown', 
        apm: 0, 
        eapm: 0,
        buildOrder: [] 
      };
    }
    
    // Also normalize legacy buildOrder field if it exists
    if (transformedData.buildOrder) {
      transformedData.buildOrder = normalizeBuildOrder(transformedData.buildOrder);
      console.log('[browserReplayParser] Normalized legacy build order:', 
        transformedData.buildOrder.length, 'items');
    } else {
      console.log('[browserReplayParser] No legacy build order found');
    }
    
    // Make sure proper fields exist
    const parsedData = {
      ...transformedData,
      primaryPlayer: {
        name: transformedData.playerName || transformedData.primaryPlayer?.name || 'Player',
        race: transformedData.playerRace || transformedData.primaryPlayer?.race || 'Unknown',
        apm: transformedData.apm || transformedData.primaryPlayer?.apm || 0,
        eapm: transformedData.eapm || transformedData.primaryPlayer?.eapm || 0,
        buildOrder: transformedData.primaryPlayer?.buildOrder || transformedData.buildOrder || []
      },
      secondaryPlayer: {
        name: transformedData.opponentName || transformedData.secondaryPlayer?.name || 'Opponent',
        race: transformedData.opponentRace || transformedData.secondaryPlayer?.race || 'Unknown',
        apm: transformedData.opponentApm || transformedData.secondaryPlayer?.apm || 0, 
        eapm: transformedData.opponentEapm || transformedData.secondaryPlayer?.eapm || 0,
        buildOrder: transformedData.secondaryPlayer?.buildOrder || []
      }
    } as ParsedReplayData;
    
    // Debug the final parsed data
    debugReplayData(parsedData);
    
    return parsedData;
  } catch (error) {
    console.error('[browserReplayParser] Error parsing replay:', error);
    throw error;
  }
}
