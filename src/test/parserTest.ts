
import { parseReplayInBrowser } from '../services/browserReplayParser';
import { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';
import { ParsedReplayResult } from '../services/replayParserService';

// Logger utility to make console output more readable
const logger = {
  info: (message: string, ...args: any[]) => console.log(`\x1b[36m[INFO]\x1b[0m ${message}`, ...args),
  success: (message: string, ...args: any[]) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.log(`\x1b[31m[ERROR]\x1b[0m ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.log(`\x1b[33m[WARNING]\x1b[0m ${message}`, ...args),
  section: (message: string) => console.log(`\n\x1b[35m======== ${message} ========\x1b[0m\n`)
};

/**
 * Creates a File object from a local file path for testing purposes
 */
function createFileFromPath(filePath: string, fileName: string = path.basename(filePath)): File {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = new Uint8Array(fileBuffer).buffer;
    
    // Create a File object using the Blob API
    // Note: In Node.js environments, we need to manually create a File-like object
    return new File([arrayBuffer], fileName, { type: 'application/octet-stream' });
  } catch (error) {
    logger.error(`Failed to create File from ${filePath}:`, error);
    throw new Error(`Could not create File from path: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Run the test with a provided .rep file path
 */
export async function runParserTest(replayFilePath?: string): Promise<ParsedReplayResult> {
  logger.section('WASM PARSER TEST');
  
  try {
    // Use either the provided path or look for a default test file
    const filePath = replayFilePath || findDefaultReplayFile();
    
    if (!filePath) {
      logger.error('No replay file provided or found. Please provide a path to a .rep file.');
      process.exit(1);
    }
    
    logger.info(`Testing parser with file: ${filePath}`);
    const file = createFileFromPath(filePath);
    logger.info(`Created File object: ${file.name} (${file.size} bytes)`);
    
    // Run the parser
    logger.section('RUNNING PARSER');
    const result = await parseReplayInBrowser(file);
    
    // Display results
    logger.section('TEST RESULTS');
    logger.success('Parser completed successfully!');
    logger.info('Parsed data summary:');
    console.log({
      playerName: result.playerName,
      opponentName: result.opponentName,
      map: result.map,
      playerRace: result.playerRace,
      opponentRace: result.opponentRace,
      result: result.result,
      duration: result.duration,
      apm: result.apm,
      buildOrderCount: result.buildOrder?.length
    });
    
    return result;
  } catch (error) {
    logger.section('TEST ERROR');
    logger.error('Parser test failed:', error);
    throw error;
  }
}

/**
 * Look for a default replay file in common test locations
 */
function findDefaultReplayFile(): string | null {
  const commonTestPaths = [
    './test/fixtures/sample.rep',
    './tests/fixtures/sample.rep',
    './src/test/fixtures/sample.rep',
    './fixtures/sample.rep',
    './sample.rep',
    './test.rep'
  ];
  
  for (const testPath of commonTestPaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }
  
  return null;
}

// If this file is run directly (not imported), execute the test
if (require.main === module) {
  const filePath = process.argv[2]; // Optional file path argument
  runParserTest(filePath)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
