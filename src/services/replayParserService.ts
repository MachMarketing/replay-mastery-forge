import {
  ParsedReplayData,
  parseReplayFile,
  analyzeReplayData,
  DEFAULT_SCREP_API_URL
} from './replayParser';

// Re-export all the types and functions
export {
  ParsedReplayData,
  parseReplayFile,
  analyzeReplayData,
  DEFAULT_SCREP_API_URL
};

// Export the deprecated SCREP_API_URL constant for backward compatibility
export const SCREP_API_URL = DEFAULT_SCREP_API_URL;
