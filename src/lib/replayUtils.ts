
/**
 * Utility functions for replay data processing
 */

/**
 * Standardize race names into a consistent format
 * Converts different race identifiers to standard "Terran", "Protoss", "Zerg" format
 */
export function standardizeRaceName(race: string | undefined): 'Terran' | 'Protoss' | 'Zerg' {
  if (!race) return 'Terran';
  
  // Convert to string in case we get a number or other type
  const normalizedRace = String(race).trim().toLowerCase();
  
  console.log('🏁 [replayUtils] Standardizing race:', race, 'normalized to:', normalizedRace);
  
  // Check for common race identifiers with more patterns
  if (
    normalizedRace === 't' || 
    normalizedRace === 'terran' || 
    normalizedRace === '0' || 
    normalizedRace.includes('terr') ||
    normalizedRace.includes('human')
  ) {
    return 'Terran';
  }
  
  if (
    normalizedRace === 'p' || 
    normalizedRace === 'protoss' || 
    normalizedRace === '1' || 
    normalizedRace.includes('prot') ||
    normalizedRace.includes('toss')
  ) {
    return 'Protoss';
  }
  
  if (
    normalizedRace === 'z' || 
    normalizedRace === 'zerg' || 
    normalizedRace === '2' || 
    normalizedRace.includes('zerg')
  ) {
    return 'Zerg';
  }
  
  // Handle numeric race codes
  if (normalizedRace === '0' || normalizedRace === 'race0') return 'Terran';
  if (normalizedRace === '1' || normalizedRace === 'race1') return 'Protoss';
  if (normalizedRace === '2' || normalizedRace === 'race2') return 'Zerg';
  
  console.warn('🔄 [replayUtils] Unknown race identifier:', race, 'defaulting to Terran');
  return 'Terran';
}

/**
 * Format player name to ensure it's displayed correctly
 */
export function formatPlayerName(name: string | undefined): string {
  if (!name) return 'Unknown';
  
  // Trim whitespace and ensure it's a string
  const formattedName = String(name).trim();
  
  // Return default if empty
  if (!formattedName || formattedName.length === 0) {
    return 'Unknown';
  }
  
  // Handle special characters and encoding issues
  return formattedName
    .replace(/[^\x20-\x7E]/g, '') // Remove non-printable chars
    .replace(/\\u[\dA-Fa-f]{4}/g, '') // Remove unicode escapes
    .trim();
}

/**
 * Ensures build order items are properly formatted
 */
export function formatBuildOrder(buildOrder: any[] | undefined): { time: string; supply: number; action: string }[] {
  if (!buildOrder || !Array.isArray(buildOrder) || buildOrder.length === 0) {
    return [];
  }
  
  return buildOrder.map(item => {
    // Ensure each item has the proper structure
    return {
      time: typeof item.time === 'string' ? item.time : '00:00',
      supply: typeof item.supply === 'number' ? item.supply : 0,
      action: typeof item.action === 'string' ? item.action : 'Unknown Action'
    };
  });
}

/**
 * Debug utility to log parsed replay data
 */
export function debugLogReplayData(data: any, source: string): void {
  console.log(`🔍 [${source}] Replay data debug:`, {
    playerName: data.playerName || 'Missing',
    opponentName: data.opponentName || 'Missing',
    playerRace: data.playerRace || 'Missing', 
    opponentRace: data.opponentRace || 'Missing',
    hasBuildOrder: Array.isArray(data.buildOrder) ? data.buildOrder.length : 'No',
    hasStrengths: Array.isArray(data.strengths) ? data.strengths.length : 'No'
  });
}

