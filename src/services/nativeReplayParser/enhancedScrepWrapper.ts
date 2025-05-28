/**
 * Enhanced screp-js wrapper with native action parsing for Remastered replays
 * Combines screp-js metadata with detailed action extraction
 */

import { ScrepJsWrapper, ScrepJsResult } from './screpJsWrapper';
import { RemasteredActionParser, RemasteredActionData } from './remasteredActionParser';
import { DirectReplayParser, DirectParserResult } from './directReplayParser';

export interface EnhancedReplayData extends ScrepJsResult {
  enhanced: {
    hasDetailedActions: boolean;
    actionData?: RemasteredActionData;
    directParserData?: DirectParserResult;
    extractionMethod: 'screp-js' | 'native-parser' | 'direct-parser' | 'combined';
    extractionTime: number;
    debugInfo: {
      screpJsSuccess: boolean;
      nativeParserSuccess: boolean;
      directParserSuccess: boolean;
      screpJsError?: string;
      nativeParserError?: string;
      directParserError?: string;
      actionsExtracted: number;
      buildOrdersGenerated: number;
      qualityCheck: {
        nativeParserRealistic: boolean;
        directParserRealistic: boolean;
        activeParser: 'native' | 'direct' | 'screp-fallback';
        apmValidation: {
          nativeAPM: number[];
          directAPM: number[];
          screpAPM: number[];
          chosenAPM: number[];
        };
      };
    };
  };
}

export class EnhancedScrepWrapper {
  private static screpWrapper = ScrepJsWrapper.getInstance();

  /**
   * Parse replay with multiple fallback strategies and quality validation
   */
  static async parseReplayEnhanced(file: File): Promise<EnhancedReplayData> {
    console.log('[REPLAY-PARSER] === STARTING ENHANCED PARSING ===');
    console.log('[REPLAY-PARSER] File:', file.name, 'Size:', file.size);
    const startTime = Date.now();

    // Initialize debug info with all properties
    const debugInfo = {
      screpJsSuccess: false,
      nativeParserSuccess: false,
      directParserSuccess: false,
      screpJsError: undefined as string | undefined,
      nativeParserError: undefined as string | undefined,
      directParserError: undefined as string | undefined,
      actionsExtracted: 0,
      buildOrdersGenerated: 0,
      qualityCheck: {
        nativeParserRealistic: false,
        directParserRealistic: false,
        activeParser: 'screp-fallback' as 'native' | 'direct' | 'screp-fallback',
        apmValidation: {
          nativeAPM: [] as number[],
          directAPM: [] as number[],
          screpAPM: [] as number[],
          chosenAPM: [] as number[]
        }
      }
    };

    let screpResult: ScrepJsResult;
    let extractionMethod: 'screp-js' | 'native-parser' | 'direct-parser' | 'combined' = 'screp-js';

    // === STEP 1: Get base data from screp-js ===
    try {
      const available = await this.screpWrapper.initialize();
      if (!available) {
        throw new Error('screp-js not available');
      }

      console.log('[REPLAY-PARSER] Getting base data from screp-js');
      screpResult = await this.screpWrapper.parseReplay(file);
      debugInfo.screpJsSuccess = true;
      debugInfo.qualityCheck.apmValidation.screpAPM = screpResult.computed.apm;
      
      console.log('[REPLAY-PARSER] screp-js parsing successful');
      console.log('  - Map:', screpResult.header.mapName);
      console.log('  - Players:', screpResult.players.length);
      console.log('  - Duration:', screpResult.header.duration);
      console.log('  - screp-js APM:', screpResult.computed.apm);
      
    } catch (error) {
      console.error('[REPLAY-PARSER] screp-js parsing failed:', error);
      debugInfo.screpJsError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }

    // === STEP 2: Try native action parser ===
    console.log('[REPLAY-PARSER] === ATTEMPTING NATIVE ACTION PARSING ===');
    let actionData: RemasteredActionData | undefined;
    let nativeParserRealistic = false;

    try {
      actionData = await RemasteredActionParser.parseActions(file);
      debugInfo.nativeParserSuccess = true;
      debugInfo.actionsExtracted = actionData.actions.length;
      debugInfo.buildOrdersGenerated = actionData.buildOrders.reduce((sum, bo) => sum + bo.length, 0);
      
      // Calculate APM from native parser
      const gameTimeMinutes = screpResult.header.frames / (24 * 60);
      const nativeAPM = actionData.playerActions ? 
        Object.keys(actionData.playerActions).map(pid => {
          const playerActions = actionData.playerActions[parseInt(pid)] || [];
          return gameTimeMinutes > 0 ? Math.round(playerActions.length / gameTimeMinutes) : 0;
        }) : [];
      
      debugInfo.qualityCheck.apmValidation.nativeAPM = nativeAPM;
      
      // Quality check for native parser
      nativeParserRealistic = this.validateParserResults({
        actions: actionData.actions.length,
        buildOrders: debugInfo.buildOrdersGenerated,
        apm: nativeAPM,
        gameTimeMinutes,
        parserName: 'Native'
      });
      
      debugInfo.qualityCheck.nativeParserRealistic = nativeParserRealistic;
      
      console.log('[REPLAY-PARSER] Native parser results:');
      console.log('  - Actions found:', actionData.actions.length);
      console.log('  - Build orders:', debugInfo.buildOrdersGenerated);
      console.log('  - Calculated APM:', nativeAPM);
      console.log('  - Realistic quality:', nativeParserRealistic);

    } catch (actionError) {
      console.warn('[REPLAY-PARSER] Native action parsing failed:', actionError);
      debugInfo.nativeParserError = actionError instanceof Error ? actionError.message : 'Unknown error';
    }

    // === STEP 3: Try direct replay parser (always run for comparison) ===
    console.log('[REPLAY-PARSER] === ATTEMPTING DIRECT PARSER ===');
    let directParserData: DirectParserResult | undefined;
    let directParserRealistic = false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const directParser = new DirectReplayParser(arrayBuffer);
      directParserData = directParser.parseReplay();
      
      debugInfo.directParserSuccess = directParserData.success;
      
      if (directParserData.success) {
        debugInfo.qualityCheck.apmValidation.directAPM = directParserData.apm;
        
        // Quality check for direct parser
        directParserRealistic = this.validateParserResults({
          actions: directParserData.commands.length,
          buildOrders: directParserData.buildOrders.reduce((sum, bo) => sum + bo.length, 0),
          apm: directParserData.apm,
          gameTimeMinutes: screpResult.header.frames / (24 * 60),
          parserName: 'Direct'
        });
        
        debugInfo.qualityCheck.directParserRealistic = directParserRealistic;
        
        console.log('[REPLAY-PARSER] Direct parser results:');
        console.log('  - Commands found:', directParserData.commands.length);
        console.log('  - Build orders:', directParserData.buildOrders.reduce((sum, bo) => sum + bo.length, 0));
        console.log('  - APM:', directParserData.apm);
        console.log('  - Realistic quality:', directParserRealistic);
      }

    } catch (directError) {
      console.warn('[REPLAY-PARSER] Direct parser failed:', directError);
      debugInfo.directParserError = directError instanceof Error ? directError.message : 'Unknown error';
    }

    // === STEP 4: Choose best parser based on quality ===
    let hasDetailedActions = false;
    let chosenAPM = screpResult.computed.apm;

    if (directParserRealistic && directParserData?.success) {
      // Direct parser has realistic results - use it
      extractionMethod = 'direct-parser';
      hasDetailedActions = true;
      debugInfo.qualityCheck.activeParser = 'direct';
      chosenAPM = directParserData.apm;
      
      console.log('[REPLAY-PARSER] Using DIRECT PARSER (realistic results)');
      this.enhanceWithDirectParserData(screpResult, directParserData);
      
    } else if (nativeParserRealistic && actionData) {
      // Native parser has realistic results - use it
      extractionMethod = 'combined';
      hasDetailedActions = true;
      debugInfo.qualityCheck.activeParser = 'native';
      chosenAPM = debugInfo.qualityCheck.apmValidation.nativeAPM;
      
      console.log('[REPLAY-PARSER] Using NATIVE PARSER (realistic results)');
      this.enhanceWithNativeData(screpResult, actionData);
      
    } else {
      // Both parsers failed or unrealistic - stick with screp-js
      extractionMethod = 'screp-js';
      hasDetailedActions = false;
      debugInfo.qualityCheck.activeParser = 'screp-fallback';
      chosenAPM = screpResult.computed.apm;
      
      console.log('[REPLAY-PARSER] Using SCREP-JS FALLBACK (other parsers unrealistic)');
      console.log('  - Native realistic:', nativeParserRealistic);
      console.log('  - Direct realistic:', directParserRealistic);
    }

    debugInfo.qualityCheck.apmValidation.chosenAPM = chosenAPM;
    
    // Update final actions/build orders count
    if (hasDetailedActions) {
      if (debugInfo.qualityCheck.activeParser === 'direct' && directParserData) {
        debugInfo.actionsExtracted = directParserData.commands.length;
        debugInfo.buildOrdersGenerated = directParserData.buildOrders.reduce((sum, bo) => sum + bo.length, 0);
      } else if (debugInfo.qualityCheck.activeParser === 'native' && actionData) {
        debugInfo.actionsExtracted = actionData.actions.length;
        debugInfo.buildOrdersGenerated = actionData.buildOrders.reduce((sum, bo) => sum + bo.length, 0);
      }
    }

    const extractionTime = Date.now() - startTime;

    const enhancedResult: EnhancedReplayData = {
      ...screpResult,
      enhanced: {
        hasDetailedActions,
        actionData,
        directParserData,
        extractionMethod,
        extractionTime,
        debugInfo
      }
    };

    console.log('[REPLAY-PARSER] === ENHANCED PARSING COMPLETE ===');
    console.log('  - Method:', extractionMethod);
    console.log('  - Active Parser:', debugInfo.qualityCheck.activeParser);
    console.log('  - Has actions:', hasDetailedActions);
    console.log('  - Time taken:', extractionTime, 'ms');
    console.log('  - Total actions extracted:', debugInfo.actionsExtracted);
    console.log('  - Total build orders generated:', debugInfo.buildOrdersGenerated);
    console.log('  - Final APM:', chosenAPM);

    // Store enhanced result for debugging
    (window as any).lastEnhancedResult = enhancedResult;

    return enhancedResult;
  }

  /**
   * Validate if parser results are realistic for a StarCraft game
   */
  private static validateParserResults(data: {
    actions: number;
    buildOrders: number;
    apm: number[];
    gameTimeMinutes: number;
    parserName: string;
  }): boolean {
    console.log(`[REPLAY-PARSER] Validating ${data.parserName} parser results:`);
    console.log('  - Actions:', data.actions);
    console.log('  - Build orders:', data.buildOrders);
    console.log('  - APM:', data.apm);
    console.log('  - Game time:', data.gameTimeMinutes, 'minutes');

    // Minimum realistic actions based on game length
    const minExpectedActions = Math.floor(data.gameTimeMinutes * 20); // ~20 actions per minute minimum
    console.log('  - Min expected actions:', minExpectedActions);

    // Check if we have enough actions
    if (data.actions < minExpectedActions) {
      console.log(`  - ❌ Too few actions (${data.actions} < ${minExpectedActions})`);
      return false;
    }

    // Check if APM is realistic (between 30-500)
    const hasRealisticAPM = data.apm.some(apm => apm >= 30 && apm <= 500);
    console.log('  - Realistic APM found:', hasRealisticAPM);
    
    if (!hasRealisticAPM) {
      console.log('  - ❌ No realistic APM values found');
      return false;
    }

    // Check if we have some build orders
    if (data.buildOrders < 3) {
      console.log(`  - ❌ Too few build orders (${data.buildOrders} < 3)`);
      return false;
    }

    console.log(`  - ✅ ${data.parserName} parser results are realistic`);
    return true;
  }

  /**
   * Enhance screp-js data with native parser results
   */
  private static enhanceWithNativeData(screpResult: ScrepJsResult, actionData: RemasteredActionData): void {
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
      
      // Use enhanced APM if it seems more reasonable
      if (enhancedAPM.some(apm => apm > 0)) {
        screpResult.computed.apm = enhancedAPM;
        screpResult.computed.eapm = enhancedEAPM;
        console.log('[EnhancedScrepWrapper] Updated APM/EAPM with native parser data');
      }
    }
  }

  /**
   * Enhance screp-js data with direct parser results
   */
  private static enhanceWithDirectParserData(screpResult: ScrepJsResult, directData: DirectParserResult): void {
    console.log('[EnhancedScrepWrapper] Enhancing screp-js data with direct parser results');
    
    // Update build orders with direct parser data
    screpResult.computed.buildOrders = directData.buildOrders.map(buildOrder => 
      buildOrder.map(action => ({
        frame: action.frame,
        timestamp: action.timestamp,
        action: action.action,
        supply: action.supply
      }))
    );
    
    // Update APM/EAPM with direct parser calculations
    if (directData.apm.length > 0) {
      console.log('[EnhancedScrepWrapper] Original APM:', screpResult.computed.apm);
      console.log('[EnhancedScrepWrapper] Direct parser APM:', directData.apm);
      console.log('[EnhancedScrepWrapper] Direct parser EAPM:', directData.eapm);
      
      // Use direct parser APM if it's more reasonable
      if (directData.apm.some(apm => apm > 0)) {
        screpResult.computed.apm = directData.apm;
        screpResult.computed.eapm = directData.eapm;
        console.log('[EnhancedScrepWrapper] Updated APM/EAPM with direct parser data');
      }
    }
    
    // Update frame count if direct parser found more
    if (directData.totalFrames > screpResult.header.frames) {
      screpResult.header.frames = directData.totalFrames;
      const durationMs = Math.floor((directData.totalFrames / 24) * 1000);
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      screpResult.header.duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      screpResult.header.durationMs = durationMs;
      console.log('[EnhancedScrepWrapper] Updated duration based on direct parser frames');
    }
  }

  /**
   * Get detailed action summary for a specific player
   */
  static getPlayerActionSummary(enhancedData: EnhancedReplayData, playerId: number) {
    // Try direct parser data first
    if (enhancedData.enhanced.directParserData) {
      const playerActions = enhancedData.enhanced.directParserData.playerActions[playerId] || [];
      const buildOrder = enhancedData.enhanced.directParserData.buildOrders[playerId] || [];

      return {
        totalActions: playerActions.length,
        buildOrderLength: buildOrder.length,
        firstAction: playerActions[0]?.frame || 'N/A',
        lastAction: playerActions[playerActions.length - 1]?.frame || 'N/A',
        actionTypes: this.getDirectParserActionTypeBreakdown(playerActions),
        buildOrderSummary: buildOrder.slice(0, 10) // First 10 build order items
      };
    }

    // Fallback to original native parser data
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
   * Get breakdown of action types for direct parser data
   */
  private static getDirectParserActionTypeBreakdown(actions: any[]) {
    const breakdown: Record<string, number> = {};
    
    for (const action of actions) {
      breakdown[action.type] = (breakdown[action.type] || 0) + 1;
    }
    
    return Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5) // Top 5 action types
      .map(([type, count]) => ({ type, count }));
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
