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
 * Deep analyze the replay structure to find data in multiple formats
 */
export function deepAnalyzeReplayStructure(data: any): void {
  if (!data || typeof data !== 'object') {
    console.log('[replayUtils] No data to analyze');
    return;
  }

  console.log('[replayUtils] Analyzing replay structure...');
  
  const paths: string[] = [];
  const structures: Record<string, any> = {};
  
  // Recursively explore the object structure
  function explore(obj: any, path: string = ''): void {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      paths.push(`${path} (Array[${obj.length}])`);
      
      // Look at first few items
      if (obj.length > 0) {
        if (typeof obj[0] === 'object' && obj[0] !== null) {
          // Sample first item for arrays of objects
          structures[path] = {
            type: 'array',
            length: obj.length,
            sampleItem: obj[0]
          };
          
          // Special handling for potential command arrays
          if (
            obj[0].type || 
            obj[0].name || 
            obj[0].frame ||
            obj[0].abilityName
          ) {
            console.log(`[replayUtils] Potential commands/events at ${path}:`, 
              obj.slice(0, 3));
          }
        } else {
          // For primitive arrays, just note the type
          structures[path] = {
            type: 'array',
            length: obj.length,
            itemType: typeof obj[0]
          };
        }
      }
      
      // If it's not too big, explore array items
      if (obj.length > 0 && obj.length < 10) {
        obj.forEach((item: any, index: number) => {
          explore(item, `${path}[${index}]`);
        });
      }
    } else {
      // For objects
      const keys = Object.keys(obj);
      paths.push(`${path} (Object{${keys.length}})`);
      
      // Store keys in structure info
      structures[path] = {
        type: 'object',
        keys: keys
      };
      
      // Special inspection for common keys
      if ('players' in obj && Array.isArray(obj.players)) {
        console.log(`[replayUtils] Found players array with ${obj.players.length} players`);
        if (obj.players.length > 0) {
          console.log('[replayUtils] Sample player:', obj.players[0]);
        }
      }
      
      if ('header' in obj) {
        console.log('[replayUtils] Found header:', obj.header);
      }
      
      if ('commands' in obj && Array.isArray(obj.commands)) {
        console.log(`[replayUtils] Found commands array with ${obj.commands.length} commands`);
        if (obj.commands.length > 0) {
          console.log('[replayUtils] Sample commands:', obj.commands.slice(0, 3));
        }
      }
      
      // Check for certain keywords that might indicate build orders
      const buildOrderKeys = ['buildOrder', 'builds', 'units', 'buildings', 'commands', 'events'];
      const found = buildOrderKeys.filter(key => key in obj);
      if (found.length > 0) {
        console.log(`[replayUtils] Potential build order keys at ${path}:`, found);
      }
      
      // Continue exploring each property
      keys.forEach(key => {
        explore(obj[key], path ? `${path}.${key}` : key);
      });
    }
  }
  
  // Start exploration from root
  explore(data);
  
  console.log('[replayUtils] Found paths:', paths.length > 20 ? 
    `${paths.length} paths (showing first 20)` : `${paths.length} paths`);
    
  // Log only first 20 paths to avoid flooding console
  if (paths.length > 0) {
    console.log(paths.slice(0, 20));
  }
  
  // Log important structures we found
  const importantPaths = Object.keys(structures).filter(path => 
    path.includes('players') || 
    path.includes('commands') || 
    path.includes('events') ||
    path.includes('buildOrder') ||
    path.includes('units') ||
    path.includes('header')
  );
  
  if (importantPaths.length > 0) {
    console.log('[replayUtils] Important structures found:');
    importantPaths.forEach(path => {
      console.log(`- ${path}:`, structures[path]);
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
