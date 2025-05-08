
/**
 * This file contains functionality for parsing StarCraft: Brood War replay files
 * using the SCREP parser API.
 */
import type { ParsedReplayData } from './types';
import { API_CONFIG } from '@/config/environment';

// Export constants for API access
export const DEFAULT_SCREP_API_URL = API_CONFIG.SCREP_API_URL;

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
    
    // Get API URL from our centralized config
    const apiUrl = DEFAULT_SCREP_API_URL;
    console.log('🔍 [parser.ts] Using SCREP API URL:', apiUrl);
    
    // Generate a unique identifier for this parse request to track logs
    const parseId = Math.random().toString(36).substring(2, 10);
    console.log(`🔍 [parser.ts] Parse request ID: ${parseId}`);
    
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
      console.error(`❌ [parser.ts] API error response (${parseId}):`, errorText);
      throw new Error(`SCREP API error (${response.status}): ${errorText}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    console.log(`🔍 [parser.ts] SCREP API returned data (${parseId}):`, data);
    
    // Verify we have actual data before continuing
    if (!data || (data && Object.keys(data).length === 0)) {
      console.error(`❌ [parser.ts] Received empty data from API (${parseId})`);
      throw new Error('Received empty data from SCREP API');
    }
    
    // If the API returns an error field, throw it
    if (data.error) {
      throw new Error(`API error: ${data.error}`);
    }
    
    // Print data structure in logs to help with debugging
    if (data.header) {
      console.log(`🔍 [parser.ts] Replay header keys (${parseId}):`, Object.keys(data.header));
      if (data.header.frames) {
        console.log(`🔍 [parser.ts] Replay frames (${parseId}):`, data.header.frames);
      }
    }
    
    if (data.players && data.players.length > 0) {
      console.log(`🔍 [parser.ts] Player data available (${parseId}):`, 
        data.players.length, 'players');
        
      // Log the structure of player data to help debug
      const playerKeys = Object.keys(data.players[0]);
      console.log(`🔍 [parser.ts] First player data keys (${parseId}):`, playerKeys);
      
      // Log build order/actions data if available
      if (data.players[0].actions) {
        console.log(`🔍 [parser.ts] Player actions available (${parseId})`);
      }
      
      if (data.players[0].buildOrder) {
        console.log(`🔍 [parser.ts] Player build order available (${parseId})`);
      }
    }
    
    // Add a unique identifier to the data
    data.uniqueId = file.name + '_' + parseId;
    
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
