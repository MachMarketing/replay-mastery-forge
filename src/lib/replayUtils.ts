
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
