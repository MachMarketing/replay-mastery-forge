
/**
 * Enhanced Data Mapper - Complete screp Integration
 * Now uses the full screp-compatible parsing pipeline
 */

import { EnhancedCommandExtractor } from './enhancedCommandExtractor';
import { SCCommandInterpreter, InterpretedCommand } from './scCommandInterpreter';
import { RepFormat, RACE_NAMES, PLAYER_COLORS, framesToTimeString } from './repcore/constants';
import { calculateEAPM } from './repcore/ineffKind';

export interface EnhancedReplayResult {
  // Basis-Daten von screp-js
  header: {
    mapName: string;
    duration: string;
    frames: number;
    gameType: string;
    startTime: Date;
  };
  players: Array<{
    name: string;
    race: string;
    team: number;
    color: number;
  }>;
  
  // Erweiterte Daten aus Hex-Analyse
  realCommands: any[];
  interpretedCommands: Record<number, InterpretedCommand[]>;
  realMetrics: Record<number, {
    apm: number;
    eapm: number;
    realActions: number;
    effectiveActions: number;
    buildOrderTiming: number;
    microIntensity: number;
    spamPercentage: number;
    efficiency: number;
  }>;
  
  // Intelligente Build Orders
  enhancedBuildOrders: Record<number, Array<{
    time: string;
    action: string;
    supply: number;
    unitName: string;
    category: 'build' | 'train' | 'tech' | 'upgrade';
    cost?: { minerals: number; gas: number };
    effective: boolean;
  }>>;
  
  // Gameplay-Analyse mit EAPM
  gameplayAnalysis: Record<number, {
    playstyle: 'aggressive' | 'defensive' | 'economic' | 'tech-focused';
    apmBreakdown: {
      economic: number;
      micro: number;
      selection: number;
      spam: number;
      effective: number;
    };
    microEvents: Array<{
      time: string;
      action: string;
      intensity: number;
    }>;
    economicEfficiency: number;
    commandCoverage: {
      recognized: number;
      total: number;
      coverage: number;
    };
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }>;
  
  dataQuality: {
    source: 'enhanced' | 'screp-js-only';
    commandsExtracted: number;
    interpretedCommands: number;
    effectiveCommands: number;
    reliability: 'high' | 'medium' | 'low';
    eapmCalculated: boolean;
  };
}

export class EnhancedDataMapper {
  /**
   * Main parsing entry point with complete screp integration
   */
  static async parseReplay(file: File): Promise<EnhancedReplayResult> {
    console.log('[EnhancedDataMapper] Starting complete screp-compatible parsing');
    console.log('[EnhancedDataMapper] File:', file.name, file.size, 'bytes');
    
    try {
      const buffer = await file.arrayBuffer();
      
      // Use Enhanced Command Extractor with complete screp pipeline
      const extractor = new EnhancedCommandExtractor(buffer);
      const extractionResult = await extractor.extractCommands();
      
      console.log('[EnhancedDataMapper] Extraction result:', {
        format: extractionResult.format,
        commands: extractionResult.commands.length,
        totalFrames: extractionResult.totalFrames,
        eapm: extractionResult.eapmData.eapm,
        efficiency: extractionResult.eapmData.efficiency,
        parseErrors: extractionResult.parseErrors
      });
      
      // Build enhanced result
      const header = this.buildEnhancedHeader(extractionResult.header, extractionResult.totalFrames);
      const players = this.buildEnhancedPlayers(extractionResult.header.players, extractionResult.commands);
      const interpretedCommands = this.interpretCommands(extractionResult.commands);
      const buildOrders = this.buildEnhancedBuildOrders(interpretedCommands, players);
      const realMetrics = this.calculateEnhancedMetrics(interpretedCommands, extractionResult, extractionResult.commands);
      const gameplayAnalysis = this.analyzeGameplay(interpretedCommands, extractionResult.eapmData);
      
      // Calculate data quality
      const dataQuality = this.calculateDataQuality(extractionResult, interpretedCommands);
      
      const result: EnhancedReplayResult = {
        header,
        players,
        realCommands: extractionResult.commands,
        interpretedCommands,
        realMetrics,
        enhancedBuildOrders: buildOrders,
        gameplayAnalysis,
        dataQuality,
        
        // Additional screp data
        format: extractionResult.format,
        sections: extractionResult.sections,
        eapmData: extractionResult.eapmData
      } as any;
      
      console.log('[EnhancedDataMapper] Complete parsing finished successfully');
      return result;
      
    } catch (error) {
      console.error('[EnhancedDataMapper] Parsing failed:', error);
      throw new Error(`Enhanced parsing failed: ${error}`);
    }
  }

  /**
   * Build enhanced header with screp data
   */
  private static buildEnhancedHeader(replayHeader: any, totalFrames: number): any {
    const gameDuration = Math.floor(totalFrames / 23.81); // Exact SC:R frame rate
    const minutes = Math.floor(gameDuration / 60);
    const seconds = gameDuration % 60;
    
    return {
      mapName: replayHeader.map || 'Unknown Map',
      gameType: this.getGameTypeName(replayHeader.type),
      duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      frames: totalFrames,
      startTime: replayHeader.startTime || new Date(),
      
      // Enhanced fields
      frameRate: 23.81,
      version: this.getVersionFromFormat(RepFormat.Modern121),
      remastered: true
    };
  }

  /**
   * Build enhanced players with screp data
   */
  private static buildEnhancedPlayers(playerSlots: any[], commands: any[]): any[] {
    return playerSlots.map((slot, index) => {
      const playerCommands = commands.filter(cmd => cmd.playerId === slot.id);
      const effectiveCommands = playerCommands.filter(cmd => cmd.effective);
      
      // Calculate APM and EAPM
      const gameMinutes = Math.max(...commands.map(c => c.frame)) / 23.81 / 60;
      const apm = gameMinutes > 0 ? Math.round(playerCommands.length / gameMinutes) : 0;
      const eapm = gameMinutes > 0 ? Math.round(effectiveCommands.length / gameMinutes) : 0;
      
      return {
        name: slot.name || `Player ${slot.id + 1}`,
        race: RACE_NAMES[slot.race] || 'Unknown',
        team: slot.team,
        color: slot.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        
        // Enhanced stats
        apm,
        eapm,
        efficiency: playerCommands.length > 0 ? Math.round((effectiveCommands.length / playerCommands.length) * 100) : 0
      };
    });
  }

  /**
   * Interpret commands using enhanced interpreter
   */
  private static interpretCommands(commands: any[]): Record<number, InterpretedCommand[]> {
    const result: Record<number, InterpretedCommand[]> = {};
    
    commands.forEach(cmd => {
      const interpreted = SCCommandInterpreter.interpretCommand({
        frame: cmd.frame,
        playerId: cmd.playerId,
        commandName: cmd.commandName,
        parameters: cmd.parameters
      }, []);
      
      if (!result[cmd.playerId]) {
        result[cmd.playerId] = [];
      }
      result[cmd.playerId].push(interpreted);
    });
    
    return result;
  }

  /**
   * Calculate enhanced metrics with EAPM
   */
  private static calculateEnhancedMetrics(
    interpretedCommands: Record<number, InterpretedCommand[]>, 
    extractionResult: any,
    realCommands: any[]
  ): Record<number, any> {
    console.log('[EnhancedDataMapper] Calculating enhanced metrics with EAPM');
    
    const gameMinutes = extractionResult.totalFrames / 23.81 / 60;
    const metrics: Record<number, any> = {};
    
    Object.entries(interpretedCommands).forEach(([playerIdStr, playerCommands]) => {
      const playerId = parseInt(playerIdStr);
      const playerRealCommands = realCommands.filter(cmd => cmd.playerId === playerId);
      
      const eapmResult = calculateEAPM(playerRealCommands, extractionResult.totalFrames);
      const apm = Math.round(eapmResult.totalCommands / gameMinutes);
      
      metrics[playerId] = {
        apm,
        eapm: eapmResult.eapm,
        realActions: eapmResult.totalCommands,
        effectiveActions: eapmResult.totalEffective,
        buildOrderTiming: this.calculateBuildOrderTiming(playerCommands),
        microIntensity: this.calculateMicroIntensity(playerCommands, gameMinutes),
        spamPercentage: Math.round(((eapmResult.totalCommands - eapmResult.totalEffective) / eapmResult.totalCommands) * 100),
        efficiency: eapmResult.efficiency
      };
    });
    
    return metrics;
  }

  /**
   * Build enhanced build orders
   */
  private static buildEnhancedBuildOrders(
    interpretedCommands: Record<number, InterpretedCommand[]>, 
    players: any[]
  ): Record<number, any[]> {
    const buildOrders: Record<number, any[]> = {};
    
    Object.entries(interpretedCommands).forEach(([playerIdStr, commands]) => {
      const playerId = parseInt(playerIdStr);
      
      const gameplayAnalysis = SCCommandInterpreter.analyzeGameplay(commands);
      
      buildOrders[playerId] = gameplayAnalysis.buildOrder.map((entry: any) => ({
        time: entry.time,
        action: entry.action,
        supply: entry.supply,
        unitName: entry.unit,
        category: this.categorizeBuildAction(entry.action),
        cost: entry.cost,
        effective: true
      }));
    });
    
    return buildOrders;
  }

  /**
   * Analyze gameplay with comprehensive analysis
   */
  private static analyzeGameplay(
    interpretedCommands: Record<number, InterpretedCommand[]>,
    eapmData: any
  ): Record<number, any> {
    const analysis: Record<number, any> = {};
    
    Object.entries(interpretedCommands).forEach(([playerIdStr, playerCommands]) => {
      const playerId = parseInt(playerIdStr);
      
      let gameplayAnalysis: any = {};
      let apmBreakdown = { economic: 0, micro: 0, selection: 0, spam: 0, effective: 0 };
      let microEvents: any[] = [];
      let economicEfficiency = 0;
      let playstyle: string = 'balanced';
      
      if (playerCommands.length > 0) {
        gameplayAnalysis = SCCommandInterpreter.analyzeGameplay(playerCommands);
        apmBreakdown = gameplayAnalysis.apmBreakdown;
        microEvents = gameplayAnalysis.microEvents;
        economicEfficiency = gameplayAnalysis.economicEfficiency;
        playstyle = gameplayAnalysis.playstyle;
      }
      
      const commandCoverage = {
        recognized: playerCommands.length,
        total: playerCommands.length,
        coverage: 100
      };
      
      analysis[playerId] = {
        playstyle,
        apmBreakdown,
        microEvents,
        economicEfficiency,
        commandCoverage,
        strengths: [],
        weaknesses: [],
        recommendations: []
      };
    });
    
    return analysis;
  }

  /**
   * Calculate data quality
   */
  private static calculateDataQuality(extractionResult: any, interpretedCommands: Record<number, InterpretedCommand[]>): any {
    const totalCommands = extractionResult.commands.length;
    const effectiveCommands = extractionResult.eapmData.totalEffective;
    const parseErrors = extractionResult.parseErrors;
    
    // Calculate reliability score
    let reliability: 'high' | 'medium' | 'low';
    const errorRate = totalCommands > 0 ? parseErrors / totalCommands : 0;
    const efficiency = extractionResult.eapmData.efficiency;
    
    if (errorRate < 0.01 && efficiency > 80 && totalCommands > 500) {
      reliability = 'high';
    } else if (errorRate < 0.05 && efficiency > 60 && totalCommands > 200) {
      reliability = 'medium';
    } else {
      reliability = 'low';
    }
    
    return {
      reliability,
      commandsExtracted: totalCommands,
      interpretedCommands: Object.values(interpretedCommands).reduce((sum, cmds) => sum + cmds.length, 0),
      effectiveCommands,
      source: 'enhanced',
      eapmCalculated: true
    };
  }

  // Helper Methods
  private static calculateBuildOrderTiming(playerCommands: InterpretedCommand[]): number {
    const firstTrain = playerCommands.find(cmd => 
      cmd.actionType === 'train' && !cmd.ineffective
    );
    return firstTrain ? firstTrain.frame / 23.81 : 0;
  }

  private static calculateMicroIntensity(playerCommands: InterpretedCommand[], gameMinutes: number): number {
    const microActions = playerCommands.filter(cmd => 
      cmd.isMicroAction && !cmd.ineffective
    );
    return Math.round(microActions.length / gameMinutes);
  }

  private static categorizeBuildAction(actionName: string): 'build' | 'train' | 'tech' | 'upgrade' {
    if (actionName.includes('Build')) return 'build';
    if (actionName.includes('Train')) return 'train';
    if (actionName.includes('Research')) return 'tech';
    if (actionName.includes('Upgrade')) return 'upgrade';
    return 'build';
  }

  private static getGameTypeName(gameType: number): string {
    const gameTypes: Record<number, string> = {
      1: 'Melee',
      2: 'Free For All',
      3: 'One on One',
      8: 'Ladder',
      9: 'Use Map Settings',
      10: 'Team Melee',
      15: 'Top vs Bottom'
    };
    return gameTypes[gameType] || 'Unknown';
  }

  private static getVersionFromFormat(format: RepFormat): string {
    switch (format) {
      case RepFormat.Legacy: return 'Pre-1.18';
      case RepFormat.Modern: return '1.18-1.20';
      case RepFormat.Modern121: return '1.21+';
      default: return 'Unknown';
    }
  }
}
