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
   * Parse replay with aggressive DirectParser activation and quality validation
   */
  static async parseReplayEnhanced(file: File): Promise<EnhancedReplayData> {
    console.log('[ENHANCED-PARSER] === STARTING ENHANCED PARSING WITH AGGRESSIVE VALIDATION ===');
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

    // === STEP 2: AGGRESSIVE DIRECT PARSER ATTEMPT (Always run) ===
    console.log('[ENHANCED-PARSER] === AGGRESSIVE DIRECT PARSER ATTEMPT ===');
    let directParserData: DirectParserResult | undefined;
    let directParserRealistic = false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const directParser = new DirectReplayParser(arrayBuffer);
      directParserData = directParser.parseReplay();
      
      debugInfo.directParserSuccess = directParserData.success;
      
      if (directParserData.success) {
        debugInfo.qualityCheck.apmValidation.directAPM = directParserData.apm;
        
        // ENHANCED QUALITY CHECK: 30+ actions per player minimum
        directParserRealistic = this.validateParserWithActionCount({
          actions: directParserData.commands.length,
          buildOrders: directParserData.buildOrders.reduce((sum, bo) => sum + bo.length, 0),
          apm: directParserData.apm,
          gameTimeMinutes: screpResult.header.frames / (24 * 60),
          parserName: 'Direct',
          playerActions: directParserData.playerActions
        });
        
        debugInfo.qualityCheck.directParserRealistic = directParserRealistic;
        
        console.log('[ENHANCED-PARSER] Direct parser results:');
        console.log('  - Commands found:', directParserData.commands.length);
        console.log('  - Build orders:', directParserData.buildOrders.reduce((sum, bo) => sum + bo.length, 0));
        console.log('  - APM:', directParserData.apm);
        console.log('  - Realistic quality:', directParserRealistic);
      }

    } catch (directError) {
      console.warn('[ENHANCED-PARSER] Direct parser failed:', directError);
      debugInfo.directParserError = directError instanceof Error ? directError.message : 'Unknown error';
    }

    // === STEP 3: Try native action parser (only if DirectParser failed) ===
    let actionData: RemasteredActionData | undefined;
    let nativeParserRealistic = false;

    if (!directParserRealistic) {
      console.log('[ENHANCED-PARSER] === FALLBACK TO NATIVE ACTION PARSING ===');
      
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
        
        // ENHANCED QUALITY CHECK with action count validation
        nativeParserRealistic = this.validateParserWithActionCount({
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
        console.log('  - Realistic quality:', nativeParserRealistic);

      } catch (actionError) {
        console.warn('[ENHANCED-PARSER] Native action parsing failed:', actionError);
        debugInfo.nativeParserError = actionError instanceof Error ? actionError.message : 'Unknown error';
      }
    }

    // === STEP 4: Choose best parser with aggressive DirectParser preference ===
    let hasDetailedActions = false;
    let chosenAPM = screpResult.computed.apm;
    let validationData: any = undefined;

    if (directParserRealistic && directParserData?.success) {
      // DirectParser is realistic - use it
      extractionMethod = 'direct-parser';
      hasDetailedActions = true;
      debugInfo.qualityCheck.activeParser = 'direct';
      chosenAPM = directParserData.apm;
      
      console.log('[ENHANCED-PARSER] ✅ Using DIRECT PARSER (realistic results)');
      this.enhanceWithDirectParserData(screpResult, directParserData);
      
      // Generate validation data
      validationData = this.generateValidationData(directParserData);
      
    } else if (nativeParserRealistic && actionData) {
      // Native parser has realistic results
      extractionMethod = 'combined';
      hasDetailedActions = true;
      debugInfo.qualityCheck.activeParser = 'native';
      chosenAPM = debugInfo.qualityCheck.apmValidation.nativeAPM;
      
      console.log('[ENHANCED-PARSER] ✅ Using NATIVE PARSER (fallback with realistic results)');
      this.enhanceWithNativeData(screpResult, actionData);
      
    } else {
      // Both parsers failed - stick with screp-js
      extractionMethod = 'screp-js';
      hasDetailedActions = false;
      debugInfo.qualityCheck.activeParser = 'screp-fallback';
      chosenAPM = screpResult.computed.apm;
      
      console.log('[ENHANCED-PARSER] ⚠️ Using SCREP-JS FALLBACK (all parsers unrealistic)');
      console.log('  - Direct realistic:', directParserRealistic);
      console.log('  - Native realistic:', nativeParserRealistic);
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
        debugInfo,
        validationData
      }
    };

    console.log('[ENHANCED-PARSER] === ENHANCED PARSING COMPLETE ===');
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
   * Enhanced validation with aggressive action count requirements
   */
  private static validateParserWithActionCount(data: {
    actions: number;
    buildOrders: number;
    apm: number[];
    gameTimeMinutes: number;
    parserName: string;
    playerActions?: any;
  }): boolean {
    console.log(`[ENHANCED-PARSER] 🔍 ENHANCED VALIDATION for ${data.parserName} parser:`);
    console.log('  - Actions:', data.actions);
    console.log('  - Build orders:', data.buildOrders);
    console.log('  - APM:', data.apm);
    console.log('  - Game time:', data.gameTimeMinutes, 'minutes');

    // Calculate minimum expected actions based on game length (aggressive)
    const minExpectedActions = Math.floor(data.gameTimeMinutes * 50); // 50 actions per minute minimum
    console.log('  - Min expected actions (aggressive):', minExpectedActions);

    // Check if we have enough total actions
    if (data.actions < minExpectedActions) {
      console.log(`  - ❌ Too few total actions (${data.actions} < ${minExpectedActions})`);
      return false;
    }

    // Check per-player action count (30+ per player minimum)
    if (data.playerActions) {
      const playerActionCounts = Object.values(data.playerActions).map((actions: any) => Array.isArray(actions) ? actions.length : 0);
      const minPerPlayer = 30;
      
      console.log('  - Per-player actions:', playerActionCounts);
      
      if (playerActionCounts.some(count => count < minPerPlayer)) {
        console.log(`  - ❌ Player with too few actions (minimum ${minPerPlayer} required)`);
        return false;
      }
    }

    // Check if APM is realistic (between 50-500)
    const hasRealisticAPM = data.apm.some(apm => apm >= 50 && apm <= 500);
    console.log('  - Realistic APM found:', hasRealisticAPM);
    
    if (!hasRealisticAPM) {
      console.log('  - ❌ No realistic APM values found (50-500 range)');
      return false;
    }

    // Check if we have meaningful build orders
    if (data.buildOrders < 5) {
      console.log(`  - ❌ Too few build orders (${data.buildOrders} < 5)`);
      return false;
    }

    console.log(`  - ✅ ${data.parserName} parser results are REALISTIC`);
    return true;
  }

  /**
   * Generate validation data for debug UI
   */
  private static generateValidationData(directData: DirectParserResult): any {
    const validationData: any = {};
    
    Object.keys(directData.playerActions).forEach(playerIdStr => {
      const playerId = parseInt(playerIdStr);
      const playerCommands = directData.playerActions[playerId] || [];
      
      // Get first 5 command IDs
      const firstCommands = playerCommands
        .slice(0, 5)
        .map(cmd => `0x${cmd.cmdId.toString(16).padStart(2, '0')}`);
      
      // Get first units (from build/train commands)
      const firstUnits = playerCommands
        .filter(cmd => cmd.unitName)
        .slice(0, 3)
        .map(cmd => cmd.unitName || 'Unknown');
      
      // Calculate realistic APM
      const validActions = playerCommands.filter(c => ![0x00, 0x01, 0x02].includes(c.cmdId));
      const lastFrame = Math.max(...playerCommands.map(c => c.frame), 0);
      const minutes = lastFrame / (24 * 60);
      const realisticAPM = minutes > 0 ? Math.round(validActions.length / minutes) : 0;
      
      validationData[playerId] = {
        detectedCommands: playerCommands.length,
        firstCommands,
        firstUnits,
        realisticAPM
      };
    });
    
    return { playersWithActions: validationData };
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
