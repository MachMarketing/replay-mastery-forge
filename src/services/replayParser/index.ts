
import { analyzeReplayData } from './analyzer';
import { transformJSSUHData } from './transformer';
import type { ParsedReplayData, ReplayAnalysis } from './types';
import type { ParsedReplayResult } from '../replayParserService';

export { analyzeReplayData, transformJSSUHData };
export type { ParsedReplayData, ReplayAnalysis, ParsedReplayResult };

// The real parsing is now done with JSSUH library via browserReplayParser.ts
// This file mainly serves as a coordinator for aborting long-running processes

// Global variable to track active processes
let activeProcess: AbortController | null = null;

// Export helper to support ending processes that get stuck
export function abortLongRunningProcess(): void {
  console.log('Aborting long running JSSUH parsing process');
  
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
  
  // Import wasmLoader dynamically to avoid circular dependencies
  import('../wasmLoader').then(wasmLoader => {
    // Reset WASM status to ensure clean state for next parse
    console.log('Resetting WASM initialization state for JSSUH parser');
    wasmLoader.forceWasmReset();
  }).catch(err => {
    console.error('Failed to reset WASM state during abort:', err);
  });
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
  console.log('Creating new process controller for JSSUH parser');
  activeProcess = new AbortController();
  return activeProcess;
}
