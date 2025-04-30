import { ReplayParser } from 'jssuh';
import { Buffer } from 'buffer';

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
