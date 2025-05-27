
/**
 * Environment configuration
 */

// API configuration
export const API_CONFIG = {
  // Supabase Edge Function URL for bwscrep parsing
  SCREP_API_URL: import.meta.env.VITE_PARSER_URL || 'https://ijletuopynpqyundrfdq.supabase.co/functions/v1/parseReplay',
  
  // Feature flags
  ENABLE_BROWSER_PARSER: false, // Disable browser parser, use Supabase Edge Function
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true'
};
