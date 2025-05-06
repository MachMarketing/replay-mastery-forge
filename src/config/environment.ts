
/**
 * Environment configuration
 */

// API configuration
export const API_CONFIG = {
  // Default SCREP API URL for server-side parsing (if available)
  SCREP_API_URL: import.meta.env.VITE_SCREP_API_URL || '/api/parse',
  
  // Feature flags
  ENABLE_BROWSER_PARSER: import.meta.env.VITE_ENABLE_BROWSER_PARSER !== 'false',
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true'
};
