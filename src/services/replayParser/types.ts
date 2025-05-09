
/**
 * TypeScript definitions for replay parser data
 */

/**
 * Player data in a parsed replay
 */
export interface PlayerData {
  name: string;
  race: string;
  apm: number;
  eapm: number;
  buildOrder: Array<{ time: string; supply: number; action: string }>;
  // Analysis properties
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

/**
 * Main replay analysis interface - contains all structured data from a parsed replay
 */
export interface ReplayAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
}

/**
 * Advanced metrics extracted from replay data
 */
export interface AdvancedMetrics {
  // Build order timing with detailed info
  buildOrderTiming: {
    player1: Array<{ 
      time: number;
      timeFormatted: string;
      name: string;
      supply: number;
    }>;
    player2: Array<{ 
      time: number;
      timeFormatted: string;
      name: string;
      supply: number;
    }>;
  };
  
  // Resource collection metrics (minerals, gas over time)
  resourceCollection: {
    player1: {
      collectionRate: {
        minerals: Array<{ time: number; timeFormatted: string; value: number }>;
        gas: Array<{ time: number; timeFormatted: string; value: number }>;
      };
      unspentResources: {
        minerals: Array<{ time: number; timeFormatted: string; value: number }>;
        gas: Array<{ time: number; timeFormatted: string; value: number }>;
      };
    };
    player2: {
      collectionRate: {
        minerals: Array<{ time: number; timeFormatted: string; value: number }>;
        gas: Array<{ time: number; timeFormatted: string; value: number }>;
      };
      unspentResources: {
        minerals: Array<{ time: number; timeFormatted: string; value: number }>;
        gas: Array<{ time: number; timeFormatted: string; value: number }>;
      };
    };
  };
  
  // Supply management metrics
  supplyManagement: {
    player1: {
      supplyUsage: Array<{ 
        time: number;
        timeFormatted: string;
        used: number;
        total: number;
        percentage: number;
      }>;
      supplyBlocks: Array<{
        startTime: number;
        startTimeFormatted: string;
        endTime: number;
        endTimeFormatted: string;
        duration: number;
        durationSeconds: number;
      }>;
    };
    player2: {
      supplyUsage: Array<{ 
        time: number;
        timeFormatted: string;
        used: number;
        total: number;
        percentage: number;
      }>;
      supplyBlocks: Array<{
        startTime: number;
        startTimeFormatted: string;
        endTime: number;
        endTimeFormatted: string;
        duration: number;
        durationSeconds: number;
      }>;
    };
  };
  
  // Army value and unit composition over time
  armyValueOverTime: {
    player1: {
      armyValueOverTime: Array<{ time: number; timeFormatted: string; value: number }>;
      unitComposition: Array<{ 
        time: number; 
        timeFormatted: string;
        composition: Record<string, number>; 
      }>;
    };
    player2: {
      armyValueOverTime: Array<{ time: number; timeFormatted: string; value: number }>;
      unitComposition: Array<{ 
        time: number; 
        timeFormatted: string;
        composition: Record<string, number>; 
      }>;
    };
  };
  
  // Production efficiency metrics
  productionEfficiency: {
    player1: {
      idleProductionTime: Array<{ percentage: number; totalSeconds: number }>;
      productionFacilities: Array<{
        time: number;
        timeFormatted: string;
        total: number;
        idle: number;
        idlePercentage: number;
      }>;
    };
    player2: {
      idleProductionTime: Array<{ percentage: number; totalSeconds: number }>;
      productionFacilities: Array<{
        time: number;
        timeFormatted: string;
        total: number;
        idle: number;
        idlePercentage: number;
      }>;
    };
  };
  
  // Expansion timing metrics
  expansionTiming: {
    player1: Array<{
      time: number;
      timeFormatted: string;
      name: string;
      location: string;
    }>;
    player2: Array<{
      time: number;
      timeFormatted: string;
      name: string;
      location: string;
    }>;
  };
  
  // Tech path metrics
  techPath: {
    player1: Array<{
      time: number;
      timeFormatted: string;
      name: string;
      type: 'building' | 'research';
    }>;
    player2: Array<{
      time: number;
      timeFormatted: string;
      name: string;
      type: 'building' | 'research';
    }>;
  };
  
  // Scouting effectiveness metrics
  scoutingEffectiveness: {
    player1: {
      scoutingEvents: Array<{
        time: number;
        timeFormatted: string;
        unitType: string;
        location: { x: number; y: number };
      }>;
      enemyBaseFirstSeenAt: number;
      enemyTechFirstSeenAt: number;
    };
    player2: {
      scoutingEvents: Array<{
        time: number;
        timeFormatted: string;
        unitType: string;
        location: { x: number; y: number };
      }>;
      enemyBaseFirstSeenAt: number;
      enemyTechFirstSeenAt: number;
    };
  };
  
  // Hotkey usage metrics
  hotkeyUsage: {
    player1: {
      hotkeyActions: number;
      hotkeyDistribution: Record<string, number>;
      hotkeyActionsPerMinute: number;
    };
    player2: {
      hotkeyActions: number;
      hotkeyDistribution: Record<string, number>;
      hotkeyActionsPerMinute: number;
    };
  };
  
  // Action distribution metrics
  actionDistribution: {
    player1: {
      total: number;
      macro: number;
      micro: number;
      other: number;
      macroPercentage: number;
      microPercentage: number;
      otherPercentage: number;
    };
    player2: {
      total: number;
      macro: number;
      micro: number;
      other: number;
      macroPercentage: number;
      microPercentage: number;
      otherPercentage: number;
    };
  };
}

/**
 * Raw parsed replay data structure
 */
export interface ParsedReplayData {
  // Primary data structure
  primaryPlayer: PlayerData;
  secondaryPlayer: PlayerData;
  
  // Game info
  map: string;
  matchup: string;
  duration: string;
  durationMS: number;
  date: string;
  result: 'win' | 'loss' | 'unknown';
  
  // Analysis results
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  
  // Legacy properties for backward compatibility
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
  apm: number;
  eapm: number;
  opponentApm: number;
  opponentEapm: number;
  buildOrder: Array<{ time: string; supply: number; action: string }>;
  
  // Optional training plan
  trainingPlan?: Array<{ day: number; focus: string; drill: string }>;
}

/**
 * Extended replay data with advanced metrics
 */
export interface ExtendedReplayData extends ParsedReplayData {
  // Store the raw parser data for advanced processing
  rawData: any;
  
  // Advanced metrics extracted from replay
  advancedMetrics: AdvancedMetrics;
}

/**
 * Mapped replay data with required fields guaranteed
 */
export interface ParsedReplayResult extends ParsedReplayData {
  // Required training plan
  trainingPlan: Array<{ day: number; focus: string; drill: string }>;
}

