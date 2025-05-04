/**
 * Maps raw parser output to our application's format
 */
import { standardizeRaceName } from '@/lib/replayUtils';
import type { ParsedReplayResult } from './replayParserService';

export function mapRawToParsed(rawData: any): ParsedReplayResult {
  console.log('🔄 [replayMapper] Mapping raw data to application format, keys:', Object.keys(rawData));

  // Extract player information with better validation
  const players = extractPlayers(rawData);
  const player = players.player;
  const opponent = players.opponent;
  
  // Process race information with enhanced detection
  // Use the pre-mapped race from the WASM parser if available, otherwise use the race letter
  let playerRaceInfo = player.race || player.raceLetter;
  let opponentRaceInfo = opponent.race || opponent.raceLetter;
  
  console.log('🔄 [replayMapper] Raw race information:', { 
    playerRaceInfo,
    opponentRaceInfo
  });
  
  // Standardize race names
  const playerRace = standardizeRaceName(playerRaceInfo);
  const opponentRace = standardizeRaceName(opponentRaceInfo);
  
  console.log('🔄 [replayMapper] Standardized race information:', { 
    playerRace,
    opponentRace
  });
  
  // Extract map name with fallbacks
  const map = extractMapName(rawData);
  console.log('🔄 [replayMapper] Map name:', map);
  
  // Calculate duration
  const durationInfo = extractDuration(rawData);
  console.log('🔄 [replayMapper] Duration:', durationInfo.duration);
  
  // Extract date with fallback
  const date = extractDate(rawData);
  console.log('🔄 [replayMapper] Date:', date);
  
  // Extract APM
  const apmInfo = calculateApm(rawData, durationInfo.durationMs);
  console.log('🔄 [replayMapper] APM:', apmInfo.apm, 'EAPM:', apmInfo.eapm);
  
  // Create matchup 
  const matchup = `${playerRace.charAt(0)}v${opponentRace.charAt(0)}`;
  console.log('🔄 [replayMapper] Matchup:', matchup);
  
  // Extract result
  const result = determineResult(rawData, player.id);
  console.log('🔄 [replayMapper] Result:', result);
  
  // Extract build order
  const buildOrder = extractBuildOrder(rawData);
  console.log('🔄 [replayMapper] Build order items:', buildOrder.length);

  // Log raw players for debugging
  if (rawData.players) {
    console.log('🔄 [replayMapper] Raw player data (from rawData.players):', 
      rawData.players.map((p: any) => ({
        name: p.name,
        race: p.race,
        raceLetter: p.raceLetter,
        id: p.id
      }))
    );
  }
  
  // Return mapped data
  const mappedData: ParsedReplayResult = {
    playerName: player.name || 'Unknown',
    opponentName: opponent.name || 'Unknown',
    playerRace: playerRace,
    opponentRace: opponentRace,
    map,
    duration: durationInfo.duration,
    date,
    result,
    apm: apmInfo.apm,
    eapm: apmInfo.eapm,
    matchup,
    buildOrder,
    // These will be filled by the analyzer later if not present:
    strengths: [],
    weaknesses: [],
    recommendations: []
  };
  
  console.log('🔄 [replayMapper] Final mapped data:', mappedData);
  return mappedData;
}

/**
 * Extract player information from various formats
 */
function extractPlayers(data: any): { player: any, opponent: any } {
  console.log('🔄 [replayMapper] Extracting players from format:', 
    data.players ? 'Standard' : 
    data.header?.players ? 'Header' : 
    'Unknown');
  
  let rawPlayers: any[] = [];
  
  // Handle different parser output formats
  if (Array.isArray(data.players)) {
    rawPlayers = data.players;
    console.log('🔄 [replayMapper] Using data.players array:', 
      rawPlayers.map(p => ({name: p.name, race: p.race, raceLetter: p.raceLetter}))
    );
  } else if (data.header && Array.isArray(data.header.players)) {
    rawPlayers = data.header.players;
    console.log('🔄 [replayMapper] Using data.header.players array');
  } else if (typeof data.players === 'object') {
    // Convert player object to array (some formats use object with numeric keys)
    rawPlayers = Object.values(data.players);
    console.log('🔄 [replayMapper] Converted player object to array');
  }
  
  console.log('🔄 [replayMapper] Raw players data count:', rawPlayers.length);
  
  if (rawPlayers.length > 0) {
    // Log the first few players for debugging
    rawPlayers.slice(0, Math.min(rawPlayers.length, 3)).forEach((p, i) => {
      console.log(`🔄 [replayMapper] Raw player ${i + 1}:`, {
        name: p.name,
        race: p.race,
        raceLetter: p.raceLetter, 
        id: p.id
      });
    });
  }
  
  // Default player objects
  const defaultPlayer = { id: '1', name: 'Player', race: 'Terran', raceLetter: 'T' };
  const defaultOpponent = { id: '2', name: 'Opponent', race: 'Terran', raceLetter: 'T' };
  
  // Try to extract meaningful player information
  let player = defaultPlayer;
  let opponent = defaultOpponent;
  
  if (rawPlayers.length >= 2) {
    // Normal case: we have at least 2 players
    player = sanitizePlayer(rawPlayers[0]);
    opponent = sanitizePlayer(rawPlayers[1]);
    console.log('🔄 [replayMapper] Found 2+ players in replay:', 
      { player: `${player.name} (${player.race || player.raceLetter})`, 
        opponent: `${opponent.name} (${opponent.race || opponent.raceLetter})` });
  } else if (rawPlayers.length === 1) {
    // Edge case: only 1 player in data
    player = sanitizePlayer(rawPlayers[0]);
    console.log('🔄 [replayMapper] Found only 1 player in replay, using default opponent:', 
      { player: `${player.name} (${player.race || player.raceLetter})` });
  } else {
    // No players found, use defaults
    console.warn('🔄 [replayMapper] No players found in replay data, using defaults');
  }
  
  return { player, opponent };
}

/**
 * Clean up player data and ensure required fields
 */
function sanitizePlayer(rawPlayer: any): any {
  if (!rawPlayer) return { id: '0', name: 'Unknown', race: 'Terran', raceLetter: 'T' };
  
  console.log('🔄 [replayMapper] Sanitizing player data:', rawPlayer);
  
  // Extract name with fallbacks
  let name = 'Unknown';
  if (typeof rawPlayer.name === 'string') {
    name = rawPlayer.name;
  } else if (rawPlayer.playerName) {
    name = String(rawPlayer.playerName);
  }
  
  // Extract race with enhanced fallbacks
  let race = rawPlayer.race || '';
  let raceLetter = rawPlayer.raceLetter || '';
  
  // If we have a full race name but no letter, extract the letter
  if (race && !raceLetter && typeof race === 'string') {
    if (race.toUpperCase().startsWith('P')) raceLetter = 'P';
    else if (race.toUpperCase().startsWith('T')) raceLetter = 'T';
    else if (race.toUpperCase().startsWith('Z')) raceLetter = 'Z';
  }
  
  // If we have a letter but no full race name, map to full name
  if (raceLetter && !race) {
    if (raceLetter.toUpperCase() === 'P') race = 'Protoss';
    else if (raceLetter.toUpperCase() === 'T') race = 'Terran';
    else if (raceLetter.toUpperCase() === 'Z') race = 'Zerg';
  }
  
  // Fallbacks for race information
  if (!race && !raceLetter) {
    console.warn('🔄 [replayMapper] No race information found, defaulting to Terran');
    race = 'Terran';
    raceLetter = 'T';
  }
  
  // Extract ID with fallbacks
  let id = '0';
  if (rawPlayer.id) {
    id = String(rawPlayer.id);
  } else if (rawPlayer.playerID) {
    id = String(rawPlayer.playerID);
  } else if (rawPlayer.playerId) {
    id = String(rawPlayer.playerId);
  }
  
  console.log('🔄 [replayMapper] Sanitized player data:', { name, race, raceLetter, id });
  
  return { id, name, race, raceLetter };
}

/**
 * Extract map name from various formats
 */
function extractMapName(data: any): string {
  // Try different paths where map name might be stored
  if (typeof data.map === 'string') {
    return data.map;
  } else if (typeof data.mapName === 'string') {
    return data.mapName;
  } else if (data.header && typeof data.header.mapName === 'string') {
    return data.header.mapName;
  } else if (data.header && data.header.map && typeof data.header.map.name === 'string') {
    return data.header.map.name;
  }
  
  // Default if not found
  return 'Unknown Map';
}

/**
 * Extract duration information from various formats
 */
function extractDuration(data: any): { duration: string, durationMs: number } {
  let durationMs = 0;
  
  // Try different paths where duration might be stored
  if (typeof data.durationMS === 'number') {
    durationMs = data.durationMS;
  } else if (typeof data.duration === 'number') {
    durationMs = data.duration;
  } else if (data.header && typeof data.header.duration === 'number') {
    durationMs = data.header.duration;
  } else if (data.computed && typeof data.computed.durationFrames === 'number') {
    // Convert frames to ms (assuming 24fps for StarCraft)
    durationMs = data.computed.durationFrames * (1000 / 24);
  }
  
  // Format duration string
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return { duration, durationMs };
}

/**
 * Extract date from various formats
 */
function extractDate(data: any): string {
  // Try different paths where date might be stored
  if (data.date) {
    return formatDate(data.date);
  } else if (data.header && data.header.date) {
    return formatDate(data.header.date);
  } else if (data.header && data.header.startTime) {
    return formatDate(data.header.startTime);
  } else if (data.gameStartDate) {
    return formatDate(data.gameStartDate);
  }
  
  // Default to current date if not found
  return new Date().toISOString().split('T')[0];
}

/**
 * Format date to ISO string
 */
function formatDate(date: any): string {
  // Handle string dates
  if (typeof date === 'string') {
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }
  
  // Handle timestamp numbers
  if (typeof date === 'number') {
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }
  
  // Default
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate APM from various data formats
 */
function calculateApm(data: any, durationMs: number): { apm: number, eapm: number } {
  let actions = 0;
  let gameMinutes = Math.max(durationMs / 60000, 1); // Prevent division by zero
  
  // Try different paths where actions might be stored
  if (data.actions && Array.isArray(data.actions)) {
    actions = data.actions.length;
  } else if (data.commands && Array.isArray(data.commands)) {
    actions = data.commands.length;
  } else if (data.computed && typeof data.computed.apm === 'number') {
    return {
      apm: Math.round(data.computed.apm),
      eapm: Math.round(data.computed.apm * 0.85) // Estimated EAPM if not available
    };
  }
  
  // Calculate APM and EAPM
  const apm = Math.round(actions / gameMinutes);
  const eapm = Math.round(apm * 0.85); // Estimated EAPM if not available
  
  return { apm, eapm };
}

/**
 * Determine win/loss result
 */
function determineResult(data: any, playerId: string): 'win' | 'loss' {
  // Try to find winner information
  if (data.winner === playerId || data.winnerId === playerId) {
    return 'win';
  } else if (data.winner && data.winner !== playerId) {
    return 'loss';
  }
  
  // If there's a result property, use it
  if (data.result) {
    return data.result.toLowerCase().includes('win') ? 'win' : 'loss';
  }
  
  // Default to win (can be improved with more data)
  return 'win';
}

/**
 * Extract build order from command data
 */
function extractBuildOrder(data: any): { time: string; supply: number; action: string }[] {
  const buildActions: any[] = [];
  
  // Try to find action/command data
  let actions: any[] = [];
  if (Array.isArray(data.actions)) {
    actions = data.actions;
  } else if (Array.isArray(data.commands)) {
    actions = data.commands;
  } else {
    return [];
  }
  
  // Filter for relevant build actions
  actions.forEach(cmd => {
    if (cmd.type === 'train' || cmd.type === 'build' || cmd.type === 'upgrade') {
      buildActions.push(cmd);
    }
  });
  
  // Map to our build order format
  return buildActions.slice(0, 20).map(cmd => {
    // Convert frames to time string
    const timeMs = (cmd.frame || 0) * (1000 / 24);
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    
    return {
      time: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      supply: cmd.supply || 0,
      action: cmd.unit || cmd.building || cmd.upgrade || 'Unknown Action'
    };
  });
}
