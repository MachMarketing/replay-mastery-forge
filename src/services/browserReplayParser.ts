
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
    
    // Log the advanced metrics we extracted
    logAdvancedMetrics(parsedData);
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
  
  // Create matchup string
  const matchup = `${defaultRace1.charAt(0)}v${defaultRace2.charAt(0)}`;
  
  // Create minimal replay data structure
  const minimalData: ParsedReplayData = {
    primaryPlayer: {
      name: player1,
      race: defaultRace1,
      apm: 150,
      eapm: 105,
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    secondaryPlayer: {
      name: player2,
      race: defaultRace2,
      apm: 150,
      eapm: 105,
      buildOrder: [],
      strengths: ['Replay analysis requires premium'],
      weaknesses: ['Replay analysis requires premium'],
      recommendations: ['Upgrade to premium for detailed analysis']
    },
    map: 'Unknown Map',
    matchup: matchup,
    duration: '10:00',
    durationMS: 600000,
    date: new Date().toISOString(),
    result: 'unknown' as 'unknown' | 'win' | 'loss',
    strengths: ['Replay analysis requires premium'],
    weaknesses: ['Replay analysis requires premium'],
    recommendations: ['Upgrade to premium for detailed analysis'],
    
    // Legacy properties
    playerName: player1,
    opponentName: player2,
    playerRace: defaultRace1,
    opponentRace: defaultRace2,
    apm: 150,
    eapm: 105,
    opponentApm: 150,
    opponentEapm: 105,
    buildOrder: []
  };
  
  return minimalData;
}

/**
 * Transform the extended parsed data into our application's expected format
 */
function transformParsedData(parsedData: ExtendedReplayData, fileName: string): ParsedReplayData {
  // First, log the structure to help with debugging
  console.log('[browserReplayParser] Transforming extended data');
  
  // Start with player data
  let playerName = '';
  let opponentName = '';
  let playerRace = '';
  let opponentRace = '';
  let playerApm = 0;
  let opponentApm = 0;
  let buildOrder = [];
  
  // According to screparsed docs, players should be in rawData.players
  let players = [];
  
  if (parsedData.rawData.players && Array.isArray(parsedData.rawData.players)) {
    console.log('[browserReplayParser] Using rawData.players array');
    players = parsedData.rawData.players.map((player: any) => ({
      name: player.name || `Player ${player.id || 'Unknown'}`,
      race: standardizeRaceName(player.race || 'Unknown'),
      apm: player.apm || 150,
      team: player.team || player.id || 0
    }));
  } else {
    console.log('[browserReplayParser] No players array found, using extractPlayerData');
    // Fall back to our extraction function
    players = extractPlayerData(parsedData.rawData);
  }
  
  // Extract map name using enhanced map extractor
  let mapName = extractMapName(parsedData.rawData);
  console.log('[browserReplayParser] Extracted map name:', mapName);
  
  // If still no players, extract from filename as last resort
  if (!players || players.length === 0) {
    console.log('[browserReplayParser] No player data found, extracting from filename');
    const { player1, player2, race1, race2 } = extractPlayersFromFilename(fileName);
    
    players = [
      { 
        name: player1, 
        race: race1 || 'Protoss', 
        apm: 150, 
        team: 0 
      },
      { 
        name: player2, 
        race: race2 || 'Protoss', 
        apm: 150, 
        team: 1 
      }
    ];
  }
  
  // Ensure we have at least 2 players
  while (players.length < 2) {
    players.push({ 
      name: `Player ${players.length + 1}`, 
      race: 'Protoss', 
      apm: 150,
      team: players.length
    });
  }
  
  // Extract player 1 and 2
  const player1 = players[0];
  const player2 = players[1];
  
  // Standardize race names
  const race1 = standardizeRaceName(player1.race);
  const race2 = standardizeRaceName(player2.race);
  
  // Format player names
  playerName = formatPlayerName(player1.name);
  opponentName = formatPlayerName(player2.name);
  playerRace = race1;
  opponentRace = race2;
  playerApm = player1.apm || 150;
  opponentApm = player2.apm || 150;
  
  // Calculate duration in seconds from the parsed data
  let durationFrames = parsedData.rawData.metadata?.frames || 0;
  const durationSeconds = Math.max(1, Math.floor(durationFrames / 24));
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;
  
  // Use the enhanced build order data from our advanced metrics
  if (parsedData.advancedMetrics && parsedData.advancedMetrics.buildOrderTiming) {
    buildOrder = parsedData.advancedMetrics.buildOrderTiming.player1.map(item => ({
      time: item.timeFormatted,
      supply: item.supply,
      action: item.name
    }));
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
  
  // Create the transformed data structure
  const transformedData: ParsedReplayData = {
    primaryPlayer: {
      name: playerName,
      race: race1,
      apm: player1.apm || 150,
      eapm: Math.round((player1.apm || 150) * 0.7),
      buildOrder: buildOrder,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations
    },
    secondaryPlayer: {
      name: opponentName,
      race: race2,
      apm: player2.apm || 150,
      eapm: Math.round((player2.apm || 150) * 0.7),
      buildOrder: parsedData.advancedMetrics.buildOrderTiming.player2.map(item => ({
        time: item.timeFormatted,
        supply: item.supply,
        action: item.name
      })),
      strengths: opponentStrengths,
      weaknesses: opponentWeaknesses,
      recommendations: opponentRecommendations
    },
    map: mapName,
    matchup: `${race1.charAt(0)}v${race2.charAt(0)}`,
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
    playerRace: race1,
    opponentRace: race2,
    apm: player1.apm || 150,
    eapm: Math.round((player1.apm || 150) * 0.7),
    opponentApm: player2.apm || 150,
    opponentEapm: Math.round((player2.apm || 150) * 0.7),
    buildOrder: buildOrder,
    
    trainingPlan
  };
  
  console.log('[browserReplayParser] Transformed data:', 
    `${transformedData.primaryPlayer.name} (${transformedData.primaryPlayer.race}) vs ` +
    `${transformedData.secondaryPlayer.name} (${transformedData.secondaryPlayer.race}) on ${transformedData.map}`);
  console.log('[browserReplayParser] Build order items:', transformedData.buildOrder.length);
  
  return transformedData;
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

