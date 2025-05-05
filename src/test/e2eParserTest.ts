
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
    // First validate the file exists and is a proper replay file
    if (!file || file.size === 0) {
      return {
        success: false,
        message: "❌ E2E Test fehlgeschlagen: Ungültige oder leere Datei"
      };
    }
    
    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'rep') {
      return {
        success: false,
        message: "❌ E2E Test fehlgeschlagen: Ungültiger Dateityp, nur .rep Dateien werden unterstützt"
      };
    }
    
    // Parse using the browser parser directly (debug flow)
    console.log("Parsing with debug flow (browserReplayParser)...");
    let debugResult;
    try {
      debugResult = await parseReplayInBrowser(file);
    } catch (error) {
      // Handle the specific makeslice error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
        return {
          success: false,
          message: "❌ E2E Test fehlgeschlagen: Die Replay-Datei scheint beschädigt zu sein. Der Parser kann die Dateistruktur nicht korrekt lesen."
        };
      }
      
      return {
        success: false,
        message: `❌ E2E Test fehlgeschlagen (debug flow): ${errorMessage}`
      };
    }
    
    // Parse using the upload service (upload flow)
    console.log("Parsing with upload flow (replayParserService)...");
    let uploadResult;
    try {
      uploadResult = await parseReplayFile(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `❌ E2E Test fehlgeschlagen (upload flow): ${errorMessage}`
      };
    }
    
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
    
    // Provide a more user-friendly error message
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle the specific WASM slice error
    if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
      errorMessage = 'Replay-Datei scheint beschädigt zu sein. Der Parser kann die Dateistruktur nicht korrekt lesen.';
    }
    
    return {
      success: false,
      message: `❌ E2E Test fehlgeschlagen mit Fehler: ${errorMessage}`
    };
  }
}
