
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
    
    // Parse the replay using the JSSUH browser-safe parser
    const jssuhData = await parseReplayWithBrowserSafeParser(new Uint8Array(fileBuffer));
    
    if (!jssuhData) {
      throw new Error('No data returned from parser');
    }
    
    // Transform the data into our application format
    const transformedData = transformJSSUHData(jssuhData);
    
    // Normalize build orders for both players
    transformedData.primaryPlayer.buildOrder = normalizeBuildOrder(transformedData.primaryPlayer.buildOrder);
    transformedData.secondaryPlayer.buildOrder = normalizeBuildOrder(transformedData.secondaryPlayer.buildOrder);
    
    // Debug the final parsed data
    debugReplayData(transformedData);
    
    return transformedData;
  } catch (error) {
    console.error('[browserReplayParser] Error parsing replay:', error);
    throw error;
  }
}
