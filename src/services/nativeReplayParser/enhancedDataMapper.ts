/**
 * Enhanced Data Mapper - Complete screp Integration
 * Now uses the full screp-compatible parsing pipeline
 */

import { EnhancedCommandExtractor } from './enhancedCommandExtractor';
import { SCCommandInterpreter } from './scCommandInterpreter';
import { RepFormat, RACE_NAMES, PLAYER_COLORS, framesToTimeString } from './repcore/constants';

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
      const gameplayAnalysis = this.analyzeGameplay(interpretedCommands, extractionResult.eapmData);
      
      // Calculate data quality
      const dataQuality = this.calculateDataQuality(extractionResult, interpretedCommands);
      
      const result: EnhancedReplayResult = {
        header,
        players,
        commands: extractionResult.commands,
        interpretedCommands,
        enhancedBuildOrders: buildOrders,
        gameplayAnalysis,
        dataQuality,
        
        // Additional screp data
        format: extractionResult.format,
        sections: extractionResult.sections,
        eapmData: extractionResult.eapmData
      };
      
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
      gameDuration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      gameDurationMS: gameDuration * 1000,
      totalFrames,
      startTime: replayHeader.startTime,
      title: replayHeader.title,
      mapWidth: replayHeader.mapWidth,
      mapHeight: replayHeader.mapHeight,
      speed: replayHeader.speed,
      host: replayHeader.host,
      engine: replayHeader.engine,
      
      // Enhanced fields
      frameRate: 23.81,
      version: this.getVersionFromFormat(RepFormat.Modern121), // Updated based on format
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
        id: slot.id,
        name: slot.name || `Player ${slot.id + 1}`,
        race: RACE_NAMES[slot.race] || 'Unknown',
        team: slot.team,
        color: slot.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        type: this.getPlayerTypeName(slot.type),
        
        // Enhanced stats
        apm,
        eapm,
        efficiency: playerCommands.length > 0 ? Math.round((effectiveCommands.length / playerCommands.length) * 100) : 0,
        commandsTotal: playerCommands.length,
        commandsEffective: effectiveCommands.length,
        
        // Additional screp data
        slotId: slot.slotId,
        rawData: slot
      };
    });
  }

  /**
   * Interpret commands using enhanced interpreter
   */
  private static interpretCommands(commands: any[]): any[] {
    return commands.map(cmd => 
      SCCommandInterpreter.interpretCommand({
        frame: cmd.frame,
        playerId: cmd.playerId,
        commandName: cmd.commandName,
        parameters: cmd.parameters
      }, [])
    );
  }

  /**
   * Calculate enhanced data quality
   */
  private static calculateDataQuality(extractionResult: any, interpretedCommands: any[]): any {
    const totalCommands = extractionResult.commands.length;
    const effectiveCommands = extractionResult.eapmData.totalEffective;
    const parseErrors = extractionResult.parseErrors;
    
    // Calculate reliability score
    let reliability: 'excellent' | 'good' | 'fair' | 'poor';
    const errorRate = totalCommands > 0 ? parseErrors / totalCommands : 0;
    const efficiency = extractionResult.eapmData.efficiency;
    
    if (errorRate < 0.01 && efficiency > 80 && totalCommands > 500) {
      reliability = 'excellent';
    } else if (errorRate < 0.05 && efficiency > 60 && totalCommands > 200) {
      reliability = 'good';
    } else if (errorRate < 0.10 && totalCommands > 50) {
      reliability = 'fair';
    } else {
      reliability = 'poor';
    }
    
    return {
      reliability,
      commandsExtracted: totalCommands,
      commandsEffective: effectiveCommands,
      parseErrors,
      errorRate: Math.round(errorRate * 100),
      efficiency,
      source: 'Enhanced screp-compatible parser',
      format: this.getFormatName(extractionResult.format),
      
      // Detailed metrics
      sections: extractionResult.sections.length,
      sectionsParsed: extractionResult.sections.filter(s => s.data.length > 0).length,
      compressionDetected: extractionResult.sections.some(s => s.compressed),
      modernSections: extractionResult.sections.filter(s => s.id > 4).length
    };
  }

  /**
   * Berechne erweiterte Metriken mit EAPM und Effectiveness
   */
  private static calculateEnhancedMetrics(
    interpretedCommands: Record<number, InterpretedCommand[]>, 
    screpResult: any,
    realCommands: any[]
  ): Record<number, any> {
    console.log('[EnhancedDataMapper.calculateEnhancedMetrics] RepCore enhanced calculation');
    
    const gameMinutes = screpResult.header.frames / 23.81 / 60;
    const metrics: Record<number, any> = {};
    
    // Use screp-js APM if available, enhance with our EAPM
    if (screpResult.computed?.apm) {
      console.log('[EnhancedDataMapper.calculateEnhancedMetrics] Using screp-js APM with RepCore EAPM');
      
      screpResult.players.forEach((player: any, index: number) => {
        const playerCommands = interpretedCommands[index] || [];
        const playerRealCommands = realCommands.filter(cmd => cmd.playerId === index);
        
        // Calculate EAPM using RepCore logic
        const eapmResult = calculateEAPM(playerRealCommands, screpResult.header.frames || 0);
        
        const apm = screpResult.computed.apm[index] || 0;
        const realActions = Math.round(apm * gameMinutes);
        
        metrics[index] = {
          apm,
          eapm: eapmResult.eapm,
          realActions,
          effectiveActions: eapmResult.totalEffective,
          buildOrderTiming: this.calculateBuildOrderTiming(playerCommands),
          microIntensity: this.calculateMicroIntensity(playerCommands, gameMinutes),
          spamPercentage: eapmResult.totalCommands > 0 ? 
            Math.round(((eapmResult.totalCommands - eapmResult.totalEffective) / eapmResult.totalCommands) * 100) : 0,
          efficiency: eapmResult.efficiency
        };
        
        console.log(`[EnhancedDataMapper] RepCore Player ${index}:`, {
          apm: metrics[index].apm,
          eapm: metrics[index].eapm,
          efficiency: metrics[index].efficiency
        });
      });
      
      return metrics;
    }
    
    // Fallback calculation with RepCore EAPM
    Object.entries(interpretedCommands).forEach(([playerIdStr, playerCommands]) => {
      const playerId = parseInt(playerIdStr);
      const playerRealCommands = realCommands.filter(cmd => cmd.playerId === playerId);
      
      const eapmResult = calculateEAPM(playerRealCommands, screpResult.header.frames);
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
   * Berechne Build Order Timing
   */
  private static calculateBuildOrderTiming(playerCommands: InterpretedCommand[]): number {
    const firstTrain = playerCommands.find(cmd => 
      cmd.actionType === 'train' && !cmd.ineffective
    );
    return firstTrain ? firstTrain.frame / 23.81 : 0;
  }

  /**
   * Berechne Micro-Intensität
   */
  private static calculateMicroIntensity(playerCommands: InterpretedCommand[], gameMinutes: number): number {
    const microActions = playerCommands.filter(cmd => 
      cmd.isMicroAction && !cmd.ineffective
    );
    return Math.round(microActions.length / gameMinutes);
  }

  /**
   * Generiere erweiterte Build Orders mit Effectiveness
   */
  private static generateEnhancedBuildOrders(
    interpretedCommands: Record<number, InterpretedCommand[]>, 
    screpResult: any
  ): Record<number, any[]> {
    console.log('[EnhancedDataMapper.generateEnhancedBuildOrders] Enhanced with effectiveness analysis');
    
    const buildOrders: Record<number, any[]> = {};
    
    if (Object.keys(interpretedCommands).length > 0) {
      Object.entries(interpretedCommands).forEach(([playerIdStr, commands]) => {
        const playerId = parseInt(playerIdStr);
        
        const gameplayAnalysis = SCCommandInterpreter.analyzeGameplay(commands);
        
        buildOrders[playerId] = gameplayAnalysis.buildOrder.map(entry => ({
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
    
    if (screpResult.computed?.buildOrders) {
      screpResult.computed.buildOrders.forEach((bo: any[], index: number) => {
        buildOrders[index] = bo.map((item: any) => ({
          time: item.timestamp || '0:00',
          action: item.action || 'Unknown',
          supply: item.supply || 0,
          unitName: 'Unknown',
          category: 'build',
          effective: true
        }));
      });
    }
    
    return buildOrders;
  }

  /**
   * Generiere umfassende Gameplay-Analyse mit Command Coverage
   */
  private static generateComprehensiveGameplayAnalysis(
    interpretedCommands: Record<number, InterpretedCommand[]>,
    metrics: Record<number, any>,
    realCommands: any[],
    screpResult: any
  ): Record<number, any> {
    console.log('[EnhancedDataMapper.generateComprehensiveGameplayAnalysis] Comprehensive analysis with coverage');
    
    const analysis: Record<number, any> = {};
    
    Object.entries(metrics).forEach(([playerIdStr, metric]) => {
      const playerId = parseInt(playerIdStr);
      const playerCommands = interpretedCommands[playerId] || [];
      
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
      
      const playerRealCommands = realCommands.filter(cmd => cmd.playerId === playerId);
      const recognizedCommands = playerCommands.length;
      const commandCoverage = {
        recognized: recognizedCommands,
        total: playerRealCommands.length,
        coverage: playerRealCommands.length > 0 ? 
          Math.round((recognizedCommands / playerRealCommands.length) * 100) : 0
      };
      
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const recommendations: string[] = [];
      
      // RepCore EAPM-based analysis
      if (metric.eapm > 80) {
        strengths.push('Hohe effektive APM (RepCore EAPM)');
      } else if (metric.eapm < 40) {
        weaknesses.push('Niedrige effektive APM');
        recommendations.push('Reduziere Spam-Aktionen, fokussiere auf sinnvolle Commands');
      }
      
      if (metric.efficiency > 80) {
        strengths.push('Sehr effiziente Command-Nutzung (RepCore)');
      } else if (metric.efficiency < 60) {
        weaknesses.push('Viele ineffektive Commands');
        recommendations.push('Vermeide zu schnelle Wiederholungen (IneffKind-Analyse)');
      }
      
      analysis[playerId] = {
        playstyle,
        apmBreakdown,
        microEvents,
        economicEfficiency,
        commandCoverage,
        strengths,
        weaknesses,
        recommendations
      };
    });
    
    return analysis;
  }

  // Helper Methods
  private static estimateSupply(frame: number, playerCommands: any[]): number {
    // Vereinfachte Supply-Schätzung
    const relevantCommands = playerCommands.filter(cmd => cmd.frame <= frame);
    return Math.max(9, Math.floor(relevantCommands.length / 3) + 9);
  }

  private static getUnitName(command: any): string {
    if (command.parameters?.unitType) {
      const unitMap: Record<number, string> = {
        0: 'Marine', 7: 'SCV', 64: 'Probe', 43: 'Drone',
        106: 'Command Center', 154: 'Nexus', 131: 'Hatchery'
      };
      return unitMap[command.parameters.unitType] || 'Unknown Unit';
    }
    return 'Unknown';
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

  private static getPlayerTypeName(playerType: number): string {
    const playerTypes: Record<number, string> = {
      0: 'Inactive',
      1: 'Human',
      2: 'Computer',
      3: 'Neutral',
      4: 'Closed',
      5: 'Observer',
      6: 'User',
      7: 'Open'
    };
    return playerTypes[playerType] || 'Unknown';
  }

  private static getVersionFromFormat(format: RepFormat): string {
    switch (format) {
      case RepFormat.Legacy: return 'Pre-1.18';
      case RepFormat.Modern: return '1.18-1.20';
      case RepFormat.Modern121: return '1.21+';
      default: return 'Unknown';
    }
  }

  private static getFormatName(format: RepFormat): string {
    switch (format) {
      case RepFormat.Legacy: return 'Legacy PKWARE';
      case RepFormat.Modern: return 'Modern zlib';
      case RepFormat.Modern121: return 'Modern 1.21+ Enhanced';
      default: return 'Unknown Format';
    }
  }
}
