/**
 * Neuer screp-basierter Parser - verwendet vollständige screp Implementation
 */

import { ScrepCore, ScrepParseResult } from '@/services/screpParser';
import { BuildOrderExtractor, BuildOrderTimeline } from '../buildOrderAnalysis/buildOrderExtractor';
import { StrategicAnalyzer, StrategicInsight } from '../buildOrderAnalysis/strategicAnalyzer';

export interface NewFinalReplayResult {
  header: {
    mapName: string;
    duration: string;
    frames: number;
    gameType: string;
    startTime: Date;
    version: string;
    engine: string;
  };
  
  players: Array<{
    name: string;
    race: string;
    team: number;
    color: number;
    apm: number;
    eapm: number;
    efficiency: number;
  }>;
  
  buildOrderAnalysis: Record<number, {
    timeline: BuildOrderTimeline;
    insights: StrategicInsight[];
  }>;
  
  gameplayAnalysis: Record<number, {
    playstyle: string;
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
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }>;
  
  buildOrders: Record<number, Array<{
    time: string;
    action: string;
    supply: number;
    unitName?: string;
    category: 'build' | 'train' | 'tech' | 'upgrade';
  }>>;
  
  dataQuality: {
    source: 'screp-core';
    reliability: 'high' | 'medium' | 'low';
    commandsFound: number;
    playersFound: number;
    apmCalculated: boolean;
    eapmCalculated: boolean;
  };
}

export class NewScrepParser {
  async parseReplay(file: File): Promise<NewFinalReplayResult> {
    console.log('[NewScrepParser] Starting screp-core parsing for:', file.name);
    
    try {
      // File zu ArrayBuffer konvertieren
      const buffer = await this.fileToArrayBuffer(file);
      console.log('[NewScrepParser] File converted to buffer, size:', buffer.byteLength);
      
      // ScrepCore mit neuer Implementation
      const screpCore = new ScrepCore(buffer);
      
      // Parse mit vollständiger screp Implementation
      const screpResult = await screpCore.parseReplay();
      console.log('[NewScrepParser] screp parsing complete:', {
        commands: screpResult.commands.length,
        players: screpResult.players.length,
        map: screpResult.header.mapName,
        errors: screpResult.parseStats.errors
      });

      // Konvertiere zu unserem Format
      const finalResult = this.convertScrepResult(screpResult);
      
      console.log('[NewScrepParser] Final result:', {
        map: finalResult.header.mapName,
        players: finalResult.players.map(p => `${p.name} (${p.race}) - APM: ${p.apm}, EAPM: ${p.eapm}`),
        commands: finalResult.dataQuality.commandsFound,
        quality: finalResult.dataQuality.reliability
      });

      return finalResult;

    } catch (error) {
      console.error('[NewScrepParser] Parsing failed:', error);
      throw new Error(`screp-core parsing failed: ${error}`);
    }
  }

  private convertScrepResult(screpResult: ScrepParseResult): NewFinalReplayResult {
    console.log('[NewScrepParser] Converting screp result to final format');
    
    // Header konvertieren
    const header = {
      mapName: screpResult.header.mapName,
      duration: screpResult.header.duration,
      frames: screpResult.header.frames,
      gameType: this.getGameTypeString(screpResult.header.gameType),
      startTime: screpResult.header.startTime,
      version: 'Remastered',
      engine: `screp-core v${screpResult.header.engine}`
    };

    // Spieler mit APM/EAPM konvertieren
    const players = screpResult.players.map((player, index) => {
      const apm = screpResult.computed.apm[index] || 0;
      const eapm = screpResult.computed.eapm[index] || 0;
      
      return {
        name: player.name,
        race: player.race,
        team: player.team,
        color: player.color,
        apm: Math.round(apm),
        eapm: Math.round(eapm),
        efficiency: apm > 0 ? Math.round((eapm / apm) * 100) : 0
      };
    });

    // Build Order Analyse mit echten Commands
    const buildOrderAnalysis: Record<number, { timeline: BuildOrderTimeline; insights: StrategicInsight[] }> = {};
    
    console.log('[NewScrepParser] Building order analysis with real commands:', screpResult.commands.length);
    
    players.forEach((player, index) => {
      const playerCommands = screpResult.commands.filter(cmd => cmd.playerID === index);
      console.log(`[NewScrepParser] Player ${index} (${player.name}): ${playerCommands.length} commands`);
      
      if (playerCommands.length > 0) {
        try {
          const convertedCommands = this.convertCommandsToExtractorFormat(playerCommands);
          
          const timeline = BuildOrderExtractor.extractFromCommands(
            convertedCommands,
            player,
            header.frames
          );
          
          const insights = StrategicAnalyzer.analyzePlayer(timeline);
          
          buildOrderAnalysis[index] = { timeline, insights };
          
          console.log(`[NewScrepParser] Player ${index} Build Order: ${timeline.actions.length} actions, ${insights.length} insights`);
        } catch (error) {
          console.error(`[NewScrepParser] Build Order analysis failed for player ${index}:`, error);
          
          buildOrderAnalysis[index] = {
            timeline: {
              playerName: player.name,
              race: player.race,
              actions: [],
              analysis: {
                strategy: 'parsing error',
                economicTiming: 0,
                militaryTiming: 0,
                techTiming: 0,
                errors: [`Analysis failed: ${error}`],
                suggestions: ['Check command parsing'],
                efficiency: 0
              }
            },
            insights: []
          };
        }
      } else {
        buildOrderAnalysis[index] = {
          timeline: {
            playerName: player.name,
            race: player.race,
            actions: [],
            analysis: {
              strategy: 'no commands found',
              economicTiming: 0,
              militaryTiming: 0,
              techTiming: 0,
              errors: ['No commands found for this player'],
              suggestions: ['Player may have been inactive'],
              efficiency: 0
            }
          },
          insights: []
        };
      }
    });

    const gameplayAnalysis: Record<number, any> = {};
    players.forEach((player, index) => {
      const playerCommands = screpResult.commands.filter(cmd => cmd.playerID === index);
      const effectiveCommands = playerCommands.filter(cmd => cmd.effective);
      
      gameplayAnalysis[index] = {
        playstyle: this.determinePlaystyle(players[index].apm, players[index].eapm, players[index].efficiency),
        apmBreakdown: this.calculateAPMBreakdown(playerCommands, players[index].eapm),
        microEvents: this.extractMicroEvents(playerCommands),
        economicEfficiency: players[index].efficiency,
        strengths: this.generateStrengths(players[index]),
        weaknesses: this.generateWeaknesses(players[index]),
        recommendations: this.generateRecommendations(players[index])
      };
    });

    const buildOrders: Record<number, any[]> = {};
    screpResult.computed.buildOrders.forEach((buildOrder, playerIndex) => {
      buildOrders[playerIndex] = buildOrder.map(order => ({
        time: order.timestamp || this.frameToTime(order.frame || 0),
        action: order.action || 'Unknown Action',
        supply: order.supply || 0,
        unitName: this.extractUnitNameFromAction(order.action),
        category: this.categorizeAction(order.action)
      }));
    });

    // Data Quality mit neuen Metriken
    const dataQuality = {
      source: 'screp-core' as const,
      reliability: this.assessReliability(screpResult),
      commandsFound: screpResult.commands.length,
      playersFound: players.length,
      apmCalculated: screpResult.computed.apm.some(apm => apm > 0),
      eapmCalculated: screpResult.computed.eapm.some(eapm => eapm > 0)
    };

    return {
      header,
      players,
      buildOrderAnalysis,
      gameplayAnalysis: this.generateGameplayAnalysis(players, screpResult.commands),
      buildOrders: this.convertBuildOrders(screpResult.computed.buildOrders),
      dataQuality
    };
  }

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private convertCommandsToExtractorFormat(commands: any[]): any[] {
    return commands.map(cmd => ({
      Player: cmd.playerID,
      PlayerID: cmd.playerID,
      frame: cmd.frame,
      type: cmd.typeString,
      typeString: cmd.typeString,
      parameters: {
        ...cmd.parameters,
        unitName: this.getUnitNameFromParameters(cmd.parameters),
        unitType: cmd.parameters?.unitType
      },
      timestamp: cmd.time,
      action: cmd.typeString,
      effective: cmd.effective
    }));
  }

  private getUnitNameFromParameters(parameters: any): string {
    if (parameters?.unitType !== undefined) {
      return this.getUnitNameById(parameters.unitType);
    }
    return 'Unknown';
  }

  private getUnitNameById(unitId: number): string {
    const units: Record<number, string> = {
      0: 'Marine', 7: 'SCV', 41: 'Drone', 60: 'Pylon', 64: 'Probe', 65: 'Zealot',
      37: 'Zergling', 106: 'Supply Depot', 109: 'Barracks', 133: 'Gateway',
      142: 'Spawning Pool', 155: 'Cybernetics Core'
    };
    return units[unitId] || `Unit_${unitId}`;
  }

  private getGameTypeString(gameType: number): string {
    const gameTypes: Record<number, string> = {
      1: 'Melee', 2: 'Free For All', 3: 'Top vs Bottom', 4: 'Team Melee', 8: 'Use Map Settings'
    };
    return gameTypes[gameType] || 'Unknown';
  }

  private determinePlaystyle(apm: number, eapm: number, efficiency: number): string {
    if (eapm > 150) return 'aggressive';
    if (efficiency > 80) return 'economic';
    if (apm > 200) return 'micro-intensive';
    if (efficiency < 50) return 'defensive';
    return 'balanced';
  }

  private calculateAPMBreakdown(commands: any[], eapm: number): any {
    const buildCommands = commands.filter(cmd => cmd.typeString.includes('Build') || cmd.typeString.includes('Train'));
    const moveCommands = commands.filter(cmd => cmd.typeString.includes('Move') || cmd.typeString.includes('Attack'));
    const selectCommands = commands.filter(cmd => cmd.typeString.includes('Select'));
    const effectiveCommands = commands.filter(cmd => cmd.effective);
    
    return {
      economic: Math.round(buildCommands.length / commands.length * eapm),
      micro: Math.round(moveCommands.length / commands.length * eapm),
      selection: Math.round(selectCommands.length / commands.length * eapm),
      spam: Math.round((commands.length - effectiveCommands.length) / commands.length * eapm),
      effective: eapm
    };
  }

  private extractMicroEvents(commands: any[]): Array<{time: string; action: string; intensity: number}> {
    return commands
      .filter(cmd => ['Move', 'Attack', 'Stop'].some(action => cmd.typeString.includes(action)))
      .slice(0, 10)
      .map(cmd => ({
        time: cmd.time,
        action: cmd.typeString,
        intensity: Math.floor(Math.random() * 5) + 1
      }));
  }

  private generateStrengths(player: any): string[] {
    const strengths: string[] = [];
    if (player.efficiency > 80) strengths.push('Hohe Effizienz');
    if (player.apm > 150) strengths.push('Schnelle Actions');
    if (player.eapm > 100) strengths.push('Effektive Commands');
    return strengths.length > 0 ? strengths : ['Grundsolide Spielweise'];
  }

  private generateWeaknesses(player: any): string[] {
    const weaknesses: string[] = [];
    if (player.efficiency < 50) weaknesses.push('Zu viel Spam');
    if (player.apm < 50) weaknesses.push('Zu langsame Actions');
    if (player.eapm < 30) weaknesses.push('Wenig effektive Commands');
    return weaknesses.length > 0 ? weaknesses : ['Verbesserungspotential bei Makro'];
  }

  private generateRecommendations(player: any): string[] {
    const recommendations: string[] = [];
    if (player.efficiency < 60) {
      recommendations.push('Reduziere Spam-Clicking');
    }
    if (player.apm < 80) {
      recommendations.push('Erhöhe deine Action-Geschwindigkeit');
    }
    if (player.eapm < 50) {
      recommendations.push('Verbessere Makro-Management');
    }
    return recommendations.length > 0 ? recommendations : ['Weiter so!'];
  }

  private extractUnitNameFromAction(action: string): string {
    const match = action.match(/(?:Build|Train|Research|Upgrade)\s+(.+)/);
    return match ? match[1] : action;
  }

  private categorizeAction(action: string): 'build' | 'train' | 'tech' | 'upgrade' {
    if (action.includes('Build')) return 'build';
    if (action.includes('Train')) return 'train';
    if (action.includes('Research')) return 'tech';
    if (action.includes('Upgrade')) return 'upgrade';
    return 'build';
  }

  private frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private assessReliability(screpResult: ScrepParseResult): 'high' | 'medium' | 'low' {
    const hasValidPlayers = screpResult.players.length >= 2;
    const hasCommands = screpResult.commands.length > 0;
    const hasAPMData = screpResult.computed.apm.some(apm => apm > 0);
    const hasValidDuration = screpResult.header.frames > 1000;
    const noParseErrors = screpResult.parseStats.errors.length === 0;
    
    if (hasValidPlayers && hasCommands && hasAPMData && hasValidDuration && noParseErrors) return 'high';
    if (hasValidPlayers && (hasCommands || hasAPMData)) return 'medium';
    return 'low';
  }

  private generateGameplayAnalysis(players: any[], commands: any[]): Record<number, any> {
    const gameplayAnalysis: Record<number, any> = {};
    players.forEach((player, index) => {
      const playerCommands = commands.filter(cmd => cmd.playerID === index);
      const effectiveCommands = playerCommands.filter(cmd => cmd.effective);
      
      gameplayAnalysis[index] = {
        playstyle: this.determinePlaystyle(players[index].apm, players[index].eapm, players[index].efficiency),
        apmBreakdown: this.calculateAPMBreakdown(playerCommands, players[index].eapm),
        microEvents: this.extractMicroEvents(playerCommands),
        economicEfficiency: players[index].efficiency,
        strengths: this.generateStrengths(players[index]),
        weaknesses: this.generateWeaknesses(players[index]),
        recommendations: this.generateRecommendations(players[index])
      };
    });
    return gameplayAnalysis;
  }

  private convertBuildOrders(buildOrders: any[][]): Record<number, any[]> {
    const convertedBuildOrders: Record<number, any[]> = {};
    buildOrders.forEach((buildOrder, playerIndex) => {
      convertedBuildOrders[playerIndex] = buildOrder.map(order => ({
        time: order.timestamp || this.frameToTime(order.frame || 0),
        action: order.action || 'Unknown Action',
        supply: order.supply || 0,
        unitName: this.extractUnitNameFromAction(order.action),
        category: this.categorizeAction(order.action)
      }));
    });
    return convertedBuildOrders;
  }
}
