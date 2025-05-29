
/**
 * StarCraft: Remastered Enhanced Wrapper - FIXED FRAME COUNTING
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
    extractionMethod: 'remastered-action-parser' | 'remastered-parser' | 'direct-parser' | 'screp-js-fallback';
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
      gameMinutes: number;
      realAPMCalculated: number[];
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
          chosenAPM: number[];
          reason: string;
        };
      };
    };
  };
}

export class EnhancedScrepWrapper {
  
  private static formatDuration(frames: number): string {
    const totalSeconds = Math.floor(frames / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * REMASTERED-OPTIMIZED parsing mit korrekter Frame-Zählung
   */
  static async parseReplayEnhanced(file: File): Promise<EnhancedReplayData> {
    const startTime = Date.now();
    console.log('[EnhancedScrepWrapper] ===== REMASTERED PARSER - FRAME CORRECTED VERSION =====');
    
    let remasteredActionResult: any = null;
    let screpJsResult: any = null;
    
    let remasteredActionParserSuccess = false;
    let screpJsSuccess = false;
    
    let remasteredActionParserError: string | undefined;
    let screpJsError: string | undefined;
    
    let realActionsExtracted = 0;
    let realAPM: number[] = [0, 0];
    let gameMinutes = 0;
    let correctedFrameCount = 0;

    // PRIORITÄT 1: SCREP-JS für korrekte Frame-Zählung und Header
    try {
      console.log('[EnhancedScrepWrapper] === GETTING REFERENCE DATA FROM SCREP-JS ===');
      const screpJsWrapper = ScrepJsWrapper.getInstance();
      screpJsResult = await screpJsWrapper.parseReplay(file);
      screpJsSuccess = true;
      
      // Verwende die KORREKTE Frame-Anzahl von screp-js
      correctedFrameCount = screpJsResult?.header?.frames || 0;
      console.log('[EnhancedScrepWrapper] Screp-js reference data successful, frames:', correctedFrameCount);
    } catch (error) {
      screpJsError = error instanceof Error ? error.message : 'Screp-js failed';
      console.warn('[EnhancedScrepWrapper] Screp-js failed:', screpJsError);
    }

    // PRIORITÄT 2: REMASTERED ACTION PARSER mit Frame-Korrektur
    try {
      console.log('[EnhancedScrepWrapper] === USING CORRECTED REMASTERED ACTION PARSER ===');
      remasteredActionResult = await RemasteredActionParser.parseActions(file);
      remasteredActionParserSuccess = true;
      
      // Korrigiere die Frame-Zählung wenn screp-js erfolgreich war
      if (screpJsSuccess && correctedFrameCount > 0) {
        console.log('[EnhancedScrepWrapper] Correcting frame count from', remasteredActionResult.frameCount, 'to', correctedFrameCount);
        
        // Recalculate with corrected frame count
        const correctedGameMinutes = correctedFrameCount / 23.81 / 60;
        const correctedAPM = this.recalculateAPM(remasteredActionResult.playerActions, correctedGameMinutes);
        
        remasteredActionResult.frameCount = correctedFrameCount;
        remasteredActionResult.gameMinutes = correctedGameMinutes;
        remasteredActionResult.realAPM = correctedAPM;
        
        console.log('[EnhancedScrepWrapper] Frame-corrected results:', {
          originalFrames: remasteredActionResult.frameCount,
          correctedFrames: correctedFrameCount,
          correctedMinutes: correctedGameMinutes.toFixed(2),
          correctedAPM: correctedAPM
        });
      }
      
      realActionsExtracted = remasteredActionResult.totalActionCount;
      realAPM = remasteredActionResult.realAPM;
      gameMinutes = remasteredActionResult.gameMinutes;
      
      console.log('[EnhancedScrepWrapper] ✅ REMASTERED ACTION PARSER SUCCESS');
      console.log('[EnhancedScrepWrapper] Real actions extracted:', realActionsExtracted);
      console.log('[EnhancedScrepWrapper] Corrected APM calculated:', realAPM);
      console.log('[EnhancedScrepWrapper] Corrected game minutes:', gameMinutes.toFixed(2));
      
    } catch (error) {
      remasteredActionParserError = error instanceof Error ? error.message : 'Remastered Action Parser failed';
      console.error('[EnhancedScrepWrapper] RemasteredActionParser failed:', remasteredActionParserError);
    }

    // BESTIMME EXTRACTION METHOD
    let extractionMethod: 'remastered-action-parser' | 'remastered-parser' | 'direct-parser' | 'screp-js-fallback' = 'screp-js-fallback';
    
    if (remasteredActionParserSuccess && realActionsExtracted > 0) {
      extractionMethod = 'remastered-action-parser';
      console.log('[EnhancedScrepWrapper] ✅ USING CORRECTED REMASTERED ACTION PARSER DATA');
    }

    // ERSTELLE SPIELER-DATEN
    const defaultPlayers: EnhancedPlayerInfo[] = [
      { id: 0, name: 'Player 1', race: 'Unknown', team: 0, color: 0 },
      { id: 1, name: 'Player 2', race: 'Unknown', team: 1, color: 1 }
    ];

    let players = defaultPlayers;
    if (screpJsResult?.players && screpJsResult.players.length >= 2) {
      players = screpJsResult.players.map((p: any, index: number) => ({
        id: index,
        name: p.name || `Player ${index + 1}`,
        race: p.race || 'Unknown',
        team: p.team || index,
        color: p.color || index
      }));
    }

    // GENERIERE BUILD ORDERS
    let enhancedBuildOrders: EnhancedBuildOrder[] | undefined;
    let buildOrdersGenerated = 0;
    
    if (remasteredActionParserSuccess && remasteredActionResult.buildOrders) {
      enhancedBuildOrders = this.generateEnhancedBuildOrdersFromRemastered(remasteredActionResult);
      buildOrdersGenerated = enhancedBuildOrders.reduce((sum, bo) => sum + bo.entries.length, 0);
    }

    const extractionTime = Date.now() - startTime;

    // QUALITY CHECK mit korrigierten Daten
    const qualityCheck = this.performRemasteredQualityCheck(
      realActionsExtracted,
      realAPM,
      extractionMethod,
      gameMinutes
    );

    // Verwende die korrekte Frame-Anzahl für Header
    const finalFrameCount = correctedFrameCount || remasteredActionResult?.frameCount || 0;

    const result: EnhancedReplayData = {
      header: {
        mapName: screpJsResult?.header?.mapName || 'Unknown Map',
        duration: this.formatDuration(finalFrameCount),
        playerCount: players.length,
        frames: finalFrameCount, // Korrekte Frame-Anzahl
        engine: 'Remastered',
        version: screpJsResult?.header?.version || 'Remastered',
        startTime: screpJsResult?.header?.startTime,
        gameType: screpJsResult?.header?.gameType
      },
      players,
      computed: {
        buildOrders: this.generateBasicBuildOrders(remasteredActionResult, players.length),
        apm: realAPM.slice(0, players.length), // Korrigierte APM
        eapm: realAPM.slice(0, players.length)
      },
      enhanced: {
        hasDetailedActions: realActionsExtracted > 0,
        extractionMethod,
        extractionTime,
        enhancedBuildOrders,
        debugInfo: {
          remasteredParserSuccess: false,
          remasteredActionParserSuccess,
          directParserSuccess: false,
          screpJsSuccess,
          remasteredActionParserError,
          screpJsError,
          actionsExtracted: realActionsExtracted,
          buildOrdersGenerated,
          gameMinutes,
          realAPMCalculated: realAPM,
          qualityCheck
        }
      }
    };

    console.log('[EnhancedScrepWrapper] ===== FINAL CORRECTED RESULT =====');
    console.log('[EnhancedScrepWrapper] Success! Corrected data:', {
      extractionMethod,
      realActionsExtracted,
      correctedAPM: realAPM,
      correctedGameMinutes: gameMinutes.toFixed(2),
      correctedFrames: finalFrameCount,
      playersFound: players.length,
      mapName: result.header.mapName
    });

    return result;
  }

  /**
   * Neuberechnung der APM mit korrigierter Spielzeit
   */
  private static recalculateAPM(playerActions: Record<number, any[]>, gameMinutes: number): number[] {
    const apm: number[] = [];
    
    // APM-relevante Commands (ohne Sync)
    const APM_RELEVANT_COMMANDS = [
      0x09, 0x0A, 0x0B, 0x0C, 0x10, 0x11, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
      0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25,
      0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31,
      0x32, 0x33, 0x34, 0x35
    ];
    
    for (let playerId = 0; playerId < 8; playerId++) {
      const actions = playerActions[playerId] || [];
      
      const apmActions = actions.filter(action => 
        APM_RELEVANT_COMMANDS.includes(action.actionId)
      );
      
      const playerAPM = gameMinutes > 0 ? Math.round(apmActions.length / gameMinutes) : 0;
      apm.push(playerAPM);
    }
    
    return apm;
  }

  private static performRemasteredQualityCheck(
    actionsExtracted: number, 
    apm: number[], 
    method: string,
    gameMinutes: number
  ): any {
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
        quality: actionsExtracted > 500 ? 'realistic' : actionsExtracted > 100 ? 'suspicious' : 'insufficient'
      },
      apmValidation: {
        remasteredAPM: apm,
        chosenAPM: apm,
        reason: `Calculated from ${actionsExtracted} real actions over ${gameMinutes.toFixed(2)} minutes with frame correction`
      }
    };
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

  private static generateBasicBuildOrders(remasteredResult: any, playerCount: number): Array<Array<any>> {
    if (remasteredResult?.buildOrders) {
      return remasteredResult.buildOrders.map((buildOrder: any[]) => 
        buildOrder.map((entry: any) => ({
          frame: entry.frame,
          timestamp: entry.timestamp,
          action: entry.action,
          supply: entry.supply || 0
        }))
      );
    }
    
    return Array.from({ length: playerCount }, () => []);
  }
}
