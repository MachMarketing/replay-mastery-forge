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
 * Extract map name from replay data
 */
export function extractMapName(data: any): string {
  // Check various locations where the map name might be
  if (data && typeof data === 'object') {
    // Check in common _gameInfo location
    if (data._gameInfo && data._gameInfo.mapName) {
      return data._gameInfo.mapName;
    }
    
    // Check for map name in header structures (common in other parsers)
    if (data.header && data.header.map) {
      return data.header.map;
    }
    
    if (data.Header && data.Header.Map) {
      return data.Header.Map;
    }
    
    // Check for map data object
    if (data.mapData && data.mapData.name) {
      return data.mapData.name;
    }
    
    // Try to find map name in various scenario data locations
    if (data.scenario && data.scenario.mapTitle) {
      return data.scenario.mapTitle;
    }
    
    // Check for common filename key patterns
    const mapKeys = Object.keys(data).filter(key => 
      key.toLowerCase().includes('map') || 
      key.toLowerCase().includes('level') ||
      key.toLowerCase().includes('scenario')
    );
    
    if (mapKeys.length > 0) {
      for (const key of mapKeys) {
        const value = data[key];
        if (typeof value === 'string') {
          return value;
        } else if (typeof value === 'object' && value && value.name) {
          return value.name;
        }
      }
    }
    
    // Try to look for possible map name string in the most likely locations
    const possibleMapContainers = [
      data.metadata,
      data.info,
      data.gameInfo,
      data.replay,
      data._metadata,
      data._replay,
      data.settings
    ].filter(Boolean);
    
    for (const container of possibleMapContainers) {
      if (container && typeof container === 'object') {
        const mapInContainer = Object.keys(container).find(key => 
          key.toLowerCase().includes('map') || 
          key.toLowerCase().includes('level')
        );
        
        if (mapInContainer && typeof container[mapInContainer] === 'string') {
          return container[mapInContainer];
        }
      }
    }
    
    // Last resort - look for anything that might be a StarCraft map name
    const starCraftMapPatterns = [
      'lost temple', 'python', 'circuit breaker', 'fighting spirit',
      'jade', 'heartbreak', 'luna', 'medusa', 'requiem', 'cross game',
      'neo', 'benzene', 'destination', 'match point', 'blue storm'
    ];
    
    const allStrings = JSON.stringify(data).toLowerCase();
    for (const mapPattern of starCraftMapPatterns) {
      if (allStrings.includes(mapPattern)) {
        // Extract the context around the map name
        const index = allStrings.indexOf(mapPattern);
        const start = Math.max(0, index - 20);
        const end = Math.min(allStrings.length, index + mapPattern.length + 20);
        const context = allStrings.substring(start, end);
        
        console.log(`[extractMapName] Found map pattern "${mapPattern}" in context: ${context}`);
        return mapPattern.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
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
 * Deeper analysis of the replay data structure to find player information
 */
export function deepAnalyzeReplayStructure(data: any): void {
  if (!data || typeof data !== 'object') {
    console.log('[deepAnalyze] Invalid data format');
    return;
  }
  
  console.log('[deepAnalyze] Starting deep structure analysis');
  
  // Convert to string for pattern searches
  const dataString = JSON.stringify(data);
  
  // Look for indicators of players
  const playerPatterns = ['player', 'name', 'race', 'color', 'apm'];
  for (const pattern of playerPatterns) {
    const regex = new RegExp(`"${pattern}":\\s*"([^"]+)"`, 'gi');
    const matches = Array.from(dataString.matchAll(regex)).slice(0, 5);
    if (matches.length > 0) {
      console.log(`[deepAnalyze] Found ${matches.length} potential ${pattern} values:`, 
        matches.map(m => m[1]).join(', '));
    }
  }
  
  // Look for race identifiers
  const raceRegex = /"race":\s*("?\d+"?|"[^"]+"|true|false)/gi;
  const raceMatches = Array.from(dataString.matchAll(raceRegex)).slice(0, 5);
  if (raceMatches.length > 0) {
    console.log('[deepAnalyze] Found race identifiers:', 
      raceMatches.map(m => m[1]).join(', '));
  }
  
  // Check special structures from known parser formats
  const knownStructures = [
    { path: '_playerStructs', desc: 'Player structures' },
    { path: 'players', desc: 'Players array' },
    { path: 'Players', desc: 'Capitalized players array' },
    { path: 'entities', desc: 'Game entities' },
    { path: 'playerInfo', desc: 'Player info object' }
  ];
  
  for (const struct of knownStructures) {
    const structRegex = new RegExp(`"${struct.path}":\\s*(\\{|\\[)`, 'gi');
    if (structRegex.test(dataString)) {
      console.log(`[deepAnalyze] Found potential ${struct.desc} at ${struct.path}`);
    }
  }
}

/**
 * Extract player information from replay filename
 */
export function extractPlayersFromFilename(filename: string): { 
  player1: string, 
  player2: string, 
  race1?: string, 
  race2?: string 
} {
  console.log(`[extractPlayersFromFilename] Analyzing filename: ${filename}`);
  
  // Remove file extension
  const nameWithoutExt = filename.split('.')[0];
  
  // Look for common separators and matchup patterns
  const vsPatterns = [' vs ', ' VS ', ' Vs ', '_vs_', '-vs-', ' v ', '(', ')', '[', ']'];
  let parts: string[] = [nameWithoutExt];
  
  // Try to split by common separators
  for (const pattern of vsPatterns) {
    if (nameWithoutExt.includes(pattern)) {
      parts = nameWithoutExt.split(pattern).filter(p => p.trim().length > 0);
      console.log(`[extractPlayersFromFilename] Split by "${pattern}":`, parts);
      break;
    }
  }
  
  // If no specific separator found, try spaces or underscores
  if (parts.length === 1) {
    parts = nameWithoutExt.split(/[\s_-]+/);
    console.log('[extractPlayersFromFilename] Split by spaces/underscores:', parts);
  }
  
  // Extract player names based on parts
  let player1 = 'Unknown';
  let player2 = 'Unknown';
  
  // If we have multiple parts, first and last are likely player names
  if (parts.length >= 2) {
    player1 = parts[0].trim();
    player2 = parts[parts.length - 1].trim();
  } 
  // If we have just one part but it's long, try to split in the middle
  else if (parts[0].length > 10) {
    const middle = Math.floor(parts[0].length / 2);
    player1 = parts[0].substring(0, middle).trim();
    player2 = parts[0].substring(middle).trim();
  }
  // Otherwise just use the filename as player 1
  else {
    player1 = parts[0].trim();
  }
  
  // Look for race identifiers (T, P, Z) in the filename
  let race1: string | undefined;
  let race2: string | undefined;
  
  const raceMatch = nameWithoutExt.match(/([TPZtpz])\s*v\s*([TPZtpz])/i);
  if (raceMatch) {
    const r1 = raceMatch[1].toUpperCase();
    const r2 = raceMatch[2].toUpperCase();
    
    race1 = r1 === 'T' ? 'Terran' : r1 === 'Z' ? 'Zerg' : 'Protoss';
    race2 = r2 === 'T' ? 'Terran' : r2 === 'Z' ? 'Zerg' : 'Protoss';
    
    console.log(`[extractPlayersFromFilename] Found race identifiers: ${race1} vs ${race2}`);
  }
  
  return { player1, player2, race1, race2 };
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
