
import { ReplayParser } from 'jssuh';
import { Buffer } from 'buffer';
import { ParsedReplayData, ParsedReplayResult } from './replayParser/types';
import { transformJSSUHData } from './replayParser/transformer';

/**
 * Parse a StarCraft: Brood War .rep file in-browser using jssuh
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
  console.log('parseReplayFile: starting client-side parse');
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const parser = new ReplayParser();
  let header: any = null;
  const actions: any[] = [];

  parser.on('replayHeader', (h) => {
    console.log('received header', h);
    header = h;
  });
  parser.on('replayAction', (action) => {
    actions.push(action);
  });
  parser.on('error', (err) => {
    console.error('jssuh parser error', err);
    throw err;
  });

  parser.end(buffer);
  await new Promise<void>((resolve) => parser.on('end', () => resolve()));

  console.log(`parseReplayFile: parsed ${actions.length} actions`);
  return { header, actions };
}

/**
 * Process the raw parsed data into our application's format
 */
export function processReplayData(parsedResult: ParsedReplayResult): ParsedReplayData {
  console.log('processReplayData: transforming raw data');
  
  // Extract player information from header
  const header = parsedResult.header || {};
  const players = header.players || [];
  
  // Create basic data structure with default values
  const baseData = {
    playerName: 'Unknown',
    opponentName: 'Unknown',
    playerRace: 'Terran' as const,
    opponentRace: 'Terran' as const,
    map: header.mapName || 'Unknown Map',
    duration: '0:00',
    date: new Date().toISOString().split('T')[0],
    result: 'win' as const,
    apm: 0,
    eapm: 0,
    matchup: 'TvT',
    buildOrder: [],
    resourcesGraph: []
  };
  
  // Transform data using our transformer utility
  return transformJSSUHData({
    ...parsedResult,
    players,
    mapName: header.mapName,
    gameStartDate: header.gameStartDate,
    durationMS: header.durationFrames ? (header.durationFrames / 24 * 1000) : 0
  });
}
