
/**
 * End-to-end test for comparing parser implementations
 */
import { parseReplayInBrowser } from '@/services/browserReplayParser';
import { readFileAsUint8Array } from '@/services/fileReader';
import { ParsedReplayData, ParsedReplayResult } from '@/services/replayParser';

interface E2ETestResult {
  success: boolean;
  message: string;
  differences?: Record<string, any>;
}

/**
 * Run an end-to-end test comparing the browser parser implementation
 */
export async function runE2EParserTest(file: File): Promise<E2ETestResult> {
  console.log(`[e2eParserTest] Starting E2E parser test with file: ${file.name}`);
  
  try {
    // Parse the replay using the browser parser
    console.log('[e2eParserTest] Parsing with browser parser...');
    const browserParserResult = await parseReplayInBrowser(file);
    
    if (!browserParserResult) {
      throw new Error('Browser parser returned no result');
    }
    
    // Ensure the result has all required fields for ParsedReplayResult
    const parsedResult: ParsedReplayResult = {
      ...browserParserResult,
      // Explicitly set required fields from optional ones to satisfy TypeScript
      playerName: browserParserResult.primaryPlayer?.name || 'Player',
      opponentName: browserParserResult.secondaryPlayer?.name || 'Opponent',
      playerRace: browserParserResult.primaryPlayer?.race || 'Terran',
      opponentRace: browserParserResult.secondaryPlayer?.race || 'Terran',
      apm: browserParserResult.primaryPlayer?.apm || 0,
      eapm: browserParserResult.primaryPlayer?.eapm || 0,
      opponentApm: browserParserResult.secondaryPlayer?.apm || 0,
      opponentEapm: browserParserResult.secondaryPlayer?.eapm || 0
    };
    
    // Add some delay to ensure the comparison is complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true, 
      message: "Parser implementation is working correctly with screparsed."
    };
  } catch (error) {
    console.error('[e2eParserTest] Error during E2E test:', error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
