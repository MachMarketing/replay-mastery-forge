/**
 * Einziger Replay Parser - verwendet ausschließlich screp-js
 * Jetzt mit intelligenter Build Order Analyse
 */

import { ScrepJsWrapper, ScrepJsResult } from './screpJsWrapper';
import { BuildOrderExtractor, BuildOrderTimeline } from '../buildOrderAnalysis/buildOrderExtractor';
import { StrategicAnalyzer, StrategicInsight } from '../buildOrderAnalysis/strategicAnalyzer';

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
  
  // Intelligente Build Order Analyse
  buildOrderAnalysis: Record<number, {
    timeline: BuildOrderTimeline;
    insights: StrategicInsight[];
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
  
  // Build Orders (legacy - wird durch buildOrderAnalysis ersetzt)
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
        buildOrderAnalysis: Object.keys(finalResult.buildOrderAnalysis).length,
        quality: finalResult.dataQuality.reliability
      });

      return finalResult;

    } catch (error) {
      console.error('[ScrepJsParser] screp-js Parsing fehlgeschlagen:', error);
      throw new Error(`screp-js Parsing fehlgeschlagen: ${error}`);
    }
  }

  private convertScrepResult(screpResult: ScrepJsResult): FinalReplayResult {
    console.log('[ScrepJsParser] Konvertiere screp-js Ergebnis zu FinalReplayResult mit intelligenter Build Order Analyse');
    
    // Erstmal die komplette Struktur von screpResult loggen
    console.log('[ScrepJsParser] COMPLETE screpResult structure:', {
      keys: Object.keys(screpResult),
      computed: screpResult.computed ? Object.keys(screpResult.computed) : 'none',
      header: screpResult.header ? Object.keys(screpResult.header) : 'none',
      players: screpResult.players ? screpResult.players.length : 'none'
    });
    
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

    // Intelligente Build Order Analyse
    const buildOrderAnalysis: Record<number, { timeline: BuildOrderTimeline; insights: StrategicInsight[] }> = {};
    
    console.log('[ScrepJsParser] Starte intelligente Build Order Extraktion');
    
    // DEBUGGING: Alle möglichen Command-Quellen prüfen
    const possibleCommandSources = [
      { name: 'Commands', data: (screpResult as any).Commands },
      { name: 'commands', data: (screpResult as any).commands },
      { name: 'computed.commands', data: screpResult.computed?.commands },
      { name: 'computed.buildOrders', data: screpResult.computed?.buildOrders },
      { name: 'rawCommands', data: (screpResult as any).rawCommands },
      { name: 'actions', data: (screpResult as any).actions },
      { name: 'gameData', data: (screpResult as any).gameData },
      { name: 'data', data: (screpResult as any).data }
    ];
    
    console.log('[ScrepJsParser] Checking all possible command sources:');
    possibleCommandSources.forEach(source => {
      if (source.data) {
        console.log(`[ScrepJsParser] ${source.name}:`, {
          type: typeof source.data,
          isArray: Array.isArray(source.data),
          length: source.data.length || Object.keys(source.data).length,
          firstItem: Array.isArray(source.data) ? source.data[0] : source.data[0] || 'not array'
        });
      } else {
        console.log(`[ScrepJsParser] ${source.name}: not available`);
      }
    });
    
    // Finde die beste Command-Quelle
    let commands: any[] = [];
    
    // Versuche verschiedene Quellen
    if (screpResult.computed?.buildOrders && Array.isArray(screpResult.computed.buildOrders)) {
      console.log('[ScrepJsParser] Using computed.buildOrders as command source');
      
      // Build Orders pro Spieler extrahieren
      screpResult.computed.buildOrders.forEach((playerBuildOrder, playerIndex) => {
        if (Array.isArray(playerBuildOrder)) {
          playerBuildOrder.forEach((buildItem, itemIndex) => {
            commands.push({
              Player: playerIndex,
              PlayerID: playerIndex,
              frame: buildItem.frame || (itemIndex * 100), // Fallback frame
              type: 'Build',
              typeString: `Build ${buildItem.unitName || buildItem.action}`,
              parameters: {
                unitName: buildItem.unitName,
                unitType: this.getUnitIdFromName(buildItem.unitName)
              },
              timestamp: buildItem.timestamp || buildItem.time,
              action: buildItem.action,
              supply: buildItem.supply || 0
            });
          });
        }
      });
      
      console.log('[ScrepJsParser] Extracted', commands.length, 'commands from buildOrders');
    } else if ((screpResult as any).Commands && Array.isArray((screpResult as any).Commands)) {
      commands = (screpResult as any).Commands;
      console.log('[ScrepJsParser] Using Commands array:', commands.length);
    } else if ((screpResult as any).commands && Array.isArray((screpResult as any).commands)) {
      commands = (screpResult as any).commands;
      console.log('[ScrepJsParser] Using commands array:', commands.length);
    }
    
    console.log('[ScrepJsParser] Final commands count:', commands.length);
    
    if (commands && commands.length > 0) {
      console.log('[ScrepJsParser] Sample command structure:', commands[0]);
      
      players.forEach((player, index) => {
        const playerCommands = commands.filter((cmd: any) => 
          (cmd.PlayerID === index || cmd.Player === index)
        );
        console.log(`[ScrepJsParser] Player ${index} (${player.name}): ${playerCommands.length} commands`);
        
        if (playerCommands.length > 0) {
          try {
            console.log(`[ScrepJsParser] Sample player ${index} command:`, playerCommands[0]);
            
            const timeline = BuildOrderExtractor.extractFromCommands(
              playerCommands,
              player,
              header.frames
            );
            
            const insights = StrategicAnalyzer.analyzePlayer(timeline);
            
            buildOrderAnalysis[index] = { timeline, insights };
            
            console.log(`[ScrepJsParser] Player ${index} Build Order: ${timeline.actions.length} actions, ${insights.length} insights`);
          } catch (error) {
            console.error(`[ScrepJsParser] Build Order Analyse für Player ${index} fehlgeschlagen:`, error);
            
            // Fallback: Leere Timeline
            buildOrderAnalysis[index] = {
              timeline: {
                playerName: player.name,
                race: player.race,
                actions: [],
                analysis: {
                  strategy: 'error during extraction',
                  economicTiming: 0,
                  militaryTiming: 0,
                  techTiming: 0,
                  errors: [`Command extraction failed: ${error}`],
                  suggestions: ['Parser needs improvement for this replay format'],
                  efficiency: 0
                }
              },
              insights: []
            };
          }
        } else {
          console.log(`[ScrepJsParser] Keine Commands für Player ${index} verfügbar`);
          buildOrderAnalysis[index] = {
            timeline: {
              playerName: player.name,
              race: player.race,
              actions: [],
              analysis: {
                strategy: 'no player commands',
                economicTiming: 0,
                militaryTiming: 0,
                techTiming: 0,
                errors: ['Keine Commands für diesen Spieler gefunden'],
                suggestions: ['Commands könnten anders strukturiert sein'],
                efficiency: 0
              }
            },
            insights: []
          };
        }
      });
    } else {
      console.warn('[ScrepJsParser] Keine Commands verfügbar für Build Order Analyse');
      
      // Fallback für alle Spieler
      players.forEach((player, index) => {
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
              errors: ['Keine Commands in screp-js Ergebnis gefunden'],
              suggestions: ['Prüfe screp-js Version und Replay-Format'],
              efficiency: 0
            }
          },
          insights: []
        };
      });
    }

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

    // Build Orders von screp-js übernehmen (legacy)
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
      commandsFound: commands.length,
      playersFound: players.length,
      apmCalculated: screpResult.computed.apm.some(apm => apm > 0),
      eapmCalculated: screpResult.computed.eapm.some(eapm => eapm > 0)
    };

    return {
      header,
      players,
      buildOrderAnalysis,
      gameplayAnalysis,
      buildOrders,
      dataQuality
    };
  }

  private getUnitIdFromName(unitName: string): number {
    // Mapping der häufigsten Unit-Namen zu IDs
    const unitMap: Record<string, number> = {
      'SCV': 7,
      'Probe': 64,
      'Drone': 41,
      'Marine': 0,
      'Zealot': 65,
      'Zergling': 37,
      'Supply Depot': 106,
      'Pylon': 60,
      'Overlord': 42,
      'Gateway': 133,
      'Barracks': 109,
      'Spawning Pool': 142,
      'Cybernetics Core': 155
    };
    
    return unitMap[unitName] || 0;
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
