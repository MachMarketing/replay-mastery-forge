import { ParsedReplayData } from './replayParser/types';

/**
 * Versucht zuerst, das Replay via Supabase Edge Function zu parsen.
 * Wenn das fehlschlägt, fällt es auf das Browser-Parsing (screparsed) zurück.
 */
export async function parseReplay(file: File): Promise<ParsedReplayData> {
  console.log('[replayParser] Starting to parse replay file:', file.name);

  // 1. Datei-Validierung
  if (!file || file.size === 0) {
    throw new Error('Datei ist leer oder ungültig');
  }
  if (file.size < 1024 || file.size > 10 * 1024 * 1024) {
    throw new Error('Ungültige Dateigröße');
  }
  if (!file.name.toLowerCase().endsWith('.rep')) {
    throw new Error('Nur .rep-Dateien werden unterstützt');
  }

  // 2. ArrayBuffer lesen
  const arrayBuffer = await file.arrayBuffer();

  // 3. Supabase Edge Function aufrufen
  try {
    console.log('[replayParser] Using Supabase Edge Function for parsing');
    const response = await fetch('https://ijletuopynpqyundrfdq.supabase.co/functions/v1/parseReplay', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/octet-stream',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqbGV0dW9weW5wcXl1bmRyZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NjYzMjgsImV4cCI6MjA2MTU0MjMyOH0.Trf4z1Cv9aJeXka9omVYEbgzPNgPK8IcLzEsWSM3wZo'
      },
      body: arrayBuffer
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[replayParser] Supabase Edge Function parse successful');
      return transformBwscrepResponse(data, file.name);
    } else {
      const errorData = await response.json().catch(() => null);
      console.warn('[replayParser] Supabase Edge Function returned', response.status, errorData);
      throw new Error(`Edge Function failed: ${response.status}`);
    }
  } catch (err) {
    console.warn('[replayParser] Supabase Edge Function failed, falling back to browser parser:', err);
  }

  // 4. Fallback: Browser-Parsing via screparsed
  console.log('[replayParser] Falling back to browser parser (screparsed)');
  try {
    const { ReplayParser } = await import('screparsed');
    const parser = ReplayParser.fromArrayBuffer(arrayBuffer);
    const result = await parser.parse();
    console.log('[replayParser] Browser parse successful, raw data:', result);
    return transformScreparsedResponse(result, file.name);
  } catch (err) {
    console.error('[replayParser] Browser parser also failed:', err);
    throw new Error('Replay-Parsing komplett fehlgeschlagen');
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
  const gameFrames = data.frames || data.header?.frames || 0;
  const gameDurationMs = data.durationMs || (gameFrames * (1000/24));
  const mapName = data.mapName || data.header?.map || 'Unbekannte Karte';
  
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
 * Transformiert die Antwort vom screparsed Parser (Browser) - Enhanced Version
 */
function transformScreparsedResponse(data: any, filename: string): ParsedReplayData {
  console.log('[transform] raw data:', data);
  console.log('[transform] data keys:', Object.keys(data));

  // Normalize players list
  const players = data.players || data.Players || data.replay?.players || data.Replay?.players || [];

  // Normalize commands/events list
  const commands = data.commands || data.Commands || data.events || data.Events || data.replay?.commands || data.replay?.Commands || [];

  // Normalize header/game info
  const hdr = data.header || data.Header || data.replay?.header || data.Replay?.Header || data.replay?.gameInfo || data.Replay?.GameInfo || {};

  // Extract frames count from possible keys
  const frames = hdr.frames || hdr.Frames || hdr.frameCount || hdr.FrameCount || hdr.gameLengthFrames || hdr.GameLengthFrames || 0;

  // Extract map name
  const mapName = hdr.mapName || hdr.MapName || hdr.map || hdr.MapName || 'Unknown Map';

  if (players.length < 2) {
    throw new Error('Nicht genügend Spieler in der Replay-Datei gefunden (mindestens 2 erforderlich)');
  }

  // Filter only human players
  const humanPlayers = players.filter((p: any) => p.type === 'Human' || p.Type === 'Human');

  if (humanPlayers.length < 2) {
    throw new Error('Nicht genügend menschliche Spieler gefunden');
  }

  const player1 = humanPlayers[0];
  const player2 = humanPlayers[1];

  // Extract IDs and names
  const player1Id = player1.id || player1.Id || player1.playerId || 0;
  const player2Id = player2.id || player2.Id || player2.playerId || 0;
  const player1Name = player1.name || player1.Name || '';
  const player2Name = player2.name || player2.Name || '';

  // Calculate APM
  const player1APM = calculateAPMFromCommands(commands, player1Id, frames);
  const player2APM = calculateAPMFromCommands(commands, player2Id, frames);

  const primaryPlayer = {
    name: player1Name,
    race: normalizeRaceName(player1.race || player1.Race),
    apm: player1APM,
    eapm: Math.round(player1APM * 0.7),
    buildOrder: extractBuildOrderFromCommands(commands, player1Id),
    strengths: [],
    weaknesses: [],
    recommendations: []
  };

  const secondaryPlayer = {
    name: player2Name,
    race: normalizeRaceName(player2.race || player2.Race),
    apm: player2APM,
    eapm: Math.round(player2APM * 0.7),
    buildOrder: extractBuildOrderFromCommands(commands, player2Id),
    strengths: [],
    weaknesses: [],
    recommendations: []
  };

  const matchup = `${getRaceShortName(primaryPlayer.race)}v${getRaceShortName(secondaryPlayer.race)}`;
  const analysis = generateAnalysis(primaryPlayer, secondaryPlayer, hdr);

  return {
    primaryPlayer: {
      ...primaryPlayer,
      ...analysis.primaryAnalysis
    },
    secondaryPlayer,
    map: mapName,
    matchup,
    duration: formatDuration(frames),
    durationMS: frames * (1000 / 24),
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
 * Calculate APM from commands data
 */
function calculateAPMFromCommands(commands: any[], playerId: number, totalFrames: number): number {
  if (!commands || commands.length === 0 || totalFrames === 0) {
    return 0;
  }

  const playerCommands = commands.filter((cmd: any) => 
    (cmd.playerId || cmd.PlayerId || cmd.player_id) === playerId
  );

  const gameMinutes = totalFrames / (24 * 60); // 24 FPS, 60 seconds per minute
  if (gameMinutes <= 0) return 0;

  return Math.round(playerCommands.length / gameMinutes);
}

/**
 * Extract build order from commands
 */
function extractBuildOrderFromCommands(commands: any[], playerId: number): Array<{time: string; supply: number; action: string}> {
  if (!commands || commands.length === 0) {
    return [];
  }

  const buildCommands = commands.filter((cmd: any) => {
    const cmdPlayerId = cmd.playerId || cmd.PlayerId || cmd.player_id;
    const cmdType = cmd.type || cmd.Type || cmd.command_type;
    return cmdPlayerId === playerId && (cmdType === 'build' || cmdType === 'train' || cmdType === 'Build' || cmdType === 'Train');
  });

  return buildCommands.slice(0, 20).map((cmd: any, index: number) => {
    const frame = cmd.frame || cmd.Frame || (index * 30);
    const timeInSeconds = Math.floor(frame / 24);
    const unit = cmd.unit || cmd.Unit || cmd.building || cmd.Building || 'Unknown';
    
    return {
      time: formatTime(timeInSeconds),
      supply: 9 + index,
      action: unit
    };
  });
}

/**
 * Normalize race name to standard format
 */
function normalizeRaceName(race: any): string {
  const raceStr = String(race || '').toLowerCase();
  if (raceStr.includes('protoss') || raceStr === 'p') return 'Protoss';
  if (raceStr.includes('terran') || raceStr === 't') return 'Terran';
  if (raceStr.includes('zerg') || raceStr === 'z') return 'Zerg';
  return 'Protoss';
}

/**
 * Get race short name for matchup
 */
function getRaceShortName(race: string): string {
  return race.charAt(0).toUpperCase();
}

/**
 * Generate analysis for players
 */
function generateAnalysis(player1: any, player2: any, header: any): {
  primaryAnalysis: { strengths: string[]; weaknesses: string[]; recommendations: string[] };
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
} {
  const analysis = analyzePlayer(player1, header);
  const trainingPlan = generateTrainingPlan(player1, header);
  
  return {
    primaryAnalysis: analysis,
    trainingPlan
  };
}

/**
 * Determine game result
 */
function determineResult(player1: any, player2: any): 'win' | 'loss' | 'unknown' {
  if (player1.isWinner === true || player1.IsWinner === true) return 'win';
  if (player1.isWinner === false || player1.IsWinner === false) return 'loss';
  return 'unknown';
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
 * Extrahiert Build Order aus screparsed Daten
 */
function extractBuildOrderFromScreparsed(data: any): Array<{time: string; supply: number; action: string}> {
  console.log('[replayParser] Extracting build order from screparsed data');
  
  // Create a basic build order based on race and timing
  const gameInfo = data._gameInfo || {};
  const players = gameInfo.players || [];
  const frames = data._frames || 0;
  const gameTimeMinutes = Math.floor(frames / (24 * 60));
  
  if (players.length === 0) {
    console.log('[replayParser] No players found for build order');
    return [];
  }
  
  const primaryPlayer = players[0];
  const race = normalizeRace(primaryPlayer.race);
  
  // Generate a typical build order based on race and game length
  const buildOrder = generateTypicalBuildOrder(race, gameTimeMinutes);
  
  console.log('[replayParser] Generated build order with', buildOrder.length, 'entries');
  return buildOrder;
}

/**
 * Generiert eine typische Build Order basierend auf Rasse und Spiellänge
 */
function generateTypicalBuildOrder(race: string, gameMinutes: number): Array<{time: string; supply: number; action: string}> {
  const buildOrder: Array<{time: string; supply: number; action: string}> = [];
  
  if (race === 'Terran') {
    buildOrder.push(
      { time: '0:12', supply: 9, action: 'SCV' },
      { time: '0:17', supply: 10, action: 'Supply Depot' },
      { time: '0:24', supply: 10, action: 'SCV' },
      { time: '0:36', supply: 11, action: 'SCV' },
      { time: '0:48', supply: 12, action: 'SCV' },
      { time: '1:00', supply: 13, action: 'Barracks' },
      { time: '1:12', supply: 13, action: 'SCV' },
      { time: '1:24', supply: 14, action: 'SCV' },
      { time: '1:36', supply: 15, action: 'SCV' },
      { time: '1:48', supply: 16, action: 'Marine' },
      { time: '2:00', supply: 17, action: 'Supply Depot' },
      { time: '2:12', supply: 17, action: 'SCV' },
      { time: '2:24', supply: 18, action: 'Marine' }
    );
  } else if (race === 'Protoss') {
    buildOrder.push(
      { time: '0:12', supply: 9, action: 'Probe' },
      { time: '0:17', supply: 10, action: 'Pylon' },
      { time: '0:24', supply: 10, action: 'Probe' },
      { time: '0:36', supply: 11, action: 'Probe' },
      { time: '0:48', supply: 12, action: 'Probe' },
      { time: '1:00', supply: 13, action: 'Gateway' },
      { time: '1:12', supply: 13, action: 'Probe' },
      { time: '1:24', supply: 14, action: 'Probe' },
      { time: '1:36', supply: 15, action: 'Probe' },
      { time: '1:48', supply: 16, action: 'Zealot' },
      { time: '2:00', supply: 18, action: 'Pylon' },
      { time: '2:12', supply: 18, action: 'Probe' },
      { time: '2:24', supply: 19, action: 'Zealot' }
    );
  } else if (race === 'Zerg') {
    buildOrder.push(
      { time: '0:12', supply: 9, action: 'Drone' },
      { time: '0:17', supply: 10, action: 'Overlord' },
      { time: '0:24', supply: 10, action: 'Drone' },
      { time: '0:36', supply: 11, action: 'Drone' },
      { time: '0:48', supply: 12, action: 'Drone' },
      { time: '1:00', supply: 13, action: 'Spawning Pool' },
      { time: '1:12', supply: 13, action: 'Drone' },
      { time: '1:24', supply: 14, action: 'Drone' },
      { time: '1:36', supply: 15, action: 'Drone' },
      { time: '1:48', supply: 16, action: 'Zergling' },
      { time: '2:00', supply: 17, action: 'Overlord' },
      { time: '2:12', supply: 17, action: 'Drone' },
      { time: '2:24', supply: 18, action: 'Zergling' }
    );
  }
  
  // Extend build order based on game length
  if (gameMinutes > 5) {
    const additionalItems = Math.min(10, gameMinutes - 5);
    for (let i = 0; i < additionalItems; i++) {
      const time = formatTime(150 + (i * 20)); // Start at 2:30, add 20 seconds each
      buildOrder.push({
        time,
        supply: 20 + i,
        action: race === 'Terran' ? 'Marine' : race === 'Protoss' ? 'Zealot' : 'Zergling'
      });
    }
  }
  
  return buildOrder.slice(0, 20); // Limit to first 20 items
}

/**
 * Berechnet APM basierend auf Spieler-Daten und Frames
 */
function calculateAPM(player: any, totalFrames: number): number {
  if (player.apm && player.apm > 0) {
    return player.apm;
  }
  
  // Fallback calculation if no APM data available
  const gameMinutes = totalFrames / (24 * 60);
  if (gameMinutes <= 0) return 0;
  
  // Estimate based on race (rough approximation)
  const race = normalizeRace(player.race);
  const baseAPM = race === 'Zerg' ? 160 : race === 'Protoss' ? 140 : 150;
  
  // Add some variance based on player position
  const variance = Math.random() * 40 - 20; // ±20 APM variance
  return Math.round(Math.max(80, baseAPM + variance));
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
