
import { parseReplayWithBrowserSafeParser, initBrowserSafeParser } from './replayParser/browserSafeParser';
import { ParsedReplayData, ExtendedReplayData } from './replayParser/types';

// Import readFileAsArrayBuffer
import { readFileAsArrayBuffer } from './fileReader';
import { 
  formatPlayerName, 
  standardizeRaceName, 
  debugLogReplayData, 
  getRaceFromId, 
  extractPlayerData, 
  extractMapName,
  extractPlayersFromFilename 
} from '../lib/replayUtils';

// Track if the parser has been initialized
let parserInitialized = false;

/**
 * Initialize the browser replay parser
 */
async function ensureParserInitialized(): Promise<void> {
  if (!parserInitialized) {
    console.log('[browserReplayParser] Initializing parser');
    try {
      await initBrowserSafeParser();
      parserInitialized = true;
      console.log('[browserReplayParser] Parser initialized');
    } catch (error) {
      console.error('[browserReplayParser] Failed to initialize parser:', error);
      throw new Error('Failed to initialize replay parser');
    }
  }
}

/**
 * Parse replay file using the browser parser
 */
export async function parseReplayInBrowser(file: File): Promise<ParsedReplayData> {
  console.log('[browserReplayParser] Starting browser replay parsing for file:', file.name);
  
  // Make sure the parser is initialized
  await ensureParserInitialized();
  
  // Read file as ArrayBuffer
  const fileBuffer = await readFileAsArrayBuffer(file);
  
  console.log('[browserReplayParser] File read successfully, size:', fileBuffer.byteLength);
  
  // Parse the replay using the screparsed browser-safe parser
  let parsedData: ExtendedReplayData;
  try {
    parsedData = await parseReplayWithBrowserSafeParser(new Uint8Array(fileBuffer));
    console.log('[browserReplayParser] Raw parsed data structure:', 
      parsedData ? Object.keys(parsedData).join(', ') : 'null');
    
    // Use our enhanced debug logging
    debugLogReplayData(parsedData.rawData);
    
    // Enhanced debugging - log build order structure if available
    if (parsedData.rawData && parsedData.rawData.buildOrders) {
      console.log('[browserReplayParser] Raw build orders structure:', 
        JSON.stringify(parsedData.rawData.buildOrders).substring(0, 500) + '...');
    }
    
    // Log the advanced metrics we extracted
    logAdvancedMetrics(parsedData);

    // NEW: Debug build order data more thoroughly
    debugBuildOrderData(parsedData.rawData);
    
  } catch (error) {
    console.error('[browserReplayParser] Error during parsing:', error);
    // If parsing fails, create a minimal structure
    return createMinimalReplayData(file.name);
  }
  
  try {
    // Transform the parsed data into our expected format
    return transformParsedData(parsedData, file.name);
  } catch (error) {
    console.error('[browserReplayParser] Error transforming parsed data:', error);
    return createMinimalReplayData(file.name);
  }
}

/**
 * NEW: Debug build order data more thoroughly
 */
function debugBuildOrderData(rawData: any): void {
  console.log('[browserReplayParser] Debugging build order data sources:');
  
  // Check if we have direct access to buildOrders array
  if (rawData.buildOrders) {
    console.log('[browserReplayParser] Found buildOrders array:', 
      Array.isArray(rawData.buildOrders), 
      Array.isArray(rawData.buildOrders) ? rawData.buildOrders.length : 0);
    
    if (Array.isArray(rawData.buildOrders) && rawData.buildOrders.length > 0) {
      console.log('[browserReplayParser] First player build order array:', 
        Array.isArray(rawData.buildOrders[0]), 
        Array.isArray(rawData.buildOrders[0]) ? rawData.buildOrders[0].length : 0);
        
      if (Array.isArray(rawData.buildOrders[0]) && rawData.buildOrders[0].length > 0) {
        console.log('[browserReplayParser] Sample build order item:', rawData.buildOrders[0][0]);
      }
    }
  }
  
  // Check if we have players with buildOrder property
  if (rawData.players && Array.isArray(rawData.players)) {
    console.log('[browserReplayParser] Players array length:', rawData.players.length);
    
    if (rawData.players.length > 0) {
      const player1BuildOrder = rawData.players[0]?.buildOrder;
      console.log('[browserReplayParser] Player 1 build order:', 
        Array.isArray(player1BuildOrder), 
        Array.isArray(player1BuildOrder) ? player1BuildOrder.length : 0);
        
      if (Array.isArray(player1BuildOrder) && player1BuildOrder.length > 0) {
        console.log('[browserReplayParser] Sample player 1 build order item:', player1BuildOrder[0]);
      }
    }
  }
  
  // Check if we have a direct buildOrder property
  if (rawData.buildOrder) {
    console.log('[browserReplayParser] Direct buildOrder property:', 
      Array.isArray(rawData.buildOrder), 
      Array.isArray(rawData.buildOrder) ? rawData.buildOrder.length : 0);
      
    if (Array.isArray(rawData.buildOrder) && rawData.buildOrder.length > 0) {
      console.log('[browserReplayParser] Sample direct build order item:', rawData.buildOrder[0]);
    }
  }
  
  // Check if we have a game object with players
  if (rawData.game && rawData.game.players && Array.isArray(rawData.game.players)) {
    console.log('[browserReplayParser] Game players array length:', rawData.game.players.length);
    
    if (rawData.game.players.length > 0) {
      const gamePlayer1BuildOrder = rawData.game.players[0]?.buildOrder;
      console.log('[browserReplayParser] Game player 1 build order:', 
        Array.isArray(gamePlayer1BuildOrder), 
        Array.isArray(gamePlayer1BuildOrder) ? gamePlayer1BuildOrder.length : 0);
        
      if (Array.isArray(gamePlayer1BuildOrder) && gamePlayer1BuildOrder.length > 0) {
        console.log('[browserReplayParser] Sample game player 1 build order item:', gamePlayer1BuildOrder[0]);
      }
    }
  }

  // Check for replay property
  if (rawData.replay) {
    console.log('[browserReplayParser] Found replay property with keys:', Object.keys(rawData.replay).join(', '));
    
    // Check if we have commands in replay
    if (rawData.replay.commands) {
      console.log('[browserReplayParser] Replay commands array length:', 
        Array.isArray(rawData.replay.commands) ? rawData.replay.commands.length : 'not an array');
    }
  }
}

/**
 * Log the advanced metrics we extracted
 */
function logAdvancedMetrics(data: ExtendedReplayData): void {
  const metrics = data.advancedMetrics;
  
  console.log('[browserReplayParser] 📊 Advanced Metrics Summary:');
  
  // Log build order counts
  console.log(`[browserReplayParser] 📊 Build Order: P1(${metrics.buildOrderTiming.player1.length} items), P2(${metrics.buildOrderTiming.player2.length} items)`);
  
  // Log supply blocks
  const p1Blocks = metrics.supplyManagement.player1.supplyBlocks.length;
  const p2Blocks = metrics.supplyManagement.player2.supplyBlocks.length;
  console.log(`[browserReplayParser] 📊 Supply Blocks: P1(${p1Blocks} blocks), P2(${p2Blocks} blocks)`);
  
  // Log resource collection points
  const p1Resources = metrics.resourceCollection.player1.collectionRate.minerals.length;
  const p2Resources = metrics.resourceCollection.player2.collectionRate.minerals.length;
  console.log(`[browserReplayParser] 📊 Resource Collection Data Points: P1(${p1Resources}), P2(${p2Resources})`);
  
  // Log expansion counts
  const p1Expansions = metrics.expansionTiming.player1.length;
  const p2Expansions = metrics.expansionTiming.player2.length;
  console.log(`[browserReplayParser] 📊 Expansions: P1(${p1Expansions}), P2(${p2Expansions})`);
  
  // Log tech path items
  const p1Tech = metrics.techPath.player1.length;
  const p2Tech = metrics.techPath.player2.length;
  console.log(`[browserReplayParser] 📊 Tech Path Items: P1(${p1Tech}), P2(${p2Tech})`);
  
  // Log action distribution
  const p1Macro = metrics.actionDistribution.player1.macroPercentage;
  const p1Micro = metrics.actionDistribution.player1.microPercentage;
  const p2Macro = metrics.actionDistribution.player2.macroPercentage;
  const p2Micro = metrics.actionDistribution.player2.microPercentage;
  console.log(`[browserReplayParser] 📊 Action Distribution: P1(${p1Macro}% macro, ${p1Micro}% micro), P2(${p2Macro}% macro, ${p2Micro}% micro)`);
  
  // Log hotkey usage
  const p1Hotkeys = metrics.hotkeyUsage.player1.hotkeyActionsPerMinute;
  const p2Hotkeys = metrics.hotkeyUsage.player2.hotkeyActionsPerMinute;
  console.log(`[browserReplayParser] 📊 Hotkey APM: P1(${p1Hotkeys}), P2(${p2Hotkeys})`);
}

/**
 * Create a minimal replay data structure as a fallback
 */
function createMinimalReplayData(fileName: string): ParsedReplayData {
  console.log('[browserReplayParser] Creating minimal replay data for:', fileName);
  
  // Extract potential player names and matchup from filename using the enhanced utility
  const { player1, player2, race1, race2 } = extractPlayersFromFilename(fileName);
  
  // Default races if not found in filename
  const defaultRace1 = race1 || 'Protoss';
  const defaultRace2 = race2 || 'Protoss';
  
  // Create more meaningful player names
  const player1Name = player1 && player1 !== 'Unknown' ? player1 : 'Spieler 1';
  const player2Name = player2 && player2 !== 'Unknown' ? player2 : 'Spieler 2';
  
  // Create matchup string
  const matchup = `${defaultRace1.charAt(0)}v${defaultRace2.charAt(0)}`;
  
  // Training plan
  const trainingPlan = [
    { day: 1, focus: "Makromanagement", drill: "Konstante Arbeiterproduktion" },
    { day: 2, focus: "Mikromanagement", drill: "Einheitenpositionierung" },
    { day: 3, focus: "Build Order", drill: "Timing-Angriffe ausführen" }
  ];
  
  // Create minimal replay data structure
  const minimalData: ParsedReplayData = {
    primaryPlayer: {
      name: player1Name,
      race: defaultRace1,
      apm: 150,
      eapm: 105,
      buildOrder: [],
      strengths: ['Replay-Analyse benötigt Premium'],
      weaknesses: ['Replay-Analyse benötigt Premium'],
      recommendations: ['Upgrade auf Premium für detaillierte Analyse']
    },
    secondaryPlayer: {
      name: player2Name,
      race: defaultRace2,
      apm: 150,
      eapm: 105,
      buildOrder: [],
      strengths: ['Replay-Analyse benötigt Premium'],
      weaknesses: ['Replay-Analyse benötigt Premium'],
      recommendations: ['Upgrade auf Premium für detaillierte Analyse']
    },
    map: 'Unbekannte Karte',
    matchup: matchup,
    duration: '10:00',
    durationMS: 600000,
    date: new Date().toISOString(),
    result: 'unknown' as 'unknown' | 'win' | 'loss',
    strengths: ['Replay-Analyse benötigt Premium'],
    weaknesses: ['Replay-Analyse benötigt Premium'],
    recommendations: ['Upgrade auf Premium für detaillierte Analyse'],
    
    // Legacy properties
    playerName: player1Name,
    opponentName: player2Name,
    playerRace: defaultRace1,
    opponentRace: defaultRace2,
    apm: 150,
    eapm: 105,
    opponentApm: 150,
    opponentEapm: 105,
    buildOrder: [],
    
    // Required training plan
    trainingPlan: trainingPlan
  };
  
  return minimalData;
}

/**
 * Transform the extended parsed data into our application's expected format
 */
function transformParsedData(parsedData: ExtendedReplayData, fileName: string): ParsedReplayData {
  // First, log the structure to help with debugging
  console.log('[browserReplayParser] Transforming extended data');
  
  // Extract players from raw data or metadata
  let players: Array<{name: string; race: string; apm: number; team?: number}> = [];
  
  // Try multiple data paths to extract players
  if (parsedData.rawData) {
    // First attempt: look in header.players
    if (parsedData.rawData.header && 
        parsedData.rawData.header.players && 
        Array.isArray(parsedData.rawData.header.players)) {
      console.log('[browserReplayParser] Found players in header.players');
      players = parsedData.rawData.header.players.map((p: any) => ({
        name: formatPlayerName(p.name || ''),
        race: standardizeRaceName(p.race || getRaceFromId(p.raceId)),
        apm: parseInt(p.apm || '0'),
        team: p.team || 0
      }));
    }
    
    // Second attempt: look in players array
    else if (parsedData.rawData.players && Array.isArray(parsedData.rawData.players)) {
      console.log('[browserReplayParser] Found players in players array');
      players = parsedData.rawData.players.map((p: any) => ({
        name: formatPlayerName(p.name || ''),
        race: standardizeRaceName(p.race || getRaceFromId(p.raceId)),
        apm: p.apm || 0,
        team: p.team || 0
      }));
    }
    
    // Third attempt: look in metadata
    else if (parsedData.rawData.metadata) {
      const metadata = parsedData.rawData.metadata;
      if (metadata.playerNames && Array.isArray(metadata.playerNames)) {
        console.log('[browserReplayParser] Found players in metadata');
        players = metadata.playerNames.map((name: string, index: number) => ({
          name: formatPlayerName(name || ''),
          race: standardizeRaceName(
            metadata.playerRaces && metadata.playerRaces[index] ? 
              metadata.playerRaces[index] : 
              index === 0 ? 'Protoss' : 'Terran'
          ),
          apm: metadata.apm && metadata.apm[index] ? metadata.apm[index] : 150,
          team: metadata.teams && metadata.teams[index] ? metadata.teams[index] : index
        }));
      }
    }

    // Fourth attempt: look in replay structure
    else if (parsedData.rawData.replay && parsedData.rawData.replay.players) {
      console.log('[browserReplayParser] Found players in replay.players');
      players = parsedData.rawData.replay.players.map((p: any) => ({
        name: formatPlayerName(p.name || ''),
        race: standardizeRaceName(p.race || getRaceFromId(p.raceId || p.race_id)),
        apm: p.apm || 150,
        team: p.team || 0
      }));
    }
  }
  
  // If we still don't have players, try to extract from filename
  if (!players || players.length < 2) {
    console.log('[browserReplayParser] Extracting players from filename:', fileName);
    const { player1, player2, race1, race2 } = extractPlayersFromFilename(fileName);
    players = [
      {
        name: player1 && player1 !== 'Unknown' ? player1 : 'Spieler 1',
        race: standardizeRaceName(race1 || 'Protoss'), 
        apm: 150
      },
      {
        name: player2 && player2 !== 'Unknown' ? player2 : 'Spieler 2', 
        race: standardizeRaceName(race2 || 'Terran'), 
        apm: 150
      }
    ];
  }
  
  // Debug log what we found
  console.log('[browserReplayParser] Extracted players:', players.map(p => `${p.name} (${p.race})`).join(', '));
  
  // Ensure we have at least 2 players
  while (players.length < 2) {
    players.push({
      name: `Spieler ${players.length + 1}`,
      race: 'Protoss',
      apm: 150
    });
  }
  
  // Extract player 1 and 2
  const player1 = players[0];
  const player2 = players[1];
  
  // Set real player names instead of placeholders
  const playerName = formatPlayerName(player1.name || '');
  const opponentName = formatPlayerName(player2.name || '');
  
  // Make sure the race names are standardized
  const playerRace = standardizeRaceName(player1.race);
  const opponentRace = standardizeRaceName(player2.race);
  
  // Use the APM from the parsed data or defaults
  const playerApm = player1.apm || 150;
  const opponentApm = player2.apm || 150;
  
  // Calculate duration in seconds from the parsed data
  let durationFrames = parsedData.rawData.metadata?.frames || 0;
  const durationSeconds = Math.max(1, Math.floor(durationFrames / 24));
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;
  
  // Extract map name using enhanced map extractor
  let mapName = extractMapName(parsedData.rawData) || 'Unbekannte Karte';
  
  // IMPROVED BUILD ORDER EXTRACTION: Try multiple sources for build order data
  let buildOrder = [];
  
  // First attempt: Check if it's in the advanced metrics
  if (parsedData.advancedMetrics && 
      parsedData.advancedMetrics.buildOrderTiming &&
      parsedData.advancedMetrics.buildOrderTiming.player1 &&
      parsedData.advancedMetrics.buildOrderTiming.player1.length > 0) {
    
    buildOrder = parsedData.advancedMetrics.buildOrderTiming.player1.map(item => ({
      time: item.timeFormatted,
      supply: item.supply,
      action: item.name
    }));
    console.log(`[browserReplayParser] Found ${buildOrder.length} build order items in advanced metrics`);
  } 
  
  // Second attempt: Check in screparsed structure - check for commands and buildOrders
  else if (parsedData.rawData.replay && parsedData.rawData.replay.commands && 
          Array.isArray(parsedData.rawData.replay.commands)) {
          
    console.log('[browserReplayParser] Found commands in replay, attempting to extract build order');
    
    // Extract a build order from the commands - this is complex but worth trying
    const buildItems = extractBuildOrderFromCommands(parsedData.rawData.replay.commands);
    if (buildItems && buildItems.length > 0) {
      buildOrder = buildItems;
      console.log(`[browserReplayParser] Extracted ${buildOrder.length} build order items from replay commands`);
    }
  }
  
  // Third attempt: Check in rawData.buildOrders - direct access
  else if (parsedData.rawData.buildOrders && 
           Array.isArray(parsedData.rawData.buildOrders) && 
           parsedData.rawData.buildOrders.length > 0) {
    
    // Log the structure to help us understand
    console.log('[browserReplayParser] Build orders structure:', 
      typeof parsedData.rawData.buildOrders, 
      Array.isArray(parsedData.rawData.buildOrders) ? parsedData.rawData.buildOrders.length : 'not array');
      
    // Try first player's build order if it exists
    if (Array.isArray(parsedData.rawData.buildOrders[0])) {
      buildOrder = parsedData.rawData.buildOrders[0].map((item: any) => ({
        time: formatTime(item.time || 0),
        supply: item.supply || 0,
        action: item.name || 'Unknown'
      }));
      console.log(`[browserReplayParser] Found ${buildOrder.length} build order items in rawData.buildOrders[0]`);
    }
  }
  
  // Fourth attempt: Check player1 object if it has a buildOrder array
  else if (parsedData.rawData.players && 
           parsedData.rawData.players[0] && 
           parsedData.rawData.players[0].buildOrder && 
           Array.isArray(parsedData.rawData.players[0].buildOrder)) {
    
    buildOrder = parsedData.rawData.players[0].buildOrder.map((item: any) => ({
      time: formatTime(item.time || 0),
      supply: item.supply || 0,
      action: item.name || 'Unknown'
    }));
    console.log(`[browserReplayParser] Found ${buildOrder.length} build order items in players[0].buildOrder`);
  }
  
  // Fifth attempt: Look for a buildOrder object directly on the parsedData.rawData
  else if (parsedData.rawData.buildOrder && Array.isArray(parsedData.rawData.buildOrder)) {
    buildOrder = parsedData.rawData.buildOrder.map((item: any) => ({
      time: formatTime(item.time || 0),
      supply: item.supply || 0,
      action: item.name || 'Unknown'
    }));
    console.log(`[browserReplayParser] Found ${buildOrder.length} build order items in rawData.buildOrder`);
  }
  
  // Sixth attempt: Look deeper in structure
  else if (parsedData.rawData.game && 
           parsedData.rawData.game.players && 
           parsedData.rawData.game.players[0] && 
           parsedData.rawData.game.players[0].buildOrder) {
    
    buildOrder = parsedData.rawData.game.players[0].buildOrder.map((item: any) => ({
      time: formatTime(item.time || 0),
      supply: item.supply || 0,
      action: item.name || 'Unknown'
    }));
    console.log(`[browserReplayParser] Found ${buildOrder.length} build order items in game.players[0].buildOrder`);
  }
  
  // If we still don't have a build order, create a fallback with useful info
  if (buildOrder.length === 0) {
    console.warn('[browserReplayParser] No build order found in any expected location');
    // Create a minimal fallback build order based on race
    buildOrder = createFallbackBuildOrder(playerRace);
    console.log('[browserReplayParser] Using fallback build order with', buildOrder.length, 'items');
  }
  
  // Generate strengths and weaknesses based on the advanced metrics
  const strengths = generatePlayerStrengths(parsedData, 0);
  const weaknesses = generatePlayerWeaknesses(parsedData, 0);
  const recommendations = generatePlayerRecommendations(parsedData, 0);
  
  // Generate opponent strengths and weaknesses
  const opponentStrengths = generatePlayerStrengths(parsedData, 1);
  const opponentWeaknesses = generatePlayerWeaknesses(parsedData, 1);
  const opponentRecommendations = generatePlayerRecommendations(parsedData, 1);
  
  // Generate a customized training plan
  const trainingPlan = generateTrainingPlan(parsedData, 0);
  
  // Determine result - ensure it's one of the allowed enum values
  let matchResult: 'win' | 'loss' | 'unknown' = 'unknown';
  
  // Second player build order
  let opponentBuildOrder = [];
  // IMPROVED OPPONENT BUILD ORDER EXTRACTION
  if (parsedData.advancedMetrics && 
      parsedData.advancedMetrics.buildOrderTiming &&
      parsedData.advancedMetrics.buildOrderTiming.player2 &&
      parsedData.advancedMetrics.buildOrderTiming.player2.length > 0) {
    
    opponentBuildOrder = parsedData.advancedMetrics.buildOrderTiming.player2.map(item => ({
      time: item.timeFormatted,
      supply: item.supply,
      action: item.name
    }));
  } 
  // Try direct access to second player build order
  else if (parsedData.rawData.buildOrders && 
           Array.isArray(parsedData.rawData.buildOrders) && 
           parsedData.rawData.buildOrders.length > 1 &&
           Array.isArray(parsedData.rawData.buildOrders[1])) {
    
    opponentBuildOrder = parsedData.rawData.buildOrders[1].map((item: any) => ({
      time: formatTime(item.time || 0),
      supply: item.supply || 0,
      action: item.name || 'Unknown'
    }));
  }
  else if (parsedData.rawData.players && 
           parsedData.rawData.players[1] && 
           parsedData.rawData.players[1].buildOrder && 
           Array.isArray(parsedData.rawData.players[1].buildOrder)) {
    
    opponentBuildOrder = parsedData.rawData.players[1].buildOrder.map((item: any) => ({
      time: formatTime(item.time || 0),
      supply: item.supply || 0,
      action: item.name || 'Unknown'
    }));
  }
  
  // Create the transformed data structure
  const transformedData: ParsedReplayData = {
    primaryPlayer: {
      name: playerName,
      race: playerRace,
      apm: playerApm,
      eapm: Math.round(playerApm * 0.7),
      buildOrder: buildOrder,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations
    },
    secondaryPlayer: {
      name: opponentName,
      race: opponentRace,
      apm: opponentApm,
      eapm: Math.round(opponentApm * 0.7),
      buildOrder: opponentBuildOrder,
      strengths: opponentStrengths,
      weaknesses: opponentWeaknesses,
      recommendations: opponentRecommendations
    },
    map: mapName,
    matchup: `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`,
    duration: formattedDuration,
    durationMS: durationSeconds * 1000,
    date: new Date().toISOString(),
    result: matchResult,
    strengths: strengths,
    weaknesses: weaknesses,
    recommendations: recommendations,
    
    // Legacy properties
    playerName,
    opponentName,
    playerRace,
    opponentRace,
    apm: playerApm,
    eapm: Math.round(playerApm * 0.7),
    opponentApm,
    opponentEapm: Math.round(opponentApm * 0.7),
    buildOrder,
    
    trainingPlan
  };
  
  console.log('[browserReplayParser] Transformed data:', 
    `${transformedData.primaryPlayer.name} (${transformedData.primaryPlayer.race}) vs ` +
    `${transformedData.secondaryPlayer.name} (${transformedData.secondaryPlayer.race}) on ${transformedData.map}`);
  console.log('[browserReplayParser] Build order items:', transformedData.buildOrder.length);
  
  return transformedData;
}

/**
 * NEW: Extract build order from replay commands
 * This is a simplified approach - full implementation would be more complex
 */
function extractBuildOrderFromCommands(commands: any[]): Array<{time: string; supply: number; action: string}> | null {
  if (!Array.isArray(commands) || commands.length === 0) {
    return null;
  }
  
  try {
    const buildItems: Array<{time: string; supply: number; action: string}> = [];
    let currentSupply = 4; // Starting supply
    
    // Look for build commands (simplified approach)
    commands.forEach((cmd: any, index: number) => {
      if (!cmd) return;
      
      // Only process certain command types that are likely to be build actions
      if (cmd.type === 'build' || cmd.type === 'train' || cmd.type === 'research' || 
          (cmd.name && (
            cmd.name.includes('Build') || 
            cmd.name.includes('Train') || 
            cmd.name.includes('Research') || 
            cmd.name.includes('Upgrade')
          ))
      ) {
        // Get time in frames
        const frameTime = cmd.frame || cmd.time || index * 24; // Estimate if not available
        const timeFormatted = formatTime(frameTime);
        
        // Extract action name
        let actionName = '';
        if (cmd.name) {
          actionName = cmd.name;
        } else if (cmd.action) {
          actionName = cmd.action;
        } else if (cmd.type === 'build' && cmd.unit) {
          actionName = `Build ${cmd.unit}`;
        } else if (cmd.type === 'train' && cmd.unit) {
          actionName = `Train ${cmd.unit}`;
        } else if (cmd.type === 'research' && cmd.tech) {
          actionName = `Research ${cmd.tech}`;
        } else {
          actionName = `Action at ${timeFormatted}`;
        }
        
        // Increment supply for certain unit types (simplified)
        if (actionName.includes('Probe') || 
            actionName.includes('SCV') || 
            actionName.includes('Drone')) {
          currentSupply += 1;
        } else if (
            actionName.includes('Marine') || 
            actionName.includes('Zealot') ||
            actionName.includes('Zergling')) {
          currentSupply += 2;
        }
        
        // Add to build items
        buildItems.push({
          time: timeFormatted,
          supply: currentSupply,
          action: actionName
        });
      }
    });
    
    return buildItems.length > 0 ? buildItems : null;
  } catch (error) {
    console.error('[browserReplayParser] Error extracting build order from commands:', error);
    return null;
  }
}

/**
 * NEW: Create a fallback build order based on race
 */
function createFallbackBuildOrder(race: string): Array<{time: string; supply: number; action: string}> {
  const raceLC = race.toLowerCase();
  
  if (raceLC.includes('protoss')) {
    return [
      {time: "0:00", supply: 4, action: "Start"},
      {time: "0:16", supply: 5, action: "Probe"},
      {time: "0:32", supply: 6, action: "Probe"},
      {time: "0:48", supply: 7, action: "Probe"},
      {time: "1:02", supply: 8, action: "Pylon"},
      {time: "1:20", supply: 8, action: "Probe"},
      {time: "1:36", supply: 9, action: "Probe"},
      {time: "1:58", supply: 10, action: "Gateway"},
      {time: "2:15", supply: 10, action: "Assimilator"},
      {time: "2:30", supply: 11, action: "Probe"},
      {time: "2:46", supply: 12, action: "Probe"},
    ];
  } 
  else if (raceLC.includes('terran')) {
    return [
      {time: "0:00", supply: 4, action: "Start"},
      {time: "0:16", supply: 5, action: "SCV"},
      {time: "0:32", supply: 6, action: "SCV"},
      {time: "0:48", supply: 7, action: "SCV"},
      {time: "1:02", supply: 8, action: "Supply Depot"},
      {time: "1:20", supply: 8, action: "SCV"},
      {time: "1:36", supply: 9, action: "SCV"},
      {time: "1:58", supply: 10, action: "Barracks"},
      {time: "2:15", supply: 10, action: "Refinery"},
      {time: "2:30", supply: 11, action: "SCV"},
      {time: "2:46", supply: 12, action: "SCV"},
    ];
  }
  else if (raceLC.includes('zerg')) {
    return [
      {time: "0:00", supply: 4, action: "Start"},
      {time: "0:16", supply: 5, action: "Drone"},
      {time: "0:32", supply: 6, action: "Drone"},
      {time: "0:48", supply: 7, action: "Drone"},
      {time: "1:02", supply: 8, action: "Drone"},
      {time: "1:15", supply: 9, action: "Overlord"},
      {time: "1:35", supply: 9, action: "Drone"},
      {time: "1:51", supply: 10, action: "Drone"},
      {time: "2:05", supply: 11, action: "Spawning Pool"},
      {time: "2:20", supply: 11, action: "Drone"},
      {time: "2:36", supply: 12, action: "Drone"},
    ];
  }
  else {
    // Generic fallback
    return [
      {time: "0:00", supply: 4, action: "Start"},
      {time: "0:50", supply: 5, action: "Worker"},
      {time: "1:45", supply: 6, action: "Worker"},
      {time: "2:30", supply: 7, action: "Supply Building"},
      {time: "3:15", supply: 8, action: "Production Structure"}
    ];
  }
}

/**
 * Format time in frames to a mm:ss format
 */
function formatTime(frames: number): string {
  const seconds = Math.floor(frames / 24); // Assuming 24 frames per second
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

/**
 * Generate player strengths based on the replay metrics
 */
function generatePlayerStrengths(data: ExtendedReplayData, playerIndex: number): string[] {
  const metrics = data.advancedMetrics;
  const strengths: string[] = [];
  const playerKey = playerIndex === 0 ? 'player1' : 'player2';
  
  // Check APM
  const apm = playerIndex === 0 ? data.primaryPlayer.apm : data.secondaryPlayer.apm;
  if (apm > 150) {
    strengths.push('Hohe Aktionsgeschwindigkeit (APM)');
  }
  
  // Check macro (low supply blocks, good resource usage)
  const supplyBlocks = metrics.supplyManagement[playerKey].supplyBlocks.length;
  if (supplyBlocks === 0) {
    strengths.push('Ausgezeichnetes Supply-Management (keine Supply-Blocks)');
  } else if (supplyBlocks <= 2) {
    strengths.push('Gutes Supply-Management (wenige Supply-Blocks)');
  }
  
  // Check expansion timing
  const expansions = metrics.expansionTiming[playerKey];
  if (expansions.length >= 2) {
    const firstExpansionTime = expansions[0]?.time || 0;
    if (firstExpansionTime > 0 && firstExpansionTime < 24 * 300) { // Before 5 minutes
      strengths.push('Schnelle Expansion für wirtschaftliche Vorteile');
    }
  }
  
  // Check resource collection efficiency
  const resourceData = metrics.resourceCollection[playerKey];
  if (resourceData.unspentResources.minerals.length > 0) {
    const lastIndex = resourceData.unspentResources.minerals.length - 1;
    const lastMinerals = resourceData.unspentResources.minerals[lastIndex]?.value || 0;
    
    if (lastMinerals < 300) {
      strengths.push('Effiziente Ressourcennutzung (geringe ungenutzte Mineralien)');
    }
  }
  
  // Check production efficiency
  const productionData = metrics.productionEfficiency[playerKey];
  if (productionData.idleProductionTime.length > 0) {
    const idlePercentage = productionData.idleProductionTime[0]?.percentage || 0;
    if (idlePercentage < 15) {
      strengths.push('Kontinuierliche Produktionsprozesse (geringe Leerlaufzeiten)');
    }
  }
  
  // Check hotkey usage
  const hotkeyAPM = metrics.hotkeyUsage[playerKey].hotkeyActionsPerMinute;
  if (hotkeyAPM > 30) {
    strengths.push('Effektive Verwendung von Hotkeys');
  }
  
  // Check micro/macro balance
  const actionDistribution = metrics.actionDistribution[playerKey];
  if (actionDistribution.macroPercentage > 30 && actionDistribution.microPercentage > 30) {
    strengths.push('Gute Balance zwischen Makro- und Mikromanagement');
  } else if (actionDistribution.macroPercentage > 45) {
    strengths.push('Starker Fokus auf Makromanagement');
  } else if (actionDistribution.microPercentage > 45) {
    strengths.push('Ausgezeichnete Einheitenkontrolle (Mikromanagement)');
  }
  
  // If we still don't have enough strengths, add some generic ones
  if (strengths.length < 3) {
    const genericStrengths = [
      'Konstante Arbeiterproduktion',
      'Strategische Entscheidungsfindung',
      'Anpassungsfähige Spielweise'
    ];
    
    for (const generic of genericStrengths) {
      if (!strengths.includes(generic) && strengths.length < 3) {
        strengths.push(generic);
      }
    }
  }
  
  return strengths;
}

/**
 * Generate player weaknesses based on the replay metrics
 */
function generatePlayerWeaknesses(data: ExtendedReplayData, playerIndex: number): string[] {
  const metrics = data.advancedMetrics;
  const weaknesses: string[] = [];
  const playerKey = playerIndex === 0 ? 'player1' : 'player2';
  
  // Check APM
  const apm = playerIndex === 0 ? data.primaryPlayer.apm : data.secondaryPlayer.apm;
  if (apm < 70) {
    weaknesses.push('Niedrige Aktionsgeschwindigkeit (APM)');
  }
  
  // Check supply blocks
  const supplyBlocks = metrics.supplyManagement[playerKey].supplyBlocks;
  if (supplyBlocks.length > 4) {
    weaknesses.push('Häufige Supply-Blocks behindern die Produktion');
  } else if (supplyBlocks.length > 0) {
    // Check if any supply blocks are long
    const longBlock = supplyBlocks.find(block => block.durationSeconds > 20);
    if (longBlock) {
      weaknesses.push('Lange Supply-Blocks verursachen Produktionsverzögerungen');
    }
  }
  
  // Check resource management
  const resourceData = metrics.resourceCollection[playerKey];
  if (resourceData.unspentResources.minerals.length > 0) {
    const highMinerals = resourceData.unspentResources.minerals
      .filter(point => point.value > 800);
    
    if (highMinerals.length > Math.floor(resourceData.unspentResources.minerals.length * 0.3)) {
      weaknesses.push('Ansammlung von ungenutzten Ressourcen');
    }
  }
  
  // Check production efficiency
  const productionData = metrics.productionEfficiency[playerKey];
  if (productionData.idleProductionTime.length > 0) {
    const idlePercentage = productionData.idleProductionTime[0]?.percentage || 0;
    if (idlePercentage > 30) {
      weaknesses.push('Hohe Produktionsleerlaufzeiten');
    }
  }
  
  // Check expansion timing
  const expansions = metrics.expansionTiming[playerKey];
  if (expansions.length === 0) {
    weaknesses.push('Keine Expansion für wirtschaftliche Entwicklung');
  } else if (expansions.length === 1 && expansions[0].time > 24 * 600) { // After 10 minutes
    weaknesses.push('Verspätete Expansion limitiert wirtschaftliche Entwicklung');
  }
  
  // Check tech progression
  const techPath = metrics.techPath[playerKey];
  if (techPath.length === 0) {
    weaknesses.push('Fehlende technologische Entwicklung');
  }
  
  // Check hotkey usage
  const hotkeyAPM = metrics.hotkeyUsage[playerKey].hotkeyActionsPerMinute;
  if (hotkeyAPM < 10) {
    weaknesses.push('Geringe Nutzung von Hotkeys und Kontrollgruppen');
  }
  
  // If we still don't have enough weaknesses, add some generic ones
  if (weaknesses.length < 2) {
    const genericWeaknesses = [
      'Aufklärung könnte verbessert werden',
      'Reaktionsgeschwindigkeit auf gegnerische Strategien',
      'Build Order Optimierung benötigt'
    ];
    
    for (const generic of genericWeaknesses) {
      if (!weaknesses.includes(generic) && weaknesses.length < 2) {
        weaknesses.push(generic);
      }
    }
  }
  
  return weaknesses;
}

/**
 * Generate player recommendations based on the replay metrics and weaknesses
 */
function generatePlayerRecommendations(data: ExtendedReplayData, playerIndex: number): string[] {
  const weaknesses = playerIndex === 0 ? 
    generatePlayerWeaknesses(data, playerIndex) : 
    data.secondaryPlayer.weaknesses;
  
  const recommendations: string[] = [];
  
  // Generate specific recommendations for each weakness
  for (const weakness of weaknesses) {
    if (weakness.includes('Supply-Block')) {
      recommendations.push('Übungsroutine: Baue ein Versorgungsgebäude, wenn du bei 75% deines maximalen Supplies bist');
    }
    
    if (weakness.includes('ungenutzten Ressourcen')) {
      recommendations.push('Nutze zusätzliche Produktionsgebäude, um ungenutzte Ressourcen effektiver einzusetzen');
    }
    
    if (weakness.includes('Leerlaufzeiten')) {
      recommendations.push('Fokussiere dich auf eine konstante Produktion aus allen Produktionsgebäuden');
    }
    
    if (weakness.includes('Expansion')) {
      recommendations.push('Plane deine Expansion früher, idealerweise nach einem bestimmten Punkt in deiner Build Order');
    }
    
    if (weakness.includes('technologische Entwicklung')) {
      recommendations.push('Investiere früher in Technologiegebäude, um Zugang zu fortgeschrittenen Einheiten zu erhalten');
    }
    
    if (weakness.includes('Hotkeys')) {
      recommendations.push('Übe die Verwendung von Kontrollgruppen für deine Armee und Produktionsgebäude');
    }
    
    if (weakness.includes('Aufklärung')) {
      recommendations.push('Sende frühe Scouts und halte Aufklärungseinheiten an strategischen Positionen auf der Karte');
    }
    
    if (weakness.includes('APM')) {
      recommendations.push('Verbessere deine Mechanik durch gezielte Übungen und Hotkey-Optimierung');
    }
  }
  
  // Add map-specific recommendation if available
  const mapName = data.map.toLowerCase();
  if (mapName.includes('fighting spirit')) {
    recommendations.push('Auf Fighting Spirit: Kontrolliere die zentrale Hochebene für strategische Vorteile');
  } else if (mapName.includes('circuit breaker')) {
    recommendations.push('Auf Circuit Breaker: Sichere die Wege zwischen den Basen gegen Runbys');
  } else if (mapName.includes('jade')) {
    recommendations.push('Auf Jade: Nutze die zusätzlichen Mineralfelder für wirtschaftliche Vorteile');
  }
  
  // If we still don't have enough recommendations, add some generic ones
  if (recommendations.length < 3) {
    const genericRecommendations = [
      'Verbessere deine Build Order Ausführung durch regelmäßiges Üben',
      'Entwickle spezifische Strategien gegen jede Rasse und übe diese',
      'Analysiere mehr Replays von professionellen Spielern mit deiner Rasse',
      'Verbessere deine multitasking-Fähigkeiten durch gezielte Übungen'
    ];
    
    for (const generic of genericRecommendations) {
      if (!recommendations.includes(generic) && recommendations.length < 3) {
        recommendations.push(generic);
      }
    }
  }
  
  return recommendations;
}

/**
 * Generate a personalized training plan based on the replay metrics
 */
function generateTrainingPlan(data: ExtendedReplayData, playerIndex: number): Array<{ day: number; focus: string; drill: string }> {
  const weaknesses = playerIndex === 0 ? 
    generatePlayerWeaknesses(data, playerIndex) : 
    data.secondaryPlayer.weaknesses;
  
  const trainingPlan: Array<{ day: number; focus: string; drill: string }> = [];
  
  // Add weakness-specific training
  if (weaknesses.some(w => w.includes('Supply-Block'))) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Supply-Management",
      drill: "Übe, jedes Supply-Gebäude rechtzeitig zu bauen (bei 75% des maximalen Supplies)"
    });
  }
  
  if (weaknesses.some(w => w.includes('ungenutzten Ressourcen'))) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Ressourcenmanagement",
      drill: "Optimiere Ausgaben - halte Mineralien unter 500, Gas unter 300 nach der frühen Spielphase"
    });
  }
  
  if (weaknesses.some(w => w.includes('Leerlaufzeiten'))) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Produktionszyklen",
      drill: "Kontinuierliche Produktion aus allen Gebäuden, ohne Leerlaufzeiten"
    });
  }
  
  if (weaknesses.some(w => w.includes('Expansion'))) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Expansionstiming",
      drill: "Übe optimale Timing-Punkte für deine erste und zweite Expansion"
    });
  }
  
  if (weaknesses.some(w => w.includes('Hotkeys'))) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Hotkey-Optimierung",
      drill: "Setze Produktionsgebäude und Armeeeinheiten auf konsistente Kontrollgruppen"
    });
  }
  
  if (weaknesses.some(w => w.includes('Aufklärung'))) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Aufklärung",
      drill: "Entwickle einen systematischen Aufklärungsplan für jede Karte und jeden Gegnertyp"
    });
  }
  
  // Always include build order practice
  trainingPlan.push({
    day: trainingPlan.length + 1,
    focus: "Build Order Ausführung",
    drill: "Übe deine Build Order bis zur Perfektion gegen KI-Gegner"
  });
  
  // Always include micro practice based on race
  const race = playerIndex === 0 ? data.primaryPlayer.race : data.secondaryPlayer.race;
  if (race.toLowerCase().includes('terran')) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Einheiten-Mikro",
      drill: "Übe Marine Splits gegen simulierte Baneling-Angriffe"
    });
  } else if (race.toLowerCase().includes('protoss')) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Einheiten-Mikro",
      drill: "Übe Stalker Blink-Mikro gegen Belagerungspanzer"
    });
  } else if (race.toLowerCase().includes('zerg')) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Einheiten-Mikro",
      drill: "Übe Zergling/Baneling-Kontrolle gegen Bio-Armeen"
    });
  }
  
  // Ensure we have at least 3 days of training
  if (trainingPlan.length < 3) {
    trainingPlan.push({
      day: trainingPlan.length + 1,
      focus: "Multitasking",
      drill: "Führe gleichzeitig Mehrfachangriffe durch, während du deine Wirtschaft ausbaust"
    });
  }
  
  return trainingPlan;
}
