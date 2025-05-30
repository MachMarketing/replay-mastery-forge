/**
 * Enhanced Data Mapper with RepCore integration and accurate EAPM
 */

import { ScrepJsWrapper } from './screpJsWrapper';
import { EnhancedCommandExtractor } from './enhancedCommandExtractor';
import { SCCommandInterpreter, InterpretedCommand } from './scCommandInterpreter';
import { getRaceName, getGameTypeName, framesToTimeString } from './bwRemastered/enhancedConstants';
import { calculateEAPM, IneffKind, isEffective } from './bwRemastered/repcore/ineffKind';

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
   * Enhanced Parser with RepCore integration and accurate EAPM
   */
  static async parseReplay(file: File): Promise<EnhancedReplayResult> {
    console.log('[EnhancedDataMapper] === ENHANCED SC:R PARSING WITH REPCORE ===');
    console.log('[EnhancedDataMapper] RepCore integration: Race mapping, GameType mapping, Frame timing');
    
    // 1. screp-js for base data
    const screpWrapper = ScrepJsWrapper.getInstance();
    const screpResult = await screpWrapper.parseReplay(file);
    
    console.log('[EnhancedDataMapper] screp-js completed with RepCore enhancements:', {
      map: screpResult.header.mapName,
      players: screpResult.players.length,
      gameType: getGameTypeName(typeof screpResult.header.gameType === 'string' ? 0 : screpResult.header.gameType || 0),
      duration: framesToTimeString(screpResult.header.frames || 0)
    });
    
    let realCommands: any[] = [];
    let interpretedCommands: Record<number, InterpretedCommand[]> = {};
    let dataQuality: any = {
      source: 'screp-js-only',
      commandsExtracted: 0,
      interpretedCommands: 0,
      effectiveCommands: 0,
      reliability: 'medium',
      eapmCalculated: false
    };
    
    // 2. Enhanced command extraction with EAPM
    try {
      console.log('[EnhancedDataMapper] === STARTING REPCORE COMMAND EXTRACTION ===');
      const arrayBuffer = await file.arrayBuffer();
      
      const commandExtractor = new EnhancedCommandExtractor(arrayBuffer);
      realCommands = commandExtractor.extractRealCommands();
      
      console.log('[EnhancedDataMapper] === REPCORE EXTRACTION RESULT ===');
      console.log('[EnhancedDataMapper] Enhanced commands with EAPM:', realCommands.length);
      
      if (realCommands.length > 0) {
        console.log('[EnhancedDataMapper] === EAPM ANALYSIS WITH INEFFKIND ===');
        
        // Group by player and analyze EAPM
        const playerCommandsRaw: Record<number, any[]> = {};
        realCommands.forEach(cmd => {
          if (!playerCommandsRaw[cmd.playerId]) {
            playerCommandsRaw[cmd.playerId] = [];
          }
          playerCommandsRaw[cmd.playerId].push(cmd);
        });
        
        // Enhanced interpretation with EAPM analysis
        Object.entries(playerCommandsRaw).forEach(([playerIdStr, commands]) => {
          const playerId = parseInt(playerIdStr);
          interpretedCommands[playerId] = [];
          
          // Sort by frame for proper EAPM analysis
          commands.sort((a, b) => (a.frame || 0) - (b.frame || 0));
          
          // Calculate EAPM using RepCore logic
          const eapmResult = calculateEAPM(commands, screpResult.header.frames || 0);
          
          // Create interpreted commands with effectiveness
          commands.forEach(cmd => {
            const interpreted = SCCommandInterpreter.interpretCommand(cmd, interpretedCommands[playerId]);
            interpreted.ineffective = !cmd.effective;
            interpreted.ineffectiveReason = cmd.ineffectiveReason;
            interpretedCommands[playerId].push(interpreted);
          });
          
          console.log(`[EnhancedDataMapper] Player ${playerId} RepCore EAPM:`, {
            eapm: eapmResult.eapm,
            efficiency: eapmResult.efficiency,
            effective: eapmResult.totalEffective,
            total: eapmResult.totalCommands
          });
        });
        
        const totalInterpreted = Object.values(interpretedCommands).reduce((sum, cmds) => sum + cmds.length, 0);
        const totalEffective = realCommands.filter(cmd => cmd.effective).length;
        
        if (realCommands.length > 50) {
          dataQuality = {
            source: 'enhanced',
            commandsExtracted: realCommands.length,
            interpretedCommands: totalInterpreted,
            effectiveCommands: totalEffective,
            reliability: realCommands.length > 200 ? 'high' : 'medium',
            eapmCalculated: true
          };
          console.log('[EnhancedDataMapper] ✅ RepCore enhanced extraction successful:', {
            commands: realCommands.length,
            effective: totalEffective,
            eapmEnabled: true
          });
        }
      }
    } catch (error) {
      console.error('[EnhancedDataMapper] ❌ Enhanced extraction failed:', error);
      console.log('[EnhancedDataMapper] Falling back to screp-js only');
    }
    
    // 3. Calculate enhanced metrics with RepCore
    console.log('[EnhancedDataMapper] === CALCULATING REPCORE METRICS ===');
    const realMetrics = this.calculateEnhancedMetrics(interpretedCommands, screpResult, realCommands);
    
    // 4. Generate enhanced build orders
    const enhancedBuildOrders = this.generateEnhancedBuildOrders(interpretedCommands, screpResult);
    
    // 5. Create comprehensive analysis
    const gameplayAnalysis = this.generateComprehensiveGameplayAnalysis(interpretedCommands, realMetrics, realCommands, screpResult);
    
    const finalResult = {
      header: {
        mapName: screpResult.header.mapName,
        duration: framesToTimeString(screpResult.header.frames || 0),
        frames: screpResult.header.frames,
        gameType: getGameTypeName(typeof screpResult.header.gameType === 'string' ? 0 : screpResult.header.gameType || 0),
        startTime: screpResult.header.startTime
      },
      players: screpResult.players.map((p: any, i: number) => ({
        name: p.name,
        race: getRaceName(p.race),
        team: p.team || i,
        color: p.color || i
      })),
      realCommands,
      interpretedCommands,
      realMetrics,
      enhancedBuildOrders,
      gameplayAnalysis,
      dataQuality
    };
    
    console.log('[EnhancedDataMapper] === REPCORE ENHANCED PARSING COMPLETE ===');
    console.log('[EnhancedDataMapper] Final RepCore result:', {
      players: finalResult.players.length,
      realCommands: finalResult.realCommands.length,
      eapmCalculated: finalResult.dataQuality.eapmCalculated,
      dataSource: finalResult.dataQuality.source,
      gameType: finalResult.header.gameType
    });
    
    return finalResult;
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
        const eapmResult = calculateEAPM(playerRealCommands, screpResult.header.frames);
        
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
}
