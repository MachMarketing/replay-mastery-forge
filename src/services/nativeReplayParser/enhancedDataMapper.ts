/**
 * Enhanced Data Mapper - Verbindet screp-js mit SC:R-spezifischer Hex-Command-Analyse
 * DAS ist unser einziger Parser!
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
    buildOrderTiming: number;
    microIntensity: number;
  }>;
  
  // Intelligente Build Orders
  enhancedBuildOrders: Record<number, Array<{
    time: string;
    action: string;
    supply: number;
    unitName: string;
    category: 'build' | 'train' | 'tech' | 'upgrade';
    cost?: { minerals: number; gas: number };
  }>>;
  
  // Gameplay-Analyse
  gameplayAnalysis: Record<number, {
    playstyle: 'aggressive' | 'defensive' | 'economic' | 'tech-focused';
    apmBreakdown: {
      economic: number;
      micro: number;
      selection: number;
      spam: number;
    };
    microEvents: Array<{
      time: string;
      action: string;
      intensity: number;
    }>;
    economicEfficiency: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }>;
  
  dataQuality: {
    source: 'enhanced' | 'screp-js-only';
    commandsExtracted: number;
    interpretedCommands: number;
    reliability: 'high' | 'medium' | 'low';
  };
}

export class EnhancedDataMapper {
  /**
   * DER EINZIGE PARSER - Kombiniert screp-js + SC:R-spezifische Hex-Analyse
   */
  static async parseReplay(file: File): Promise<EnhancedReplayResult> {
    console.log('[EnhancedDataMapper] === STARTING SC:R UNIFIED PARSING ===');
    console.log('[EnhancedDataMapper] File size:', file.size, 'bytes');
    console.log('[EnhancedDataMapper] File name:', file.name);
    console.log('[EnhancedDataMapper] File type detected: StarCraft: Remastered .rep');
    
    // 1. screp-js für Basis-Daten (immer zuerst!)
    const screpWrapper = ScrepJsWrapper.getInstance();
    const screpResult = await screpWrapper.parseReplay(file);
    
    console.log('[EnhancedDataMapper] screp-js completed:', {
      map: screpResult.header.mapName,
      players: screpResult.players.length,
      duration: screpResult.header.duration,
      frames: screpResult.header.frames
    });
    
    console.log('[EnhancedDataMapper] screp-js players:', screpResult.players.map(p => `${p.name} (${p.race})`));
    console.log('[EnhancedDataMapper] screp-js computed data available:', Object.keys(screpResult.computed || {}));
    
    let realCommands: any[] = [];
    let interpretedCommands: Record<number, InterpretedCommand[]> = {};
    let dataQuality: any = {
      source: 'screp-js-only',
      commandsExtracted: 0,
      interpretedCommands: 0,
      reliability: 'medium'
    };
    
    // 2. Versuche SC:R-spezifische Command-Extraktion
    try {
      console.log('[EnhancedDataMapper] === STARTING SC:R COMMAND EXTRACTION ===');
      const arrayBuffer = await file.arrayBuffer();
      console.log('[EnhancedDataMapper] ArrayBuffer size:', arrayBuffer.byteLength);
      
      const commandExtractor = new EnhancedCommandExtractor(arrayBuffer);
      realCommands = commandExtractor.extractRealCommands();
      
      console.log('[EnhancedDataMapper] === SC:R EXTRACTION RESULT ===');
      console.log('[EnhancedDataMapper] Commands found:', realCommands.length);
      
      if (realCommands.length > 0) {
        console.log('[EnhancedDataMapper] === INTERPRETING COMMANDS ===');
        
        // Interpretiere Commands zu verständlichen Aktionen
        const playerCommandsRaw: Record<number, any[]> = {};
        realCommands.forEach(cmd => {
          if (!playerCommandsRaw[cmd.playerId]) {
            playerCommandsRaw[cmd.playerId] = [];
          }
          playerCommandsRaw[cmd.playerId].push(cmd);
        });
        
        // Interpretiere Commands für jeden Spieler
        Object.entries(playerCommandsRaw).forEach(([playerIdStr, commands]) => {
          const playerId = parseInt(playerIdStr);
          interpretedCommands[playerId] = commands.map(cmd => 
            SCCommandInterpreter.interpretCommand(cmd)
          );
          
          console.log(`[EnhancedDataMapper] Player ${playerId}: ${commands.length} commands -> ${interpretedCommands[playerId].length} interpreted`);
          
          // Zeige Sample der interpretierten Commands
          const economicActions = interpretedCommands[playerId].filter(cmd => cmd.isEconomicAction);
          const microActions = interpretedCommands[playerId].filter(cmd => cmd.isMicroAction);
          
          console.log(`[EnhancedDataMapper] Player ${playerId} breakdown:`, {
            total: interpretedCommands[playerId].length,
            economic: economicActions.length,
            micro: microActions.length,
            sampleEconomic: economicActions.slice(0, 3).map(cmd => cmd.actionName),
            sampleMicro: microActions.slice(0, 3).map(cmd => cmd.actionName)
          });
        });
        
        const totalInterpreted = Object.values(interpretedCommands).reduce((sum, cmds) => sum + cmds.length, 0);
        
        if (realCommands.length > 50) {
          dataQuality = {
            source: 'enhanced',
            commandsExtracted: realCommands.length,
            interpretedCommands: totalInterpreted,
            reliability: realCommands.length > 200 ? 'high' : 'medium'
          };
          console.log('[EnhancedDataMapper] ✅ SC:R extraction and interpretation successful:', realCommands.length, 'commands');
        } else {
          console.log('[EnhancedDataMapper] ⚠️ Low command count from SC:R extraction:', realCommands.length);
        }
      }
    } catch (error) {
      console.error('[EnhancedDataMapper] ❌ SC:R extraction failed:', error);
      console.log('[EnhancedDataMapper] Using screp-js only mode');
    }
    
    // 3. Berechne echte Metriken
    console.log('[EnhancedDataMapper] === CALCULATING METRICS ===');
    const realMetrics = this.calculateRealMetrics(realCommands, screpResult);
    console.log('[EnhancedDataMapper] Real metrics calculated for', Object.keys(realMetrics).length, 'players');
    
    // 4. Generiere intelligente Build Orders mit Command-Interpretation
    console.log('[EnhancedDataMapper] === GENERATING BUILD ORDERS ===');
    const enhancedBuildOrders = this.generateEnhancedBuildOrders(interpretedCommands, screpResult);
    console.log('[EnhancedDataMapper] Enhanced build orders generated for', Object.keys(enhancedBuildOrders).length, 'players');
    
    // 5. Erstelle erweiterte Gameplay-Analyse
    console.log('[EnhancedDataMapper] === GENERATING ENHANCED ANALYSIS ===');
    const gameplayAnalysis = this.generateEnhancedGameplayAnalysis(interpretedCommands, realMetrics, screpResult);
    console.log('[EnhancedDataMapper] Enhanced gameplay analysis generated for', Object.keys(gameplayAnalysis).length, 'players');
    
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
    
    console.log('[EnhancedDataMapper] === SC:R PARSING COMPLETE ===');
    console.log('[EnhancedDataMapper] Final result summary:', {
      players: finalResult.players.length,
      realCommands: finalResult.realCommands.length,
      interpretedCommands: Object.keys(finalResult.interpretedCommands).length,
      quality: finalResult.dataQuality.reliability,
      dataSource: finalResult.dataQuality.source
    });
    
    return finalResult;
  }

  /**
   * Berechne echte Metriken aus Commands + screp-js Daten
   */
  private static calculateRealMetrics(commands: any[], screpResult: any): Record<number, any> {
    console.log('[EnhancedDataMapper.calculateRealMetrics] Input:', {
      commandsCount: commands.length,
      screpPlayersCount: screpResult.players.length,
      gameFrames: screpResult.header.frames,
      screpComputedAvailable: !!screpResult.computed
    });
    
    const gameMinutes = screpResult.header.frames / 23.81 / 60;
    const metrics: Record<number, any> = {};
    
    // WICHTIG: Verwende IMMER screp-js APM-Daten wenn verfügbar!
    if (screpResult.computed?.apm && screpResult.computed?.eapm) {
      console.log('[EnhancedDataMapper.calculateRealMetrics] Using screp-js APM/EAPM data');
      console.log('[EnhancedDataMapper.calculateRealMetrics] screp-js APM:', screpResult.computed.apm);
      console.log('[EnhancedDataMapper.calculateRealMetrics] screp-js EAPM:', screpResult.computed.eapm);
      
      screpResult.players.forEach((player: any, index: number) => {
        const apm = screpResult.computed.apm[index] || 0;
        const eapm = screpResult.computed.eapm[index] || 0;
        const realActions = Math.round(apm * gameMinutes);
        
        metrics[index] = {
          apm,
          eapm,
          realActions,
          buildOrderTiming: 60, // Default timing
          microIntensity: Math.round(apm * 0.3) // Schätzung: 30% der Aktionen sind Micro
        };
        
        console.log(`[EnhancedDataMapper.calculateRealMetrics] Player ${index} (${player.name}):`, {
          apm,
          eapm,
          realActions,
          gameMinutes: gameMinutes.toFixed(1)
        });
      });
      
      return metrics;
    }
    
    // Fallback wenn keine screp-js APM Daten
    console.log('[EnhancedDataMapper.calculateRealMetrics] No screp-js APM data, using fallback');
    
    if (commands.length === 0) {
      console.log('[EnhancedDataMapper.calculateRealMetrics] No commands, using minimal fallback');
      screpResult.players.forEach((player: any, index: number) => {
        metrics[index] = {
          apm: 0,
          eapm: 0,
          realActions: 0,
          buildOrderTiming: 0,
          microIntensity: 0
        };
      });
      return metrics;
    }
    
    // Echte Berechnung aus Commands
    const playerCommands: Record<number, any[]> = {};
    commands.forEach(cmd => {
      if (!playerCommands[cmd.playerId]) {
        playerCommands[cmd.playerId] = [];
      }
      playerCommands[cmd.playerId].push(cmd);
    });
    
    console.log('[EnhancedDataMapper.calculateRealMetrics] Player command distribution:', 
      Object.entries(playerCommands).map(([id, cmds]) => `Player ${id}: ${cmds.length} commands`)
    );
    
    Object.entries(playerCommands).forEach(([playerIdStr, playerCmds]) => {
      const playerId = parseInt(playerIdStr);
      
      const realActions = playerCmds.length;
      const apm = Math.round(realActions / gameMinutes);
      
      // EAPM (nur Build/Train/Research)
      const economicActions = playerCmds.filter(cmd => 
        ['Build', 'Train Unit', 'Research Tech', 'Upgrade'].includes(cmd.commandName)
      );
      const eapm = Math.round(economicActions.length / gameMinutes);
      
      // Build Order Timing
      const firstTrain = playerCmds.find(cmd => cmd.commandName === 'Train Unit');
      const buildOrderTiming = firstTrain ? firstTrain.frame / 23.81 : 0;
      
      // Micro-Intensität
      const microActions = playerCmds.filter(cmd => 
        ['Move', 'Attack', 'Use Tech'].includes(cmd.commandName)
      );
      const microIntensity = Math.round(microActions.length / gameMinutes);
      
      metrics[playerId] = {
        apm,
        eapm,
        realActions,
        buildOrderTiming,
        microIntensity
      };
      
      console.log(`[EnhancedDataMapper.calculateRealMetrics] Player ${playerId} metrics:`, metrics[playerId]);
    });
    
    return metrics;
  }

  /**
   * Generiere intelligente Build Orders aus interpretierten Commands
   */
  private static generateEnhancedBuildOrders(
    interpretedCommands: Record<number, InterpretedCommand[]>, 
    screpResult: any
  ): Record<number, any[]> {
    console.log('[EnhancedDataMapper.generateEnhancedBuildOrders] Input:', {
      interpretedPlayers: Object.keys(interpretedCommands).length,
      screpBuildOrdersAvailable: !!screpResult.computed?.buildOrders
    });
    
    const buildOrders: Record<number, any[]> = {};
    
    // Wenn wir interpretierte Commands haben, nutze diese!
    if (Object.keys(interpretedCommands).length > 0) {
      console.log('[EnhancedDataMapper.generateEnhancedBuildOrders] Using interpreted commands');
      
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
          cost: entry.cost
        }));
        
        console.log(`[EnhancedDataMapper.generateEnhancedBuildOrders] Player ${playerId}: ${buildOrders[playerId].length} build entries from interpreted commands`);
      });
      
      return buildOrders;
    }
    
    // Fallback zu screp-js Build Orders
    console.log('[EnhancedDataMapper.generateEnhancedBuildOrders] Using screp-js fallback');
    if (screpResult.computed?.buildOrders) {
      screpResult.computed.buildOrders.forEach((bo: any[], index: number) => {
        buildOrders[index] = bo.map((item: any) => ({
          time: item.timestamp || '0:00',
          action: item.action || 'Unknown',
          supply: item.supply || 0,
          unitName: 'Unknown',
          category: 'build'
        }));
      });
    }
    
    return buildOrders;
  }

  /**
   * Generiere erweiterte Gameplay-Analyse mit Command-Interpretation
   */
  private static generateEnhancedGameplayAnalysis(
    interpretedCommands: Record<number, InterpretedCommand[]>,
    metrics: Record<number, any>,
    screpResult: any
  ): Record<number, any> {
    console.log('[EnhancedDataMapper.generateEnhancedGameplayAnalysis] Input:', {
      interpretedPlayers: Object.keys(interpretedCommands).length,
      metricsPlayers: Object.keys(metrics).length
    });
    
    const analysis: Record<number, any> = {};
    
    Object.entries(metrics).forEach(([playerIdStr, metric]) => {
      const playerId = parseInt(playerIdStr);
      const playerCommands = interpretedCommands[playerId] || [];
      
      let gameplayAnalysis: any = {};
      let apmBreakdown = { economic: 0, micro: 0, selection: 0, spam: 0 };
      let microEvents: any[] = [];
      let economicEfficiency = 0;
      let playstyle: string = 'balanced';
      
      // Wenn wir interpretierte Commands haben, nutze diese für detaillierte Analyse
      if (playerCommands.length > 0) {
        gameplayAnalysis = SCCommandInterpreter.analyzeGameplay(playerCommands);
        apmBreakdown = gameplayAnalysis.apmBreakdown;
        microEvents = gameplayAnalysis.microEvents;
        economicEfficiency = gameplayAnalysis.economicEfficiency;
        playstyle = gameplayAnalysis.playstyle;
        
        console.log(`[EnhancedDataMapper.generateEnhancedGameplayAnalysis] Player ${playerId} enhanced analysis:`, {
          playstyle: gameplayAnalysis.playstyle,
          economicEfficiency: gameplayAnalysis.economicEfficiency,
          microEventsCount: gameplayAnalysis.microEvents.length
        });
      }
      
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const recommendations: string[] = [];
      
      // APM Analyse
      if (metric.apm > 150) {
        strengths.push('Sehr hohe Aktionsgeschwindigkeit');
      } else if (metric.apm < 80) {
        weaknesses.push('Niedrige APM - trainiere Hotkeys');
        recommendations.push('Übe Build Orders und Hotkey-Nutzung');
      }
      
      // Effizienz-Analyse basierend auf APM Breakdown
      if (apmBreakdown.economic > 40) {
        strengths.push('Fokus auf wirtschaftliche Entwicklung');
      }
      if (apmBreakdown.micro > 30) {
        strengths.push('Aktive Einheitenkontrolle');
      }
      if (apmBreakdown.spam > 30) {
        weaknesses.push('Viele unnötige Aktionen');
        recommendations.push('Reduziere überflüssige Klicks');
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
