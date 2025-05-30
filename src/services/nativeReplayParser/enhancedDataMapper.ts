/**
 * Enhanced Data Mapper - Verbindet screp-js mit SC:R-spezifischer Hex-Command-Analyse
 * Now with EAPM and enhanced command classification
 */

import { ScrepJsWrapper } from './screpJsWrapper';
import { EnhancedCommandExtractor } from './enhancedCommandExtractor';
import { SCCommandInterpreter, InterpretedCommand } from './scCommandInterpreter';

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
   * DER EINZIGE PARSER - Kombiniert screp-js + SC:R-spezifische Hex-Analyse mit EAPM
   */
  static async parseReplay(file: File): Promise<EnhancedReplayResult> {
    console.log('[EnhancedDataMapper] === STARTING ENHANCED SC:R PARSING ===');
    console.log('[EnhancedDataMapper] File size:', file.size, 'bytes');
    console.log('[EnhancedDataMapper] Enhanced features: EAPM, Command Coverage, Build Order Analysis');
    
    // 1. screp-js für Basis-Daten (immer zuerst!)
    const screpWrapper = ScrepJsWrapper.getInstance();
    const screpResult = await screpWrapper.parseReplay(file);
    
    console.log('[EnhancedDataMapper] screp-js completed:', {
      map: screpResult.header.mapName,
      players: screpResult.players.length,
      duration: screpResult.header.duration,
      frames: screpResult.header.frames
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
    
    // 2. Versuche SC:R-spezifische Command-Extraktion
    try {
      console.log('[EnhancedDataMapper] === STARTING ENHANCED COMMAND EXTRACTION ===');
      const arrayBuffer = await file.arrayBuffer();
      
      const commandExtractor = new EnhancedCommandExtractor(arrayBuffer);
      realCommands = commandExtractor.extractRealCommands();
      
      console.log('[EnhancedDataMapper] === ENHANCED EXTRACTION RESULT ===');
      console.log('[EnhancedDataMapper] Commands found:', realCommands.length);
      
      if (realCommands.length > 0) {
        console.log('[EnhancedDataMapper] === INTERPRETING WITH EAPM ANALYSIS ===');
        
        // Interpretiere Commands zu verständlichen Aktionen mit EAPM
        const playerCommandsRaw: Record<number, any[]> = {};
        realCommands.forEach(cmd => {
          if (!playerCommandsRaw[cmd.playerId]) {
            playerCommandsRaw[cmd.playerId] = [];
          }
          playerCommandsRaw[cmd.playerId].push(cmd);
        });
        
        // Sortiere Commands nach Frame für EAPM-Analyse
        Object.values(playerCommandsRaw).forEach(commands => {
          commands.sort((a, b) => (a.frame || 0) - (b.frame || 0));
        });
        
        // Interpretiere Commands für jeden Spieler mit EAPM
        Object.entries(playerCommandsRaw).forEach(([playerIdStr, commands]) => {
          const playerId = parseInt(playerIdStr);
          interpretedCommands[playerId] = [];
          
          // Sequenzielle Interpretation für EAPM-Berechnung
          commands.forEach(cmd => {
            const interpreted = SCCommandInterpreter.interpretCommand(
              cmd, 
              interpretedCommands[playerId]
            );
            interpretedCommands[playerId].push(interpreted);
          });
          
          const totalCommands = interpretedCommands[playerId].length;
          const effectiveCommands = interpretedCommands[playerId].filter(cmd => !cmd.ineffective).length;
          
          console.log(`[EnhancedDataMapper] Player ${playerId} EAPM Analysis:`, {
            total: totalCommands,
            effective: effectiveCommands,
            effectiveness: totalCommands > 0 ? Math.round((effectiveCommands / totalCommands) * 100) : 0,
            sampleIneffective: interpretedCommands[playerId]
              .filter(cmd => cmd.ineffective)
              .slice(0, 3)
              .map(cmd => `${cmd.actionName} (${cmd.ineffectiveReason})`)
          });
        });
        
        const totalInterpreted = Object.values(interpretedCommands).reduce((sum, cmds) => sum + cmds.length, 0);
        const totalEffective = Object.values(interpretedCommands).reduce(
          (sum, cmds) => sum + cmds.filter(cmd => !cmd.ineffective).length, 0
        );
        
        if (realCommands.length > 50) {
          dataQuality = {
            source: 'enhanced',
            commandsExtracted: realCommands.length,
            interpretedCommands: totalInterpreted,
            effectiveCommands: totalEffective,
            reliability: realCommands.length > 200 ? 'high' : 'medium',
            eapmCalculated: true
          };
          console.log('[EnhancedDataMapper] ✅ Enhanced extraction with EAPM successful:', {
            commands: realCommands.length,
            effective: totalEffective,
            effectiveness: totalInterpreted > 0 ? Math.round((totalEffective / totalInterpreted) * 100) : 0
          });
        }
      }
    } catch (error) {
      console.error('[EnhancedDataMapper] ❌ Enhanced extraction failed:', error);
      console.log('[EnhancedDataMapper] Using screp-js only mode');
    }
    
    // 3. Berechne erweiterte Metriken mit EAPM
    console.log('[EnhancedDataMapper] === CALCULATING ENHANCED METRICS ===');
    const realMetrics = this.calculateEnhancedMetrics(interpretedCommands, screpResult);
    console.log('[EnhancedDataMapper] Enhanced metrics calculated for', Object.keys(realMetrics).length, 'players');
    
    // 4. Generiere intelligente Build Orders mit Effectiveness
    console.log('[EnhancedDataMapper] === GENERATING ENHANCED BUILD ORDERS ===');
    const enhancedBuildOrders = this.generateEnhancedBuildOrders(interpretedCommands, screpResult);
    console.log('[EnhancedDataMapper] Enhanced build orders generated for', Object.keys(enhancedBuildOrders).length, 'players');
    
    // 5. Erstelle erweiterte Gameplay-Analyse mit Command Coverage
    console.log('[EnhancedDataMapper] === GENERATING COMPREHENSIVE ANALYSIS ===');
    const gameplayAnalysis = this.generateComprehensiveGameplayAnalysis(interpretedCommands, realMetrics, realCommands, screpResult);
    console.log('[EnhancedDataMapper] Comprehensive analysis generated for', Object.keys(gameplayAnalysis).length, 'players');
    
    const finalResult = {
      header: {
        mapName: screpResult.header.mapName,
        duration: screpResult.header.duration,
        frames: screpResult.header.frames,
        gameType: screpResult.header.gameType,
        startTime: screpResult.header.startTime
      },
      players: screpResult.players.map((p: any, i: number) => ({
        name: p.name,
        race: p.race,
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
    
    console.log('[EnhancedDataMapper] === ENHANCED SC:R PARSING COMPLETE ===');
    console.log('[EnhancedDataMapper] Final enhanced result:', {
      players: finalResult.players.length,
      realCommands: finalResult.realCommands.length,
      interpretedCommands: Object.keys(finalResult.interpretedCommands).length,
      quality: finalResult.dataQuality.reliability,
      eapmEnabled: finalResult.dataQuality.eapmCalculated,
      dataSource: finalResult.dataQuality.source
    });
    
    return finalResult;
  }

  /**
   * Berechne erweiterte Metriken mit EAPM und Effectiveness
   */
  private static calculateEnhancedMetrics(
    interpretedCommands: Record<number, InterpretedCommand[]>, 
    screpResult: any
  ): Record<number, any> {
    console.log('[EnhancedDataMapper.calculateEnhancedMetrics] Enhanced calculation with EAPM');
    
    const gameMinutes = screpResult.header.frames / 23.81 / 60;
    const metrics: Record<number, any> = {};
    
    // WICHTIG: Verwende IMMER screp-js APM-Daten wenn verfügbar!
    if (screpResult.computed?.apm && screpResult.computed?.eapm) {
      console.log('[EnhancedDataMapper.calculateEnhancedMetrics] Using screp-js APM with enhanced analysis');
      
      screpResult.players.forEach((player: any, index: number) => {
        const playerCommands = interpretedCommands[index] || [];
        const effectiveCommands = playerCommands.filter(cmd => !cmd.ineffective);
        const spamCommands = playerCommands.filter(cmd => cmd.priority === 'spam');
        
        const apm = screpResult.computed.apm[index] || 0;
        const realActions = Math.round(apm * gameMinutes);
        
        // Enhanced EAPM von eigener Analyse
        const enhancedEapm = playerCommands.length > 0 ? 
          Math.round(effectiveCommands.length / gameMinutes) : 0;
        
        metrics[index] = {
          apm,
          eapm: enhancedEapm, // Verwende unsere EAPM-Berechnung
          realActions,
          effectiveActions: effectiveCommands.length,
          buildOrderTiming: this.calculateBuildOrderTiming(playerCommands),
          microIntensity: this.calculateMicroIntensity(playerCommands, gameMinutes),
          spamPercentage: playerCommands.length > 0 ? 
            Math.round((spamCommands.length / playerCommands.length) * 100) : 0,
          efficiency: playerCommands.length > 0 ? 
            Math.round((effectiveCommands.length / playerCommands.length) * 100) : 0
        };
        
        console.log(`[EnhancedDataMapper.calculateEnhancedMetrics] Enhanced Player ${index}:`, {
          apm: metrics[index].apm,
          eapm: metrics[index].eapm,
          efficiency: metrics[index].efficiency,
          spamPercentage: metrics[index].spamPercentage
        });
      });
      
      return metrics;
    }
    
    // Fallback zu eigener Berechnung
    console.log('[EnhancedDataMapper.calculateEnhancedMetrics] Using enhanced fallback calculation');
    
    Object.entries(interpretedCommands).forEach(([playerIdStr, playerCommands]) => {
      const playerId = parseInt(playerIdStr);
      const effectiveCommands = playerCommands.filter(cmd => !cmd.ineffective);
      const spamCommands = playerCommands.filter(cmd => cmd.priority === 'spam');
      
      const realActions = playerCommands.length;
      const apm = Math.round(realActions / gameMinutes);
      const eapm = Math.round(effectiveCommands.length / gameMinutes);
      
      metrics[playerId] = {
        apm,
        eapm,
        realActions,
        effectiveActions: effectiveCommands.length,
        buildOrderTiming: this.calculateBuildOrderTiming(playerCommands),
        microIntensity: this.calculateMicroIntensity(playerCommands, gameMinutes),
        spamPercentage: realActions > 0 ? Math.round((spamCommands.length / realActions) * 100) : 0,
        efficiency: realActions > 0 ? Math.round((effectiveCommands.length / realActions) * 100) : 0
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
        
        // Analysiere Gameplay für intelligente Build Order
        const gameplayAnalysis = SCCommandInterpreter.analyzeGameplay(commands);
        
        buildOrders[playerId] = gameplayAnalysis.buildOrder.map(entry => ({
          time: entry.time,
          action: entry.action,
          supply: entry.supply,
          unitName: entry.unit,
          category: this.categorizeBuildAction(entry.action),
          cost: entry.cost,
          effective: true // Alle Build Order Entries sind per Definition effektiv
        }));
        
        console.log(`[EnhancedDataMapper.generateEnhancedBuildOrders] Player ${playerId}: ${buildOrders[playerId].length} enhanced build entries`);
      });
      
      return buildOrders;
    }
    
    // Fallback zu screp-js Build Orders
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
      
      // Enhanced Analyse wenn Commands verfügbar
      if (playerCommands.length > 0) {
        gameplayAnalysis = SCCommandInterpreter.analyzeGameplay(playerCommands);
        apmBreakdown = gameplayAnalysis.apmBreakdown;
        microEvents = gameplayAnalysis.microEvents;
        economicEfficiency = gameplayAnalysis.economicEfficiency;
        playstyle = gameplayAnalysis.playstyle;
      }
      
      // Command Coverage Analysis
      const playerRealCommands = realCommands.filter(cmd => cmd.playerId === playerId);
      const recognizedCommands = playerCommands.length;
      const commandCoverage = {
        recognized: recognizedCommands,
        total: playerRealCommands.length,
        coverage: playerRealCommands.length > 0 ? 
          Math.round((recognizedCommands / playerRealCommands.length) * 100) : 0
      };
      
      // Enhanced Strengths/Weaknesses/Recommendations
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const recommendations: string[] = [];
      
      // EAPM-basierte Analyse
      if (metric.eapm > 80) {
        strengths.push('Hohe effektive APM (EAPM)');
      } else if (metric.eapm < 40) {
        weaknesses.push('Niedrige effektive APM');
        recommendations.push('Reduziere Spam-Aktionen, fokussiere auf sinnvolle Commands');
      }
      
      if (metric.efficiency > 80) {
        strengths.push('Sehr effiziente Command-Nutzung');
      } else if (metric.efficiency < 60) {
        weaknesses.push('Viele ineffektive Commands');
        recommendations.push('Vermeide zu schnelle Wiederholungen und überflüssige Selektionen');
      }
      
      if (metric.spamPercentage > 30) {
        weaknesses.push('Hoher Spam-Anteil');
        recommendations.push('Reduziere Network-Commands und überflüssige Selektionen');
      }
      
      // APM Analyse
      if (metric.apm > 150) {
        strengths.push('Sehr hohe Aktionsgeschwindigkeit');
      } else if (metric.apm < 80) {
        weaknesses.push('Niedrige APM - trainiere Hotkeys');
        recommendations.push('Übe Build Orders und Hotkey-Nutzung');
      }
      
      // Coverage Analyse
      if (commandCoverage.coverage < 70) {
        weaknesses.push('Geringe Command-Erkennungsrate');
      }
      
      // Playstyle-spezifische Empfehlungen
      if (playstyle === 'aggressive') {
        recommendations.push('Achte auf Balance zwischen Micro und Macro');
      } else if (playstyle === 'economic') {
        recommendations.push('Entwickle mehr Einheitenkontrolle');
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
