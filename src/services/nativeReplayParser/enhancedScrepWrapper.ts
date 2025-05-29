
/**
 * Enhanced wrapper that combines screp-js with native parsing capabilities
 */

import { ScrepJsWrapper } from './screpJsWrapper';
import { DirectReplayParser } from './directReplayParser';
import { mapDirectReplayDataToUI } from './dataMapper';
import { DirectParserResult } from './types';
import { EnhancedBuildOrder } from './buildOrderMapper';
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
    extractionMethod: 'screp-js' | 'native-parser' | 'direct-parser' | 'combined';
    extractionTime: number;
    enhancedBuildOrders?: EnhancedBuildOrder[];
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
        activeParser: string;
        dataQuality: 'high' | 'medium' | 'low';
        commandValidation: {
          totalCommands: number;
          expectedRange: { min: number; max: number };
          quality: 'realistic' | 'suspicious' | 'insufficient';
        };
        apmValidation: {
          screpJsAPM: number[];
          nativeParserAPM: number[];
          directParserAPM: number[];
          chosenAPM: number[];
          reason: string;
        };
      };
    };
    validationData?: {
      playersWithActions: Record<number, {
        detectedCommands: number;
        buildOrderItems: number;
        firstUnits: string[];
        apm: number;
        eapm: number;
        quality: string;
        buildActionsCount: number;
        race: string;
        efficiencyGrade: string;
        benchmarksPassed: number;
      }>;
      gameMetrics: {
        duration: string;
        totalCommands: number;
        averageAPM: number;
        commandQuality: string;
        expectedCommandRange: { min: number; max: number };
        buildOrdersFound: number;
      };
      enhancedFeatures: {
        commandIdMapping: boolean;
        raceDetection: string[];
        buildOrderBenchmarks: number[];
        efficiencyGrades: string[];
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
  
  private static performQualityCheck(screpJsResult: any, nativeParserResult: any, directParserResult: DirectParserResult | null): any {
    const screpJsAPM = screpJsResult?.computed?.apm || [0, 0];
    const nativeParserAPM = nativeParserResult?.computed?.apm || [0, 0];
    const directParserAPM = directParserResult?.apm || [0, 0];
    
    let chosenAPM = [...screpJsAPM];
    let activeParser = 'screp-js';
    let reason = 'Defaulting to screp-js data';
    
    if (directParserResult?.success && directParserResult?.commands?.length > 10) {
      chosenAPM = [...directParserAPM];
      activeParser = 'direct-parser';
      reason = 'Direct parser has valid command data';
    } else if (screpJsAPM.every((apm: number) => apm === 0) && nativeParserAPM.some((apm: number) => apm > 0)) {
      chosenAPM = [...nativeParserAPM];
      activeParser = 'native-parser';
      reason = 'Screp-js APM is zero, using native parser data';
    }
    
    const totalCommands = directParserResult?.commands?.length || 0;
    const gameDurationMinutes = (directParserResult?.totalFrames || 0) / 23.81 / 60;
    
    const commandValidation = this.validateCommandCount(totalCommands, gameDurationMinutes, chosenAPM.length);
    
    return {
      activeParser,
      dataQuality: commandValidation.quality === 'realistic' ? 'high' : 'medium',
      commandValidation,
      apmValidation: {
        screpJsAPM,
        nativeParserAPM,
        directParserAPM,
        chosenAPM,
        reason
      }
    };
  }
  
  static validateCommandCount(totalCommands: number, gameDurationMinutes: number, playerCount: number): {
    expectedRange: { min: number; max: number };
    quality: 'realistic' | 'suspicious' | 'insufficient';
  } {
    const expectedCommandsPerMinute = 40 * playerCount;
    const expectedTotalCommands = expectedCommandsPerMinute * gameDurationMinutes;
    
    const rangePercentage = 0.2;
    const range = expectedTotalCommands * rangePercentage;
    
    const minCommands = expectedTotalCommands - range;
    const maxCommands = expectedTotalCommands + range;
    
    let quality: 'realistic' | 'suspicious' | 'insufficient' = 'realistic';
    
    if (totalCommands < minCommands * 0.7 || totalCommands > maxCommands * 1.3) {
      quality = 'insufficient';
    } else if (totalCommands < minCommands || totalCommands > maxCommands) {
      quality = 'suspicious';
    }
    
    return {
      expectedRange: { min: Math.round(minCommands), max: Math.round(maxCommands) },
      quality
    };
  }
  
  static async parseReplayEnhanced(file: File): Promise<EnhancedReplayData> {
    const startTime = Date.now();
    console.log('[EnhancedScrepWrapper] Starting enhanced replay parsing...');
    
    let screpJsResult: any = null;
    let nativeParserResult: any = null;
    let directParserResult: DirectParserResult | null = null;
    
    let screpJsSuccess = false;
    let nativeParserSuccess = false;
    let directParserSuccess = false;
    
    let screpJsError: string | undefined;
    let nativeParserError: string | undefined;
    let directParserError: string | undefined;
    
    // Try screp-js first - using the singleton pattern
    try {
      const screpJsWrapper = ScrepJsWrapper.getInstance();
      screpJsResult = await screpJsWrapper.parseReplay(file);
      screpJsSuccess = true;
      console.log('[EnhancedScrepWrapper] Screp-js parsing successful');
    } catch (error) {
      screpJsError = error instanceof Error ? error.message : 'Unknown screp-js error';
      console.warn('[EnhancedScrepWrapper] Screp-js parsing failed:', screpJsError);
    }
    
    // Try direct parser - using instance method
    try {
      const arrayBuffer = await file.arrayBuffer();
      const directParser = new DirectReplayParser(arrayBuffer);
      directParserResult = directParser.parseReplay();
      directParserSuccess = directParserResult.success;
      console.log('[EnhancedScrepWrapper] Direct parser result:', {
        success: directParserSuccess,
        commands: directParserResult.commands?.length || 0,
        players: Object.keys(directParserResult.playerActions || {}).length
      });
    } catch (error) {
      directParserError = error instanceof Error ? error.message : 'Unknown direct parser error';
      console.warn('[EnhancedScrepWrapper] Direct parser failed:', directParserError);
    }
    
    // Quality check and choose best data source
    const qualityCheck = this.performQualityCheck(screpJsResult, nativeParserResult, directParserResult);
    
    // Build the enhanced result
    const extractionTime = Date.now() - startTime;
    
    let enhancedBuildOrders: EnhancedBuildOrder[] | undefined;
    let mappedData: any = null;
    
    // Get enhanced build orders from direct parser if available
    if (directParserResult && directParserSuccess) {
      mappedData = mapDirectReplayDataToUI(directParserResult);
      enhancedBuildOrders = mappedData.enhanced.enhancedBuildOrders;
    }

    // Create default players if screp-js failed
    const defaultPlayers: EnhancedPlayerInfo[] = [
      { id: 0, name: 'Player 1', race: 'Unknown', team: 0, color: 0 },
      { id: 1, name: 'Player 2', race: 'Unknown', team: 1, color: 1 }
    ];
    
    const result: EnhancedReplayData = {
      header: {
        mapName: screpJsResult?.header?.mapName || 'Unknown Map',
        duration: this.formatDuration(screpJsResult?.header?.frames || directParserResult?.totalFrames || 0),
        playerCount: screpJsResult?.header?.playerCount || 2,
        frames: screpJsResult?.header?.frames || directParserResult?.totalFrames || 0,
        engine: screpJsResult?.header?.engine,
        version: screpJsResult?.header?.version,
        startTime: screpJsResult?.header?.startTime,
        gameType: screpJsResult?.header?.gameType
      },
      players: screpJsResult?.players?.map((p: any, index: number) => ({
        id: index,
        name: p.name || `Player ${index + 1}`,
        race: p.race || 'Unknown',
        team: p.team || index,
        color: p.color || index
      })) || defaultPlayers,
      computed: {
        buildOrders: mappedData?.buildOrders || [[], []],
        apm: qualityCheck.apmValidation.chosenAPM,
        eapm: directParserResult?.eapm || [0, 0]
      },
      enhanced: {
        hasDetailedActions: directParserSuccess && (directParserResult?.commands?.length || 0) > 0,
        directParserData: directParserResult || undefined,
        extractionMethod: qualityCheck.activeParser as any,
        extractionTime,
        enhancedBuildOrders,
        debugInfo: {
          screpJsSuccess,
          nativeParserSuccess,
          directParserSuccess,
          screpJsError,
          nativeParserError,
          directParserError,
          actionsExtracted: directParserResult?.commands?.length || 0,
          buildOrdersGenerated: mappedData?.enhanced?.buildOrdersGenerated || 0,
          qualityCheck
        },
        validationData: mappedData?.enhanced?.validationData
      }
    };
    
    console.log('[EnhancedScrepWrapper] Enhanced parsing completed:', {
      extractionTime,
      hasDetailedActions: result.enhanced.hasDetailedActions,
      enhancedBuildOrdersCount: enhancedBuildOrders?.length || 0,
      activeParser: qualityCheck.activeParser
    });
    
    return result;
  }
}
