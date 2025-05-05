
import { analyzeReplayData } from './analyzer';
import { transformJSSUHData } from './transformer';
import type { ParsedReplayData, ReplayAnalysis } from './types';
import type { ParsedReplayResult } from '../replayParserService';

export { analyzeReplayData, transformJSSUHData };
export type { ParsedReplayData, ReplayAnalysis, ParsedReplayResult };

// Export default URL for backwards compatibility
export const DEFAULT_SCREP_API_URL = 'https://api.replayanalyzer.com/parse';

// Export helper to support ending processes that get stuck
export function abortLongRunningProcess(): void {
  console.log('Aborting long running process');
  // Diese Funktion kann vom UI aufgerufen werden, um hängende Prozesse zu beenden
  // Implementierung ist ein Platzhalter, der tatsächliche Abbruchlogik würde mehr Kontext benötigen
}
