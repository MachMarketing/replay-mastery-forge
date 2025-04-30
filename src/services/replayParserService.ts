
import { Buffer } from 'buffer';
import { parse } from 'jssuh';
import type { ParsedReplayResult } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War .rep file using jssuh
 * 
 * @param file The uploaded .rep File object
 * @returns Promise resolving to the parsed replay data
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
  try {
    // Read file into an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // Convert to Buffer for compatibility with jssuh
    const buffer = Buffer.from(arrayBuffer);
    
    // Use jssuh to parse the replay file
    console.log('Starting jssuh parsing of replay file:', file.name);
    const parsedReplay = parse(buffer);
    console.log('jssuh parsing complete:', parsedReplay);
    
    // Extract basic header information
    return { 
      header: {
        filename: file.name,
        fileSize: file.size,
        type: 'replay-file',
        players: parsedReplay.players.map(player => ({
          name: player.name,
          race: player.race,
          id: player.id
        })),
        mapName: parsedReplay.mapName,
        gameStartDate: new Date(parsedReplay.timestamp * 1000).toISOString(),
        durationMS: parsedReplay.durationFrames * (1000 / 24) // Convert frames to MS
      }, 
      actions: parsedReplay.commands || []
    };
  } catch (error) {
    console.error('Error parsing replay file with jssuh:', error);
    throw new Error('Failed to parse replay file. Is this a valid StarCraft replay?');
  }
}

// Re-export the types from our types module directly
export type { ParsedReplayData, ReplayAnalysis } from './replayParser/types';

// Re-export the analyzer function for backward compatibility
export { analyzeReplayData } from './replayParser';
