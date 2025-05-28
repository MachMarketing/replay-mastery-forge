
/**
 * Data mapping layer for converting DirectParser results to UI format
 * Enhanced with BWAPI-conform command processing and Remastered FPS
 */

import { DirectParserResult, BuildOrderItem } from './types';
import { EnhancedReplayData } from './enhancedScrepWrapper';
import { BWAPICommandEngine, REMASTERED_FPS } from './bwapi/commandEngine';
import { UNIT_NAMES, BUILDING_NAMES } from './bwRemastered/constants';

/**
 * Converts frame number to timestamp string "mm:ss" mit Remastered FPS
 */
export function frameToTimestamp(frame: number): string {
  const totalSeconds = Math.floor(frame / REMASTERED_FPS); // Korrekte Remastered FPS
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(1, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Estimates supply based on game progression mit realistischen Werten
 */
export function estimateSupply(frame: number, playerActions: any[]): number {
  const timeBasedSupply = Math.floor((frame / REMASTERED_FPS) / 25) * 2; // Alle 25 Sekunden +2 Supply
  
  // Zähle tatsächliche Einheiten und Gebäude für bessere Schätzung
  const buildActions = playerActions.filter(action => {
    if (typeof action.type === 'string') {
      return ['Build', 'Train', 'Build Self'].includes(action.type);
    }
    if (typeof action.cmdId === 'number') {
      return [0x0C, 0x14, 0x1D, 0x20].includes(action.cmdId);
    }
    return false;
  });
  
  const baseSupply = 4; // Startwert
  const unitSupply = Math.min(buildActions.length * 0.8, 100); // Schätzung basierend auf Build-Actions
  
  return Math.min(Math.max(baseSupply + timeBasedSupply + unitSupply, baseSupply), 200);
}

/**
 * Mappe Unit/Building ID zu Namen
 */
export function getUnitName(unitId: number): string {
  return UNIT_NAMES[unitId as keyof typeof UNIT_NAMES] || 
         BUILDING_NAMES[unitId as keyof typeof BUILDING_NAMES] || 
         `Unit ${unitId}`;
}

/**
 * Enhanced Build Order Mapping mit BWAPI-konformen Commands
 */
export function mapBuildOrdersToUI(buildOrders: BuildOrderItem[][], playerActions: Record<number, any[]>): Array<Array<{ frame: number; timestamp: string; action: string; supply: number; unitName?: string; category?: string }>> {
  return buildOrders.map((playerBuildOrder, playerIndex) => {
    const actions = playerActions[playerIndex] || [];
    
    return playerBuildOrder.map(item => {
      // Verbesserte Action-Namen mit Unit-Mapping
      let actionName = item.action;
      let unitName: string | undefined;
      let category: string | undefined;
      
      // Extrahiere Unit-Namen aus Command-Parametern wenn verfügbar
      if (actions.length > 0) {
        const matchingAction = actions.find(action => 
          Math.abs(action.frame - item.frame) <= 2 // Frame-Toleranz
        );
        
        if (matchingAction && matchingAction.parameters) {
          const unitId = matchingAction.parameters.unitTypeId;
          if (unitId) {
            unitName = getUnitName(unitId);
            actionName = `${item.action} ${unitName}`;
          }
          
          // Kategorisiere basierend auf Command
          if (matchingAction.cmdId) {
            const cmdCategory = BWAPICommandEngine.categorizeCommand(matchingAction.cmdId);
            category = cmdCategory;
          }
        }
      }
      
      return {
        frame: item.frame,
        timestamp: item.timestamp || frameToTimestamp(item.frame),
        action: actionName,
        supply: item.supply || estimateSupply(item.frame, actions),
        unitName,
        category
      };
    });
  });
}

/**
 * Enhanced Player Actions Mapping mit realistischer APM-Berechnung
 */
export function mapPlayerActionsToUI(playerActions: Record<number, any[]>, totalFrames: number): Array<{ id: number; apm: number; eapm: number; actions: any[]; quality: string }> {
  const gameMinutes = totalFrames / REMASTERED_FPS / 60; // Korrekte Remastered FPS
  
  return Object.entries(playerActions).map(([playerIdStr, actions]) => {
    const playerId = parseInt(playerIdStr);
    
    // Separiere verschiedene Command-Typen für realistische APM/EAPM
    const effectiveActions = actions.filter(action => {
      // BWAPI-konforme Filterung für EAPM
      if (typeof action.cmdId === 'number') {
        return BWAPICommandEngine.isEffectiveAction(action.cmdId);
      }
      
      // Fallback für String-basierte Types
      if (typeof action.type === 'string') {
        return !['Sync', 'Select', 'Frame'].includes(action.type);
      }
      
      return true;
    });
    
    const totalActionCount = actions.length;
    const effectiveActionCount = effectiveActions.length;
    
    // Verwende BWAPI-Engine für APM-Validierung
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
 * Main mapping function mit erweiterten Validierungen
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
  console.log('[DataMapper] Mapping DirectParser data to UI format with BWAPI enhancements');
  
  const buildOrders = mapBuildOrdersToUI(directData.buildOrders, directData.playerActions);
  const playerStats = mapPlayerActionsToUI(directData.playerActions, directData.totalFrames);
  
  // Berechne erweiterte Validierungsmetriken
  const gameDurationMinutes = directData.totalFrames / REMASTERED_FPS / 60;
  const totalCommands = directData.commands.length;
  const averageAPM = playerStats.reduce((sum, p) => sum + p.apm, 0) / Math.max(playerStats.length, 1);
  
  // Validiere Gesamtqualität der Daten
  const commandValidation = BWAPICommandEngine.validateCommandCount(
    totalCommands, 
    gameDurationMinutes, 
    playerStats.length
  );
  
  // Generate enhanced validation data for debug UI
  const validationData: any = { 
    playersWithActions: {},
    gameMetrics: {
      duration: `${gameDurationMinutes.toFixed(1)} minutes`,
      totalCommands,
      averageAPM: Math.round(averageAPM),
      commandQuality: commandValidation.quality,
      expectedCommandRange: commandValidation.expectedRange
    }
  };
  
  Object.entries(directData.playerActions).forEach(([playerIdStr, actions]) => {
    const playerId = parseInt(playerIdStr);
    const playerStat = playerStats.find(p => p.id === playerId);
    
    // Analysiere Command-Typen für bessere Debugging-Info
    const commandTypes: Record<string, number> = {};
    const firstCommands = actions.slice(0, 5).map(cmd => {
      let cmdStr = '';
      if (typeof cmd.cmdId === 'number') {
        cmdStr = `0x${cmd.cmdId.toString(16).padStart(2, '0')}`;
        const category = BWAPICommandEngine.categorizeCommand(cmd.cmdId);
        commandTypes[category] = (commandTypes[category] || 0) + 1;
      } else if (typeof cmd.type === 'string') {
        cmdStr = cmd.type;
      } else {
        cmdStr = 'Unknown';
      }
      return cmdStr;
    });
    
    const buildActions = actions.filter(a => 
      (typeof a.cmdId === 'number' && [0x0C, 0x14, 0x1D, 0x20].includes(a.cmdId)) ||
      (typeof a.type === 'string' && ['Build', 'Train'].includes(a.type))
    );
    
    const firstUnits = buildActions
      .slice(0, 3)
      .map(cmd => {
        if (cmd.parameters && cmd.parameters.unitTypeId) {
          return getUnitName(cmd.parameters.unitTypeId);
        }
        return cmd.unitName || (typeof cmd.type === 'string' ? cmd.type : 'Unknown');
      });
    
    validationData.playersWithActions[playerId] = {
      detectedCommands: actions.length,
      firstCommands,
      firstUnits,
      apm: playerStat?.apm || 0,
      eapm: playerStat?.eapm || 0,
      quality: playerStat?.quality || 'unknown',
      commandTypeBreakdown: commandTypes,
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
