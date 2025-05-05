
import { analyzeReplayData } from './analyzer';
import { transformJSSUHData } from './transformer';
import type { ParsedReplayData, ReplayAnalysis } from './types';
import type { ParsedReplayResult } from '../replayParserService';

export { analyzeReplayData, transformJSSUHData };
export type { ParsedReplayData, ReplayAnalysis, ParsedReplayResult };

// Export default URL for backwards compatibility
export const DEFAULT_SCREP_API_URL = 'https://api.replayanalyzer.com/parse';

// Globale Variable zum Verfolgen von aktiven Prozessen
let activeProcess: AbortController | null = null;

// Export helper to support ending processes that get stuck
export function abortLongRunningProcess(): void {
  console.log('Aborting long running process');
  
  // Wenn ein aktiver Prozess existiert, diesen abbrechen
  if (activeProcess) {
    console.log('Active process found, aborting');
    activeProcess.abort();
    activeProcess = null;
  }
  
  // Zusätzliche Reset-Maßnahmen könnten hier implementiert werden
}

// Funktion zum Erstellen eines neuen Prozesses
export function createProcessController(): AbortController {
  // Alten Prozess abbrechen, falls einer existiert
  if (activeProcess) {
    console.log('Canceling previous process before starting new one');
    activeProcess.abort();
  }
  
  // Neuen Controller erstellen und speichern
  activeProcess = new AbortController();
  return activeProcess;
}
