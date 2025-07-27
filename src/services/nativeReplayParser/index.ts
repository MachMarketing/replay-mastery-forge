/**
 * Unified Replay Parser - consolidates all parsing strategies
 */

import { UnifiedReplayParser } from '../replayParser/unifiedParser';

// Use the unified parser as the main entry point
export const parseReplay = async (file: File) => {
  const buffer = await file.arrayBuffer();
  return await UnifiedReplayParser.parseReplay(buffer);
};

export { UnifiedReplayParser };

// Legacy exports for compatibility
export type FinalReplayResult = any; // Will be replaced with proper types
export { UnifiedReplayParser as ScrepJsParser };