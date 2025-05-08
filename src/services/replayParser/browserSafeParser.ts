
/**
 * Browser-safe wrapper for JSSUH replay parser
 */

// Import as named export to ensure we access it properly
import { ReplayParser } from 'jssuh';

// Track initialization state
let isInitialized = false;
let replayParserConstructor: any = null;

/**
 * Initialize the browser-safe parser
 */
export async function initBrowserSafeParser(): Promise<void> {
  if (isInitialized) {
    console.log('[browserSafeParser] Parser already initialized');
    return;
  }
  
  try {
    // Get the ReplayParser constructor and check if it exists
    console.log('[browserSafeParser] Attempting to initialize parser, ReplayParser:', typeof ReplayParser);
    
    if (!ReplayParser) {
      throw new Error('JSSUH ReplayParser not found');
    }
    
    // Create a test instance to verify functionality
    try {
      const testParser = new ReplayParser({ encoding: "cp1252" });
      console.log('[browserSafeParser] Test parser created successfully');
      console.log('[browserSafeParser] Test parser has these methods:', Object.keys(testParser));
      
      // Store the constructor for future use
      replayParserConstructor = ReplayParser;
      isInitialized = true;
      
      console.log('[browserSafeParser] ✅ Browser-safe parser initialized successfully');
    } catch (innerError) {
      console.error('[browserSafeParser] Failed to create test parser instance:', innerError);
      throw new Error(`Failed to create parser instance: ${innerError}`);
    }
  } catch (err) {
    console.error('[browserSafeParser] Failed to initialize browser-safe parser:', err);
    throw new Error(`Failed to initialize replay parser: ${err}`);
  }
}

/**
 * Parse a replay file using the browser-safe JSSUH parser
 */
export async function parseReplayWithBrowserSafeParser(data: Uint8Array): Promise<any> {
  if (!isInitialized || !replayParserConstructor) {
    await initBrowserSafeParser();
  }
  
  return new Promise((resolve, reject) => {
    try {
      console.log('[browserSafeParser] Creating parser instance');
      const ReplayParserClass = replayParserConstructor;
      
      // Create a parser instance with explicit class reference
      const parser = new ReplayParserClass({ encoding: "cp1252" });
      console.log('[browserSafeParser] Created ReplayParser instance successfully');
      
      // Create collectors for the parsed data
      let headerData: any = null;
      let commandsData: any[] = [];
      let chatMessagesData: any[] = [];
      let playersData: any[] = [];
      
      // Event listeners to collect data
      parser.on('header', (header: any) => {
        console.log('[browserSafeParser] Header received:', header?.game);
        headerData = header;
      });
      
      parser.on('player', (player: any) => {
        console.log('[browserSafeParser] Player received:', player?.name);
        playersData.push(player);
      });
      
      parser.on('command', (command: any) => {
        // Don't log every command as it would flood the console
        if (commandsData.length === 0) {
          console.log('[browserSafeParser] First command received');
        }
        commandsData.push(command);
      });
      
      parser.on('chatmessage', (message: any) => {
        console.log('[browserSafeParser] Chat message received');
        chatMessagesData.push(message);
      });
      
      parser.on('error', (error: any) => {
        console.error('[browserSafeParser] Parser error:', error);
        reject(error);
      });
      
      parser.on('end', () => {
        console.log('[browserSafeParser] Parsing completed');
        console.log('[browserSafeParser] Collected data summary:');
        console.log(`- Header: ${headerData ? 'Present' : 'Missing'}`);
        console.log(`- Players: ${playersData.length}`);
        console.log(`- Commands: ${commandsData.length}`);
        console.log(`- Chat messages: ${chatMessagesData.length}`);
        
        // Assemble the full data object
        const parsedData = {
          header: headerData,
          players: playersData,
          commands: commandsData,
          chatMessages: chatMessagesData
        };
        
        resolve(parsedData);
      });
      
      // Direct write approach for browser compatibility
      console.log('[browserSafeParser] Writing data to parser:', data.length, 'bytes');
      parser.write(data);
      parser.end();
      console.log('[browserSafeParser] Data written to parser');
      
    } catch (error) {
      console.error('[browserSafeParser] Parsing error:', error);
      reject(error);
    }
  });
}
