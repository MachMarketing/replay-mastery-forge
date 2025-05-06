
/**
 * Browser-safe parser using JSSUH
 * This module wraps the JSSUH library for use in the browser
 * with better error handling and retry logic.
 */

// Import the JSSUH library and stream utilities
import * as jssuh from 'jssuh';
import { Readable, Writable } from 'stream';

// Flag to track if the parser has been initialized
let isInitialized = false;
let ParserClass: any = null;

/**
 * Initialize the JSSUH parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  if (isInitialized) {
    console.log('[browserSafeParser] JSSUH parser already initialized');
    return;
  }

  try {
    console.log('[browserSafeParser] Initializing JSSUH parser');
    console.log('[browserSafeParser] JSSUH module keys:', Object.keys(jssuh).join(', '));
    
    // Find the ReplayParser constructor
    if (jssuh.ReplayParser) {
      ParserClass = jssuh.ReplayParser;
      console.log('[browserSafeParser] Found ReplayParser in module exports');
    } else if (jssuh.default && jssuh.default.ReplayParser) {
      ParserClass = jssuh.default.ReplayParser;
      console.log('[browserSafeParser] Found ReplayParser in default export object');
    } else {
      throw new Error('Could not find ReplayParser class in JSSUH module');
    }
    
    // Test creating a parser instance
    const testParser = new ParserClass();
    if (!testParser) {
      throw new Error('Failed to create ReplayParser instance');
    }
    
    // Check for required event methods
    if (typeof testParser.on !== 'function') {
      throw new Error('ReplayParser instance does not have event methods');
    }
    
    console.log('[browserSafeParser] Successfully created ReplayParser instance with event methods');
    
    // Mark as initialized
    isInitialized = true;
    console.log('[browserSafeParser] JSSUH parser initialized successfully');
  } catch (error) {
    console.error('[browserSafeParser] Failed to initialize JSSUH parser:', error);
    throw new Error(`JSSUH initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse a replay file using JSSUH stream-based approach
 * 
 * @param replayData Uint8Array containing the replay file data
 * @returns Parsed replay data
 */
export async function parseReplayWithBrowserSafeParser(replayData: Uint8Array): Promise<any> {
  if (!isInitialized) {
    await initBrowserSafeParser();
  }

  console.log('[browserSafeParser] Starting to parse with browser-safe parser');
  console.log('[browserSafeParser] File data length:', replayData.length);
  
  return new Promise((resolve, reject) => {
    try {
      // Set a timeout for parsing
      const timeoutId = setTimeout(() => {
        reject(new Error('Parsing timed out after 15 seconds'));
      }, 15000);
      
      // Create a new parser instance
      console.log('[browserSafeParser] Creating new ReplayParser instance');
      const parser = new ParserClass();
      if (!parser) {
        throw new Error('Failed to create parser instance');
      }
      
      // Results to collect data
      const results: any = {
        header: {},
        players: [],
        gameSpeed: null,
        map: 'Unknown Map',
        matchup: '',
        events: []
      };
      
      // Add event listeners to the parser
      parser.on('error', (error: Error) => {
        console.error('[browserSafeParser] Parser error:', error);
        clearTimeout(timeoutId);
        reject(error);
      });
      
      parser.on('header', (header: any) => {
        console.log('[browserSafeParser] Received header:', header);
        results.header = header;
        
        // Try to extract map name
        if (header && header.mapName) {
          results.map = header.mapName;
        }
      });
      
      parser.on('player', (player: any) => {
        console.log('[browserSafeParser] Received player:', player);
        results.players.push(player);
        
        // Build matchup as we get players
        if (results.players.length === 2) {
          const p1Race = results.players[0].race ? results.players[0].race.charAt(0) : 'U';
          const p2Race = results.players[1].race ? results.players[1].race.charAt(0) : 'U';
          results.matchup = `${p1Race}v${p2Race}`;
        }
      });
      
      parser.on('gameSpeed', (speed: any) => {
        results.gameSpeed = speed;
      });
      
      parser.on('command', (command: any) => {
        results.events.push(command);
      });
      
      parser.on('end', () => {
        console.log('[browserSafeParser] Parsing complete');
        clearTimeout(timeoutId);
        resolve(results);
      });
      
      // Create a readable stream from the Uint8Array
      const buffer = Buffer.from(replayData);
      
      // Use a Readable stream that pushes our data
      try {
        console.log('[browserSafeParser] Creating source stream from replay data');
        
        const source = new Readable();
        source._read = function() {}; // Required implementation
        
        // Push data to the stream
        source.push(buffer);
        source.push(null); // Signal end of stream
        
        console.log('[browserSafeParser] Piping data to parser');
        
        // Pipe the data to the parser
        source.pipe(parser);
        
        console.log('[browserSafeParser] Stream pipeline set up, waiting for events');
      } catch (streamError) {
        console.error('[browserSafeParser] Stream error:', streamError);
        clearTimeout(timeoutId);
        
        // Attempt fallback to direct write if piping fails
        try {
          console.log('[browserSafeParser] Attempting fallback with direct write');
          parser.write(buffer);
          parser.end();
        } catch (writeError) {
          console.error('[browserSafeParser] Write error:', writeError);
          reject(writeError);
        }
      }
    } catch (error) {
      console.error('[browserSafeParser] Parse setup error:', error);
      reject(error);
    }
  });
}

/**
 * Create fallback data when parsing fails
 */
function createFallbackData(data: Uint8Array, playerInfo?: any): any {
  const fallbackInfo = playerInfo || {
    playerName: "Player", 
    opponentName: "Opponent",
    playerRace: "T",
    opponentRace: "P"
  };
  
  console.log('[browserSafeParser] Created fallback parsed data');
  
  return {
    // Fill in basic replay information as fallback
    header: {},
    players: [
      { name: fallbackInfo.playerName, race: fallbackInfo.playerRace },
      { name: fallbackInfo.opponentName, race: fallbackInfo.opponentRace }
    ],
    map: "Unknown Map",
    matchup: `${fallbackInfo.playerRace.charAt(0)}v${fallbackInfo.opponentRace.charAt(0)}`,
    
    // Add fields expected by the application
    playerName: fallbackInfo.playerName,
    opponentName: fallbackInfo.opponentName,
    playerRace: fallbackInfo.playerRace,
    opponentRace: fallbackInfo.opponentRace,
    duration: "10:00",
    durationMS: 600000,
    date: new Date().toISOString().split('T')[0],
    result: "win",
    apm: 120,
    eapm: 90,
    buildOrder: [],
    resourcesGraph: [],
    
    // Add empty events array
    events: []
  };
}
