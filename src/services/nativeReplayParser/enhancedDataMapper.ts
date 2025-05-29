/**
 * Enhanced Data Mapper - Verbindet screp-js mit SC:R-spezifischer Hex-Command-Analyse
 * DAS ist unser einziger Parser!
 */

import { ScrepJsWrapper } from './screpJsWrapper';
import { EnhancedCommandExtractor } from './enhancedCommandExtractor';

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
  }>>;
  
  // Gameplay-Analyse
  gameplayAnalysis: Record<number, {
    playstyle: 'aggressive' | 'defensive' | 'economic' | 'tech-focused';
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }>;
  
  dataQuality: {
    source: 'enhanced' | 'screp-js-only';
    commandsExtracted: number;
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
    let dataQuality: any = {
      source: 'screp-js-only',
      commandsExtracted: 0,
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
        console.log('[EnhancedDataMapper] Sample commands:', realCommands.slice(0, 10).map(cmd => ({
          frame: cmd.frame,
          playerId: cmd.playerId,
          commandName: cmd.commandName,
          parameters: cmd.parameters
        })));
        
        // Analysiere Command-Verteilung
        const commandTypes = realCommands.reduce((acc, cmd) => {
          acc[cmd.commandName] = (acc[cmd.commandName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('[EnhancedDataMapper] Command distribution:', commandTypes);
        
        // Analysiere Player-Verteilung
        const playerDistribution = realCommands.reduce((acc, cmd) => {
          acc[cmd.playerId] = (acc[cmd.playerId] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        console.log('[EnhancedDataMapper] Player command distribution:', playerDistribution);
      }
      
      if (realCommands.length > 50) {
        dataQuality = {
          source: 'enhanced',
          commandsExtracted: realCommands.length,
          reliability: realCommands.length > 200 ? 'high' : 'medium'
        };
        console.log('[EnhancedDataMapper] ✅ SC:R extraction successful:', realCommands.length, 'commands');
      } else {
        console.log('[EnhancedDataMapper] ⚠️ Low command count from SC:R extraction:', realCommands.length);
        console.log('[EnhancedDataMapper] This might indicate a parsing issue or unusual replay format');
      }
    } catch (error) {
      console.error('[EnhancedDataMapper] ❌ SC:R extraction failed:', error);
      console.log('[EnhancedDataMapper] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      console.log('[EnhancedDataMapper] Using screp-js only mode');
    }
    
    // 3. Berechne echte Metriken
    console.log('[EnhancedDataMapper] === CALCULATING METRICS ===');
    const realMetrics = this.calculateRealMetrics(realCommands, screpResult);
    console.log('[EnhancedDataMapper] Real metrics calculated for', Object.keys(realMetrics).length, 'players');
    console.log('[EnhancedDataMapper] Sample metrics:', Object.entries(realMetrics).slice(0, 2).map(([id, metrics]) => ({
      playerId: id,
      apm: (metrics as any).apm,
      eapm: (metrics as any).eapm
    })));
    
    // 4. Generiere intelligente Build Orders
    console.log('[EnhancedDataMapper] === GENERATING BUILD ORDERS ===');
    const enhancedBuildOrders = this.generateEnhancedBuildOrders(realCommands, screpResult);
    console.log('[EnhancedDataMapper] Enhanced build orders generated for', Object.keys(enhancedBuildOrders).length, 'players');
    console.log('[EnhancedDataMapper] Build order samples:', Object.entries(enhancedBuildOrders).map(([id, bo]) => ({
      playerId: id,
      entries: (bo as any[]).length
    })));
    
    // 5. Erstelle Gameplay-Analyse
    console.log('[EnhancedDataMapper] === GENERATING ANALYSIS ===');
    const gameplayAnalysis = this.generateGameplayAnalysis(realCommands, realMetrics, screpResult);
    console.log('[EnhancedDataMapper] Gameplay analysis generated for', Object.keys(gameplayAnalysis).length, 'players');
    
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
      realMetrics,
      enhancedBuildOrders,
      gameplayAnalysis,
      dataQuality
    };
    
    console.log('[EnhancedDataMapper] === SC:R PARSING COMPLETE ===');
    console.log('[EnhancedDataMapper] Final result summary:', {
      players: finalResult.players.length,
      realCommands: finalResult.realCommands.length,
      realMetrics: Object.keys(finalResult.realMetrics).length,
      enhancedBuildOrders: Object.keys(finalResult.enhancedBuildOrders).length,
      gameplayAnalysis: Object.keys(finalResult.gameplayAnalysis).length,
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
   * Generiere intelligente Build Orders
   */
  private static generateEnhancedBuildOrders(commands: any[], screpResult: any): Record<number, any[]> {
    console.log('[EnhancedDataMapper.generateEnhancedBuildOrders] Input:', {
      commandsCount: commands.length,
      screpBuildOrdersAvailable: !!screpResult.computed?.buildOrders
    });
    
    const buildOrders: Record<number, any[]> = {};
    
    // Fallback zu screp-js Build Orders
    if (commands.length === 0) {
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
      console.log('[EnhancedDataMapper.generateEnhancedBuildOrders] Fallback build orders:', Object.keys(buildOrders).length, 'players');
      return buildOrders;
    }
    
    // Erstelle aus echten Commands
    const playerCommands: Record<number, any[]> = {};
    commands.forEach(cmd => {
      if (['Build', 'Train Unit', 'Research Tech', 'Upgrade'].includes(cmd.commandName)) {
        if (!playerCommands[cmd.playerId]) {
          playerCommands[cmd.playerId] = [];
        }
        playerCommands[cmd.playerId].push(cmd);
      }
    });
    
    console.log('[EnhancedDataMapper.generateEnhancedBuildOrders] Build commands per player:', 
      Object.entries(playerCommands).map(([id, cmds]) => `Player ${id}: ${cmds.length} build commands`)
    );
    
    Object.entries(playerCommands).forEach(([playerIdStr, playerCmds]) => {
      const playerId = parseInt(playerIdStr);
      
      buildOrders[playerId] = playerCmds
        .sort((a, b) => a.frame - b.frame)
        .map(cmd => {
          const timestamp = cmd.frame / 23.81;
          const minutes = Math.floor(timestamp / 60);
          const seconds = Math.floor(timestamp % 60);
          
          return {
            time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            action: cmd.commandName,
            supply: this.estimateSupply(cmd.frame, playerCmds),
            unitName: this.getUnitName(cmd),
            category: this.categorizeAction(cmd.commandName)
          };
        });
    });
    
    console.log('[EnhancedDataMapper.generateEnhancedBuildOrders] Generated build orders:', 
      Object.entries(buildOrders).map(([id, bo]) => `Player ${id}: ${bo.length} entries`)
    );
    
    return buildOrders;
  }

  /**
   * Generiere Gameplay-Analyse
   */
  private static generateGameplayAnalysis(commands: any[], metrics: Record<number, any>, screpResult: any): Record<number, any> {
    console.log('[EnhancedDataMapper.generateGameplayAnalysis] Input:', {
      commandsCount: commands.length,
      metricsPlayers: Object.keys(metrics).length
    });
    
    const analysis: Record<number, any> = {};
    
    Object.entries(metrics).forEach(([playerIdStr, metric]) => {
      const playerId = parseInt(playerIdStr);
      
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const recommendations: string[] = [];
      let playstyle: string = 'balanced';
      
      // APM Analyse
      if (metric.apm > 150) {
        strengths.push('Sehr hohe Aktionsgeschwindigkeit');
        playstyle = 'aggressive';
      } else if (metric.apm < 80) {
        weaknesses.push('Niedrige APM - trainiere Hotkeys');
        recommendations.push('Übe Build Orders und Hotkey-Nutzung');
      }
      
      // EAPM vs APM Verhältnis
      const efficiency = metric.eapm / Math.max(metric.apm, 1);
      if (efficiency > 0.4) {
        strengths.push('Sehr effiziente Aktionen');
      } else if (efficiency < 0.2) {
        weaknesses.push('Viele unnötige Aktionen');
        recommendations.push('Fokussiere auf wichtige Befehle');
      }
      
      // Micro vs Macro
      if (metric.microIntensity > metric.eapm) {
        playstyle = 'aggressive';
        strengths.push('Starke Einheitenkontrolle');
      } else {
        playstyle = 'economic';
        strengths.push('Gutes Wirtschaftsmanagement');
      }
      
      // Build Order Timing
      if (metric.buildOrderTiming > 0 && metric.buildOrderTiming < 60) {
        strengths.push('Schnelle Build Order');
      } else if (metric.buildOrderTiming > 120) {
        weaknesses.push('Langsame Build Order');
        recommendations.push('Übe optimierte Build Orders');
      }
      
      analysis[playerId] = {
        playstyle,
        strengths,
        weaknesses,
        recommendations
      };
      
      console.log(`[EnhancedDataMapper.generateGameplayAnalysis] Player ${playerId} analysis:`, {
        playstyle: analysis[playerId].playstyle,
        strengthsCount: analysis[playerId].strengths.length,
        weaknessesCount: analysis[playerId].weaknesses.length
      });
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

  private static categorizeAction(commandName: string): 'build' | 'train' | 'tech' | 'upgrade' {
    if (commandName.includes('Build')) return 'build';
    if (commandName.includes('Train')) return 'train';
    if (commandName.includes('Research')) return 'tech';
    if (commandName.includes('Upgrade')) return 'upgrade';
    return 'build';
  }
}
