
import { analyzeReplayData } from './analyzer';
import { transformJSSUHData } from './transformer';
import { parseReplayFile } from './parser';
import type { ParsedReplayData, ReplayAnalysis } from './types';
import type { ParsedReplayResult } from '../replayParserService';

export { analyzeReplayData, transformJSSUHData, parseReplayFile };
export type { ParsedReplayData, ReplayAnalysis, ParsedReplayResult };

// Global variable to track active processes
let activeProcess: AbortController | null = null;

// Export helper to support ending processes that get stuck
export function abortLongRunningProcess(): void {
  console.log('Aborting long running SCREP parsing process');
  
  // If an active process exists, abort it
  if (activeProcess) {
    console.log('Active process found, aborting');
    try {
      activeProcess.abort();
      console.log('Process abort signal sent');
    } catch (e) {
      console.error('Error during abort:', e);
    } finally {
      activeProcess = null;
    }
  } else {
    console.log('No active process to abort');
  }
}

// Function to create a new process controller
export function createProcessController(): AbortController {
  // Cancel old process if one exists
  if (activeProcess) {
    console.log('Canceling previous process before starting new one');
    try {
      activeProcess.abort();
    } catch (e) {
      console.error('Error canceling previous process:', e);
    }
  }
  
  // Create and store new controller
  console.log('Creating new process controller for SCREP parser');
  activeProcess = new AbortController();
  return activeProcess;
}
