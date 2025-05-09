
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
 * Try to extract player data from various formats in screparsed output
 */
export function extractPlayerData(data: any): Array<{ name: string; race: string; apm?: number; team?: number }> {
  const players: Array<{ name: string; race: string; apm?: number; team?: number }> = [];
  
  // Check if we have a _gameInfo.playerStructs object
  if (data._gameInfo?.playerStructs) {
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
  if (data._gameInfo) {
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
  if (data.Header?.Players && Array.isArray(data.Header.Players)) {
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
  } else if (data.header?.players && Array.isArray(data.header.players)) {
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
