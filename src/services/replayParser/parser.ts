
/**
 * This file contains functionality for parsing StarCraft: Brood War replay files
 * using the SCREP parser API.
 */
import type { ParsedReplayData } from './types';

// Export constants for API access
export const DEFAULT_SCREP_API_URL = 'http://localhost:8000/parse';

/**
 * Parse a StarCraft: Brood War replay file using the SCREP API
 * 
 * @param file The replay file to parse
 * @returns The parsed replay data
 * @throws Error if parsing fails
 */
export async function parseReplayFile(file: File): Promise<ParsedReplayData | null> {
  console.log('🔍 [parser.ts] Starting to parse file with SCREP API:', file.name);
  
  try {
    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', file);
    
    // Get API URL (fallback to default if not configured)
    const apiUrl = process.env.SCREP_API_URL || DEFAULT_SCREP_API_URL;
    console.log('🔍 [parser.ts] Using SCREP API URL:', apiUrl);
    
    // Send the request to the SCREP API
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      // Using 60 second timeout for large files
      signal: AbortSignal.timeout(60000)
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SCREP API error (${response.status}): ${errorText}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    console.log('🔍 [parser.ts] SCREP API returned data successfully');
    
    return data;
  } catch (error) {
    console.error('❌ [parser.ts] Error parsing replay with SCREP API:', error);
    throw new Error(`SCREP parsing error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Create an abort controller for managing parser process
let activeController: AbortController | null = null;

export function createProcessController(): AbortController {
  // Cancel previous controller if exists
  if (activeController) {
    try {
      activeController.abort();
    } catch (e) {
      console.error('Error canceling previous process:', e);
    }
  }
  
  // Create new controller
  activeController = new AbortController();
  return activeController;
}

export function abortActiveProcess(): void {
  if (activeController) {
    try {
      activeController.abort();
      console.log('[parser.ts] Aborted active SCREP parsing process');
    } catch (e) {
      console.error('[parser.ts] Error during abort:', e);
    } finally {
      activeController = null;
    }
  }
}
