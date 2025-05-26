
import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War replay file using screp-js
 * This is the single entry point for all replay parsing in the application
 */
export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting to parse replay file:', file.name);
  console.log('[replayParser] File size:', file.size, 'bytes');
  
  // Enhanced file validation
  if (!file || file.size === 0) {
    throw new Error('Datei ist leer oder ungültig');
  }
  
  if (file.size < 1024) {
    throw new Error('Datei ist zu klein für eine gültige Replay-Datei (minimum 1KB)');
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('Datei ist zu groß (Maximum: 10MB)');
  }
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (fileExtension !== 'rep') {
    throw new Error('Nur .rep Dateien werden unterstützt');
  }
  
  // Read file as ArrayBuffer
  console.log('[replayParser] Reading file as ArrayBuffer...');
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
    console.log('[replayParser] Successfully read ArrayBuffer, size:', arrayBuffer.byteLength);
  } catch (fileError) {
    console.error('[replayParser] Failed to read file:', fileError);
    throw new Error('Konnte Datei nicht lesen - möglicherweise beschädigt');
  }
  
  const uint8Array = new Uint8Array(arrayBuffer);
  console.log('[replayParser] Created Uint8Array, length:', uint8Array.length);
  
  // Parse with screp-js - this is the ONLY way we parse now
  try {
    console.log('[replayParser] Parsing with screp-js...');
    const { parseReplay: screpParse } = await import('screp-js');
    
    const screpResult = screpParse(uint8Array);
    console.log('[replayParser] SCREP result:', screpResult);
    
    if (!screpResult || !screpResult.header || !screpResult.players) {
      throw new Error('SCREP Parser konnte keine gültigen Replay-Daten extrahieren');
    }
    
    if (screpResult.players.length < 2) {
      throw new Error('Replay muss mindestens 2 Spieler enthalten');
    }
    
    console.log('[replayParser] Successfully parsed with screp-js');
    return createParsedDataFromScrep(screpResult, file.name);
    
  } catch (screpError) {
    console.error('[replayParser] SCREP parsing failed:', screpError);
    throw new Error(`Replay parsing fehlgeschlagen: ${screpError instanceof Error ? screpError.message : 'Unbekannter Fehler'}`);
  }
}

/**
 * Create parsed data from screp-js result - ONLY real data
 */
function createParsedDataFromScrep(screpResult: any, filename: string): ParsedReplayData {
  console.log('[replayParser] Processing SCREP result:', {
    header: !!screpResult.header,
    playersCount: screpResult.players?.length,
    hasCommands: !!screpResult.commands
  });
  
  const players = screpResult.players || [];
  
  // Filter human players only
  const humanPlayers = players.filter((p: any) => p.isHuman || p.type === 1);
  console.log('[replayParser] Found human players:', humanPlayers.length);
  
  if (humanPlayers.length < 2) {
    throw new Error('Nicht genügend menschliche Spieler gefunden');
  }
  
  const player1 = humanPlayers[0];
  const player2 = humanPlayers[1];
  
  console.log('[replayParser] Player 1:', player1.name, player1.race);
  console.log('[replayParser] Player 2:', player2.name, player2.race);
  
  // Extract real build order from commands
  const buildOrder = extractRealBuildOrder(screpResult.commands, player1.id);
  console.log('[replayParser] Extracted build order items:', buildOrder.length);
  
  // Extract real game metrics
  const gameMetrics = extractGameMetrics(screpResult);
  console.log('[replayParser] Game metrics:', gameMetrics);
  
  // Determine winner
  const isPlayer1Winner = player1.isWinner || false;
  
  // Real APM from screp
  const player1APM = Math.round(player1.apm || 0);
  const player2APM = Math.round(player2.apm || 0);
  const player1EAPM = Math.round(player1.eapm || player1APM * 0.7);
  const player2EAPM = Math.round(player2.eapm || player2APM * 0.7);
  
  // Real game duration
  const durationFrames = screpResult.header?.frames || 0;
  const durationSeconds = Math.floor(durationFrames / 24); // 24 FPS
  const duration = formatDuration(durationSeconds);
  
  // Real map name
  const mapName = screpResult.header?.mapName || 'Unknown Map';
  
  // Create matchup string
  const matchup = `${player1.race.charAt(0)}v${player2.race.charAt(0)}`;
  
  // Analyze real performance data
  const analysis = analyzeRealPerformance(player1, buildOrder, screpResult.commands);
  
  const primaryPlayer = {
    name: player1.name,
    race: player1.race,
    apm: player1APM,
    eapm: player1EAPM,
    buildOrder: buildOrder,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    recommendations: analysis.recommendations
  };
  
  const secondaryPlayer = {
    name: player2.name,
    race: player2.race,
    apm: player2APM,
    eapm: player2EAPM,
    buildOrder: [],
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  const trainingPlan = generateTrainingPlan(analysis.weaknesses);
  
  return {
    // Primary data structure
    primaryPlayer,
    secondaryPlayer,
    
    // Real game info
    map: mapName,
    matchup,
    duration,
    durationMS: durationFrames * (1000/24), // Convert frames to MS
    date: new Date().toISOString(),
    result: isPlayer1Winner ? 'win' : 'loss',
    
    // Real analysis results
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    recommendations: analysis.recommendations,
    
    // Legacy properties for backward compatibility
    playerName: player1.name,
    opponentName: player2.name,
    playerRace: player1.race,
    opponentRace: player2.race,
    apm: player1APM,
    eapm: player1EAPM,
    opponentApm: player2APM,
    opponentEapm: player2EAPM,
    buildOrder,
    
    // Training plan
    trainingPlan
  };
}

/**
 * Extract real build order from replay commands
 */
function extractRealBuildOrder(commands: any[], playerId: number): Array<{ time: string; supply: number; action: string }> {
  if (!commands || !Array.isArray(commands)) {
    console.warn('[replayParser] No commands found in replay');
    return [];
  }
  
  const buildOrder: Array<{ time: string; supply: number; action: string }> = [];
  let currentSupply = 9; // Starting supply for most races
  
  // Filter commands for the specific player and build actions
  const playerCommands = commands.filter(cmd => 
    cmd.playerId === playerId && 
    cmd.type === 'build' || cmd.type === 'train' || cmd.type === 'research'
  );
  
  console.log('[replayParser] Found build commands:', playerCommands.length);
  
  playerCommands.forEach(cmd => {
    const timeInSeconds = Math.floor(cmd.frame / 24);
    const timeString = formatDuration(timeInSeconds);
    
    // Update supply based on action
    if (cmd.unitType && isSupplyUnit(cmd.unitType)) {
      currentSupply += getSupplyIncrease(cmd.unitType);
    }
    
    buildOrder.push({
      time: timeString,
      supply: currentSupply,
      action: cmd.unitType || cmd.actionName || 'Unknown Action'
    });
  });
  
  return buildOrder.slice(0, 20); // Limit to first 20 items
}

/**
 * Extract real game metrics from screp result
 */
function extractGameMetrics(screpResult: any): any {
  return {
    totalCommands: screpResult.commands?.length || 0,
    gameLength: screpResult.header?.frames || 0,
    mapName: screpResult.header?.mapName || 'Unknown',
    playerCount: screpResult.players?.length || 0
  };
}

/**
 * Analyze real performance based on actual replay data
 */
function analyzeRealPerformance(player: any, buildOrder: any[], commands: any[]): {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  // APM Analysis
  if (player.apm > 150) {
    strengths.push('Sehr hohe Aktionsgeschwindigkeit (APM > 150)');
  } else if (player.apm < 80) {
    weaknesses.push('Niedrige Aktionsgeschwindigkeit (APM < 80)');
    recommendations.push('Verbessere deine APM durch Hotkey-Training');
  }
  
  // Build Order Analysis
  if (buildOrder.length >= 15) {
    strengths.push('Komplexe und detaillierte Build Order');
  } else if (buildOrder.length < 8) {
    weaknesses.push('Sehr kurze Build Order - möglicherweise früh beendet');
    recommendations.push('Arbeite an längeren, strategischeren Spielen');
  }
  
  // Race-specific analysis
  if (player.race === 'Terran') {
    analyzeTerranaPerformance(buildOrder, strengths, weaknesses, recommendations);
  } else if (player.race === 'Protoss') {
    analyzeProtossPerformance(buildOrder, strengths, weaknesses, recommendations);
  } else if (player.race === 'Zerg') {
    analyzeZergPerformance(buildOrder, strengths, weaknesses, recommendations);
  }
  
  return { strengths, weaknesses, recommendations };
}

function analyzeTerranaPerformance(buildOrder: any[], strengths: string[], weaknesses: string[], recommendations: string[]) {
  const hasEarlyBarracks = buildOrder.some(item => 
    item.action.toLowerCase().includes('barracks') && 
    parseTimeToSeconds(item.time) < 120
  );
  
  if (hasEarlyBarracks) {
    strengths.push('Frühe Barracks für schnelle Einheitenproduktion');
  } else {
    weaknesses.push('Späte oder fehlende frühe Barracks');
    recommendations.push('Baue Barracks früher für bessere Kontrolle');
  }
}

function analyzeProtossPerformance(buildOrder: any[], strengths: string[], weaknesses: string[], recommendations: string[]) {
  const hasEarlyGateway = buildOrder.some(item => 
    item.action.toLowerCase().includes('gateway') && 
    parseTimeToSeconds(item.time) < 150
  );
  
  if (hasEarlyGateway) {
    strengths.push('Gutes Gateway-Timing');
  } else {
    weaknesses.push('Spätes Gateway-Timing');
    recommendations.push('Verbessere dein Gateway-Timing für frühe Einheiten');
  }
}

function analyzeZergPerformance(buildOrder: any[], strengths: string[], weaknesses: string[], recommendations: string[]) {
  const hasEarlyPool = buildOrder.some(item => 
    item.action.toLowerCase().includes('spawning') && 
    parseTimeToSeconds(item.time) < 120
  );
  
  if (hasEarlyPool) {
    strengths.push('Früher Spawning Pool für Zerglings');
  } else {
    weaknesses.push('Später Spawning Pool');
    recommendations.push('Baue Spawning Pool früher für bessere Verteidigung');
  }
}

/**
 * Helper functions
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(timeString: string): number {
  const [minutes, seconds] = timeString.split(':').map(Number);
  return minutes * 60 + seconds;
}

function isSupplyUnit(unitType: string): boolean {
  const supplyUnits = ['Supply Depot', 'Overlord', 'Pylon'];
  return supplyUnits.some(unit => unitType.toLowerCase().includes(unit.toLowerCase()));
}

function getSupplyIncrease(unitType: string): number {
  if (unitType.toLowerCase().includes('overlord')) return 8;
  if (unitType.toLowerCase().includes('supply depot')) return 8;
  if (unitType.toLowerCase().includes('pylon')) return 8;
  return 0;
}

function generateTrainingPlan(weaknesses: string[]): Array<{ day: number; focus: string; drill: string }> {
  const trainingPlan: Array<{ day: number; focus: string; drill: string }> = [];
  
  if (weaknesses.some(w => w.includes('APM'))) {
    trainingPlan.push({ day: 1, focus: "APM Training", drill: "Übe Hotkey-Nutzung und schnelle Befehle" });
  }
  
  if (weaknesses.some(w => w.includes('Build Order'))) {
    trainingPlan.push({ day: 2, focus: "Build Order", drill: "Perfektioniere Standard-Eröffnungen" });
  }
  
  if (weaknesses.some(w => w.includes('Barracks') || w.includes('Gateway') || w.includes('Pool'))) {
    trainingPlan.push({ day: 3, focus: "Frühe Produktion", drill: "Optimiere Timing für erste Produktionsgebäude" });
  }
  
  // Default training if no specific weaknesses
  if (trainingPlan.length === 0) {
    trainingPlan.push(
      { day: 1, focus: "Makro", drill: "Ununterbrochene Arbeiterproduktion" },
      { day: 2, focus: "Mikro", drill: "Einheitenkontrolle in Gefechten" }
    );
  }
  
  return trainingPlan;
}
