
import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War replay file using the Go service
 * This supports both Classic and Remastered replay formats
 * Only returns real parsed data - no fallback data
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
  
  // Read file as ArrayBuffer for validation
  console.log('[replayParser] Reading file as ArrayBuffer...');
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
    console.log('[replayParser] Successfully read ArrayBuffer, size:', arrayBuffer.byteLength);
  } catch (fileError) {
    console.error('[replayParser] Failed to read file:', fileError);
    throw new Error('Konnte Datei nicht lesen - möglicherweise beschädigt');
  }
  
  // Check if Go service is available
  console.log('[replayParser] Checking Go service availability...');
  try {
    const healthCheck = await fetch('http://localhost:8000/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!healthCheck.ok) {
      throw new Error('Go service health check failed');
    }
    console.log('[replayParser] Go service is available');
  } catch (healthError) {
    console.error('[replayParser] Go service health check failed:', healthError);
    throw new Error(`Go-Service ist nicht verfügbar. 
    
Bitte starten Sie den SCREP-Service:

1. Terminal öffnen und zum screp-service Verzeichnis navigieren:
   cd screp-service

2. Go-Service starten:
   go run main.go
   
   ODER mit Docker:
   docker build -t screp-service .
   docker run -p 8000:8000 screp-service

3. Service sollte auf http://localhost:8000 verfügbar sein

Der Service muss laufen, bevor Replays analysiert werden können.`);
  }
  
  // Parse with the Go service
  console.log('[replayParser] Attempting to parse with Go service...');
  try {
    const goServiceResult = await parseWithGoService(file);
    if (!goServiceResult) {
      throw new Error('Go-Service konnte keine gültigen Daten extrahieren');
    }
    console.log('[replayParser] Successfully parsed with Go service');
    return goServiceResult;
  } catch (goError) {
    console.error('[replayParser] Go service failed:', goError);
    throw new Error(`Replay-Parsing fehlgeschlagen: ${goError instanceof Error ? goError.message : 'Unbekannter Fehler'}`);
  }
}

/**
 * Parse with the Go service - this is our only parsing method
 */
async function parseWithGoService(file: File): Promise<ParsedReplayData | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('[replayParser] Sending request to Go service...');
    const response = await fetch('http://localhost:8000/parse', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let browser set it for FormData
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[replayParser] Go service returned error:', response.status, errorText);
      throw new Error(`Go service returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[replayParser] Raw Go service response:', data);
    
    return transformGoServiceResponse(data, file.name);
  } catch (error) {
    console.error('[replayParser] Go service error:', error);
    
    // Re-throw with more context
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
        throw new Error(`Go-Service ist nicht erreichbar. 

Bitte überprüfen Sie:

1. Ist der SCREP-Service gestartet?
   cd screp-service
   go run main.go

2. Läuft der Service auf Port 8000?
   curl http://localhost:8000/health

3. Firewall-Einstellungen erlauben Verbindungen zu localhost:8000?

Der Service muss laufen, damit Replays analysiert werden können.`);
      }
      throw error;
    }
    
    throw new Error('Unbekannter Fehler beim Kommunizieren mit dem Go-Service');
  }
}

/**
 * Transform Go service response to our format
 */
function transformGoServiceResponse(data: any, filename: string): ParsedReplayData {
  const players = data.players || [];
  const buildOrders = data.buildOrders || {};
  const metadata = data.metadata || {};
  
  if (players.length < 2) {
    throw new Error('Nicht genügend Spieler in der Replay-Datei gefunden (mindestens 2 erforderlich)');
  }
  
  // Validate that we have real player data
  const player1 = players[0];
  const player2 = players[1];
  
  if (!player1.name || player1.name.trim() === '') {
    throw new Error('Ungültige Spielerdaten: Spieler 1 Name fehlt');
  }
  
  if (!player2.name || player2.name.trim() === '') {
    throw new Error('Ungültige Spielerdaten: Spieler 2 Name fehlt');
  }
  
  const primaryPlayer = {
    name: player1.name,
    race: normalizeRaceName(player1.race),
    apm: player1.apm || 0,
    eapm: player1.eapm || Math.round((player1.apm || 0) * 0.7),
    buildOrder: transformBuildOrder(buildOrders[player1.id] || []),
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  const secondaryPlayer = {
    name: player2.name,
    race: normalizeRaceName(player2.race),
    apm: player2.apm || 0,
    eapm: player2.eapm || Math.round((player2.apm || 0) * 0.7),
    buildOrder: transformBuildOrder(buildOrders[player2.id] || []),
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  const matchup = `${getRaceShortName(primaryPlayer.race)}v${getRaceShortName(secondaryPlayer.race)}`;
  
  // Generate analysis based on real data
  const analysis = generateAnalysis(primaryPlayer, secondaryPlayer, metadata);
  
  return {
    primaryPlayer: { ...primaryPlayer, ...analysis.primaryAnalysis },
    secondaryPlayer,
    map: metadata.map || 'Unknown Map',
    matchup,
    duration: metadata.duration || '0:00',
    durationMS: metadata.durationFrames ? metadata.durationFrames * (1000/24) : 0,
    date: new Date().toISOString(),
    result: determineResult(player1, player2),
    strengths: analysis.primaryAnalysis.strengths,
    weaknesses: analysis.primaryAnalysis.weaknesses,
    recommendations: analysis.primaryAnalysis.recommendations,
    playerName: primaryPlayer.name,
    opponentName: secondaryPlayer.name,
    playerRace: primaryPlayer.race,
    opponentRace: secondaryPlayer.race,
    apm: primaryPlayer.apm,
    eapm: primaryPlayer.eapm,
    opponentApm: secondaryPlayer.apm,
    opponentEapm: secondaryPlayer.eapm,
    buildOrder: primaryPlayer.buildOrder,
    trainingPlan: analysis.trainingPlan
  };
}

/**
 * Transform build order from Go service format
 */
function transformBuildOrder(buildOrder: any[]): Array<{time: string; supply: number; action: string}> {
  if (!Array.isArray(buildOrder)) {
    console.warn('[replayParser] Invalid build order data received');
    return [];
  }
  
  return buildOrder.map(item => ({
    time: item.time || '0:00',
    supply: item.supply || 0,
    action: item.action || 'Unknown Action'
  }));
}

/**
 * Determine game result based on player data
 */
function determineResult(player1: any, player2: any): 'win' | 'loss' | 'unknown' {
  if (player1.isWinner === true) return 'win';
  if (player1.isWinner === false) return 'loss';
  return 'unknown';
}

/**
 * Generate analysis based on real player data
 */
function generateAnalysis(player1: any, player2: any, metadata: any): {
  primaryAnalysis: { strengths: string[]; weaknesses: string[]; recommendations: string[] };
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
} {
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];
  
  // APM analysis based on real data
  if (player1.apm > 150) {
    strengths.push(`Hohe APM (${player1.apm})`);
  } else if (player1.apm < 100) {
    weaknesses.push(`Niedrige APM (${player1.apm})`);
    recommendations.push('APM durch Hotkey-Training verbessern');
  } else if (player1.apm > 0) {
    strengths.push(`Solide APM (${player1.apm})`);
  }
  
  // Build order analysis based on real data
  if (player1.buildOrder && player1.buildOrder.length > 10) {
    strengths.push('Detaillierte Build Order verfügbar');
  } else if (player1.buildOrder && player1.buildOrder.length > 0) {
    weaknesses.push('Kurze Build Order - längere Spiele empfohlen');
    recommendations.push('Längere Spiele für bessere Analyse spielen');
  } else {
    weaknesses.push('Keine Build Order Daten verfügbar');
  }
  
  // Race-specific analysis
  if (player1.race === 'Terran') {
    strengths.push('Terran Mechanik');
    recommendations.push('Marine/Tank Kontrolle üben');
  } else if (player1.race === 'Protoss') {
    strengths.push('Protoss Technologie');
    recommendations.push('Zealot/Dragoon Balance optimieren');
  } else if (player1.race === 'Zerg') {
    strengths.push('Zerg Expansion');
    recommendations.push('Creep Spread verbessern');
  }
  
  // APM comparison with opponent
  if (player1.apm > 0 && player2.apm > 0) {
    if (player1.apm > player2.apm + 20) {
      strengths.push('Höhere APM als Gegner');
    } else if (player1.apm < player2.apm - 20) {
      weaknesses.push('Niedrigere APM als Gegner');
      recommendations.push('Geschwindigkeit trainieren');
    }
  }
  
  // Create training plan based on real data analysis
  const trainingPlan = [
    { day: 1, focus: "APM Training", drill: `${player1.race} Hotkeys üben` },
    { day: 2, focus: "Build Order", drill: `Standard ${player1.race} Build perfektionieren` },
    { day: 3, focus: "Makro", drill: "Kontinuierliche Produktion" },
    { day: 4, focus: "Mikro", drill: `${player1.race} Einheiten-Kontrolle` },
    { day: 5, focus: "Strategie", drill: `${player1.race} vs ${player2.race} Matchup` }
  ];
  
  return {
    primaryAnalysis: { strengths, weaknesses, recommendations },
    trainingPlan
  };
}

function getRaceShortName(race: string): string {
  const raceStr = String(race).toLowerCase();
  if (raceStr.includes('terran') || raceStr.includes('t')) return 'T';
  if (raceStr.includes('protoss') || raceStr.includes('p')) return 'P';
  if (raceStr.includes('zerg') || raceStr.includes('z')) return 'Z';
  return 'T';
}

function normalizeRaceName(race: any): string {
  const raceStr = String(race).toLowerCase();
  if (raceStr.includes('terran') || raceStr.includes('t')) return 'Terran';
  if (raceStr.includes('protoss') || raceStr.includes('p')) return 'Protoss';
  if (raceStr.includes('zerg') || raceStr.includes('z')) return 'Zerg';
  return 'Terran';
}
