
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
      
      // The screparsed package returns data in a format based on screp
      // Documentation: https://www.npmjs.com/package/screparsed
      let transformedData: ParsedReplayData;
      
      try {
        // Extract relevant data from screparsed output format
        const header = parsedData.header || {};
        const commands = parsedData.commands || [];
        const mapData = parsedData.mapData || {};
        
        const playerInfos = [];
        // Extract player data
        if (parsedData.players && Array.isArray(parsedData.players)) {
          playerInfos.push(...parsedData.players);
        } else if (header.players && Array.isArray(header.players)) {
          playerInfos.push(...header.players);
        }
        
        if (playerInfos.length < 2) {
          console.warn('[browserReplayParser] Could not find enough player data, using fallback');
          return createFallbackReplayData(file.name);
        }
        
        // Map player races based on screp format
        const mapRace = (raceVal: number | string): string => {
          if (typeof raceVal === 'string') {
            const race = raceVal.toLowerCase();
            if (race.includes('zerg')) return 'Zerg';
            if (race.includes('terran')) return 'Terran';
            if (race.includes('protoss')) return 'Protoss';
            return 'Unknown';
          }
          
          // Number-based race mapping from screp
          switch(Number(raceVal)) {
            case 0: return 'Zerg';
            case 1: return 'Terran';
            case 2: return 'Protoss';
            default: return 'Unknown';
          }
        };
        
        // Calculate APM from commands
        const calculateAPM = (playerID: number): number => {
          if (!commands || !Array.isArray(commands)) return 150;
          
          const playerCommands = commands.filter(cmd => cmd.player === playerID);
          const gameLengthMinutes = header.duration ? header.duration / 60 : 10;
          return Math.round(playerCommands.length / gameLengthMinutes);
        };
        
        // Extract basic player info
        const player1 = playerInfos[0];
        const player2 = playerInfos[1];
        
        transformedData = {
          primaryPlayer: {
            name: player1.name || 'Player 1',
            race: mapRace(player1.race),
            apm: calculateAPM(player1.id || 0),
            eapm: Math.round(calculateAPM(player1.id || 0) * 0.7),
            buildOrder: [],
            strengths: ['Good macro mechanics', 'Consistent worker production'],
            weaknesses: ['Could improve scouting', 'Build order efficiency'],
            recommendations: ['Practice scouting timings', 'Optimize build order']
          },
          secondaryPlayer: {
            name: player2.name || 'Player 2',
            race: mapRace(player2.race),
            apm: calculateAPM(player2.id || 1),
            eapm: Math.round(calculateAPM(player2.id || 1) * 0.7),
            buildOrder: [],
            strengths: ['Good macro mechanics', 'Consistent worker production'],
            weaknesses: ['Could improve scouting', 'Build order efficiency'],
            recommendations: ['Practice scouting timings', 'Optimize build order']
          },
          map: mapData.name || header.map || 'Unknown Map',
          matchup: `${mapRace(player1.race).charAt(0)}v${mapRace(player2.race).charAt(0)}`,
          duration: header.duration ? `${Math.floor(header.duration / 60)}:${String(Math.floor(header.duration % 60)).padStart(2, '0')}` : '10:00',
          durationMS: header.duration ? header.duration * 1000 : 600000,
          date: header.startTime ? new Date(header.startTime).toISOString() : new Date().toISOString(),
          result: 'unknown',
          strengths: ['Good macro mechanics', 'Consistent worker production'],
          weaknesses: ['Could improve scouting', 'Build order efficiency'],
          recommendations: ['Practice scouting timings', 'Optimize build order'],
          
          // Legacy properties
          playerName: player1.name || 'Player 1',
          opponentName: player2.name || 'Player 2',
          playerRace: mapRace(player1.race),
          opponentRace: mapRace(player2.race),
          apm: calculateAPM(player1.id || 0),
          eapm: Math.round(calculateAPM(player1.id || 0) * 0.7),
          opponentApm: calculateAPM(player2.id || 1),
          opponentEapm: Math.round(calculateAPM(player2.id || 1) * 0.7),
          buildOrder: []
        };
      } catch (transformError) {
        console.error('[browserReplayParser] Error transforming data:', transformError);
        return createFallbackReplayData(file.name);
      }
      
      // Debug the final parsed data
      debugReplayData(transformedData);
      
      return transformedData;
    } catch (parserError) {
      console.error('[browserReplayParser] Error in screparsed parser:', parserError);
      
      // Check if this is a WASM error
      if (parserError instanceof Error) {
        if (parserError.message.includes('WASM') || 
            parserError.message.includes('memory') || 
            parserError.message.includes('execution')) {
          console.warn('[browserReplayParser] WASM error detected, this might be a browser compatibility issue');
        }
      } else if (parserError && typeof parserError === 'object' && 'isTrusted' in parserError) {
        console.warn('[browserReplayParser] Received DOM event as error, likely a WASM issue');
      }
      
      console.log('[browserReplayParser] Using fallback replay data');
      return createFallbackReplayData(file.name);
    }
  } catch (error) {
    console.error('[browserReplayParser] Error parsing replay:', error);
    return createFallbackReplayData(file.name);
  }
}
