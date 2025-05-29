/**
 * StarCraft: Remastered Enhanced Wrapper - OPTIMIZED FOR REMASTERED ONLY
 * This parser is specifically designed for StarCraft: Remastered replays
 */

import { ScrepJsWrapper } from './screpJsWrapper';
import { BWRemasteredParser } from './bwRemastered/parser';
import { RemasteredActionParser } from './remasteredActionParser';
import { DirectReplayParser } from './directReplayParser';
import { DirectParserResult } from './types';
import { EnhancedBuildOrder, BuildOrderMapper } from './buildOrderMapper';
import { EnhancedPlayerInfo } from './types';

export interface EnhancedReplayData {
  header: {
    mapName: string;
    duration: string;
    playerCount: number;
    frames: number;
    engine?: string;
    version?: string;
    startTime?: Date;
    gameType?: number;
  };
  players: EnhancedPlayerInfo[];
  computed: {
    buildOrders: Array<Array<{ frame: number; timestamp: string; action: string; supply: number; unitName?: string; category?: string }>>;
    apm: number[];
    eapm: number[];
  };
  enhanced: {
    hasDetailedActions: boolean;
    directParserData?: DirectParserResult;
    extractionMethod: 'remastered-parser' | 'remastered-action-parser' | 'direct-parser' | 'screp-js-fallback';
    extractionTime: number;
    enhancedBuildOrders?: EnhancedBuildOrder[];
    debugInfo: {
      remasteredParserSuccess: boolean;
      remasteredActionParserSuccess: boolean;
      directParserSuccess: boolean;
      screpJsSuccess: boolean;
      remasteredParserError?: string;
      remasteredActionParserError?: string;
      directParserError?: string;
      screpJsError?: string;
      actionsExtracted: number;
      buildOrdersGenerated: number;
      qualityCheck: {
        activeParser: string;
        dataQuality: 'high' | 'medium' | 'low';
        commandValidation: {
          totalCommands: number;
          expectedRange: { min: number; max: number };
          quality: 'realistic' | 'suspicious' | 'insufficient';
        };
        apmValidation: {
          remasteredAPM: number[];
          directParserAPM: number[];
          screpJsAPM: number[];
          chosenAPM: number[];
          reason: string;
        };
      };
    };
  };
}

export class EnhancedScrepWrapper {
  
  private static formatDuration(frames: number): string {
    // Remastered runs at ~23.81 FPS
    const totalSeconds = Math.floor(frames / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * REMASTERED-SPECIFIC parsing with prioritized real data extraction
   */
  static async parseReplayEnhanced(file: File): Promise<EnhancedReplayData> {
    const startTime = Date.now();
    console.log('[EnhancedScrepWrapper] ===== STARCRAFT REMASTERED PARSER =====');
    console.log('[EnhancedScrepWrapper] Starting Remastered-optimized parsing...');
    
    let remasteredParserResult: any = null;
    let remasteredActionResult: any = null;
    let directParserResult: DirectParserResult | null = null;
    let screpJsResult: any = null;
    
    let remasteredParserSuccess = false;
    let remasteredActionParserSuccess = false;
    let directParserSuccess = false;
    let screpJsSuccess = false;
    
    let remasteredParserError: string | undefined;
    let remasteredActionParserError: string | undefined;
    let directParserError: string | undefined;
    let screpJsError: string | undefined;
    
    let actionsExtracted = 0;
    let buildOrdersGenerated = 0;
    let enhancedBuildOrders: EnhancedBuildOrder[] | undefined;

    // PRIORITY 1: REMASTERED ACTION PARSER (for real actions)
    try {
      console.log('[EnhancedScrepWrapper] === TRYING REMASTERED ACTION PARSER ===');
      remasteredActionResult = await RemasteredActionParser.parseActions(file);
      remasteredActionParserSuccess = true;
      
      // USE CORRECT TOTAL ACTION COUNT
      actionsExtracted = remasteredActionResult.totalActionCount || remasteredActionResult.actions?.length || 0;
      
      console.log('[EnhancedScrepWrapper] RemasteredActionParser result:', {
        success: remasteredActionParserSuccess,
        totalActionCount: remasteredActionResult.totalActionCount,
        actionsFound: actionsExtracted,
        buildOrders: remasteredActionResult.buildOrders?.length || 0,
        frameCount: remasteredActionResult.frameCount
      });
      
      if (actionsExtracted > 50) {
        console.log('[EnhancedScrepWrapper] ✅ REMASTERED ACTION PARSER SUCCESS - REAL DATA!');
        console.log('[EnhancedScrepWrapper] EXTRACTED ACTIONS:', actionsExtracted);
      }
    } catch (error) {
      remasteredActionParserError = error instanceof Error ? error.message : 'Remastered Action Parser failed';
      console.warn('[EnhancedScrepWrapper] RemasteredActionParser failed:', remasteredActionParserError);
    }

    // PRIORITY 2: ENHANCED BW REMASTERED PARSER
    try {
      console.log('[EnhancedScrepWrapper] === TRYING BW REMASTERED PARSER ===');
      const arrayBuffer = await file.arrayBuffer();
      const remasteredParser = new BWRemasteredParser(arrayBuffer);
      remasteredParserResult = await remasteredParser.parseReplay();
      remasteredParserSuccess = true;
      
      console.log('[EnhancedScrepWrapper] BWRemasteredParser result:', {
        success: remasteredParserSuccess,
        commands: remasteredParserResult.commands?.length || 0,
        players: remasteredParserResult.players?.length || 0,
        mapName: remasteredParserResult.mapName
      });
      
      if (remasteredParserResult.commands && remasteredParserResult.commands.length > actionsExtracted) {
        console.log('[EnhancedScrepWrapper] BW REMASTERED has more commands, but keeping Remastered Action count as primary');
        // Don't override actionsExtracted from RemasteredActionParser
      }
    } catch (error) {
      remasteredParserError = error instanceof Error ? error.message : 'BW Remastered Parser failed';
      console.warn('[EnhancedScrepWrapper] BWRemasteredParser failed:', remasteredParserError);
    }

    // PRIORITY 3: DIRECT PARSER (as backup)
    try {
      console.log('[EnhancedScrepWrapper] === TRYING DIRECT PARSER ===');
      const arrayBuffer = await file.arrayBuffer();
      const directParser = new DirectReplayParser(arrayBuffer);
      directParserResult = directParser.parseReplay();
      directParserSuccess = directParserResult.success;
      
      console.log('[EnhancedScrepWrapper] DirectParser result:', {
        success: directParserSuccess,
        commands: directParserResult.commands?.length || 0,
        playerActions: Object.keys(directParserResult.playerActions || {}).length
      });
      
      // Only use direct parser if no better data available
      if (directParserSuccess && directParserResult.commands && actionsExtracted === 0) {
        actionsExtracted = directParserResult.commands.length;
        console.log('[EnhancedScrepWrapper] Using direct parser action count:', actionsExtracted);
      }
    } catch (error) {
      directParserError = error instanceof Error ? error.message : 'Direct Parser failed';
      console.warn('[EnhancedScrepWrapper] DirectParser failed:', directParserError);
    }

    // FALLBACK: SCREP-JS (header data only)
    try {
      console.log('[EnhancedScrepWrapper] === TRYING SCREP-JS FOR HEADER DATA ===');
      const screpJsWrapper = ScrepJsWrapper.getInstance();
      screpJsResult = await screpJsWrapper.parseReplay(file);
      screpJsSuccess = true;
      console.log('[EnhancedScrepWrapper] Screp-js successful for header data');
    } catch (error) {
      screpJsError = error instanceof Error ? error.message : 'Screp-js failed';
      console.warn('[EnhancedScrepWrapper] Screp-js failed:', screpJsError);
    }

    // DETERMINE BEST DATA SOURCE AND BUILD ORDERS
    let extractionMethod: 'remastered-parser' | 'remastered-action-parser' | 'direct-parser' | 'screp-js-fallback' = 'screp-js-fallback';
    let chosenAPM: number[] = [0, 0];
    let primaryResult: any = null;

    if (remasteredActionParserSuccess && actionsExtracted > 0) {
      extractionMethod = 'remastered-action-parser';
      primaryResult = remasteredActionResult;
      
      // Calculate APM based on actual action count and game duration
      const frameCount = remasteredActionResult.frameCount || 0;
      const gameMinutes = frameCount > 0 ? frameCount / 23.81 / 60 : 1;
      
      // Calculate realistic APM from actions
      const playerActionsCount = Object.entries(remasteredActionResult.playerActions || {});
      chosenAPM = playerActionsCount.map(([playerId, actions]) => {
        const actionCount = Array.isArray(actions) ? actions.length : 0;
        return gameMinutes > 0 ? Math.round(actionCount / gameMinutes) : 0;
      });
      
      // Ensure we have at least 2 players
      while (chosenAPM.length < 2) {
        chosenAPM.push(0);
      }
      
      console.log('[EnhancedScrepWrapper] Calculated realistic APM from actions:', {
        totalActions: actionsExtracted,
        gameMinutes: gameMinutes.toFixed(2),
        playerActions: playerActionsCount.map(([id, acts]) => `P${id}: ${Array.isArray(acts) ? acts.length : 0}`),
        calculatedAPM: chosenAPM
      });
      
      // Generate enhanced build orders from Remastered actions
      enhancedBuildOrders = this.generateEnhancedBuildOrdersFromRemastered(remasteredActionResult);
      buildOrdersGenerated = enhancedBuildOrders.reduce((sum, bo) => sum + bo.entries.length, 0);
      
      console.log('[EnhancedScrepWrapper] USING REMASTERED ACTION PARSER DATA');
    } else if (remasteredParserSuccess && remasteredParserResult.commands && remasteredParserResult.commands.length > 0) {
      extractionMethod = 'remastered-parser';
      primaryResult = remasteredParserResult;
      chosenAPM = this.calculateAPMFromCommands(remasteredParserResult.commands, 2);
      
      // Generate enhanced build orders from BW commands
      enhancedBuildOrders = this.generateEnhancedBuildOrdersFromBWCommands(remasteredParserResult.commands);
      buildOrdersGenerated = enhancedBuildOrders.reduce((sum, bo) => sum + bo.entries.length, 0);
      
      console.log('[EnhancedScrepWrapper] USING BW REMASTERED PARSER DATA');
    } else if (directParserSuccess && directParserResult && directParserResult.commands && directParserResult.commands.length > 0) {
      extractionMethod = 'direct-parser';
      primaryResult = directParserResult;
      chosenAPM = directParserResult.apm || [0, 0];
      
      console.log('[EnhancedScrepWrapper] USING DIRECT PARSER DATA');
    }

    console.log('[EnhancedScrepWrapper] FINAL EXTRACTION STATS:', {
      method: extractionMethod,
      realActionsExtracted: actionsExtracted,
      enhancedBuildOrdersGenerated: buildOrdersGenerated,
      chosenAPM
    });

    // CREATE DEFAULT PLAYERS IF NEEDED
    const defaultPlayers: EnhancedPlayerInfo[] = [
      { id: 0, name: 'Player 1', race: 'Unknown', team: 0, color: 0 },
      { id: 1, name: 'Player 2', race: 'Unknown', team: 1, color: 1 }
    ];

    // GET PLAYERS FROM BEST SOURCE
    let players = defaultPlayers;
    if (screpJsResult?.players) {
      players = screpJsResult.players.map((p: any, index: number) => ({
        id: index,
        name: p.name || `Player ${index + 1}`,
        race: p.race || 'Unknown',
        team: p.team || index,
        color: p.color || index
      }));
    } else if (remasteredParserResult?.players) {
      players = remasteredParserResult.players.map((p: any, index: number) => ({
        id: index,
        name: p.name || `Player ${index + 1}`,
        race: p.race || 'Unknown',
        team: p.team || index,
        color: p.color || index
      }));
    }

    const extractionTime = Date.now() - startTime;

    // QUALITY CHECK
    const qualityCheck = this.performRemasteredQualityCheck(
      actionsExtracted,
      chosenAPM,
      extractionMethod
    );

    const result: EnhancedReplayData = {
      header: {
        mapName: screpJsResult?.header?.mapName || remasteredParserResult?.mapName || 'Unknown Map',
        duration: this.formatDuration(screpJsResult?.header?.frames || remasteredParserResult?.totalFrames || remasteredActionResult?.frameCount || 0),
        playerCount: screpJsResult?.header?.playerCount || 2,
        frames: screpJsResult?.header?.frames || remasteredParserResult?.totalFrames || remasteredActionResult?.frameCount || 0,
        engine: 'Remastered',
        version: screpJsResult?.header?.version || 'Remastered',
        startTime: screpJsResult?.header?.startTime,
        gameType: screpJsResult?.header?.gameType
      },
      players,
      computed: {
        buildOrders: this.generateBasicBuildOrders(primaryResult, players.length),
        apm: chosenAPM,
        eapm: chosenAPM // For now, use same as APM
      },
      enhanced: {
        hasDetailedActions: actionsExtracted > 0,
        directParserData: directParserResult || undefined,
        extractionMethod,
        extractionTime,
        enhancedBuildOrders,
        debugInfo: {
          remasteredParserSuccess,
          remasteredActionParserSuccess,
          directParserSuccess,
          screpJsSuccess,
          remasteredParserError,
          remasteredActionParserError,
          directParserError,
          screpJsError,
          actionsExtracted, // This should now be correct
          buildOrdersGenerated,
          qualityCheck
        }
      }
    };

    console.log('[EnhancedScrepWrapper] ===== REMASTERED PARSING COMPLETE =====');
    console.log('[EnhancedScrepWrapper] Final result:', {
      extractionMethod,
      hasRealActions: result.enhanced.hasDetailedActions,
      actionsExtracted: result.enhanced.debugInfo.actionsExtracted, // Should match actionsExtracted
      buildOrdersGenerated,
      extractionTime,
      finalAPM: result.computed.apm
    });

    return result;
  }

  private static performRemasteredQualityCheck(actionsExtracted: number, apm: number[], method: string): any {
    let dataQuality: 'high' | 'medium' | 'low' = 'low';
    
    if (actionsExtracted > 1000 && method === 'remastered-action-parser') {
      dataQuality = 'high';
    } else if (actionsExtracted > 100) {
      dataQuality = 'medium';
    }

    return {
      activeParser: method,
      dataQuality,
      commandValidation: {
        totalCommands: actionsExtracted,
        expectedRange: { min: 500, max: 15000 },
        quality: actionsExtracted > 500 ? 'realistic' : 'insufficient'
      },
      apmValidation: {
        remasteredAPM: apm,
        directParserAPM: apm,
        screpJsAPM: [0, 0],
        chosenAPM: apm,
        reason: `Using ${method} APM data`
      }
    };
  }

  private static calculateAPMFromActions(actions: any[], playerCount: number): number[] {
    if (!actions || actions.length === 0) return Array(playerCount).fill(0);
    
    const playerActions: Record<number, number> = {};
    const maxFrame = Math.max(...actions.map((a: any) => a.frame));
    const gameMinutes = maxFrame / 23.81 / 60;
    
    for (const action of actions) {
      playerActions[action.playerId] = (playerActions[action.playerId] || 0) + 1;
    }
    
    return Array.from({ length: playerCount }, (_, i) => 
      gameMinutes > 0 ? Math.round((playerActions[i] || 0) / gameMinutes) : 0
    );
  }

  private static calculateAPMFromCommands(commands: any[], playerCount: number): number[] {
    if (!commands || commands.length === 0) return Array(playerCount).fill(0);
    
    const playerCommands: Record<number, number> = {};
    const maxFrame = Math.max(...commands.map((c: any) => c.frame));
    const gameMinutes = maxFrame / 23.81 / 60;
    
    for (const command of commands) {
      playerCommands[command.userId] = (playerCommands[command.userId] || 0) + 1;
    }
    
    return Array.from({ length: playerCount }, (_, i) => 
      gameMinutes > 0 ? Math.round((playerCommands[i] || 0) / gameMinutes) : 0
    );
  }

  private static generateEnhancedBuildOrdersFromRemastered(remasteredResult: any): EnhancedBuildOrder[] {
    if (!remasteredResult?.buildOrders) return [];
    
    return remasteredResult.buildOrders.map((buildOrder: any[], playerIndex: number) => ({
      playerId: playerIndex,
      entries: buildOrder.map((entry: any) => ({
        frame: entry.frame,
        time: entry.timestamp,
        action: entry.action,
        supply: entry.supply || 0,
        category: 'build'
      })),
      totalEntries: buildOrder.length,
      race: 'Unknown',
      benchmarks: [],
      efficiency: {
        economyScore: 0,
        techScore: 0,
        timingScore: 0,
        overallGrade: 'F' as const
      }
    }));
  }

  private static generateEnhancedBuildOrdersFromBWCommands(commands: any[]): EnhancedBuildOrder[] {
    const playerBuildOrders: Record<number, any[]> = {};
    
    for (const command of commands) {
      if (this.isBuildCommand(command)) {
        if (!playerBuildOrders[command.userId]) {
          playerBuildOrders[command.userId] = [];
        }
        
        playerBuildOrders[command.userId].push({
          frame: command.frame,
          time: this.frameToTimestamp(command.frame),
          action: command.typeString || 'Build Action',
          supply: 0,
          category: 'build'
        });
      }
    }
    
    return Object.entries(playerBuildOrders).map(([playerId, buildOrder]) => ({
      playerId: parseInt(playerId),
      entries: buildOrder,
      totalEntries: buildOrder.length,
      race: 'Unknown',
      benchmarks: [],
      efficiency: {
        economyScore: 0,
        techScore: 0,
        timingScore: 0,
        overallGrade: 'F' as const
      }
    }));
  }

  private static isBuildCommand(command: any): boolean {
    const buildCommandTypes = [0x0C, 0x14, 0x1D, 0x20, 0x21, 0x2F, 0x31, 0x34];
    return buildCommandTypes.includes(command.type);
  }

  private static frameToTimestamp(frame: number): string {
    const seconds = frame / 23.81;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private static generateBasicBuildOrders(primaryResult: any, playerCount: number): Array<Array<any>> {
    const buildOrders = Array.from({ length: playerCount }, () => []);
    
    if (primaryResult?.buildOrders) {
      return primaryResult.buildOrders;
    }
    
    if (primaryResult?.commands) {
      // Convert commands to build order format
      for (const command of primaryResult.commands) {
        if (command.userId < playerCount && this.isBuildCommand(command)) {
          buildOrders[command.userId].push({
            frame: command.frame,
            timestamp: this.frameToTimestamp(command.frame),
            action: command.typeString || 'Build Action',
            supply: 0
          });
        }
      }
    }
    
    return buildOrders;
  }
}
