
/**
 * End-to-End test for comparing parser flows
 * This utility confirms that both the upload flow and debug tool
 * produce identical results when parsing the same replay file.
 */
import { parseReplayInBrowser } from '../services/browserReplayParser';
import { parseReplayFile } from '../services/replayParserService';

/**
 * Runs an E2E test to verify that both parser flows produce identical results
 * 
 * @param file The replay file to test
 * @returns A test result object with information about the comparison
 */
export async function runE2EParserTest(file: File): Promise<{
  success: boolean;
  message: string;
  differences?: Record<string, { uploadFlow: any; debugFlow: any; }>;
}> {
  console.log("Running E2E parser test comparing upload and debug flows");
  
  try {
    // Parse using the browser parser directly (debug flow)
    console.log("Parsing with debug flow (browserReplayParser)...");
    const debugResult = await parseReplayInBrowser(file);
    
    // Parse using the upload service (upload flow)
    console.log("Parsing with upload flow (replayParserService)...");
    const uploadResult = await parseReplayFile(file);
    
    // Compare results
    const differences: Record<string, { uploadFlow: any; debugFlow: any; }> = {};
    let differenceCount = 0;
    
    // Check for key differences in the essential fields
    const essentialFields = [
      'playerName', 'opponentName', 'playerRace', 'opponentRace', 
      'map', 'matchup', 'duration', 'result', 'apm'
    ];
    
    essentialFields.forEach(field => {
      if (JSON.stringify(debugResult[field]) !== JSON.stringify(uploadResult[field])) {
        differences[field] = {
          debugFlow: debugResult[field],
          uploadFlow: uploadResult[field]
        };
        differenceCount++;
      }
    });
    
    if (differenceCount === 0) {
      return {
        success: true,
        message: "✅ E2E Test erfolgreich: Debug- und Upload-Flow liefern identische Ergebnisse"
      };
    } else {
      return {
        success: false,
        message: `❌ E2E Test fehlgeschlagen: ${differenceCount} Unterschiede gefunden`,
        differences
      };
    }
  } catch (error) {
    console.error("E2E Parser Test failed:", error);
    return {
      success: false,
      message: `❌ E2E Test fehlgeschlagen mit Fehler: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
