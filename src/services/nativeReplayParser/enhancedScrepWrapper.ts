
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
    debugInfo: {
      screpJsSuccess: boolean;
      nativeParserSuccess: boolean;
      screpJsError?: string;
      nativeParserError?: string;
      actionsExtracted: number;
      buildOrdersGenerated: number;
    };
  };
}

export class EnhancedScrepWrapper {
  private static screpWrapper = ScrepJsWrapper.getInstance();

  /**
   * Parse replay with both screp-js and native action parser
   */
  static async parseReplayEnhanced(file: File): Promise<EnhancedReplayData> {
    console.log('[EnhancedScrepWrapper] === STARTING ENHANCED PARSING ===');
    console.log('[EnhancedScrepWrapper] File:', file.name, 'Size:', file.size);
    const startTime = Date.now();

    // Initialize debug info
    const debugInfo = {
      screpJsSuccess: false,
      nativeParserSuccess: false,
      actionsExtracted: 0,
      buildOrdersGenerated: 0
    };

    let screpResult: ScrepJsResult;
    let extractionMethod: 'screp-js' | 'native-parser' | 'combined' = 'screp-js';

    try {
      // First, get basic data from screp-js
      const available = await this.screpWrapper.initialize();
      if (!available) {
        throw new Error('screp-js not available');
      }

      console.log('[EnhancedScrepWrapper] Getting base data from screp-js');
      screpResult = await this.screpWrapper.parseReplay(file);
      debugInfo.screpJsSuccess = true;
      
      console.log('[EnhancedScrepWrapper] screp-js parsing successful');
      console.log('  - Map:', screpResult.header.mapName);
      console.log('  - Players:', screpResult.players.length);
      console.log('  - Duration:', screpResult.header.duration);
      console.log('  - APM available:', screpResult.computed.apm.length > 0);
      
    } catch (error) {
      console.error('[EnhancedScrepWrapper] screp-js parsing failed:', error);
      debugInfo.screpJsError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }

    // Then, try to get detailed actions with native parser
    console.log('[EnhancedScrepWrapper] === ATTEMPTING NATIVE ACTION PARSING ===');
    let actionData: RemasteredActionData | undefined;
    let hasDetailedActions = false;

    try {
      actionData = await RemasteredActionParser.parseActions(file);
      debugInfo.nativeParserSuccess = true;
      hasDetailedActions = actionData.actions.length > 0;
      debugInfo.actionsExtracted = actionData.actions.length;
      debugInfo.buildOrdersGenerated = actionData.buildOrders.reduce((sum, bo) => sum + bo.length, 0);
      
      console.log('[EnhancedScrepWrapper] Native parser results:');
      console.log('  - Actions extracted:', actionData.actions.length);
      console.log('  - Build orders generated:', debugInfo.buildOrdersGenerated);
      console.log('  - Player actions:', Object.keys(actionData.playerActions).length);
      console.log('  - Frame count:', actionData.frameCount);

      if (hasDetailedActions) {
        extractionMethod = 'combined';
        
        // Enhance screp-js data with native parser results
        console.log('[EnhancedScrepWrapper] Enhancing screp-js data with native parser results');
        
        // Update build orders
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
          
          console.log('[EnhancedScrepWrapper] Original APM:', screpResult.computed.apm);
          console.log('[EnhancedScrepWrapper] Enhanced APM:', enhancedAPM);
          console.log('[EnhancedScrepWrapper] Enhanced EAPM:', enhancedEAPM);
          
          // Use enhanced APM if it seems more reasonable
          if (enhancedAPM.some(apm => apm > 0)) {
            screpResult.computed.apm = enhancedAPM;
            screpResult.computed.eapm = enhancedEAPM;
            console.log('[EnhancedScrepWrapper] Updated APM/EAPM with native parser data');
          }
        }
      }

    } catch (actionError) {
      console.warn('[EnhancedScrepWrapper] Native action parsing failed:', actionError);
      debugInfo.nativeParserError = actionError instanceof Error ? actionError.message : 'Unknown error';
      // Continue with screp-js data only
    }

    const extractionTime = Date.now() - startTime;

    const enhancedResult: EnhancedReplayData = {
      ...screpResult,
      enhanced: {
        hasDetailedActions,
        actionData,
        extractionMethod,
        extractionTime,
        debugInfo
      }
    };

    console.log('[EnhancedScrepWrapper] === ENHANCED PARSING COMPLETE ===');
    console.log('  - Method:', extractionMethod);
    console.log('  - Has actions:', hasDetailedActions);
    console.log('  - Time taken:', extractionTime, 'ms');
    console.log('  - screp-js success:', debugInfo.screpJsSuccess);
    console.log('  - Native parser success:', debugInfo.nativeParserSuccess);
    console.log('  - Actions extracted:', debugInfo.actionsExtracted);
    console.log('  - Build orders generated:', debugInfo.buildOrdersGenerated);

    // Store enhanced result for debugging
    (window as any).lastEnhancedResult = enhancedResult;

    return enhancedResult;
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
