
import { ReplayParser } from 'jssuh';
import { Buffer } from 'buffer';
import type { ParsedReplayData } from './replayParser/types';
import { transformJSSUHData } from './replayParser/transformer';

export interface ParsedReplayResult {
  header: any;
  actions: any[];
}

/**
 * Parse a StarCraft: Brood War .rep file in-browser using jssuh
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
  console.log('parseReplayFile: starting client-side parse');
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<ParsedReplayResult>((resolve, reject) => {
    let header: any = null;
    const actions: any[] = [];
    const parser = new ReplayParser();

    parser.on('replayHeader', (h) => {
      console.log('parseReplayFile: received header', h);
      header = h;
    });
    parser.on('replayAction', (action) => actions.push(action));
    parser.on('error', (err) => {
      console.error('parseReplayFile: jssuh parser error', err);
      reject(err);
    });
    parser.on('end', () => {
      console.log(`parseReplayFile: parsed ${actions.length} actions`);
      resolve({ header, actions });
    });

    try {
      parser.end(buffer);
    } catch (ex) {
      console.error('parseReplayFile: exception on parser.end', ex);
      reject(ex);
    }
  });
}

/**
 * Process the raw parsed data into our application's format
 */
export function processReplayData(parsedResult: ParsedReplayResult): ParsedReplayData {
  console.log('processReplayData: transforming raw data');
  
  // Extract player information from header
  const header = parsedResult.header || {};
  const players = header.players || [];
  
  // Transform data using our transformer utility
  return transformJSSUHData({
    ...parsedResult,
    players,
    mapName: header.mapName,
    gameStartDate: header.gameStartDate,
    durationMS: header.durationFrames ? (header.durationFrames / 24 * 1000) : 0
  });
}
