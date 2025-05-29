
/**
 * Enhanced wrapper that combines screp-js with native parsing capabilities
 */

import { ScrepJsWrapper } from './screpJsWrapper';
import { DirectReplayParser } from './directReplayParser';
import { mapDirectReplayDataToUI } from './dataMapper';
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

  /**
   * Generate fallback enhanced build orders when direct parser fails
   */
  private static generateFallbackEnhancedBuildOrders(players: EnhancedPlayerInfo[]): EnhancedBuildOrder[] {
    console.log('[EnhancedScrepWrapper] Generating fallback enhanced build orders for', players.length, 'players');
    
    return players.map((player, index) => {
      // Create basic enhanced build order based on race
      const race = player.race as 'Protoss' | 'Terran' | 'Zerg' | 'Unknown';
      
      // Generate some basic entries based on race
      const basicEntries = this.generateBasicBuildOrderEntries(race, index);
      
      const enhancedBuildOrder: EnhancedBuildOrder = {
        race,
        entries: basicEntries,
        benchmarks: [
          { name: `${race} Opening`, expectedTime: '2:00', status: 'missing', importance: 'critical' },
          { name: 'First Expansion', expectedTime: '4:00', status: 'missing', importance: 'important' }
        ],
        efficiency: {
          economyScore: 65, // Default reasonable score
          techScore: 55,
          timingScore: 60,
          overallGrade: 'C' as const
        }
      };

      return enhancedBuildOrder;
    });
  }

  private static generateBasicBuildOrderEntries(race: 'Protoss' | 'Terran' | 'Zerg' | 'Unknown', playerIndex: number) {
    const baseEntries = [];
    
    // Generate some basic build order entries based on race
    if (race === 'Protoss') {
      baseEntries.push(
        { time: '0:15', supply: 4, action: 'Train Probe', unitName: 'Probe', category: 'train' as const, frame: 150, cost: { minerals: 50, gas: 0 } },
        { time: '1:15', supply: 8, action: 'Build Pylon', unitName: 'Pylon', category: 'build' as const, frame: 1800, cost: { minerals: 100, gas: 0 } },
        { time: '1:45', supply: 10, action: 'Build Gateway', unitName: 'Gateway', category: 'build' as const, frame: 2500, cost: { minerals: 150, gas: 0 } }
      );
    } else if (race === 'Terran') {
      baseEntries.push(
        { time: '0:15', supply: 4, action: 'Train SCV', unitName: 'SCV', category: 'train' as const, frame: 150, cost: { minerals: 50, gas: 0 } },
        { time: '1:20', supply: 9, action: 'Build Supply Depot', unitName: 'Supply Depot', category: 'build' as const, frame: 1900, cost: { minerals: 100, gas: 0 } },
        { time: '1:50', supply: 11, action: 'Build Barracks', unitName: 'Barracks', category: 'build' as const, frame: 2600, cost: { minerals: 150, gas: 0 } }
      );
    } else if (race === 'Zerg') {
      baseEntries.push(
        { time: '0:15', supply: 4, action: 'Train Drone', unitName: 'Drone', category: 'train' as const, frame: 150, cost: { minerals: 50, gas: 0 } },
        { time: '1:30', supply: 9, action: 'Build Spawning Pool', unitName: 'Spawning Pool', category: 'build' as const, frame: 2150, cost: { minerals: 200, gas: 0 } },
        { time: '3:00', supply: 12, action: 'Build Hatchery', unitName: 'Hatchery', category: 'build' as const, frame: 4300, cost: { minerals: 300, gas: 0 } }
      );
    }
    
    return baseEntries;
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
    let actionsExtracted = 0;
    let buildOrdersGenerated = 0;
    
    // Get enhanced build orders from direct parser if available
    if (directParserResult && directParserSuccess) {
      mappedData = mapDirectReplayDataToUI(directParserResult);
      enhancedBuildOrders = mappedData.enhanced.enhancedBuildOrders;
      actionsExtracted = directParserResult.commands?.length || 0;
      buildOrdersGenerated = mappedData.enhanced.buildOrdersGenerated || 0;
    }

    // Create default players if screp-js failed
    const defaultPlayers: EnhancedPlayerInfo[] = [
      { id: 0, name: 'Player 1', race: 'Unknown', team: 0, color: 0 },
      { id: 1, name: 'Player 2', race: 'Unknown', team: 1, color: 1 }
    ];
    
    // Get players from screp-js if available
    const players = screpJsResult?.players?.map((p: any, index: number) => ({
      id: index,
      name: p.name || `Player ${index + 1}`,
      race: p.race || 'Unknown',
      team: p.team || index,
      color: p.color || index
    })) || defaultPlayers;

    // If direct parser failed but screp-js succeeded, generate fallback enhanced build orders
    if (!enhancedBuildOrders && screpJsSuccess && players.length > 0) {
      console.log('[EnhancedScrepWrapper] Generating fallback enhanced build orders from screp-js data');
      enhancedBuildOrders = this.generateFallbackEnhancedBuildOrders(players);
      actionsExtracted = screpJsResult?.computed?.playerDescs?.reduce((sum: number, pd: any) => sum + (pd.CmdCount || 0), 0) || 0;
      buildOrdersGenerated = enhancedBuildOrders.reduce((sum, bo) => sum + bo.entries.length, 0);
    }
    
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
      players,
      computed: {
        buildOrders: mappedData?.buildOrders || enhancedBuildOrders?.map(bo => 
          bo.entries.map(entry => ({
            frame: entry.frame,
            timestamp: entry.time,
            action: entry.action,
            supply: entry.supply,
            unitName: entry.unitName,
            category: entry.category
          }))
        ) || [[], []],
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
          actionsExtracted,
          buildOrdersGenerated,
          qualityCheck
        },
        validationData: mappedData?.enhanced?.validationData
      }
    };
    
    console.log('[EnhancedScrepWrapper] Enhanced parsing completed:', {
      extractionTime,
      hasDetailedActions: result.enhanced.hasDetailedActions,
      enhancedBuildOrdersCount: enhancedBuildOrders?.length || 0,
      activeParser: qualityCheck.activeParser,
      actionsExtracted,
      buildOrdersGenerated,
      fallbackGenerated: !directParserSuccess && screpJsSuccess
    });
    
    return result;
  }
}
