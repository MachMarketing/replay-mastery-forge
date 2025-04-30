import { ReplayParser } from 'jssuh';
import { Buffer } from 'buffer';

export interface ParsedReplayResult {
    header: any;
    actions: any[];
}

/**
 * Parse a StarCraft: Brood War .rep file using the jssuh parser
 * @param file The uploaded .rep File object
 * @returns Promise resolving to the raw header and action list
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayResult> {
    // Read file into an ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
    // Convert to Node Buffer for jssuh
  const buffer = Buffer.from(arrayBuffer);

  const parser = new ReplayParser();
    let header: any = null;
    const actions: any[] = [];

  parser.on('replayHeader', (h) => {
        header = h;
  });
    parser.on('replayAction', (action) => {
          actions.push(action);
    });

  // Feed the full buffer to the parser
  parser.end(buffer);
    // Wait for parsing to finish
  await new Promise<void>((resolve) => parser.on('end', () => resolve()));

  return { header, actions };
}
