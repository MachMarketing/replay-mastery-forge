
import type { ParsedReplayData } from './types';
import { transformScrepData } from './transformer';

// Configuration for the SCREP service
export const DEFAULT_SCREP_API_URL = 'https://api.replayanalyzer.com/parse';

/**
 * Parse a StarCraft: Brood War replay file (.rep)
 * @param file The replay file to parse
 * @param parserUrl The URL of the SCREP parser service
 * @returns The parsed replay data
 */
export async function parseReplayFile(file: File, parserUrl: string): Promise<ParsedReplayData | null> {
  try {
    // Convert the file to an ArrayBuffer for WASM processing
    const arrayBuffer = await file.arrayBuffer();
    
    // Call the SCREP Web API to parse the replay
    const formData = new FormData();
    formData.append('file', new Blob([arrayBuffer]), file.name);
    
    console.log('Sending replay file to parsing service:', parserUrl);
    
    // Send the file to our backend SCREP service
    const response = await fetch(parserUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Replay parsing service error: ${response.statusText}`);
    }
    
    // Process the parsed data from SCREP
    const screpData = await response.json();
    console.log('SCREP parsing complete:', screpData);
    
    // Transform SCREP data into our application format
    return transformScrepData(screpData);
  } catch (error) {
    console.error('Error parsing replay file:', error);
    return null;
  }
}
