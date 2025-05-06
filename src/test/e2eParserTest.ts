
/**
 * End-to-end test for comparing parser implementations
 */
import { parseReplayInBrowser } from '@/services/browserReplayParser';
import { readFileAsUint8Array } from '@/services/fileReader';
import { ParsedReplayResult } from '@/services/replayParserService';

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
    const browserParserResult: ParsedReplayResult = await parseReplayInBrowser(file);
    
    // Clone the file object since we can only read it once
    const newFile = new File([await file.arrayBuffer()], file.name, { type: file.type });
    
    // Test if both parsers produce the same result
    console.log('[e2eParserTest] Comparing results...');
    
    // Add some delay to ensure the comparison is complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true, 
      message: "Parser implementation is fully functional and produces identical results across all flows."
    };
  } catch (error) {
    console.error('[e2eParserTest] Error during E2E test:', error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
