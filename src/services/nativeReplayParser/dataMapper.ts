
/**
 * Data mapping layer for converting DirectParser results to UI format
 */

import { DirectParserResult, BuildOrderItem } from './types';
import { EnhancedReplayData } from './enhancedScrepWrapper';

/**
 * Converts frame number to timestamp string "mm:ss"
 */
export function frameToTimestamp(frame: number): string {
  const totalSeconds = Math.floor(frame / 24);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(1, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Estimates supply based on game progression (fallback)
 */
export function estimateSupply(frame: number, playerActions: any[]): number {
  // Rough estimate: 1 supply every 20 seconds starting from 4
  const baseSupply = 4;
  const timeBasedSupply = Math.floor((frame / 24) / 20) * 2;
  
  // Count actual units built for better estimation
  const unitsBuilt = playerActions.filter(action => 
    action.type === 'Train' || action.type === 'Build'
  ).length;
  
  return Math.max(baseSupply + timeBasedSupply + unitsBuilt, baseSupply);
}

/**
 * Maps DirectParser build orders to UI format
 */
export function mapBuildOrdersToUI(buildOrders: BuildOrderItem[][], playerActions: Record<number, any[]>): Array<Array<{ frame: number; timestamp: string; action: string; supply: number }>> {
  return buildOrders.map((playerBuildOrder, playerIndex) => {
    const actions = playerActions[playerIndex] || [];
    
    return playerBuildOrder.map(item => ({
      frame: item.frame,
      timestamp: item.timestamp || frameToTimestamp(item.frame),
      action: item.action,
      supply: item.supply || estimateSupply(item.frame, actions)
    }));
  });
}

/**
 * Maps DirectParser player actions to enhanced format
 */
export function mapPlayerActionsToUI(playerActions: Record<number, any[]>, totalFrames: number): Array<{ id: number; apm: number; eapm: number; actions: any[] }> {
  const gameMinutes = totalFrames / 24 / 60;
  
  return Object.entries(playerActions).map(([playerIdStr, actions]) => {
    const playerId = parseInt(playerIdStr);
    
    // Filter effective actions (exclude sync frames and selections)
    const effectiveActions = actions.filter(action => {
      // Check if action has cmdId property
      if (typeof action.cmdId === 'number') {
        // Exclude sync and selection commands
        return action.cmdId !== 0x00 && action.cmdId !== 0x01 && action.cmdId !== 0x02 && 
               action.cmdId !== 0x09 && action.cmdId !== 0x0A && action.cmdId !== 0x0B;
      }
      
      // Check if action has type property
      if (typeof action.type === 'string') {
        // Exclude sync and selection actions by type
        return !['Sync', 'Select', 'Frame'].includes(action.type);
      }
      
      // Include action if we can't determine type
      return true;
    });
    
    const apm = gameMinutes > 0 ? Math.round(actions.length / gameMinutes) : 0;
    const eapm = gameMinutes > 0 ? Math.round(effectiveActions.length / gameMinutes) : 0;
    
    return {
      id: playerId,
      apm,
      eapm,
      actions
    };
  });
}

/**
 * Main mapping function: DirectParser data → UI format
 */
export function mapDirectReplayDataToUI(directData: DirectParserResult): {
  buildOrders: Array<Array<{ frame: number; timestamp: string; action: string; supply: number }>>;
  playerStats: Array<{ id: number; apm: number; eapm: number; actions: any[] }>;
  enhanced: {
    actionsExtracted: number;
    buildOrdersGenerated: number;
    validationData: any;
  };
} {
  console.log('[DataMapper] Mapping DirectParser data to UI format');
  
  const buildOrders = mapBuildOrdersToUI(directData.buildOrders, directData.playerActions);
  const playerStats = mapPlayerActionsToUI(directData.playerActions, directData.totalFrames);
  
  // Generate enhanced validation data for debug UI
  const validationData: any = { playersWithActions: {} };
  
  Object.entries(directData.playerActions).forEach(([playerIdStr, actions]) => {
    const playerId = parseInt(playerIdStr);
    const firstCommands = actions.slice(0, 5).map(cmd => {
      if (typeof cmd.type === 'number') {
        return `0x${cmd.type.toString(16).padStart(2, '0')}`;
      }
      if (typeof cmd.cmdId === 'number') {
        return `0x${cmd.cmdId.toString(16).padStart(2, '0')}`;
      }
      return cmd.type || cmd.typeString || 'Unknown';
    });
    
    const firstUnits = actions
      .filter(cmd => cmd.unitName || (typeof cmd.type === 'string' && ['Build', 'Train'].includes(cmd.type)))
      .slice(0, 3)
      .map(cmd => cmd.unitName || (typeof cmd.type === 'string' ? cmd.type : 'Unknown'));
    
    const realisticAPM = playerStats.find(p => p.id === playerId)?.apm || 0;
    
    validationData.playersWithActions[playerId] = {
      detectedCommands: actions.length,
      firstCommands,
      firstUnits,
      realisticAPM,
      apmBreakdown: {
        build: actions.filter(a => typeof a.type === 'string' && a.type === 'Build').length,
        train: actions.filter(a => typeof a.type === 'string' && a.type === 'Train').length,
        select: actions.filter(a => typeof a.type === 'string' && a.type === 'Select').length,
        move: actions.filter(a => typeof a.type === 'string' && a.type === 'Move').length,
        other: actions.filter(a => typeof a.type === 'string' && !['Build', 'Train', 'Select', 'Move'].includes(a.type)).length
      }
    };
  });
  
  console.log('[DataMapper] Mapped build orders for', buildOrders.length, 'players');
  console.log('[DataMapper] Mapped player stats:', playerStats.map(p => ({ id: p.id, apm: p.apm })));
  
  return {
    buildOrders,
    playerStats,
    enhanced: {
      actionsExtracted: directData.commands.length,
      buildOrdersGenerated: directData.buildOrders.reduce((sum, bo) => sum + bo.length, 0),
      validationData
    }
  };
}
