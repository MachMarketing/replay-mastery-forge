
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
  section: (message: string) => console.log(`\n\x1b[35m======== ${message} ========\x1b[0m\n`),
  debug: (message: string, ...args: any[]) => console.log(`\x1b[90m[DEBUG]\x1b[0m ${message}`, ...args)
};

/**
 * Creates a File object from a local file path for testing purposes
 */
function createFileFromPath(filePath: string, fileName: string = path.basename(filePath)): File {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = new Uint8Array(fileBuffer).buffer;
    
    // Log file stats
    logger.debug(`File ${fileName} stats:`, {
      size: fileBuffer.length,
      firstBytes: Array.from(fileBuffer.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '),
    });
    
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
    logger.debug('Parser environment check:', {
      isNode: typeof process !== 'undefined' && process.versions && process.versions.node,
      isBrowser: typeof window !== 'undefined',
      hasFileAPI: typeof File !== 'undefined',
      hasBuffer: typeof Buffer !== 'undefined',
    });
    
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

/**
 * Browser-compatible test runner
 * This can be used in browser environments where File API is available but fs is not
 */
export async function runBrowserParserTest(replayFile: File): Promise<ParsedReplayResult> {
  logger.section('BROWSER PARSER TEST');
  
  try {
    logger.info(`Testing parser with file: ${replayFile.name} (${replayFile.size} bytes)`);
    
    // Run the parser
    logger.section('RUNNING BROWSER PARSER');
    const result = await parseReplayInBrowser(replayFile);
    
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
    logger.error('Browser parser test failed:', error);
    throw error;
  }
}

// Modified Node.js entry point check that works in browser environments
// Instead of using require.main === module which is Node.js specific
// Use a check that will safely execute in both environments
const isDirectlyExecuted = typeof process !== 'undefined' && 
                          typeof process.versions !== 'undefined' && 
                          typeof process.versions.node !== 'undefined' &&
                          typeof module !== 'undefined' &&
                          typeof require !== 'undefined' &&
                          require.main === module;

if (isDirectlyExecuted) {
  const filePath = process.argv[2]; // Optional file path argument
  runParserTest(filePath)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
