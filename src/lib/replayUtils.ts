/**
 * Utility functions for replay data processing
 */

/**
 * Standardize race names to consistent format
 */
export function standardizeRaceName(race: string | undefined): string {
  if (!race) return 'Unknown';
  
  const lowerRace = race.toLowerCase();
  
  if (lowerRace.includes('terr') || lowerRace === 't') {
    return 'Terran';
  } else if (lowerRace.includes('prot') || lowerRace === 'p') {
    return 'Protoss';
  } else if (lowerRace.includes('zerg') || lowerRace === 'z') {
    return 'Zerg';
  } else if (lowerRace === '0') {
    return 'Zerg';     // From screparsed documentation: 0 = Zerg
  } else if (lowerRace === '1') {
    return 'Terran';   // From screparsed documentation: 1 = Terran
  } else if (lowerRace === '2') {
    return 'Protoss';  // From screparsed documentation: 2 = Protoss
  } else {
    return 'Unknown';
  }
}

/**
 * Format player name by trimming whitespace and empty characters
 */
export function formatPlayerName(name: string): string {
  if (!name) return 'Unknown';
  
  // Remove non-printable characters
  const cleanName = name.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
  
  return cleanName || 'Unknown';
}

/**
 * Deeply analyze the replay structure to find usable data
 * This helper function logs detailed information about replay structure
 */
export function deepAnalyzeReplayStructure(data: any): void {
  console.log('[deepAnalyze] Starting deep structure analysis');
  
  if (!data) {
    console.log('[deepAnalyze] No data provided');
    return;
  }
  
  // Look for keys that might contain build order data
  const buildRelatedKeys = ['commands', 'events', 'actions', 'builds', 'unitsBorn', 'buildOrder'];
  
  for (const key of buildRelatedKeys) {
    if (data[key] && Array.isArray(data[key])) {
      console.log(`[deepAnalyze] Found potential build data in ${key}:`, data[key].length, 'items');
      if (data[key].length > 0) {
        console.log(`[deepAnalyze] Sample ${key} item:`, data[key][0]);
      }
    }
  }
  
  // Look specifically for screparsed format with _frames and _gameInfo
  if (data._frames && data._gameInfo) {
    console.log('[deepAnalyze] Detected screparsed format with _frames and _gameInfo');
    console.log('[deepAnalyze] Frame count:', Array.isArray(data._frames) ? data._frames.length : 'unknown');
  }
  
  // Check for any properties that might contain build order information
  if (typeof data === 'object') {
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'object' && data[key] !== null) {
        // Check if this object has properties that suggest it might contain build orders
        if (key.toLowerCase().includes('build') || 
            key.toLowerCase().includes('command') ||
            key.toLowerCase().includes('action') ||
            key.toLowerCase().includes('event')) {
          console.log(`[deepAnalyze] Potential build data in ${key}:`, data[key]);
        }
        
        // For arrays, check sample items for build-related fields
        if (Array.isArray(data[key]) && data[key].length > 0) {
          const sample = data[key][0];
          if (sample && typeof sample === 'object') {
            const sampleKeys = Object.keys(sample);
            const hasBuildIndicators = sampleKeys.some(k => 
              k.toLowerCase().includes('build') ||
              k.toLowerCase().includes('unit') ||
              k.toLowerCase().includes('structure') ||
              k.toLowerCase().includes('train')
            );
            
            if (hasBuildIndicators) {
              console.log(`[deepAnalyze] Array ${key} may contain build data, sample:`, sample);
            }
          }
        }
      }
    });
  }
}

/**
 * Extract map name from replay data
 */
export function extractMapName(data: any): string {
  if (!data) return 'Unknown Map';
  
  // Try different property paths where map name might be stored
  const mapSearchPaths = [
    'header.mapName',
    'header.map',
    'Header.Map',
    'map',
    'mapName',
    'metadata.mapName',
    'MapName',
    'mapData.name',
    'scenario.mapTitle',
    '_gameInfo.mapName'
  ];
  
  // Log search attempts for debugging
  const mapInfo: Record<string, string> = {
    directMapName: 'Not found',
    gameInfoMapName: 'Not found',
    headerMapName: 'Not found',
    metadataMapName: 'Not found',
    mapData: 'Not found',
    scenarioMapTitle: 'Not found'
  };
  
  // Direct properties
  if (data.mapName) mapInfo.directMapName = data.mapName;
  if (data._gameInfo?.mapName) mapInfo.gameInfoMapName = data._gameInfo.mapName;
  if (data.header?.mapName || data.header?.map) mapInfo.headerMapName = data.header?.mapName || data.header?.map;
  if (data.metadata?.mapName) mapInfo.metadataMapName = data.metadata.mapName;
  if (data.mapData?.name) mapInfo.mapData = data.mapData.name;
  if (data.scenario?.mapTitle) mapInfo.scenarioMapTitle = data.scenario.mapTitle;
  
  console.log('[replayUtils] Map information search:', mapInfo);
  
  // Try each path
  for (const path of mapSearchPaths) {
    const pathParts = path.split('.');
    let current = data;
    let valid = true;
    
    for (const part of pathParts) {
      if (!current || typeof current !== 'object') {
        valid = false;
        break;
      }
      current = current[part];
    }
    
    if (valid && current && typeof current === 'string') {
      return current;
    }
  }
  
  return 'Unknown Map';
}

/**
 * Debug log for replay data structure
 */
export function debugLogReplayData(data: any): void {
  if (!data) {
    console.log('🔍 Replay data is null or undefined');
    return;
  }
  
  console.log('🔍 Replay data structure:', {
    hasHeader: !!data.Header,
    headerKeys: data.Header ? Object.keys(data.Header) : [],
    hasCommands: Array.isArray(data.Commands),
    commandsCount: Array.isArray(data.Commands) ? data.Commands.length : 0,
    hasPlayers: data.Header?.Players ? data.Header.Players.length : 0,
    topLevelKeys: Object.keys(data)
  });

  // Enhanced debugging for screparsed format
  if (data._gameInfo) {
    console.log('🔍 screparsed _gameInfo:', {
      availableKeys: Object.keys(data._gameInfo),
      hasPlayerStructs: !!data._gameInfo.playerStructs,
      mapName: data._gameInfo.mapName || 'Unknown'
    });

    // Deep inspection of playerStructs if available
    if (data._gameInfo.playerStructs) {
      const playerKeys = Object.keys(data._gameInfo.playerStructs);
      console.log('🔍 playerStructs keys:', playerKeys);

      // Log each player's data structure
      playerKeys.forEach(key => {
        const player = data._gameInfo.playerStructs[key];
        console.log(`🔍 Player ${key} structure:`, {
          availableKeys: Object.keys(player),
          name: player.name,
          race: player.race,
          id: player.id,
          team: player.team
        });
      });
    } else {
      // Try to inspect _gameInfo keys to find player data
      console.log('🔍 No playerStructs found, inspecting _gameInfo keys');
      
      // Try to identify numeric keys that might contain player data
      const numericKeys = Object.keys(data._gameInfo).filter(key => !isNaN(Number(key)));
      if (numericKeys.length > 0) {
        console.log('🔍 Found numeric keys in _gameInfo:', numericKeys);
        
        // Sample a few keys to see their structure
        const sampleSize = Math.min(5, numericKeys.length);
        for (let i = 0; i < sampleSize; i++) {
          const key = numericKeys[i];
          console.log(`🔍 Sample key ${key} data:`, data._gameInfo[key]);
        }
      }
    }
  }
  
  // Debug duration info which might be at different places
  const duration = data.header?.duration || data._frames || data.duration;
  console.log('🔍 Duration information:', {
    headerDuration: data.header?.duration,
    frameCount: data._frames,
    directDuration: data.duration,
    calculatedDurationSec: duration ? Math.floor(duration / 24) : 'unknown'
  });

  // Specifically check for map data in various places
  console.log('🔍 Map information search:', {
    directMapName: data.mapName || 'Not found',
    gameInfoMapName: data._gameInfo?.mapName || 'Not found',
    headerMapName: data.header?.map || data.Header?.Map || 'Not found',
    metadataMapName: data.metadata?.mapName || 'Not found',
    mapData: data.mapData ? JSON.stringify(data.mapData).substring(0, 100) + '...' : 'Not found',
    scenarioMapTitle: data.scenario?.mapTitle || 'Not found'
  });

  // Try to analyze the colors for player identification
  if (data._colors && Array.isArray(data._colors)) {
    console.log('🔍 Found colors array with length:', data._colors.length);
    console.log('🔍 First few color entries:', data._colors.slice(0, 3));
  }

  // If there's a raw buffer or binary data present, log its presence
  if (data._buffer || data.buffer) {
    console.log('🔍 Raw buffer data detected, length:', 
      (data._buffer?.length || data.buffer?.length || 0));
  }
}

/**
 * Extract race name from numeric race ID based on screparsed conventions
 */
export function getRaceFromId(raceId: number): string {
  switch (raceId) {
    case 0: return 'Zerg';
    case 1: return 'Terran';
    case 2: return 'Protoss';
    default: return 'Unknown';
  }
}

/**
 * Extract player information from replay filename
 * For cases where the parser couldn't extract player data
 */
export function extractPlayersFromFilename(filename: string): {
  player1: string;
  player2: string;
  race1?: string;
  race2?: string;
} {
  console.log('[extractPlayersFromFilename] Analyzing filename:', filename);
  
  // Remove file extension and decode URL entities if present
  const nameOnly = filename.replace(/\.rep$/i, '').replace(/%20/g, ' ');
  
  // Split by common separators
  const parts = nameOnly.split(/\s+|_|-|vs\.?|versus|against/i);
  console.log('[extractPlayersFromFilename] Split by spaces/underscores:', parts);
  
  // Initialize result
  const result = {
    player1: 'Player 1',
    player2: 'Player 2',
    race1: undefined as string | undefined,
    race2: undefined as string | undefined
  };
  
  // Look for common matchup patterns like "PvZ" or "TvsP"
  const matchupRegex = /([TZP])v(?:s|\.)?([TZP])/i;
  const matchupParts = nameOnly.match(matchupRegex);
  
  if (matchupParts) {
    // We found a standard matchup string
    const race1Char = matchupParts[1].toUpperCase();
    const race2Char = matchupParts[2].toUpperCase();
    
    // Map race characters to full names
    const raceMap: Record<string, string> = {
      'T': 'Terran',
      'P': 'Protoss',
      'Z': 'Zerg'
    };
    
    result.race1 = raceMap[race1Char] || undefined;
    result.race2 = raceMap[race2Char] || undefined;
    
    console.log('[extractPlayersFromFilename] Found race identifiers:', result.race1, 'vs', result.race2);
  }
  
  // Try to extract player names
  if (parts.length >= 2) {
    // Strategy: take first part as player 1, last part as player 2
    // This is a simple heuristic that works reasonably well
    result.player1 = parts[0].trim();
    result.player2 = parts[parts.length - 1].trim();
    
    // If we have a part that looks like "vs" or empty, adjust
    if (['vs', 'versus', 'v', ''].includes(result.player2.toLowerCase())) {
      result.player2 = parts[parts.length - 2].trim();
    }
    
    if (['vs', 'versus', 'v', ''].includes(result.player1.toLowerCase()) && parts.length > 2) {
      result.player1 = parts[1].trim();
    }
    
    // Clean up player names - remove race indicators if embedded
    ['tvp', 'tvt', 'tvz', 'pvp', 'pvt', 'pvz', 'zvz', 'zvt', 'zvp'].forEach(matchup => {
      result.player1 = result.player1.replace(new RegExp(matchup, 'i'), '').trim();
      result.player2 = result.player2.replace(new RegExp(matchup, 'i'), '').trim();
    });
  }
  
  return result;
}

/**
 * Try to extract player data from various formats in screparsed output
 */
export function extractPlayerData(data: any): Array<{ name: string; race: string; apm?: number; team?: number }> {
  const players: Array<{ name: string; race: string; apm?: number; team?: number }> = [];
  
  // Check if we have a _gameInfo.playerStructs object
  if (data && data._gameInfo?.playerStructs) {
    console.log('🔍 Extracting from playerStructs');
    Object.entries(data._gameInfo.playerStructs).forEach(([key, value]: [string, any]) => {
      players.push({
        name: formatPlayerName(value.name || `Player ${key}`),
        race: standardizeRaceName(value.race),
        apm: value.apm || 150,
        team: value.team || parseInt(key)
      });
    });
    
    if (players.length > 0) {
      return players;
    }
  }
  
  // Try to find player data in _gameInfo numeric keys
  if (data && data._gameInfo) {
    console.log('🔍 Looking for player data in _gameInfo keys');
    const playerKeys = Object.keys(data._gameInfo).filter(key => 
      !isNaN(Number(key)) && 
      typeof data._gameInfo[key] === 'object' && 
      data._gameInfo[key] !== null
    );
    
    if (playerKeys.length > 0) {
      console.log(`🔍 Found ${playerKeys.length} potential player entries in _gameInfo`);
      
      // Filter to only keys that have player-like data
      const validPlayerKeys = playerKeys.filter(key => {
        const entry = data._gameInfo[key];
        // Check if this object has properties that look like player data
        return entry && (
          entry.name || 
          entry.race !== undefined || 
          entry.id !== undefined || 
          entry.type !== undefined ||
          entry.color !== undefined
        );
      });
      
      if (validPlayerKeys.length > 0) {
        console.log(`🔍 Found ${validPlayerKeys.length} valid player entries`);
        
        validPlayerKeys.forEach(key => {
          const playerData = data._gameInfo[key];
          if (playerData) {
            // Determine if this represents a player (not a neutral or observer)
            const isPlayer = 
              playerData.type === 1 || // From screp: 1 = player
              playerData.controller === 1 || // Another convention: 1 = human
              playerData.race !== undefined; // Has race defined
              
            if (isPlayer) {
              players.push({
                name: formatPlayerName(playerData.name || `Player ${key}`),
                race: standardizeRaceName(playerData.race),
                apm: playerData.apm || 150,
                team: playerData.team || parseInt(key)
              });
            }
          }
        });
      }
    }
  }
  
  // Try to find players in header format
  if (data && data.Header?.Players && Array.isArray(data.Header.Players)) {
    console.log('🔍 Extracting from Header.Players array');
    data.Header.Players.forEach((player: any, idx: number) => {
      if (player) {
        players.push({
          name: formatPlayerName(player.Name || player.name || `Player ${idx + 1}`),
          race: standardizeRaceName(player.Race || player.race),
          apm: player.APM || player.apm || 150,
          team: player.Team || player.team || idx
        });
      }
    });
  } else if (data && data.header?.players && Array.isArray(data.header.players)) {
    console.log('🔍 Extracting from header.players array');
    data.header.players.forEach((player: any, idx: number) => {
      if (player) {
        players.push({
          name: formatPlayerName(player.name || `Player ${idx + 1}`),
          race: standardizeRaceName(player.race),
          apm: player.apm || 150,
          team: player.team || idx
        });
      }
    });
  }
  
  return players;
}
