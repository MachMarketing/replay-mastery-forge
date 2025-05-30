
/**
 * Einziger Einstiegspunkt - verwendet NUR screp-js
 */

import { ScrepJsParser, type FinalReplayResult } from './screpJsParser';

// Alle anderen Parser sind deaktiviert
export const parseReplay = async (file: File) => {
  const parser = new ScrepJsParser();
  return await parser.parseReplay(file);
};

export { ScrepJsParser, type FinalReplayResult };
