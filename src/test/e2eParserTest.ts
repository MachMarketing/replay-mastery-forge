
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
    
    // Additional validation for file size
    if (file.size < 100) {
      return {
        success: false,
        message: "❌ E2E Test fehlgeschlagen: Die Datei ist zu klein, um eine gültige Replay-Datei zu sein"
      };
    }
    
    if (file.size > 5000000) {
      return {
        success: false,
        message: "❌ E2E Test fehlgeschlagen: Die Datei ist zu groß (max. 5MB)"
      };
    }
    
    // New validation - check for file signature
    try {
      const buffer = await file.arrayBuffer();
      const signature = new Uint8Array(buffer, 0, 4);
      const signatureStr = String.fromCharCode(...signature);
      
      // StarCraft replays typically start with "(B)w" or "(B)W"
      if (signatureStr !== "(B)w" && signatureStr !== "(B)W") {
        console.warn("❌ Invalid replay file signature detected:", signatureStr);
        return {
          success: false,
          message: "❌ E2E Test fehlgeschlagen: Die Datei hat kein gültiges StarCraft-Replay-Format"
        };
      }
    } catch (signatureError) {
      console.warn("Failed to check file signature:", signatureError);
      // Continue anyway, as the main parsers will do their own validation
    }
    
    // Parse using the browser parser directly (debug flow)
    console.log("Parsing with debug flow (browserReplayParser)...");
    let debugResult;
    try {
      debugResult = await parseReplayInBrowser(file);
    } catch (error) {
      // Handle specific makeslice error with detailed message
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
        console.error("💥 WASM makeslice error during debug flow:", errorMessage);
        return {
          success: false,
          message: "❌ E2E Test fehlgeschlagen: Die Replay-Datei scheint beschädigt zu sein. Der Parser kann die Dateistruktur nicht korrekt lesen."
        };
      }
      
      if (errorMessage.includes('timeout')) {
        return {
          success: false,
          message: "❌ E2E Test fehlgeschlagen: Zeitüberschreitung beim Parsen. Die Datei ist möglicherweise zu komplex oder enthält ungewöhnliche Daten."
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
      
      // Handle specific makeslice error
      if (errorMessage.includes('len out of range') || errorMessage.includes('makeslice')) {
        console.error("💥 WASM makeslice error during upload flow:", errorMessage);
        return {
          success: false,
          message: "❌ E2E Test fehlgeschlagen: Die Replay-Datei scheint beschädigt zu sein. Der Parser kann die Dateistruktur nicht korrekt lesen."
        };
      }
      
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
      console.error("💥 WASM makeslice error in e2eParserTest main flow:", errorMessage);
      errorMessage = 'Replay-Datei scheint beschädigt zu sein. Der Parser kann die Dateistruktur nicht korrekt lesen.';
    }
    
    return {
      success: false,
      message: `❌ E2E Test fehlgeschlagen mit Fehler: ${errorMessage}`
    };
  }
}
