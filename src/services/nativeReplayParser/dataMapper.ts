
/**
 * Enhanced data mapping with improved build order generation
 */

import { DirectParserResult, BuildOrderItem } from './types';
import { EnhancedReplayData } from './enhancedScrepWrapper';
import { BWAPICommandEngine, REMASTERED_FPS } from './bwapi/commandEngine';
import { UNIT_NAMES, BUILDING_NAMES } from './bwRemastered/constants';

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
 * Enhanced supply estimation based on actual commands
 */
export function estimateSupply(frame: number, playerActions: any[], commandIndex: number): number {
  const baseSupply = 4; // Starting supply
  
  // Count actual supply-affecting buildings and units up to this point
  const relevantActions = playerActions.slice(0, commandIndex + 1);
  let supplyFromBuildings = 0;
  let unitsBuilt = 0;
  
  for (const action of relevantActions) {
    if (action.parameters && action.parameters.unitTypeId) {
      const unitId = action.parameters.unitTypeId;
      
      // Supply buildings (rough estimates)
      if ([84, 85, 86].includes(unitId)) { // Pylon, Overlord, Supply Depot
        supplyFromBuildings += 8;
      }
      
      // Count units for supply usage estimation
      if ([0x0C, 0x14, 0x1D].includes(action.type)) {
        unitsBuilt++;
      }
    }
  }
  
  const timeBasedSupply = Math.floor((frame / REMASTERED_FPS) / 30) * 2; // Slower progression
  const estimatedUsed = Math.min(baseSupply + Math.floor(unitsBuilt * 1.2), 200);
  
  return Math.max(estimatedUsed, baseSupply + timeBasedSupply);
}

/**
 * Get unit/building name with enhanced mapping
 */
export function getUnitName(unitId: number): string {
  const unitName = UNIT_NAMES[unitId as keyof typeof UNIT_NAMES];
  const buildingName = BUILDING_NAMES[unitId as keyof typeof BUILDING_NAMES];
  
  if (unitName) return unitName;
  if (buildingName) return buildingName;
  
  // Fallback with some common IDs
  const commonUnits: Record<number, string> = {
    0: 'Marine',
    1: 'Ghost',
    2: 'Vulture',
    3: 'Goliath',
    7: 'SCV',
    41: 'Zealot',
    42: 'Dragoon',
    43: 'High Templar',
    64: 'Probe',
    37: 'Zergling',
    38: 'Hydralisk',
    46: 'Drone'
  };
  
  return commonUnits[unitId] || `Unit_${unitId}`;
}

/**
 * Enhanced Build Order Mapping with better command filtering
 */
export function mapBuildOrdersToUI(buildOrders: BuildOrderItem[][], playerActions: Record<number, any[]>): Array<Array<{ frame: number; timestamp: string; action: string; supply: number; unitName?: string; category?: string }>> {
  return buildOrders.map((playerBuildOrder, playerIndex) => {
    const actions = playerActions[playerIndex] || [];
    
    // If build order is empty, try to generate from actions directly
    let workingBuildOrder = playerBuildOrder;
    if (workingBuildOrder.length === 0) {
      workingBuildOrder = generateBuildOrderFromActions(actions);
    }
    
    return workingBuildOrder.map((item, index) => {
      let actionName = item.action;
      let unitName: string | undefined;
      let category: string | undefined;
      
      // Enhanced action name resolution
      const matchingAction = actions.find(action => 
        Math.abs(action.frame - item.frame) <= 5 // Increased tolerance
      );
      
      if (matchingAction && matchingAction.parameters) {
        const unitId = matchingAction.parameters.unitTypeId;
        if (unitId !== undefined) {
          unitName = getUnitName(unitId);
          
          // Determine action type based on command
          if (matchingAction.type === 0x0C || matchingAction.type === 0x20) {
            actionName = `Build ${unitName}`;
          } else if (matchingAction.type === 0x14 || matchingAction.type === 0x1D) {
            actionName = `Train ${unitName}`;
          } else {
            actionName = `${item.action} ${unitName}`;
          }
        }
        
        if (matchingAction.type !== undefined) {
          category = BWAPICommandEngine.categorizeCommand(matchingAction.type);
        }
      }
      
      return {
        frame: item.frame,
        timestamp: item.timestamp || frameToTimestamp(item.frame),
        action: actionName,
        supply: item.supply || estimateSupply(item.frame, actions, index),
        unitName,
        category
      };
    });
  });
}

/**
 * Generate build order directly from actions if none exists
 */
function generateBuildOrderFromActions(actions: any[]): BuildOrderItem[] {
  const buildActions = actions.filter(action => {
    if (typeof action.type === 'number') {
      return [0x0C, 0x14, 0x1D, 0x20].includes(action.type);
    }
    if (typeof action.typeString === 'string') {
      return ['Build', 'Train', 'Build Self'].includes(action.typeString);
    }
    return false;
  });
  
  return buildActions.slice(0, 30).map((action, index) => {
    let actionType = 'Build';
    
    if (action.type === 0x14 || action.type === 0x1D) {
      actionType = 'Train';
    } else if (action.type === 0x20) {
      actionType = 'Morph';
    }
    
    let unitName = '';
    if (action.parameters && action.parameters.unitTypeId) {
      unitName = getUnitName(action.parameters.unitTypeId);
    }
    
    return {
      frame: action.frame,
      timestamp: frameToTimestamp(action.frame),
      action: unitName ? `${actionType} ${unitName}` : actionType,
      supply: estimateSupply(action.frame, buildActions, index)
    };
  });
}

/**
 * Enhanced Player Actions Mapping with realistic APM
 */
export function mapPlayerActionsToUI(playerActions: Record<number, any[]>, totalFrames: number): Array<{ id: number; apm: number; eapm: number; actions: any[]; quality: string }> {
  const gameMinutes = totalFrames / REMASTERED_FPS / 60;
  
  return Object.entries(playerActions).map(([playerIdStr, actions]) => {
    const playerId = parseInt(playerIdStr);
    
    // Enhanced effective action filtering
    const effectiveActions = actions.filter(action => {
      if (typeof action.type === 'number') {
        return BWAPICommandEngine.isEffectiveAction(action.type);
      }
      if (typeof action.typeString === 'string') {
        return !['Frame Increment', 'Frame Skip', 'Select Units', 'Sync'].includes(action.typeString);
      }
      return true;
    });
    
    const totalActionCount = actions.length;
    const effectiveActionCount = effectiveActions.length;
    
    const apmValidation = BWAPICommandEngine.validateAPM(
      totalActionCount, 
      effectiveActionCount, 
      gameMinutes
    );
    
    return {
      id: playerId,
      apm: apmValidation.apm,
      eapm: apmValidation.eapm,
      actions,
      quality: apmValidation.quality
    };
  });
}

/**
 * Main mapping function with enhanced validation
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
  };
} {
  console.log('[DataMapper] Enhanced mapping with improved build order generation');
  
  const buildOrders = mapBuildOrdersToUI(directData.buildOrders, directData.playerActions);
  const playerStats = mapPlayerActionsToUI(directData.playerActions, directData.totalFrames);
  
  const gameDurationMinutes = directData.totalFrames / REMASTERED_FPS / 60;
  const totalCommands = directData.commands.length;
  const averageAPM = playerStats.reduce((sum, p) => sum + p.apm, 0) / Math.max(playerStats.length, 1);
  
  const commandValidation = BWAPICommandEngine.validateCommandCount(
    totalCommands, 
    gameDurationMinutes, 
    playerStats.length
  );
  
  // Enhanced validation data
  const validationData: any = { 
    playersWithActions: {},
    gameMetrics: {
      duration: `${gameDurationMinutes.toFixed(1)} minutes`,
      totalCommands,
      averageAPM: Math.round(averageAPM),
      commandQuality: commandValidation.quality,
      expectedCommandRange: commandValidation.expectedRange,
      buildOrdersFound: buildOrders.reduce((sum, bo) => sum + bo.length, 0)
    }
  };
  
  Object.entries(directData.playerActions).forEach(([playerIdStr, actions]) => {
    const playerId = parseInt(playerIdStr);
    const playerStat = playerStats.find(p => p.id === playerId);
    const playerBuildOrder = buildOrders[playerId] || [];
    
    const buildActions = actions.filter(a => 
      (typeof a.type === 'number' && [0x0C, 0x14, 0x1D, 0x20].includes(a.type)) ||
      (typeof a.typeString === 'string' && ['Build', 'Train', 'Build Self'].includes(a.typeString))
    );
    
    const firstUnits = buildActions
      .slice(0, 5)
      .map(cmd => {
        if (cmd.parameters && cmd.parameters.unitTypeId) {
          return getUnitName(cmd.parameters.unitTypeId);
        }
        return cmd.unitName || (typeof cmd.typeString === 'string' ? cmd.typeString : 'Unknown');
      });
    
    validationData.playersWithActions[playerId] = {
      detectedCommands: actions.length,
      buildOrderItems: playerBuildOrder.length,
      firstUnits,
      apm: playerStat?.apm || 0,
      eapm: playerStat?.eapm || 0,
      quality: playerStat?.quality || 'unknown',
      buildActionsCount: buildActions.length
    };
  });
  
  console.log('[DataMapper] Enhanced mapping complete:', {
    buildOrdersCount: buildOrders.reduce((sum, bo) => sum + bo.length, 0),
    playerStatsCount: playerStats.length,
    gameDuration: `${gameDurationMinutes.toFixed(1)} minutes`,
    averageAPM: Math.round(averageAPM),
    dataQuality: commandValidation.quality
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
      realisticDataQuality: commandValidation.quality
    }
  };
}
