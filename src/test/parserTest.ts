
/**
 * Test utilities for the replay parser system
 */
import { parseReplayInBrowser } from '@/services/browserReplayParser';
import { readFileAsUint8Array } from '@/services/fileReader';

/**
 * Run a test of the browser parser with the given file
 */
export async function runBrowserParserTest(file: File): Promise<any> {
  console.log(`[parserTest] Starting browser parser test with file: ${file.name}`);
  
  try {
    // Read the file content directly
    console.log('[parserTest] Reading file contents...');
    const fileData = await readFileAsUint8Array(file);
    console.log(`[parserTest] File read successfully, size: ${fileData.length} bytes`);
    
    // Parse the replay using our unified browser parser
    console.log('[parserTest] Calling parseReplayInBrowser...');
    const parsedData = await parseReplayInBrowser(file);
    
    // Log success and return the parsed data
    console.log('[parserTest] Test completed successfully');
    return parsedData;
  } catch (error) {
    console.error('[parserTest] Error during parser test:', error);
    throw error;
  }
}
