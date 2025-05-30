
/**
 * Updated Einstiegspunkt - verwendet jetzt screp-core statt screp-js
 */

import { NewScrepParser, type NewFinalReplayResult } from './newScrepParser';

// Verwende den neuen screp-core Parser
export const parseReplay = async (file: File) => {
  const parser = new NewScrepParser();
  return await parser.parseReplay(file);
};

export { NewScrepParser, type NewFinalReplayResult };

// Legacy exports für Kompatibilität
export type FinalReplayResult = NewFinalReplayResult;
export { NewScrepParser as ScrepJsParser };
