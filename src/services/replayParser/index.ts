
import { parseReplayFile } from './parser';
import { analyzeReplayData } from './analyzer';
import type { ParsedReplayData, ReplayAnalysis, ParsedReplayResult } from './types';

export { parseReplayFile, analyzeReplayData };
export type { ParsedReplayData, ReplayAnalysis, ParsedReplayResult };

// Export default URL for backwards compatibility
export const DEFAULT_SCREP_API_URL = 'https://api.replayanalyzer.com/parse';
