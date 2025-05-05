
/**
 * Utility functions for replay data processing
 */

/**
 * Standardize race names into a consistent format
 * Converts different race identifiers to standard "Terran", "Protoss", "Zerg" format
 */
export function standardizeRaceName(race: string | undefined): 'Terran' | 'Protoss' | 'Zerg' {
  if (!race) return 'Terran';
  
  const normalizedRace = race.toString().trim().toLowerCase();
  
  // Check for common race identifiers
  if (normalizedRace === 't' || normalizedRace === 'terran' || normalizedRace === '0' || normalizedRace.includes('terr')) {
    return 'Terran';
  }
  
  if (normalizedRace === 'p' || normalizedRace === 'protoss' || normalizedRace === '1' || normalizedRace.includes('prot')) {
    return 'Protoss';
  }
  
  if (normalizedRace === 'z' || normalizedRace === 'zerg' || normalizedRace === '2' || normalizedRace.includes('zerg')) {
    return 'Zerg';
  }
  
  // Default to Terran if we can't determine the race
  console.warn('🔄 Unknown race identifier:', race, 'defaulting to Terran');
  return 'Terran';
}
