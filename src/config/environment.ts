
/**
 * Environment configuration
 */

// API configuration
export const API_CONFIG = {
  // Go-based microservice URL for replay parsing with icza/screp
  SCREP_API_URL: import.meta.env.VITE_PARSER_URL || 'http://localhost:8000',
  
  // Feature flags
  ENABLE_BROWSER_PARSER: false, // Use Go microservice instead
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true'
};
