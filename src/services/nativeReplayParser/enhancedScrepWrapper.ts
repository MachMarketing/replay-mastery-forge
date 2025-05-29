
/**
 * StarCraft: Remastered Enhanced Wrapper - FIXED APM AND ACTION COUNTING
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
   * REMASTERED-OPTIMIZED parsing mit korrekter APM
   */
  static async parseReplayEnhanced(file: File): Promise<EnhancedReplayData> {
    const startTime = Date.now();
    console.log('[EnhancedScrepWrapper] ===== REMASTERED PARSER - FIXED VERSION =====');
    
    // Verwende AUSSCHLIESSLICH den RemasteredActionParser für echte Daten
    let remasteredActionResult: any = null;
    let screpJsResult: any = null;
    
    let remasteredActionParserSuccess = false;
    let screpJsSuccess = false;
    
    let remasteredActionParserError: string | undefined;
    let screpJsError: string | undefined;
    
    let realActionsExtracted = 0;
    let realAPM: number[] = [0, 0];
    let gameMinutes = 0;

    // PRIORITÄT 1: REMASTERED ACTION PARSER (echte Daten)
    try {
      console.log('[EnhancedScrepWrapper] === USING REMASTERED ACTION PARSER ===');
      remasteredActionResult = await RemasteredActionParser.parseActions(file);
      remasteredActionParserSuccess = true;
      
      // Verwende die KORREKTEN Zahlen
      realActionsExtracted = remasteredActionResult.totalActionCount;
      realAPM = remasteredActionResult.realAPM || [0, 0];
      gameMinutes = remasteredActionResult.gameMinutes || 0;
      
      console.log('[EnhancedScrepWrapper] ✅ REMASTERED ACTION PARSER SUCCESS');
      console.log('[EnhancedScrepWrapper] Real actions extracted:', realActionsExtracted);
      console.log('[EnhancedScrepWrapper] Real APM calculated:', realAPM);
      console.log('[EnhancedScrepWrapper] Game minutes:', gameMinutes.toFixed(2));
      
    } catch (error) {
      remasteredActionParserError = error instanceof Error ? error.message : 'Remastered Action Parser failed';
      console.error('[EnhancedScrepWrapper] RemasteredActionParser failed:', remasteredActionParserError);
    }

    // FALLBACK: SCREP-JS für Header-Daten
    try {
      console.log('[EnhancedScrepWrapper] === GETTING HEADER DATA FROM SCREP-JS ===');
      const screpJsWrapper = ScrepJsWrapper.getInstance();
      screpJsResult = await screpJsWrapper.parseReplay(file);
      screpJsSuccess = true;
      console.log('[EnhancedScrepWrapper] Screp-js header data successful');
    } catch (error) {
      screpJsError = error instanceof Error ? error.message : 'Screp-js failed';
      console.warn('[EnhancedScrepWrapper] Screp-js failed:', screpJsError);
    }

    // BESTIMME EXTRACTION METHOD
    let extractionMethod: 'remastered-action-parser' | 'remastered-parser' | 'direct-parser' | 'screp-js-fallback' = 'screp-js-fallback';
    
    if (remasteredActionParserSuccess && realActionsExtracted > 0) {
      extractionMethod = 'remastered-action-parser';
      console.log('[EnhancedScrepWrapper] ✅ USING REMASTERED ACTION PARSER DATA');
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

    // QUALITY CHECK mit echten Daten
    const qualityCheck = this.performRemasteredQualityCheck(
      realActionsExtracted,
      realAPM,
      extractionMethod,
      gameMinutes
    );

    const result: EnhancedReplayData = {
      header: {
        mapName: screpJsResult?.header?.mapName || 'Unknown Map',
        duration: this.formatDuration(screpJsResult?.header?.frames || remasteredActionResult?.frameCount || 0),
        playerCount: players.length,
        frames: screpJsResult?.header?.frames || remasteredActionResult?.frameCount || 0,
        engine: 'Remastered',
        version: screpJsResult?.header?.version || 'Remastered',
        startTime: screpJsResult?.header?.startTime,
        gameType: screpJsResult?.header?.gameType
      },
      players,
      computed: {
        buildOrders: this.generateBasicBuildOrders(remasteredActionResult, players.length),
        apm: realAPM.slice(0, players.length), // Verwende die ECHTE APM
        eapm: realAPM.slice(0, players.length) // Für jetzt gleich wie APM
      },
      enhanced: {
        hasDetailedActions: realActionsExtracted > 0,
        extractionMethod,
        extractionTime,
        enhancedBuildOrders,
        debugInfo: {
          remasteredParserSuccess: false, // Wir verwenden nur Action Parser
          remasteredActionParserSuccess,
          directParserSuccess: false,
          screpJsSuccess,
          remasteredActionParserError,
          screpJsError,
          actionsExtracted: realActionsExtracted, // ECHTE Zahl
          buildOrdersGenerated,
          gameMinutes,
          realAPMCalculated: realAPM,
          qualityCheck
        }
      }
    };

    console.log('[EnhancedScrepWrapper] ===== FINAL REMASTERED RESULT =====');
    console.log('[EnhancedScrepWrapper] Success! Real data extracted:', {
      extractionMethod,
      realActionsExtracted,
      realAPM,
      gameMinutes: gameMinutes.toFixed(2),
      playersFound: players.length,
      mapName: result.header.mapName
    });

    return result;
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
        reason: `Calculated from ${actionsExtracted} real actions over ${gameMinutes.toFixed(2)} minutes`
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
