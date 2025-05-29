
/**
 * Enhanced data mapping with improved build order generation and Command ID mapping
 */

import { DirectParserResult, BuildOrderItem } from './types';
import { EnhancedReplayData } from './enhancedScrepWrapper';
import { BWAPICommandEngine, REMASTERED_FPS } from './bwapi/commandEngine';
import { BuildOrderMapper, calculateAPM, calculateEAPM, EnhancedBuildOrder } from './buildOrderMapper';
import { getUnitName, getUnitInfo, categorizeAction } from './commandMapper';

/**
 * Converts frame number to timestamp string "mm:ss" with Remastered FPS
 */
export function frameToTimestamp(frame: number): string {
  const totalSeconds = Math.floor(frame / REMASTERED_FPS);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(1, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Enhanced supply estimation based on actual unit costs
 */
export function estimateSupply(frame: number, playerActions: any[], commandIndex: number): number {
  const baseSupply = 4; // Starting supply
  
  // Count actual supply-affecting buildings and units up to this point
  const relevantActions = playerActions.slice(0, commandIndex + 1);
  let supplyFromBuildings = 0;
  let supplyUsed = 0;
  
  for (const action of relevantActions) {
    if (action.parameters && action.parameters.unitTypeId) {
      const unitInfo = getUnitInfo(action.parameters.unitTypeId);
      
      if (unitInfo) {
        // Supply buildings
        if (['Pylon', 'Overlord', 'Supply Depot'].includes(unitInfo.name)) {
          supplyFromBuildings += 8;
        }
        
        // Supply usage
        if (unitInfo.supplyCost && unitInfo.supplyCost > 0) {
          supplyUsed += unitInfo.supplyCost;
        }
      }
    }
  }
  
  return Math.max(baseSupply + supplyUsed, baseSupply);
}

/**
 * Enhanced Build Order Mapping with new mapper
 */
export function mapBuildOrdersToUI(
  buildOrders: BuildOrderItem[][], 
  playerActions: Record<number, any[]>
): Array<Array<{ frame: number; timestamp: string; action: string; supply: number; unitName?: string; category?: string }>> {
  
  return buildOrders.map((playerBuildOrder, playerIndex) => {
    const actions = playerActions[playerIndex] || [];
    
    // Use enhanced build order mapper
    const enhancedBuildOrder = BuildOrderMapper.convertActionsToBuildOrder(actions, `Player ${playerIndex + 1}`);
    
    console.log(`[DataMapper] Enhanced build order for Player ${playerIndex + 1}:`, {
      race: enhancedBuildOrder.race,
      entries: enhancedBuildOrder.entries.length,
      efficiency: enhancedBuildOrder.efficiency.overallGrade
    });
    
    // Convert enhanced entries to UI format
    return enhancedBuildOrder.entries.map(entry => ({
      frame: entry.frame,
      timestamp: entry.time,
      action: entry.action,
      supply: entry.supply,
      unitName: entry.unitName,
      category: entry.category
    }));
  });
}

/**
 * Enhanced Player Actions Mapping with realistic APM calculation
 */
export function mapPlayerActionsToUI(playerActions: Record<number, any[]>, totalFrames: number): Array<{ id: number; apm: number; eapm: number; actions: any[]; quality: string }> {
  const gameMinutes = totalFrames / REMASTERED_FPS / 60;
  
  return Object.entries(playerActions).map(([playerIdStr, actions]) => {
    const playerId = parseInt(playerIdStr);
    
    // Use enhanced APM calculation
    const apm = calculateAPM(actions, totalFrames);
    const eapm = calculateEAPM(actions, totalFrames);
    
    // Enhanced quality assessment
    let quality = 'unknown';
    if (apm > 180) quality = 'professional';
    else if (apm > 120) quality = 'advanced';
    else if (apm > 80) quality = 'intermediate';
    else if (apm > 40) quality = 'beginner';
    else quality = 'learning';
    
    return {
      id: playerId,
      apm,
      eapm,
      actions,
      quality
    };
  });
}

/**
 * Main mapping function with enhanced Command ID integration
 */
export function mapDirectReplayDataToUI(directData: DirectParserResult): {
  buildOrders: Array<Array<{ frame: number; timestamp: string; action: string; supply: number; unitName?: string; category?: string }>>;
  playerStats: Array<{ id: number; apm: number; eapm: number; actions: any[]; quality: string }>;
  enhanced: {
    actionsExtracted: number;
    buildOrdersGenerated: number;
    validationData: any;
    gameDuration: string;
    averageAPM: number;
    realisticDataQuality: string;
    enhancedBuildOrders?: EnhancedBuildOrder[];
  };
} {
  console.log('[DataMapper] Enhanced mapping with Command ID integration');
  
  const buildOrders = mapBuildOrdersToUI(directData.buildOrders, directData.playerActions);
  const playerStats = mapPlayerActionsToUI(directData.playerActions, directData.totalFrames);
  
  const gameDurationMinutes = directData.totalFrames / REMASTERED_FPS / 60;
  const totalCommands = directData.commands.length;
  const averageAPM = playerStats.reduce((sum, p) => sum + p.apm, 0) / Math.max(playerStats.length, 1);
  
  // Generate enhanced build orders for additional analysis
  const enhancedBuildOrders: EnhancedBuildOrder[] = [];
  Object.entries(directData.playerActions).forEach(([playerIdStr, actions]) => {
    const playerId = parseInt(playerIdStr);
    const enhancedBO = BuildOrderMapper.convertActionsToBuildOrder(actions, `Player ${playerId + 1}`);
    enhancedBuildOrders.push(enhancedBO);
  });
  
  const commandValidation = BWAPICommandEngine.validateCommandCount(
    totalCommands, 
    gameDurationMinutes, 
    playerStats.length
  );
  
  // Enhanced validation data with Command ID mapping
  const validationData: any = { 
    playersWithActions: {},
    gameMetrics: {
      duration: `${gameDurationMinutes.toFixed(1)} minutes`,
      totalCommands,
      averageAPM: Math.round(averageAPM),
      commandQuality: commandValidation.quality,
      expectedCommandRange: commandValidation.expectedRange,
      buildOrdersFound: buildOrders.reduce((sum, bo) => sum + bo.length, 0)
    },
    enhancedFeatures: {
      commandIdMapping: true,
      raceDetection: enhancedBuildOrders.map(bo => bo.race),
      buildOrderBenchmarks: enhancedBuildOrders.map(bo => bo.benchmarks.length),
      efficiencyGrades: enhancedBuildOrders.map(bo => bo.efficiency.overallGrade)
    }
  };
  
  Object.entries(directData.playerActions).forEach(([playerIdStr, actions]) => {
    const playerId = parseInt(playerIdStr);
    const playerStat = playerStats.find(p => p.id === playerId);
    const playerBuildOrder = buildOrders[playerId] || [];
    const enhancedBO = enhancedBuildOrders[playerId];
    
    const buildActions = actions.filter(a => {
      // Fix: Use correct property names for action commands - try multiple possible properties
      const commandType = a.type || a.command || a.id || 0;
      const category = categorizeAction(commandType, a.parameters?.unitTypeId);
      return ['build', 'train', 'tech'].includes(category);
    });
    
    const firstUnits = buildActions
      .slice(0, 5)
      .map(cmd => {
        if (cmd.parameters && cmd.parameters.unitTypeId) {
          return getUnitName(cmd.parameters.unitTypeId);
        }
        return cmd.unitName || 'Unknown';
      });
    
    validationData.playersWithActions[playerId] = {
      detectedCommands: actions.length,
      buildOrderItems: playerBuildOrder.length,
      firstUnits,
      apm: playerStat?.apm || 0,
      eapm: playerStat?.eapm || 0,
      quality: playerStat?.quality || 'unknown',
      buildActionsCount: buildActions.length,
      race: enhancedBO?.race || 'Unknown',
      efficiencyGrade: enhancedBO?.efficiency.overallGrade || 'F',
      benchmarksPassed: enhancedBO?.benchmarks.filter(b => b.status !== 'missing').length || 0
    };
  });
  
  console.log('[DataMapper] Enhanced mapping complete:', {
    buildOrdersCount: buildOrders.reduce((sum, bo) => sum + bo.length, 0),
    playerStatsCount: playerStats.length,
    gameDuration: `${gameDurationMinutes.toFixed(1)} minutes`,
    averageAPM: Math.round(averageAPM),
    dataQuality: commandValidation.quality,
    enhancedFeatures: {
      racesDetected: enhancedBuildOrders.map(bo => bo.race),
      averageEfficiency: enhancedBuildOrders.reduce((sum, bo) => 
        sum + (bo.efficiency.economyScore + bo.efficiency.techScore + bo.efficiency.timingScore) / 3, 0
      ) / Math.max(enhancedBuildOrders.length, 1)
    }
  });
  
  return {
    buildOrders,
    playerStats,
    enhanced: {
      actionsExtracted: directData.commands.length,
      buildOrdersGenerated: buildOrders.reduce((sum, bo) => sum + bo.length, 0),
      validationData,
      gameDuration: `${gameDurationMinutes.toFixed(1)} minutes`,
      averageAPM: Math.round(averageAPM),
      realisticDataQuality: commandValidation.quality,
      enhancedBuildOrders
    }
  };
}
