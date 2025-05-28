
/**
 * Enhanced screp-js wrapper with native action parsing for Remastered replays
 * Combines screp-js metadata with detailed action extraction
 */

import { ScrepJsWrapper, ScrepJsResult } from './screpJsWrapper';
import { RemasteredActionParser, RemasteredActionData } from './remasteredActionParser';

export interface EnhancedReplayData extends ScrepJsResult {
  enhanced: {
    hasDetailedActions: boolean;
    actionData?: RemasteredActionData;
    extractionMethod: 'screp-js' | 'native-parser' | 'combined';
    extractionTime: number;
  };
}

export class EnhancedScrepWrapper {
  private static screpWrapper = ScrepJsWrapper.getInstance();

  /**
   * Parse replay with both screp-js and native action parser
   */
  static async parseReplayEnhanced(file: File): Promise<EnhancedReplayData> {
    console.log('[EnhancedScrepWrapper] Starting enhanced parsing');
    const startTime = Date.now();

    try {
      // First, get basic data from screp-js
      const available = await this.screpWrapper.initialize();
      if (!available) {
        throw new Error('screp-js not available');
      }

      console.log('[EnhancedScrepWrapper] Getting base data from screp-js');
      const screpResult = await this.screpWrapper.parseReplay(file);
      
      // Then, try to get detailed actions with native parser
      console.log('[EnhancedScrepWrapper] Extracting detailed actions with native parser');
      let actionData: RemasteredActionData | undefined;
      let hasDetailedActions = false;
      let extractionMethod: 'screp-js' | 'native-parser' | 'combined' = 'screp-js';

      try {
        actionData = await RemasteredActionParser.parseActions(file);
        hasDetailedActions = actionData.actions.length > 0;
        extractionMethod = hasDetailedActions ? 'combined' : 'screp-js';
        
        console.log('[EnhancedScrepWrapper] Native parser extracted:', {
          actions: actionData.actions.length,
          buildOrders: Object.keys(actionData.playerActions).length,
          frameCount: actionData.frameCount
        });

        // Enhance screp-js data with native parser results
        if (hasDetailedActions) {
          screpResult.computed.buildOrders = actionData.buildOrders;
          
          // Update APM/EAPM if we have better data
          if (actionData.playerActions && Object.keys(actionData.playerActions).length > 0) {
            const enhancedAPM: number[] = [];
            const enhancedEAPM: number[] = [];
            
            for (let i = 0; i < screpResult.players.length; i++) {
              const playerActions = actionData.playerActions[i] || [];
              const gameTimeMinutes = actionData.frameCount / (24 * 60); // 24 FPS
              const apm = gameTimeMinutes > 0 ? playerActions.length / gameTimeMinutes : 0;
              
              // EAPM excludes certain actions like selection
              const effectiveActions = playerActions.filter(a => 
                ![0x09, 0x0A, 0x0B].includes(a.actionId) // Exclude select actions
              );
              const eapm = gameTimeMinutes > 0 ? effectiveActions.length / gameTimeMinutes : 0;
              
              enhancedAPM.push(Math.round(apm));
              enhancedEAPM.push(Math.round(eapm));
            }
            
            screpResult.computed.apm = enhancedAPM;
            screpResult.computed.eapm = enhancedEAPM;
            
            console.log('[EnhancedScrepWrapper] Enhanced APM:', enhancedAPM);
            console.log('[EnhancedScrepWrapper] Enhanced EAPM:', enhancedEAPM);
          }
        }

      } catch (actionError) {
        console.warn('[EnhancedScrepWrapper] Native action parsing failed:', actionError);
        // Continue with screp-js data only
      }

      const extractionTime = Date.now() - startTime;

      const enhancedResult: EnhancedReplayData = {
        ...screpResult,
        enhanced: {
          hasDetailedActions,
          actionData,
          extractionMethod,
          extractionTime
        }
      };

      console.log('[EnhancedScrepWrapper] Enhanced parsing complete:', {
        method: extractionMethod,
        hasActions: hasDetailedActions,
        timeMs: extractionTime,
        players: screpResult.players.length,
        apmData: screpResult.computed.apm?.length || 0
      });

      return enhancedResult;

    } catch (error) {
      console.error('[EnhancedScrepWrapper] Enhanced parsing failed:', error);
      throw error;
    }
  }

  /**
   * Get detailed action summary for a specific player
   */
  static getPlayerActionSummary(enhancedData: EnhancedReplayData, playerId: number) {
    if (!enhancedData.enhanced.actionData) {
      return null;
    }

    const playerActions = enhancedData.enhanced.actionData.playerActions[playerId] || [];
    const buildOrder = enhancedData.enhanced.actionData.buildOrders[playerId] || [];

    return {
      totalActions: playerActions.length,
      buildOrderLength: buildOrder.length,
      firstAction: playerActions[0]?.timestamp || 'N/A',
      lastAction: playerActions[playerActions.length - 1]?.timestamp || 'N/A',
      actionTypes: this.getActionTypeBreakdown(playerActions),
      buildOrderSummary: buildOrder.slice(0, 10) // First 10 build order items
    };
  }

  /**
   * Get breakdown of action types for a player
   */
  private static getActionTypeBreakdown(actions: any[]) {
    const breakdown: Record<string, number> = {};
    
    for (const action of actions) {
      breakdown[action.actionType] = (breakdown[action.actionType] || 0) + 1;
    }
    
    return Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5) // Top 5 action types
      .map(([type, count]) => ({ type, count }));
  }
}
