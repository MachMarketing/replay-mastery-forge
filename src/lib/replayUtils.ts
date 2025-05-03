
/**
 * Utility functions for StarCraft replay parsing
 */

/**
 * Convert race number to race string with enhanced detection
 * Different parsers use different numbering systems:
 * - Some use: 0=Zerg, 1=Terran, 2=Protoss
 * - Others use: 0=Terran, 1=Zerg, 2=Protoss
 * 
 * This function tries to handle both cases with more robust detection
 */
export function getRaceFromNumber(raceNum: number): 'Terran' | 'Protoss' | 'Zerg' {
  console.log('🏁 [replayUtils] Converting race number to string:', raceNum);
  
  // Handle standard numbering (BWChart format: 0=Zerg, 1=Terran, 2=Protoss)
  if (raceNum === 0) return 'Zerg';
  if (raceNum === 1) return 'Terran';
  if (raceNum === 2) return 'Protoss';
  
  // Handle alternate numbering seen in some parsers
  if (raceNum === 100) return 'Terran';
  if (raceNum === 101) return 'Protoss';
  if (raceNum === 102) return 'Zerg';
  
  // Handle yet another numbering system
  if (raceNum === 5) return 'Terran';
  if (raceNum === 6) return 'Protoss'; 
  if (raceNum === 7) return 'Zerg';
  
  // Additional numbering system sometimes encountered
  if (raceNum === 3) return 'Protoss'; // Some parsers use 3 for Protoss 
  if (raceNum === 4) return 'Zerg';    // Some parsers use 4 for Zerg
  
  // Default fallback to Terran to avoid undefined
  console.warn('🏁 [replayUtils] Unknown race number:', raceNum, 'defaulting to Terran');
  return 'Terran';
}

/**
 * Format milliseconds to mm:ss format
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generate a basic build order based on race
 */
export function generateBuildOrder(
  race: 'Terran' | 'Protoss' | 'Zerg', 
  durationMs: number
): { time: string; supply: number; action: string }[] {
  // Race-specific build orders
  const builds: Record<string, { time: string; supply: number; action: string }[]> = {
    'Terran': [
      { time: "00:45", supply: 8, action: "Supply Depot" },
      { time: "01:20", supply: 10, action: "Barracks" },
      { time: "01:55", supply: 12, action: "Marine" },
      { time: "02:30", supply: 16, action: "Supply Depot" },
      { time: "03:10", supply: 20, action: "Command Center" },
      { time: "04:10", supply: 24, action: "Factory" }
    ],
    'Protoss': [
      { time: "00:18", supply: 8, action: "Pylon" },
      { time: "00:50", supply: 10, action: "Gateway" },
      { time: "01:30", supply: 12, action: "Assimilator" },
      { time: "01:40", supply: 14, action: "Cybernetics Core" },
      { time: "02:30", supply: 18, action: "Zealot" },
      { time: "03:45", supply: 24, action: "Nexus" }
    ],
    'Zerg': [
      { time: "00:20", supply: 9, action: "Overlord" },
      { time: "01:00", supply: 12, action: "Spawning Pool" },
      { time: "01:35", supply: 14, action: "Extractor" },
      { time: "01:55", supply: 14, action: "Zergling" },
      { time: "02:40", supply: 22, action: "Hatchery" },
      { time: "03:20", supply: 26, action: "Hydralisk Den" }
    ]
  };
  
  // Return the appropriate build based on race and game duration
  return builds[race].filter(item => {
    const [minutes, seconds] = item.time.split(':').map(Number);
    const itemTimeMs = (minutes * 60 + seconds) * 1000;
    return itemTimeMs <= durationMs;
  });
}

/**
 * Generate resource data based on game duration
 */
export function generateResourceData(durationMs: number): { time: string; minerals: number; gas: number }[] {
  const resourceGraph = [];
  const minutes = Math.floor(durationMs / 60000);
  
  for (let i = 0; i <= minutes; i++) {
    // Simple resource growth pattern
    const minerals = Math.min(i * i * 70 + i * 30, 5000);
    const gas = i <= 1 ? 0 : Math.min((i-1) * (i-1) * 50 + (i-1) * 20, 3000);
    
    resourceGraph.push({
      time: `${i}:00`,
      minerals,
      gas
    });
  }
  
  return resourceGraph;
}

/**
 * Enhanced race name standardization
 * This function takes any race string/name and standardizes it to one of our three race types
 */
export function standardizeRaceName(raceName: string | undefined | null): 'Terran' | 'Protoss' | 'Zerg' {
  // Handle empty or null values
  if (!raceName) {
    console.warn('🏁 [replayUtils] Empty race name provided, defaulting to Terran');
    return 'Terran';
  }

  // Convert to lowercase and trim for reliable case-insensitive matching
  const normalized = String(raceName).toLowerCase().trim();
  
  console.log('🏁 [replayUtils] Standardizing race name:', raceName, '→', normalized);

  // Check for Protoss first to avoid false matches
  if (normalized.includes('prot') || 
      normalized.includes('toss') || 
      normalized === 'p' || 
      normalized === 'protoss') {
    return 'Protoss';
  }
  
  // Check for Zerg
  if (normalized.includes('zerg') || 
      normalized === 'z') {
    return 'Zerg';
  }
  
  // Check for Terran
  if (normalized.includes('terr') || 
      normalized === 't') {
    return 'Terran';
  }
  
  // Handle numbers directly provided as strings
  if (normalized === '0') return 'Zerg';
  if (normalized === '1') return 'Terran';
  if (normalized === '2') return 'Protoss';
  
  // Default fallback with warning
  console.warn('🏁 [replayUtils] Unrecognized race name:', raceName, 'defaulting to Terran');
  return 'Terran';
}
