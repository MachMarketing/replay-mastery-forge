
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
}
