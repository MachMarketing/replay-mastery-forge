import { ParsedReplayData } from './replayParser/types';

/**
 * Parse a StarCraft: Brood War replay file using screparsed
 * This supports both Classic and Remastered replay formats
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
  
  // Parse with screparsed using dynamic import to avoid TypeScript issues
  try {
    console.log('[replayParser] Loading screparsed dynamically...');
    
    // Use dynamic import to avoid TypeScript compilation issues
    const screparsedModule = await import('screparsed');
    console.log('[replayParser] screparsed loaded:', typeof screparsedModule);
    console.log('[replayParser] screparsed keys:', Object.keys(screparsedModule));
    
    let screparsedResult: any;
    
    // Try different possible API patterns for screparsed with proper type handling
    // Check if there's a named export that's a function
    if (typeof (screparsedModule as any).parse === 'function') {
      console.log('[replayParser] Using screparsed.parse');
      screparsedResult = (screparsedModule as any).parse(uint8Array);
    } else if (typeof (screparsedModule as any).parseReplay === 'function') {
      console.log('[replayParser] Using screparsed.parseReplay');
      screparsedResult = (screparsedModule as any).parseReplay(uint8Array);
    } else if (screparsedModule.default && typeof screparsedModule.default === 'object') {
      // Check if default export is an object with methods
      const defaultExport = screparsedModule.default as any;
      if (typeof defaultExport.parse === 'function') {
        console.log('[replayParser] Using screparsed.default.parse');
        screparsedResult = defaultExport.parse(uint8Array);
      } else if (typeof defaultExport.parseReplay === 'function') {
        console.log('[replayParser] Using screparsed.default.parseReplay');
        screparsedResult = defaultExport.parseReplay(uint8Array);
      } else {
        // Try to use default export as a constructor
        try {
          console.log('[replayParser] Trying screparsed.default as constructor');
          const parser = new defaultExport();
          if (typeof parser.parse === 'function') {
            screparsedResult = parser.parse(uint8Array);
          } else {
            throw new Error('Constructor created object without parse method');
          }
        } catch (constructorError) {
          console.error('[replayParser] Constructor approach failed:', constructorError);
          throw new Error('Screparsed hat keine verfügbaren Parser-Methoden');
        }
      }
    } else {
      // Check if screparsed exports any callable functions
      const exportedKeys = Object.keys(screparsedModule);
      console.log('[replayParser] Available properties in screparsed:', exportedKeys);
      
      // Find the first function that might be the parser
      const parserFunction = exportedKeys.find(key => {
        const prop = (screparsedModule as any)[key];
        return typeof prop === 'function' && 
               (key.toLowerCase().includes('parse') || key === 'default');
      });
      
      if (parserFunction) {
        console.log('[replayParser] Using found parser function:', parserFunction);
        screparsedResult = (screparsedModule as any)[parserFunction](uint8Array);
      } else {
        throw new Error('Screparsed hat keine verfügbaren Parser-Funktionen');
      }
    }
    
    console.log('[replayParser] Screparsed result:', screparsedResult);
    
    if (!screparsedResult) {
      throw new Error('Screparsed konnte keine Daten extrahieren');
    }
    
    // Validate that we have basic required data
    if (!screparsedResult.header && !screparsedResult.players) {
      throw new Error('Screparsed konnte keine gültigen Replay-Daten extrahieren');
    }
    
    // Handle different possible result structures
    const players = screparsedResult.players || [];
    if (players.length < 2) {
      throw new Error('Replay muss mindestens 2 Spieler enthalten');
    }
    
    console.log('[replayParser] Successfully parsed with screparsed');
    return createParsedDataFromScreparsed(screparsedResult, file.name);
    
  } catch (screparsedError) {
    console.error('[replayParser] Screparsed parsing failed:', screparsedError);
    throw new Error(`Replay parsing fehlgeschlagen: ${screparsedError instanceof Error ? screparsedError.message : 'Unbekannter Fehler'}`);
  }
}

/**
 * Create parsed data from screparsed result with real data extraction
 */
function createParsedDataFromScreparsed(screparsedResult: any, filename: string): ParsedReplayData {
  console.log('[replayParser] Processing screparsed result:', {
    header: !!screparsedResult.header,
    playersCount: screparsedResult.players?.length,
    hasCommands: !!screparsedResult.commands,
    gameType: screparsedResult.header?.gameType
  });
  
  const players = screparsedResult.players || [];
  
  // Filter human players only (exclude computer players)
  const humanPlayers = players.filter((p: any) => p.human !== false && p.type !== 'computer');
  console.log('[replayParser] Found human players:', humanPlayers.length);
  
  if (humanPlayers.length < 2) {
    throw new Error('Nicht genügend menschliche Spieler gefunden');
  }
  
  const player1 = humanPlayers[0];
  const player2 = humanPlayers[1];
  
  console.log('[replayParser] Player 1:', {
    name: player1.name,
    race: player1.race,
    id: player1.id || player1.playerId
  });
  console.log('[replayParser] Player 2:', {
    name: player2.name,
    race: player2.race,
    id: player2.id || player2.playerId
  });
  
  // Extract real build order from commands with improved parsing
  const buildOrder = extractRealBuildOrderFromScreparsed(screparsedResult.commands, player1.id || player1.playerId || 0);
  console.log('[replayParser] Extracted build order items:', buildOrder.length);
  
  // Extract real game metrics
  const gameMetrics = extractGameMetricsFromScreparsed(screparsedResult);
  console.log('[replayParser] Game metrics:', gameMetrics);
  
  // Determine winner from real game data
  const isPlayer1Winner = determineWinner(screparsedResult, player1.id || player1.playerId || 0);
  
  // Real APM calculation from screparsed
  const player1APM = calculateRealAPM(screparsedResult.commands, player1.id || player1.playerId || 0, screparsedResult.header?.frames || 0);
  const player2APM = calculateRealAPM(screparsedResult.commands, player2.id || player2.playerId || 1, screparsedResult.header?.frames || 0);
  const player1EAPM = calculateEffectiveAPM(screparsedResult.commands, player1.id || player1.playerId || 0, screparsedResult.header?.frames || 0);
  const player2EAPM = calculateEffectiveAPM(screparsedResult.commands, player2.id || player2.playerId || 1, screparsedResult.header?.frames || 0);
  
  console.log('[replayParser] Real APM calculated:', {
    player1: { apm: player1APM, eapm: player1EAPM },
    player2: { apm: player2APM, eapm: player2EAPM }
  });
  
  // Real game duration from frames
  const durationFrames = screparsedResult.header?.frames || 0;
  const durationSeconds = Math.floor(durationFrames / 24); // 24 FPS for StarCraft
  const duration = formatDuration(durationSeconds);
  
  // Real map name
  const mapName = screparsedResult.header?.mapName || screparsedResult.header?.title || 'Unknown Map';
  
  // Create matchup string from real race data
  const matchup = `${getRaceShortName(player1.race)}v${getRaceShortName(player2.race)}`;
  
  // Analyze real performance data
  const analysis = analyzeRealPerformanceFromScreparsed(player1, buildOrder, screparsedResult.commands, screparsedResult.header);
  
  const primaryPlayer = {
    name: player1.name || 'Player 1',
    race: normalizeRaceName(player1.race),
    apm: player1APM,
    eapm: player1EAPM,
    buildOrder: buildOrder,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    recommendations: analysis.recommendations
  };
  
  const secondaryPlayer = {
    name: player2.name || 'Player 2',
    race: normalizeRaceName(player2.race),
    apm: player2APM,
    eapm: player2EAPM,
    buildOrder: [],
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  const trainingPlan = generateTrainingPlanFromAnalysis(analysis.weaknesses, primaryPlayer.race);
  
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
    playerName: player1.name || 'Player 1',
    opponentName: player2.name || 'Player 2',
    playerRace: normalizeRaceName(player1.race),
    opponentRace: normalizeRaceName(player2.race),
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
 * Extract real build order from screparsed commands with improved parsing
 */
function extractRealBuildOrderFromScreparsed(commands: any[], playerId: number): Array<{ time: string; supply: number; action: string }> {
  if (!commands || !Array.isArray(commands)) {
    console.warn('[replayParser] No commands found in replay');
    return [];
  }
  
  const buildOrder: Array<{ time: string; supply: number; action: string }> = [];
  let currentSupply = 9; // Starting supply for most races
  
  // Filter commands for the specific player and build-related actions
  const playerCommands = commands.filter(cmd => {
    const cmdPlayerId = cmd.playerId || cmd.player || cmd.playerID;
    return cmdPlayerId === playerId && isBuildCommand(cmd);
  });
  
  console.log('[replayParser] Found build commands for player', playerId, ':', playerCommands.length);
  
  playerCommands.forEach(cmd => {
    const timeInSeconds = Math.floor((cmd.frame || cmd.gameFrame || 0) / 24);
    const timeString = formatDuration(timeInSeconds);
    
    // Get unit/building name from command
    const actionName = getActionName(cmd);
    
    // Update supply based on action
    if (isSupplyProvidingUnit(actionName)) {
      currentSupply += getSupplyProvided(actionName);
    }
    
    buildOrder.push({
      time: timeString,
      supply: currentSupply,
      action: actionName
    });
  });
  
  // Sort by time and limit to first 25 items for meaningful analysis
  return buildOrder.sort((a, b) => parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time)).slice(0, 25);
}

/**
 * Check if command is build-related
 */
function isBuildCommand(cmd: any): boolean {
  const commandType = cmd.type || cmd.commandType || cmd.id;
  const unitType = cmd.unitType || cmd.unit || cmd.targetType;
  
  // Command types that indicate building/training
  const buildCommandTypes = ['build', 'train', 'morph', 'research', 'upgrade'];
  
  return buildCommandTypes.some(type => 
    String(commandType).toLowerCase().includes(type) ||
    (unitType && String(unitType).length > 0)
  );
}

/**
 * Get action name from command
 */
function getActionName(cmd: any): string {
  // Try various properties that might contain the unit/building name
  const unitType = cmd.unitType || cmd.unit || cmd.targetType || cmd.objectType;
  const cmdType = cmd.type || cmd.commandType;
  
  if (unitType) {
    return normalizeUnitName(unitType);
  }
  
  if (cmdType) {
    return String(cmdType);
  }
  
  return 'Unknown Action';
}

/**
 * Normalize unit names to readable format
 */
function normalizeUnitName(unitType: any): string {
  const unitStr = String(unitType);
  
  // Map common unit IDs/names to readable names
  const unitMap: { [key: string]: string } = {
    'SCV': 'SCV',
    'Marine': 'Marine',
    'Firebat': 'Firebat',
    'Medic': 'Medic',
    'Ghost': 'Ghost',
    'Vulture': 'Vulture',
    'Tank': 'Siege Tank',
    'Goliath': 'Goliath',
    'Wraith': 'Wraith',
    'Dropship': 'Dropship',
    'Battlecruiser': 'Battlecruiser',
    'CommandCenter': 'Command Center',
    'Barracks': 'Barracks',
    'Factory': 'Factory',
    'Starport': 'Starport',
    'SupplyDepot': 'Supply Depot',
    'Refinery': 'Refinery',
    'Academy': 'Academy',
    'Armory': 'Armory',
    'EngineeringBay': 'Engineering Bay',
    
    'Probe': 'Probe',
    'Zealot': 'Zealot',
    'Dragoon': 'Dragoon',
    'HighTemplar': 'High Templar',
    'DarkTemplar': 'Dark Templar',
    'Archon': 'Archon',
    'DarkArchon': 'Dark Archon',
    'Shuttle': 'Shuttle',
    'Scout': 'Scout',
    'Corsair': 'Corsair',
    'Carrier': 'Carrier',
    'Arbiter': 'Arbiter',
    'Nexus': 'Nexus',
    'Pylon': 'Pylon',
    'Gateway': 'Gateway',
    'Forge': 'Forge',
    'PhotonCannon': 'Photon Cannon',
    'CyberneticsCore': 'Cybernetics Core',
    'TemplarArchives': 'Templar Archives',
    'RoboticsFacility': 'Robotics Facility',
    'Stargate': 'Stargate',
    'Observatory': 'Observatory',
    
    'Drone': 'Drone',
    'Zergling': 'Zergling',
    'Hydralisk': 'Hydralisk',
    'Lurker': 'Lurker',
    'Mutalisk': 'Mutalisk',
    'Guardian': 'Guardian',
    'Devourer': 'Devourer',
    'Scourge': 'Scourge',
    'Queen': 'Queen',
    'Ultralisk': 'Ultralisk',
    'Defiler': 'Defiler',
    'Overlord': 'Overlord',
    'Hatchery': 'Hatchery',
    'Lair': 'Lair',
    'Hive': 'Hive',
    'CreepColony': 'Creep Colony',
    'SunkenColony': 'Sunken Colony',
    'SporeColony': 'Spore Colony',
    'SpawningPool': 'Spawning Pool',
    'HydraliskDen': 'Hydralisk Den',
    'Spire': 'Spire',
    'QueensNest': "Queen's Nest",
    'UltraliskCavern': 'Ultralisk Cavern'
  };
  
  // Try exact match first
  if (unitMap[unitStr]) {
    return unitMap[unitStr];
  }
  
  // Try partial matches
  for (const [key, value] of Object.entries(unitMap)) {
    if (unitStr.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(unitStr.toLowerCase())) {
      return value;
    }
  }
  
  return unitStr; // Return as-is if no mapping found
}

/**
 * Calculate real APM from commands
 */
function calculateRealAPM(commands: any[], playerId: number, totalFrames: number): number {
  if (!commands || totalFrames === 0) return 0;
  
  const playerCommands = commands.filter(cmd => {
    const cmdPlayerId = cmd.playerId || cmd.player || cmd.playerID;
    return cmdPlayerId === playerId;
  });
  
  const gameTimeMinutes = totalFrames / (24 * 60); // 24 FPS, 60 seconds per minute
  return Math.round(playerCommands.length / gameTimeMinutes);
}

/**
 * Calculate effective APM (filtering out spam clicks)
 */
function calculateEffectiveAPM(commands: any[], playerId: number, totalFrames: number): number {
  if (!commands || totalFrames === 0) return 0;
  
  const playerCommands = commands.filter(cmd => {
    const cmdPlayerId = cmd.playerId || cmd.player || cmd.playerID;
    return cmdPlayerId === playerId && isEffectiveCommand(cmd);
  });
  
  const gameTimeMinutes = totalFrames / (24 * 60);
  return Math.round(playerCommands.length / gameTimeMinutes);
}

/**
 * Check if command is "effective" (not spam)
 */
function isEffectiveCommand(cmd: any): boolean {
  const commandType = cmd.type || cmd.commandType || cmd.id;
  const ineffectiveCommands = ['select', 'rightclick', 'move', 'stop'];
  
  return !ineffectiveCommands.some(type => 
    String(commandType).toLowerCase().includes(type)
  );
}

/**
 * Determine winner from game data
 */
function determineWinner(screparsedResult: any, playerId: number): boolean {
  // Try to determine from game end conditions
  if (screparsedResult.header?.winner !== undefined) {
    return screparsedResult.header.winner === playerId;
  }
  
  // Fallback: assume player 1 wins if game lasted more than 5 minutes
  const durationMinutes = (screparsedResult.header?.frames || 0) / (24 * 60);
  return durationMinutes > 5; // Simple heuristic
}

/**
 * Get race short name for matchup
 */
function getRaceShortName(race: any): string {
  const raceStr = String(race).toLowerCase();
  if (raceStr.includes('terran') || raceStr.includes('t')) return 'T';
  if (raceStr.includes('protoss') || raceStr.includes('p')) return 'P';
  if (raceStr.includes('zerg') || raceStr.includes('z')) return 'Z';
  return 'T'; // Default fallback
}

/**
 * Normalize race name
 */
function normalizeRaceName(race: any): string {
  const raceStr = String(race).toLowerCase();
  if (raceStr.includes('terran') || raceStr.includes('t')) return 'Terran';
  if (raceStr.includes('protoss') || raceStr.includes('p')) return 'Protoss';
  if (raceStr.includes('zerg') || raceStr.includes('z')) return 'Zerg';
  return 'Terran'; // Default fallback
}

/**
 * Extract game metrics from screparsed result
 */
function extractGameMetricsFromScreparsed(screparsedResult: any): any {
  return {
    totalCommands: screparsedResult.commands?.length || 0,
    gameLength: screparsedResult.header?.frames || 0,
    mapName: screparsedResult.header?.mapName || screparsedResult.header?.title || 'Unknown',
    playerCount: screparsedResult.players?.length || 0,
    gameType: screparsedResult.header?.gameType || 'Unknown',
    gameVersion: screparsedResult.header?.version || 'Unknown'
  };
}

/**
 * Analyze real performance from screparsed data
 */
function analyzeRealPerformanceFromScreparsed(player: any, buildOrder: any[], commands: any[], header: any): {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  // APM Analysis with real data
  const totalFrames = header?.frames || 0;
  const playerId = player.id || player.playerId || 0;
  const realAPM = calculateRealAPM(commands, playerId, totalFrames);
  
  if (realAPM > 120) {
    strengths.push(`Sehr gute Aktionsgeschwindigkeit (${realAPM} APM)`);
  } else if (realAPM < 60) {
    weaknesses.push(`Niedrige Aktionsgeschwindigkeit (${realAPM} APM)`);
    recommendations.push('Übe Hotkey-Nutzung um deine APM zu verbessern');
  }
  
  // Build Order Analysis with real timing
  const gameDurationMinutes = totalFrames / (24 * 60);
  if (buildOrder.length >= 15 && gameDurationMinutes > 10) {
    strengths.push('Detaillierte Build Order über längere Spielzeit');
  } else if (buildOrder.length < 8 && gameDurationMinutes > 5) {
    weaknesses.push('Zu wenige strategische Aktionen in der Eröffnung');
    recommendations.push('Arbeite an einer strukturierteren Build Order');
  }
  
  // Race-specific analysis with real data
  const race = normalizeRaceName(player.race);
  if (race === 'Terran') {
    analyzeTerranaPerformanceReal(buildOrder, commands, playerId, strengths, weaknesses, recommendations);
  } else if (race === 'Protoss') {
    analyzeProtossPerformanceReal(buildOrder, commands, playerId, strengths, weaknesses, recommendations);
  } else if (race === 'Zerg') {
    analyzeZergPerformanceReal(buildOrder, commands, playerId, strengths, weaknesses, recommendations);
  }
  
  return { strengths, weaknesses, recommendations };
}

/**
 * Analyze Terran performance with real command data
 */
function analyzeTerranaPerformanceReal(buildOrder: any[], commands: any[], playerId: number, strengths: string[], weaknesses: string[], recommendations: string[]) {
  // Check for early Barracks timing
  const barracksItem = buildOrder.find(item => item.action.toLowerCase().includes('barracks'));
  if (barracksItem && parseTimeToSeconds(barracksItem.time) < 180) { // 3 minutes
    strengths.push(`Gutes Barracks-Timing (${barracksItem.time})`);
  } else if (!barracksItem || parseTimeToSeconds(barracksItem.time) > 240) {
    weaknesses.push('Spätes oder fehlendes Barracks-Timing');
    recommendations.push('Baue Barracks früher für bessere frühe Verteidigung');
  }
  
  // Check for SCV production consistency
  const scvCommands = commands.filter(cmd => 
    (cmd.playerId || cmd.player || cmd.playerID) === playerId &&
    getActionName(cmd).toLowerCase().includes('scv')
  );
  
  if (scvCommands.length > 20) {
    strengths.push('Konstante SCV-Produktion');
  } else if (scvCommands.length < 10) {
    weaknesses.push('Unzureichende Arbeiterproduktion');
    recommendations.push('Konzentriere dich auf kontinuierliche SCV-Produktion');
  }
}

/**
 * Analyze Protoss performance with real command data
 */
function analyzeProtossPerformanceReal(buildOrder: any[], commands: any[], playerId: number, strengths: string[], weaknesses: string[], recommendations: string[]) {
  // Check for Gateway timing
  const gatewayItem = buildOrder.find(item => item.action.toLowerCase().includes('gateway'));
  if (gatewayItem && parseTimeToSeconds(gatewayItem.time) < 200) {
    strengths.push(`Solides Gateway-Timing (${gatewayItem.time})`);
  } else {
    weaknesses.push('Spätes Gateway-Timing');
    recommendations.push('Verbessere dein Gateway-Timing für frühe Einheiten');
  }
  
  // Check for Probe production
  const probeCommands = commands.filter(cmd => 
    (cmd.playerId || cmd.player || cmd.playerID) === playerId &&
    getActionName(cmd).toLowerCase().includes('probe')
  );
  
  if (probeCommands.length > 15) {
    strengths.push('Gute Probe-Produktion');
  } else if (probeCommands.length < 8) {
    weaknesses.push('Zu wenig Probe-Produktion');
    recommendations.push('Baue mehr Probes für bessere Wirtschaft');
  }
}

/**
 * Analyze Zerg performance with real command data
 */
function analyzeZergPerformanceReal(buildOrder: any[], commands: any[], playerId: number, strengths: string[], weaknesses: string[], recommendations: string[]) {
  // Check for Spawning Pool timing
  const poolItem = buildOrder.find(item => item.action.toLowerCase().includes('spawning') || item.action.toLowerCase().includes('pool'));
  if (poolItem && parseTimeToSeconds(poolItem.time) < 120) {
    strengths.push(`Früher Spawning Pool (${poolItem.time})`);
  } else {
    weaknesses.push('Später Spawning Pool');
    recommendations.push('Baue Spawning Pool früher für Zerglings und Verteidigung');
  }
  
  // Check for Drone production
  const droneCommands = commands.filter(cmd => 
    (cmd.playerId || cmd.player || cmd.playerID) === playerId &&
    getActionName(cmd).toLowerCase().includes('drone')
  );
  
  if (droneCommands.length > 18) {
    strengths.push('Exzellente Drone-Produktion');
  } else if (droneCommands.length < 10) {
    weaknesses.push('Unzureichende Drone-Produktion');
    recommendations.push('Baue mehr Drones für stärkere Wirtschaft');
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

function isSupplyProvidingUnit(actionName: string): boolean {
  const supplyUnits = ['Supply Depot', 'Overlord', 'Pylon'];
  return supplyUnits.some(unit => actionName.toLowerCase().includes(unit.toLowerCase()));
}

function getSupplyProvided(actionName: string): number {
  if (actionName.toLowerCase().includes('overlord')) return 8;
  if (actionName.toLowerCase().includes('supply depot')) return 8;
  if (actionName.toLowerCase().includes('pylon')) return 8;
  return 0;
}

function generateTrainingPlanFromAnalysis(weaknesses: string[], race: string): Array<{ day: number; focus: string; drill: string }> {
  const trainingPlan: Array<{ day: number; focus: string; drill: string }> = [];
  
  if (weaknesses.some(w => w.includes('APM') || w.includes('Aktionsgeschwindigkeit'))) {
    trainingPlan.push({ 
      day: 1, 
      focus: "APM Training", 
      drill: `${race}-spezifische Hotkey-Kombos üben` 
    });
  }
  
  if (weaknesses.some(w => w.includes('Build Order') || w.includes('Eröffnung'))) {
    trainingPlan.push({ 
      day: 2, 
      focus: "Build Order", 
      drill: `Standard ${race} Build Orders perfektionieren` 
    });
  }
  
  if (weaknesses.some(w => w.includes('Arbeiter') || w.includes('SCV') || w.includes('Probe') || w.includes('Drone'))) {
    trainingPlan.push({ 
      day: 3, 
      focus: "Wirtschaft", 
      drill: "Kontinuierliche Arbeiterproduktion ohne Unterbrechung" 
    });
  }
  
  if (weaknesses.some(w => w.includes('Barracks') || w.includes('Gateway') || w.includes('Pool'))) {
    trainingPlan.push({ 
      day: 4, 
      focus: "Frühe Produktion", 
      drill: "Optimales Timing für erste Produktionsgebäude" 
    });
  }
  
  // Add race-specific training if no specific weaknesses found
  if (trainingPlan.length === 0) {
    switch (race) {
      case 'Terran':
        trainingPlan.push(
          { day: 1, focus: "Marine/Medic Timing", drill: "Bio-Ball Kontrolle üben" },
          { day: 2, focus: "Tank Positioning", drill: "Siege-Tank Mikromanagement" }
        );
        break;
      case 'Protoss':
        trainingPlan.push(
          { day: 1, focus: "Zealot/Dragoon Balance", drill: "Einheitenmix optimieren" },
          { day: 2, focus: "Psionic Storm", drill: "High Templar Kontrolle" }
        );
        break;
      case 'Zerg':
        trainingPlan.push(
          { day: 1, focus: "Zergling Micro", drill: "Surround-Techniken perfektionieren" },
          { day: 2, focus: "Expansion Timing", drill: "Mehrere Hatcheries verwalten" }
        );
        break;
      default:
        trainingPlan.push(
          { day: 1, focus: "Makro", drill: "Ununterbrochene Produktion" },
          { day: 2, focus: "Mikro", drill: "Einheitenkontrolle in Kämpfen" }
        );
    }
  }
  
  return trainingPlan;
}
