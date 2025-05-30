
/**
 * Einziger Replay Parser - verwendet ausschließlich screp-js
 * Alle anderen Parser sind deaktiviert
 */

import { ScrepJsWrapper, ScrepJsResult } from './screpJsWrapper';

export interface FinalReplayResult {
  // Basis-Header
  header: {
    mapName: string;
    duration: string;
    frames: number;
    gameType: string;
    startTime: Date;
    version: string;
    engine: string;
  };
  
  // Spieler mit korrekten Daten
  players: Array<{
    name: string;
    race: string;
    team: number;
    color: number;
    apm: number;
    eapm: number;
    efficiency: number;
  }>;
  
  // Erweiterte Metriken
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
  
  // Build Orders von screp-js
  buildOrders: Record<number, Array<{
    time: string;
    action: string;
    supply: number;
    unitName?: string;
    category: 'build' | 'train' | 'tech' | 'upgrade';
  }>>;
  
  // Datenqualität
  dataQuality: {
    source: 'screp-js';
    reliability: 'high' | 'medium' | 'low';
    commandsFound: number;
    playersFound: number;
    apmCalculated: boolean;
    eapmCalculated: boolean;
  };
}

export class ScrepJsParser {
  private screpWrapper: ScrepJsWrapper;

  constructor() {
    this.screpWrapper = ScrepJsWrapper.getInstance();
  }

  async parseReplay(file: File): Promise<FinalReplayResult> {
    console.log('[ScrepJsParser] Starting EXCLUSIVE screp-js parsing for:', file.name);
    
    try {
      // Initialisiere screp-js
      const initialized = await this.screpWrapper.initialize();
      if (!initialized) {
        throw new Error('screp-js konnte nicht initialisiert werden');
      }

      // Parse mit screp-js
      const screpResult = await this.screpWrapper.parseReplay(file);
      console.log('[ScrepJsParser] screp-js Ergebnis erhalten:', screpResult);

      // Konvertiere zu unserem Format
      const finalResult = this.convertScrepResult(screpResult);
      
      console.log('[ScrepJsParser] Finales Ergebnis:', {
        map: finalResult.header.mapName,
        players: finalResult.players.map(p => `${p.name} (${p.race}) - APM: ${p.apm}, EAPM: ${p.eapm}`),
        quality: finalResult.dataQuality.reliability
      });

      return finalResult;

    } catch (error) {
      console.error('[ScrepJsParser] screp-js Parsing fehlgeschlagen:', error);
      throw new Error(`screp-js Parsing fehlgeschlagen: ${error}`);
    }
  }

  private convertScrepResult(screpResult: ScrepJsResult): FinalReplayResult {
    console.log('[ScrepJsParser] Konvertiere screp-js Ergebnis zu FinalReplayResult');
    
    // Header konvertieren
    const header = {
      mapName: screpResult.header.mapName || 'Unknown Map',
      duration: screpResult.header.duration || '0:00',
      frames: screpResult.header.frames || 0,
      gameType: screpResult.header.gameType || 'Unknown',
      startTime: screpResult.header.startTime || new Date(),
      version: 'Remastered',
      engine: screpResult.header.engine || 'StarCraft'
    };

    // Spieler mit APM/EAPM konvertieren
    const players = screpResult.players.map((player, index) => {
      const apm = screpResult.computed.apm[index] || 0;
      const eapm = screpResult.computed.eapm[index] || 0;
      
      return {
        name: player.name || `Player ${index + 1}`,
        race: player.race || 'Unknown',
        team: player.team || index,
        color: player.color || index,
        apm: Math.round(apm),
        eapm: Math.round(eapm),
        efficiency: apm > 0 ? Math.round((eapm / apm) * 100) : 0
      };
    });

    // Gameplay-Analyse basierend auf APM/EAPM
    const gameplayAnalysis: Record<number, any> = {};
    players.forEach((player, index) => {
      const apm = player.apm;
      const eapm = player.eapm;
      const efficiency = player.efficiency;
      
      // Bestimme Spielstil basierend auf APM/EAPM
      let playstyle = 'balanced';
      if (eapm > 150) playstyle = 'aggressive';
      else if (efficiency > 80) playstyle = 'economic';
      else if (apm > 200) playstyle = 'micro-intensive';
      else if (efficiency < 50) playstyle = 'defensive';

      // APM Breakdown (geschätzt basierend auf screp-js Daten)
      const spamRate = Math.max(0, 100 - efficiency);
      const effectiveRate = efficiency;
      
      gameplayAnalysis[index] = {
        playstyle,
        apmBreakdown: {
          economic: Math.round(eapm * 0.4),
          micro: Math.round(eapm * 0.3),
          selection: Math.round(eapm * 0.2),
          spam: Math.round(apm * (spamRate / 100)),
          effective: eapm
        },
        microEvents: this.generateMicroEvents(screpResult.computed.buildOrders[index] || []),
        economicEfficiency: efficiency,
        strengths: this.generateStrengths(player, efficiency),
        weaknesses: this.generateWeaknesses(player, efficiency),
        recommendations: this.generateRecommendations(player, efficiency, apm, eapm)
      };
    });

    // Build Orders von screp-js übernehmen
    const buildOrders: Record<number, any[]> = {};
    screpResult.computed.buildOrders.forEach((buildOrder, playerIndex) => {
      buildOrders[playerIndex] = buildOrder.map(order => ({
        time: order.timestamp || '0:00',
        action: order.action || 'Unknown Action',
        supply: order.supply || 0,
        unitName: this.extractUnitName(order.action),
        category: this.categorizeAction(order.action)
      }));
    });

    // Datenqualität bewerten
    const dataQuality = {
      source: 'screp-js' as const,
      reliability: this.assessReliability(screpResult),
      commandsFound: this.countCommands(screpResult),
      playersFound: players.length,
      apmCalculated: screpResult.computed.apm.some(apm => apm > 0),
      eapmCalculated: screpResult.computed.eapm.some(eapm => eapm > 0)
    };

    return {
      header,
      players,
      gameplayAnalysis,
      buildOrders,
      dataQuality
    };
  }

  private generateMicroEvents(buildOrder: any[]): Array<{time: string; action: string; intensity: number}> {
    return buildOrder
      .filter(order => order.action && (
        order.action.toLowerCase().includes('attack') ||
        order.action.toLowerCase().includes('move') ||
        order.action.toLowerCase().includes('micro')
      ))
      .slice(0, 10)
      .map(order => ({
        time: order.timestamp || '0:00',
        action: order.action,
        intensity: Math.floor(Math.random() * 5) + 1
      }));
  }

  private generateStrengths(player: any, efficiency: number): string[] {
    const strengths: string[] = [];
    
    if (efficiency > 80) strengths.push('Hohe Effizienz');
    if (player.apm > 150) strengths.push('Schnelle Actions');
    if (player.eapm > 100) strengths.push('Effektive Commands');
    
    return strengths.length > 0 ? strengths : ['Grundsolide Spielweise'];
  }

  private generateWeaknesses(player: any, efficiency: number): string[] {
    const weaknesses: string[] = [];
    
    if (efficiency < 50) weaknesses.push('Zu viel Spam');
    if (player.apm < 50) weaknesses.push('Zu langsame Actions');
    if (player.eapm < 30) weaknesses.push('Wenig effektive Commands');
    
    return weaknesses.length > 0 ? weaknesses : ['Verbesserungspotential bei Makro'];
  }

  private generateRecommendations(player: any, efficiency: number, apm: number, eapm: number): string[] {
    const recommendations: string[] = [];
    
    if (efficiency < 60) {
      recommendations.push('Reduziere Spam-Clicking');
      recommendations.push('Fokussiere auf effektive Actions');
    }
    
    if (apm < 80) {
      recommendations.push('Erhöhe deine Action-Geschwindigkeit');
      recommendations.push('Übe Hotkey-Management');
    }
    
    if (eapm < 50) {
      recommendations.push('Verbessere Makro-Management');
      recommendations.push('Plane Build Orders besser');
    }
    
    return recommendations.length > 0 ? recommendations : ['Weiter so!'];
  }

  private extractUnitName(action: string): string {
    // Extrahiere Unit-Namen aus Action-String
    const matches = action.match(/\b[A-Z][a-z]+\b/g);
    return matches ? matches[matches.length - 1] : 'Unknown';
  }

  private categorizeAction(action: string): 'build' | 'train' | 'tech' | 'upgrade' {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('build') || actionLower.includes('construct')) return 'build';
    if (actionLower.includes('train') || actionLower.includes('produce')) return 'train';
    if (actionLower.includes('research') || actionLower.includes('tech')) return 'tech';
    if (actionLower.includes('upgrade')) return 'upgrade';
    
    return 'build';
  }

  private assessReliability(screpResult: ScrepJsResult): 'high' | 'medium' | 'low' {
    const hasValidPlayers = screpResult.players.length >= 2;
    const hasAPMData = screpResult.computed.apm.some(apm => apm > 0);
    const hasValidDuration = screpResult.header.frames > 1000;
    
    if (hasValidPlayers && hasAPMData && hasValidDuration) return 'high';
    if (hasValidPlayers && (hasAPMData || hasValidDuration)) return 'medium';
    return 'low';
  }

  private countCommands(screpResult: ScrepJsResult): number {
    // Schätze Commands basierend auf APM und Spieldauer
    const totalAPM = screpResult.computed.apm.reduce((sum, apm) => sum + apm, 0);
    const gameMinutes = screpResult.header.frames / 24 / 60;
    return Math.round(totalAPM * gameMinutes);
  }
}
