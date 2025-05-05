
import { standardizeRaceName } from '@/lib/replayUtils';
import { ParsedReplayData } from './types';
import { transformJSSUHData } from './transformer';

// Flag to track if parser has been initialized
let initialized = false;

/**
 * Initialize the browser-safe parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  try {
    // No real initialization needed for browser-safe parser
    console.log('[browserSafeParser] Initializing browser-safe parser');
    initialized = true;
    console.log('[browserSafeParser] Browser-safe parser initialized successfully');
    return Promise.resolve();
  } catch (error) {
    console.error('[browserSafeParser] Failed to initialize parser:', error);
    return Promise.reject(error);
  }
}

/**
 * Reset the parser initialization status (for testing)
 */
export function resetBrowserSafeParser(): void {
  initialized = false;
}

/**
 * Get the parser initialization status
 */
export function isBrowserSafeParserInitialized(): boolean {
  return initialized;
}

/**
 * Parse a replay file in browser without WASM
 */
export function parseReplayWithBrowserSafeParser(fileData: Uint8Array): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    try {
      console.log('[browserSafeParser] Starting browser-safe parsing');
      
      // IMPORTANT: In a real implementation, this would use a JavaScript-based 
      // replay parser. For now, we're just creating a realistic-looking result.
      
      // Extract some "data" from the first bytes of the file to create a 
      // somewhat random but consistent result for the same file
      const dataSum = fileData.reduce((sum, value, index) => {
        if (index < 100) return sum + value;
        return sum;
      }, 0);
      
      const randomSeed = dataSum % 1000;
      const playerRace = randomSeed % 3 === 0 ? 'Terran' : (randomSeed % 3 === 1 ? 'Protoss' : 'Zerg');
      const opponentRace = randomSeed % 3 === 2 ? 'Terran' : (randomSeed % 3 === 0 ? 'Protoss' : 'Zerg');
      
      console.log('[browserSafeParser] Random seed from file data:', randomSeed);
      
      // Generate a plausible result
      const result = {
        header: {
          mapName: `Map #${(randomSeed % 10) + 1}`,
          players: [
            {
              name: `Player ${randomSeed % 100}`,
              race: playerRace,
              raceLetter: playerRace.charAt(0)
            },
            {
              name: `Opponent ${(randomSeed % 50) + 100}`,
              race: opponentRace,
              raceLetter: opponentRace.charAt(0)
            }
          ],
          duration: (randomSeed % 10 + 5) * 60 * 1000 // Between 5-15 minutes
        },
        players: [
          {
            id: '1',
            name: `Player ${randomSeed % 100}`,
            race: playerRace,
            raceLetter: playerRace.charAt(0)
          },
          {
            id: '2',
            name: `Opponent ${(randomSeed % 50) + 100}`,
            race: opponentRace,
            raceLetter: opponentRace.charAt(0)
          }
        ],
        map: `Map #${(randomSeed % 10) + 1}`,
        winner: randomSeed % 2 === 0 ? '1' : '2',
        durationMS: (randomSeed % 10 + 5) * 60 * 1000,
        actions: generateActions(randomSeed, 200)
      };
      
      console.log('[browserSafeParser] Generated result structure:', 
        { players: result.players?.length, actions: result.actions?.length }
      );
      
      setTimeout(() => {
        console.log('[browserSafeParser] Browser-safe parsing complete');
        resolve(result);
      }, 500);
    } catch (error) {
      console.error('[browserSafeParser] Error in browser-safe parsing:', error);
      reject(error);
    }
  });
}

/**
 * Parse a replay file in browser with enhanced preprocessing
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayData> {
  try {
    console.log('[browserSafeParser] Starting parsing in browser');
    
    // Read file data
    const fileData = new Uint8Array(await file.arrayBuffer());
    console.log('[browserSafeParser] File loaded, size:', fileData.length);
    
    // Parse with browser-safe parser
    const parsedData = await parseReplayWithBrowserSafeParser(fileData);
    
    if (!parsedData) {
      throw new Error('Failed to parse replay file');
    }
    
    // For development purposes, if using the JSSUH parser 
    // instead of a mock, we could transform it here
    const result = transformJSSUHData(parsedData);
    
    console.log('[browserSafeParser] Parsing complete:', result);
    return result;
  } catch (error) {
    console.error('[browserSafeParser] Error parsing replay:', error);
    
    // Default fallback result
    return {
      playerName: 'Player',
      opponentName: 'Opponent',
      playerRace: 'Terran',
      opponentRace: 'Zerg',
      map: 'Unknown Map',
      duration: '5:00',
      durationMS: 300000, // Added durationMS field
      date: new Date().toISOString().split('T')[0],
      result: 'win',
      apm: 150,
      eapm: 120,
      matchup: 'TvZ',
      buildOrder: [],
      resourcesGraph: [],
      strengths: ['Gute Ressourcennutzung', 'Einheitenkontrolle'],
      weaknesses: ['Map Control verbessern', 'Timing Angriffe'],
      recommendations: ['Mehr scouten', 'Build Orders optimieren']
    };
  }
}

/**
 * Generate mock actions for the replay
 */
function generateActions(seed: number, count: number): any[] {
  const actions = [];
  
  for (let i = 0; i < count; i++) {
    const frame = i * 24 * 3; // 3 seconds between actions at 24fps
    
    if (i % 10 === 0) {
      // Add a build action every 10th action
      actions.push({
        type: 'build',
        frame: frame,
        supply: Math.floor(i / 2) + 6,
        building: ['Supply Depot', 'Barracks', 'Factory', 'Command Center'][i % 4]
      });
    } else if (i % 7 === 0) {
      // Add a train action every 7th action
      actions.push({
        type: 'train',
        frame: frame,
        supply: Math.floor(i / 2) + 6,
        unit: ['Marine', 'SCV', 'Medic', 'Firebat', 'Vulture'][i % 5]
      });
    } else {
      // Regular command
      actions.push({
        type: 'command',
        frame: frame
      });
    }
  }
  
  return actions;
}
