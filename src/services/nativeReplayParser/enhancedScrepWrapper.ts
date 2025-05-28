/**
 * Enhanced screp-js wrapper with native action parsing for Remastered replays
 * Combines screp-js metadata with detailed action extraction
 */

import { ScrepJsWrapper, ScrepJsResult } from './screpJsWrapper';
import { RemasteredActionParser, RemasteredActionData } from './remasteredActionParser';
import { DirectReplayParser, DirectParserResult } from './directReplayParser';
import { mapDirectReplayDataToUI } from './dataMapper';

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
    validationData?: {
      playersWithActions: Record<number, {
        detectedCommands: number;
        firstCommands: string[];
        firstUnits: string[];
        realisticAPM: number;
      }>;
    };
  };
}

export class EnhancedScrepWrapper {
  private static screpWrapper = ScrepJsWrapper.getInstance();

  /**
   * Parse replay with ULTRA-AGGRESSIVE DirectParser activation and enhanced validation
   */
  static async parseReplayEnhanced(file: File): Promise<EnhancedReplayData> {
    console.log('[ENHANCED-PARSER] === STARTING ULTRA-AGGRESSIVE ENHANCED PARSING ===');
    console.log('[ENHANCED-PARSER] File:', file.name, 'Size:', file.size);
    const startTime = Date.now();

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

      console.log('[ENHANCED-PARSER] Getting base data from screp-js');
      screpResult = await this.screpWrapper.parseReplay(file);
      debugInfo.screpJsSuccess = true;
      debugInfo.qualityCheck.apmValidation.screpAPM = screpResult.computed.apm;
      
      console.log('[ENHANCED-PARSER] screp-js parsing successful');
      console.log('  - Map:', screpResult.header.mapName);
      console.log('  - Players:', screpResult.players.length);
      console.log('  - Duration:', screpResult.header.duration);
      console.log('  - screp-js APM:', screpResult.computed.apm);
      
    } catch (error) {
      console.error('[ENHANCED-PARSER] screp-js parsing failed:', error);
      debugInfo.screpJsError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }

    // === STEP 2: ULTRA-AGGRESSIVE DIRECT PARSER ATTEMPT (ALWAYS RUNS FIRST) ===
    console.log('[ENHANCED-PARSER] === ULTRA-AGGRESSIVE DIRECT PARSER ATTEMPT ===');
    let directParserData: DirectParserResult | undefined;
    let directParserRealistic = false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log('[ENHANCED-PARSER] Starting DirectParser with buffer size:', arrayBuffer.byteLength);
      
      const directParser = new DirectReplayParser(arrayBuffer);
      directParserData = directParser.parseReplay();
      
      console.log('[ENHANCED-PARSER] DirectParser completed, result:', {
        success: directParserData.success,
        commandsFound: directParserData.commands.length,
        playersWithActions: Object.keys(directParserData.playerActions).length,
        apm: directParserData.apm,
        error: directParserData.error
      });
      
      debugInfo.directParserSuccess = directParserData.success;
      
      if (directParserData.success) {
        debugInfo.qualityCheck.apmValidation.directAPM = directParserData.apm;
        
        // ULTRA-STRICT QUALITY CHECK: Minimum 30 actions per active player
        directParserRealistic = this.ultraStrictQualityCheck({
          actions: directParserData.commands.length,
          buildOrders: directParserData.buildOrders.reduce((sum, bo) => sum + bo.length, 0),
          apm: directParserData.apm,
          gameTimeMinutes: screpResult.header.frames / (24 * 60),
          parserName: 'Direct',
          playerActions: directParserData.playerActions
        });
        
        debugInfo.qualityCheck.directParserRealistic = directParserRealistic;
        
        console.log('[ENHANCED-PARSER] DirectParser quality check results:');
        console.log('  - Commands found:', directParserData.commands.length);
        console.log('  - Build orders total:', directParserData.buildOrders.reduce((sum, bo) => sum + bo.length, 0));
        console.log('  - APM calculated:', directParserData.apm);
        console.log('  - Per-player action breakdown:');
        
        Object.keys(directParserData.playerActions).forEach(playerId => {
          const playerCommands = directParserData.playerActions[parseInt(playerId)] || [];
          console.log(`    Player ${playerId}: ${playerCommands.length} actions`);
        });
        
        console.log('  - Realistic quality:', directParserRealistic ? '✅ PASSED' : '❌ FAILED');
      } else {
        console.log('[ENHANCED-PARSER] DirectParser failed:', directParserData.error);
      }

    } catch (directError) {
      console.error('[ENHANCED-PARSER] DirectParser crashed:', directError);
      debugInfo.directParserError = directError instanceof Error ? directError.message : 'Unknown error';
    }

    // === STEP 3: Try native action parser ONLY if DirectParser failed quality check ===
    let actionData: RemasteredActionData | undefined;
    let nativeParserRealistic = false;

    if (!directParserRealistic) {
      console.log('[ENHANCED-PARSER] === FALLBACK TO NATIVE ACTION PARSING ===');
      console.log('[ENHANCED-PARSER] DirectParser failed quality check, trying native parser...');
      
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
        
        // ULTRA-STRICT QUALITY CHECK for native parser
        nativeParserRealistic = this.ultraStrictQualityCheck({
          actions: actionData.actions.length,
          buildOrders: debugInfo.buildOrdersGenerated,
          apm: nativeAPM,
          gameTimeMinutes,
          parserName: 'Native',
          playerActions: actionData.playerActions
        });
        
        debugInfo.qualityCheck.nativeParserRealistic = nativeParserRealistic;
        
        console.log('[ENHANCED-PARSER] Native parser results:');
        console.log('  - Actions found:', actionData.actions.length);
        console.log('  - Build orders:', debugInfo.buildOrdersGenerated);
        console.log('  - Calculated APM:', nativeAPM);
        console.log('  - Realistic quality:', nativeParserRealistic ? '✅ PASSED' : '❌ FAILED');

      } catch (actionError) {
        console.error('[ENHANCED-PARSER] Native action parsing failed:', actionError);
        debugInfo.nativeParserError = actionError instanceof Error ? actionError.message : 'Unknown error';
      }
    } else {
      console.log('[ENHANCED-PARSER] Skipping native parser - DirectParser passed quality check');
    }

    // === STEP 4: Choose parser with ULTRA-AGGRESSIVE DirectParser preference ===
    let hasDetailedActions = false;
    let chosenAPM = screpResult.computed.apm;
    let validationData: any = undefined;

    if (directParserRealistic && directParserData?.success) {
      // DirectParser passed strict validation - use it
      extractionMethod = 'direct-parser';
      hasDetailedActions = true;
      debugInfo.qualityCheck.activeParser = 'direct';
      chosenAPM = directParserData.apm;
      
      console.log('[ENHANCED-PARSER] 🎯 USING DIRECT PARSER (passed ultra-strict validation)');
      this.enhanceWithDirectParserData(screpResult, directParserData);
      
      // Generate validation data for UI
      const mappedData = mapDirectReplayDataToUI(directParserData);
      validationData = mappedData.enhanced.validationData;
      
    } else if (nativeParserRealistic && actionData) {
      // Native parser has realistic results (fallback)
      extractionMethod = 'combined';
      hasDetailedActions = true;
      debugInfo.qualityCheck.activeParser = 'native';
      chosenAPM = debugInfo.qualityCheck.apmValidation.nativeAPM;
      
      console.log('[ENHANCED-PARSER] 🔄 USING NATIVE PARSER (DirectParser failed, native passed)');
      this.enhanceWithNativeData(screpResult, actionData);
      
    } else {
      // Both parsers failed strict validation - stick with screp-js
      extractionMethod = 'screp-js';
      hasDetailedActions = false;
      debugInfo.qualityCheck.activeParser = 'screp-fallback';
      chosenAPM = screpResult.computed.apm;
      
      console.log('[ENHANCED-PARSER] ⚠️ USING SCREP-JS FALLBACK (all parsers failed validation)');
      console.log('  - Direct realistic:', directParserRealistic);
      console.log('  - Native realistic:', nativeParserRealistic);
      console.log('  - Falling back to screp-js APM:', chosenAPM);
    }

    debugInfo.qualityCheck.apmValidation.chosenAPM = chosenAPM;
    
    // Update final metrics
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
        debugInfo,
        validationData
      }
    };

    console.log('[ENHANCED-PARSER] === ULTRA-AGGRESSIVE PARSING COMPLETE ===');
    console.log('  - Method:', extractionMethod);
    console.log('  - Active Parser:', debugInfo.qualityCheck.activeParser);
    console.log('  - Has detailed actions:', hasDetailedActions);
    console.log('  - Time taken:', extractionTime, 'ms');
    console.log('  - Total actions extracted:', debugInfo.actionsExtracted);
    console.log('  - Total build orders generated:', debugInfo.buildOrdersGenerated);
    console.log('  - Final APM:', chosenAPM);

    // Store enhanced result for debugging
    (window as any).lastEnhancedResult = enhancedResult;

    return enhancedResult;
  }

  /**
   * ULTRA-STRICT quality validation with higher thresholds
   */
  private static ultraStrictQualityCheck(data: {
    actions: number;
    buildOrders: number;
    apm: number[];
    gameTimeMinutes: number;
    parserName: string;
    playerActions?: any;
  }): boolean {
    console.log(`[ENHANCED-PARSER] 🔍 ULTRA-STRICT VALIDATION for ${data.parserName} parser:`);
    console.log('  - Total actions:', data.actions);
    console.log('  - Build orders:', data.buildOrders);
    console.log('  - APM array:', data.apm);
    console.log('  - Game time:', data.gameTimeMinutes, 'minutes');

    // Minimum 100 total actions for any meaningful game
    const minTotalActions = 100;
    console.log('  - Min total actions required:', minTotalActions);

    if (data.actions < minTotalActions) {
      console.log(`  - ❌ Too few total actions (${data.actions} < ${minTotalActions})`);
      return false;
    }

    // Check per-player action count (minimum 30 per active player)
    if (data.playerActions) {
      const playerActionCounts = Object.values(data.playerActions).map((actions: any) => 
        Array.isArray(actions) ? actions.length : 0
      );
      const activePlayerCount = playerActionCounts.filter(count => count > 10).length;
      const minPerActivePlayer = 30;
      
      console.log('  - Per-player actions:', playerActionCounts);
      console.log('  - Active players detected:', activePlayerCount);
      
      if (activePlayerCount < 2) {
        console.log('  - ❌ Less than 2 active players detected');
        return false;
      }
      
      const playersWithEnoughActions = playerActionCounts.filter(count => count >= minPerActivePlayer).length;
      if (playersWithEnoughActions < 2) {
        console.log(`  - ❌ Less than 2 players with minimum ${minPerActivePlayer} actions`);
        return false;
      }
    }

    // Check if APM values are realistic (50-500 range for active players)
    const realisticAPMs = data.apm.filter(apm => apm >= 50 && apm <= 500);
    console.log('  - Realistic APM values (50-500):', realisticAPMs);
    
    if (realisticAPMs.length < 2) {
      console.log('  - ❌ Less than 2 players with realistic APM (50-500 range)');
      return false;
    }

    // Check build orders (minimum 3 build actions total)
    if (data.buildOrders < 3) {
      console.log(`  - ❌ Too few build orders (${data.buildOrders} < 3)`);
      return false;
    }

    console.log(`  - ✅ ${data.parserName} parser passed ULTRA-STRICT validation`);
    return true;
  }

  /**
   * Enhance screp-js data with direct parser results using data mapper
   */
  private static enhanceWithDirectParserData(screpResult: ScrepJsResult, directData: DirectParserResult): void {
    console.log('[EnhancedScrepWrapper] Enhancing screp-js data with direct parser results using data mapper');
    
    // Use data mapper to convert DirectParser data to UI format
    const mappedData = mapDirectReplayDataToUI(directData);
    
    // Update build orders with properly formatted data
    screpResult.computed.buildOrders = mappedData.buildOrders;
    
    // Update APM/EAPM with direct parser calculations
    if (directData.apm.length > 0) {
      console.log('[EnhancedScrepWrapper] Original APM:', screpResult.computed.apm);
      console.log('[EnhancedScrepWrapper] Direct parser APM:', directData.apm);
      console.log('[EnhancedScrepWrapper] Direct parser EAPM:', directData.eapm);
      
      screpResult.computed.apm = directData.apm;
      screpResult.computed.eapm = directData.eapm;
      console.log('[EnhancedScrepWrapper] Updated APM/EAPM with direct parser data');
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
    
    console.log('[EnhancedScrepWrapper] Enhanced data mapping complete');
    console.log('  - Build orders mapped for', mappedData.buildOrders.length, 'players');
    console.log('  - Actions extracted:', mappedData.enhanced.actionsExtracted);
    console.log('  - Build orders generated:', mappedData.enhanced.buildOrdersGenerated);
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
