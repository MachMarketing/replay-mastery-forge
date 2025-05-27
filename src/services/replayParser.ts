
import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a replay file using the Supabase Edge Function with bwscrep
 */
export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting to parse replay file:', file.name);

  // File validation
  if (!file || file.size === 0) {
    throw new Error('Datei ist leer oder ungültig');
  }
  if (file.size < 1024 || file.size > 10 * 1024 * 1024) {
    throw new Error('Ungültige Dateigröße');
  }
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }

  try {
    const buf = await file.arrayBuffer();

    const parserUrl = import.meta.env.VITE_PARSER_URL;
    console.log('[replayParser] Fetching parser URL:', parserUrl);
    
    const res = await fetch(parserUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: buf,
    });
    
    console.log('[replayParser] Response status:', res.status);
    
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(`Parsing fehlgeschlagen: ${err?.error || res.statusText}`);
    }
    
    const data = await res.json();
    console.log('[replayParser] Parsed data keys:', Object.keys(data));
    
    return transformBwscrepResponse(data, file.name);
  } catch (error) {
    console.error('[replayParser] Error:', error);
    throw new Error(`Parser Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
  }
}

/**
 * Transformiert die Antwort vom bwscrep Parser (Supabase Edge Function)
 */
function transformBwscrepResponse(data: any, filename: string): ParsedReplayData {
  console.log('[replayParser] Transforming bwscrep data for file:', filename);
  console.log('[replayParser] Available bwscrep data keys:', Object.keys(data));
  
  // Spieler extrahieren
  const players = data.players || [];
  if (players.length < 2) {
    throw new Error('Nicht genügend Spieler gefunden (mindestens 2 erforderlich)');
  }
  
  const player1 = players[0];
  const player2 = players[1];
  
  if (!player1?.name || !player2?.name) {
    throw new Error('Ungültige Spielerdaten - Spielernamen fehlen');
  }
  
  // Spiel-Metadaten
  const gameFrames = data.header?.frames || 0;
  const gameDurationMs = gameFrames * (1000/24);
  const mapName = data.header?.mapName || 'Unbekannte Karte';
  
  // APM-Daten
  const player1APM = player1.apm || 0;
  const player2APM = player2.apm || 0;
  const player1EAPM = player1.eapm || Math.round(player1APM * 0.7);
  const player2EAPM = player2.eapm || Math.round(player2APM * 0.7);
  
  // Build Orders aus Commands extrahieren
  const player1BuildOrder = extractBuildOrder(data.commands || [], player1.id || 0);
  const player2BuildOrder = extractBuildOrder(data.commands || [], player2.id || 1);
  
  // Analyse generieren
  const analysis = generateGameAnalysis(player1, player2, {
    frames: gameFrames,
    mapName: mapName,
    commands: data.commands || []
  });
  
  // Primären Spieler erstellen
  const primaryPlayer = {
    name: player1.name,
    race: normalizeRace(player1.race),
    apm: player1APM,
    eapm: player1EAPM,
    buildOrder: player1BuildOrder,
    strengths: analysis.player1Analysis.strengths,
    weaknesses: analysis.player1Analysis.weaknesses,
    recommendations: analysis.player1Analysis.recommendations
  };
  
  // Sekundären Spieler erstellen
  const secondaryPlayer = {
    name: player2.name,
    race: normalizeRace(player2.race),
    apm: player2APM,
    eapm: player2EAPM,
    buildOrder: player2BuildOrder,
    strengths: analysis.player2Analysis.strengths,
    weaknesses: analysis.player2Analysis.weaknesses,
    recommendations: analysis.player2Analysis.recommendations
  };
  
  const matchup = `${getRaceInitial(primaryPlayer.race)}v${getRaceInitial(secondaryPlayer.race)}`;
  
  return {
    primaryPlayer,
    secondaryPlayer,
    map: mapName,
    matchup,
    duration: formatDuration(gameFrames),
    durationMS: gameDurationMs,
    date: new Date().toISOString(),
    result: determineGameResult(player1, player2),
    strengths: analysis.player1Analysis.strengths,
    weaknesses: analysis.player1Analysis.weaknesses,
    recommendations: analysis.player1Analysis.recommendations,
    
    // Legacy-Eigenschaften für Rückwärtskompatibilität
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
 * Extrahiert Build Order aus Commands-Array
 */
function extractBuildOrder(commands: any[], playerId: number): Array<{time: string; supply: number; action: string}> {
  if (!commands || !Array.isArray(commands)) {
    console.log('[replayParser] No commands array available for build order extraction');
    return [];
  }

  const buildOrder: Array<{time: string; supply: number; action: string}> = [];
  let currentSupply = 9;

  // Filter commands for the specific player and build-related actions
  const playerCommands = commands.filter(cmd => 
    cmd.playerId === playerId && 
    cmd.type === 'build' || cmd.type === 'train'
  );

  console.log(`[replayParser] Found ${playerCommands.length} build commands for player ${playerId}`);

  playerCommands.forEach((cmd, index) => {
    const timeInSeconds = cmd.frame ? Math.floor(cmd.frame / 24) : index * 15;
    const timeString = formatTime(timeInSeconds);
    
    buildOrder.push({
      time: timeString,
      supply: currentSupply + index,
      action: cmd.unit || cmd.building || 'Unknown Action'
    });
  });

  // If no commands found, generate a basic build order
  if (buildOrder.length === 0) {
    console.log('[replayParser] No build commands found, generating basic build order');
    return generateBasicBuildOrder();
  }

  return buildOrder.slice(0, 20); // Limit to first 20 items
}

/**
 * Formatiert Spieldauer von Frames zu mm:ss Format
 */
function formatDuration(frames: number): string {
  const totalSeconds = Math.floor(frames / 24); // 24 FPS in StarCraft
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generiert eine grundlegende Build Order wenn keine Commands verfügbar sind
 */
function generateBasicBuildOrder(): Array<{time: string; supply: number; action: string}> {
  return [
    { time: '0:12', supply: 9, action: 'Worker' },
    { time: '0:17', supply: 10, action: 'Supply Building' },
    { time: '0:24', supply: 10, action: 'Worker' },
    { time: '0:36', supply: 11, action: 'Worker' },
    { time: '0:48', supply: 12, action: 'Worker' },
    { time: '1:00', supply: 13, action: 'Production Building' },
    { time: '1:12', supply: 13, action: 'Worker' },
    { time: '1:24', supply: 14, action: 'Worker' },
    { time: '1:36', supply: 15, action: 'Worker' },
    { time: '1:48', supply: 16, action: 'Military Unit' }
  ];
}

/**
 * Formatiert Zeit in Sekunden zu mm:ss Format
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Rasse normalisieren
 */
function normalizeRace(race: any): string {
  const raceStr = String(race || '').toLowerCase();
  if (raceStr.includes('protoss') || raceStr === 'p') return 'Protoss';
  if (raceStr.includes('terran') || raceStr === 't') return 'Terran';
  if (raceStr.includes('zerg') || raceStr === 'z') return 'Zerg';
  return 'Protoss';
}

/**
 * Rassen-Initial für Matchup
 */
function getRaceInitial(race: string): string {
  return race.charAt(0).toUpperCase();
}

/**
 * Spielergebnis bestimmen
 */
function determineGameResult(player1: any, player2: any): 'win' | 'loss' | 'unknown' {
  if (player1.isWinner === true) return 'win';
  if (player1.isWinner === false) return 'loss';
  return 'unknown';
}

/**
 * Umfassende Spielanalyse generieren
 */
function generateGameAnalysis(player1: any, player2: any, gameData: any): {
  player1Analysis: { strengths: string[]; weaknesses: string[]; recommendations: string[] };
  player2Analysis: { strengths: string[]; weaknesses: string[]; recommendations: string[] };
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
} {
  const p1Analysis = analyzePlayer(player1, gameData);
  const p2Analysis = analyzePlayer(player2, gameData);
  const trainingPlan = generateTrainingPlan(player1, gameData);
  
  return {
    player1Analysis: p1Analysis,
    player2Analysis: p2Analysis,
    trainingPlan
  };
}

/**
 * Einzelne Spielerleistung analysieren
 */
function analyzePlayer(player: any, gameData: any): { strengths: string[]; weaknesses: string[]; recommendations: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  const apm = player.apm || 0;
  if (apm > 150) {
    strengths.push(`Hohe APM (${apm})`);
  } else if (apm < 80 && apm > 0) {
    weaknesses.push(`Niedrige APM (${apm})`);
    recommendations.push('APM durch Hotkey-Training verbessern');
  } else if (apm > 0) {
    strengths.push(`Solide APM (${apm})`);
  }
  
  const race = normalizeRace(player.race);
  if (race === 'Protoss') {
    strengths.push('Protoss Technologie-Vorteile');
    recommendations.push('Zealot/Dragoon Balance optimieren');
  } else if (race === 'Terran') {
    strengths.push('Terran Vielseitigkeit');
    recommendations.push('Marine/Tank Kontrolle üben');
  } else if (race === 'Zerg') {
    strengths.push('Zerg Schwarm-Taktiken');
    recommendations.push('Creep Spread und Makro verbessern');
  }
  
  const gameMinutes = (gameData.frames || 0) / (24 * 60);
  if (gameMinutes > 15) {
    strengths.push('Gute Ausdauer in langen Spielen');
  } else if (gameMinutes < 5) {
    recommendations.push('Defensive Strategien für frühe Angriffe entwickeln');
  }
  
  if (strengths.length === 0) {
    strengths.push('Grundsolide Spielweise');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Weitere Analyse für detailliertere Schwächen erforderlich');
  }
  if (recommendations.length === 0) {
    recommendations.push('Build Order Timing optimieren');
  }
  
  return { strengths, weaknesses, recommendations };
}

/**
 * Personalisierten Trainingsplan generieren
 */
function generateTrainingPlan(player: any, gameData: any): Array<{ day: number; focus: string; drill: string }> {
  const race = normalizeRace(player.race);
  const apm = player.apm || 0;
  
  const plan: Array<{ day: number; focus: string; drill: string }> = [];
  
  if (apm < 100) {
    plan.push({
      day: 1,
      focus: "APM Training",
      drill: `${race} Hotkey-Sequenzen 30 Minuten täglich üben`
    });
  } else {
    plan.push({
      day: 1,
      focus: "Präzision",
      drill: `${race} Build Order perfekt ausführen ohne Fehler`
    });
  }
  
  plan.push({
    day: 2,
    focus: "Rassen-Mechaniken",
    drill: race === 'Protoss' ? 'Pylon/Gateway Timing optimieren' :
           race === 'Terran' ? 'Supply Depot/Barracks Timing' :
           'Overlord/Spawning Pool Timing'
  });
  
  plan.push({
    day: 3,
    focus: "Makromanagement",
    drill: "Konstante Arbeiterproduktion ohne Unterbrechung"
  });
  
  plan.push({
    day: 4,
    focus: "Mikromanagement",
    drill: race === 'Protoss' ? 'Stalker Blink-Micro' :
           race === 'Terran' ? 'Marine Splitting' :
           'Zergling Surrounding'
  });
  
  plan.push({
    day: 5,
    focus: "Strategisches Denken",
    drill: `${race} Matchup-spezifische Build Orders studieren`
  });
  
  return plan;
}
