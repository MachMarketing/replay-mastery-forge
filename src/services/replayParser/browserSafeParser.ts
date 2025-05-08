
/**
 * Browser-safe wrapper for JSSUH replay parser
 */

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
    // Get the ReplayParser constructor
    if (!ReplayParser) {
      throw new Error('JSSUH ReplayParser not found');
    }
    
    console.log('[browserSafeParser] Successfully obtained ReplayParser constructor');
    
    // Test that we can create an instance
    const testParser = new ReplayParser({ encoding: "cp1252" });
    console.log('[browserSafeParser] Test parser has these methods:', Object.keys(testParser));
    
    // Check if necessary methods exist
    if (!testParser._pipeChk) {
      throw new Error('Required parser methods not found');
    }
    
    console.log('[browserSafeParser] ✅ pipeChk method found on parser');
    
    // Store the constructor for future use
    replayParserConstructor = ReplayParser;
    isInitialized = true;
    
    console.log('[browserSafeParser] Browser-safe parser initialized successfully');
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
      console.log('[browserSafeParser] Parsing replay data (' + data.length + ' bytes)');
      console.log('[browserSafeParser] Creating parser instance');
      
      // Create a parser instance
      const parser = new replayParserConstructor({ encoding: "cp1252" });
      console.log('[browserSafeParser] Created ReplayParser instance with options:', { encoding: "cp1252" });
      
      // Create collectors for the parsed data
      let headerData: any = null;
      let commandsData: any[] = [];
      let chatMessagesData: any[] = [];
      let playersData: any[] = [];
      
      // Event listeners to collect data
      parser.on('header', (header: any) => {
        headerData = header;
      });
      
      parser.on('player', (player: any) => {
        playersData.push(player);
      });
      
      parser.on('command', (command: any) => {
        commandsData.push(command);
      });
      
      parser.on('chatmessage', (message: any) => {
        chatMessagesData.push(message);
      });
      
      parser.on('error', (error: any) => {
        console.error('[browserSafeParser] Parser error:', error);
        reject(error);
      });
      
      parser.on('end', () => {
        console.log('[browserSafeParser] Parsing completed');
        
        // Assemble the full data object
        const parsedData = {
          header: headerData,
          players: playersData,
          commands: commandsData,
          chatMessages: chatMessagesData
        };
        
        resolve(parsedData);
      });
      
      // We can't use streaming in the browser, we need to use direct write
      console.log('[browserSafeParser] Using direct write approach for browser compatibility');
      
      // Use setTimeout to prevent blocking
      setTimeout(() => {
        try {
          // Write all data at once to the parser
          parser.write(data);
          // Signal the end of the data
          parser.end();
        } catch (error) {
          console.error('[browserSafeParser] Error processing replay data:', error);
          reject(error);
        }
      }, 0);
      
    } catch (error) {
      console.error('[browserSafeParser] Parsing error:', error);
      reject(error);
    }
  });
}
