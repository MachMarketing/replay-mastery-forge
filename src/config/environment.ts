
/**
 * Environment configuration for the application
 * Handles browser and server environments appropriately
 */

// API configuration
export const API_CONFIG = {
  SCREP_API_URL: getEnvVariable('SCREP_API_URL', '/api/parse')
};

/**
 * Gets an environment variable safely across different environments
 * Works in browser (via import.meta.env or window.ENV) and server contexts
 */
function getEnvVariable(key: string, defaultValue: string): string {
  // Try import.meta.env first (Vite standard)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  
  // Try window.ENV (custom solution)
  if (typeof window !== 'undefined' && (window as any).ENV && (window as any).ENV[key]) {
    return (window as any).ENV[key];
  }
  
  // Last resort, return default
  return defaultValue;
}
