
/**
 * Strategischer Analyzer - Gibt konkrete Verbesserungsvorschläge
 */

import { BuildOrderTimeline, BuildOrderAction } from './buildOrderExtractor';

export interface StrategicInsight {
  type: 'error' | 'warning' | 'suggestion' | 'strength';
  category: 'timing' | 'efficiency' | 'strategy' | 'macro' | 'micro';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: string;
}

export class StrategicAnalyzer {
  
  static analyzePlayer(timeline: BuildOrderTimeline, opponentTimeline?: BuildOrderTimeline): StrategicInsight[] {
    const insights: StrategicInsight[] = [];
    
    // Basis-Timing-Analyse
    insights.push(...this.analyzeTimings(timeline));
    
    // Build Order Effizienz
    insights.push(...this.analyzeEfficiency(timeline));
    
    // Rassen-spezifische Analyse
    insights.push(...this.analyzeRaceSpecific(timeline));
    
    // Vergleich mit Gegner (falls verfügbar)
    if (opponentTimeline) {
      insights.push(...this.analyzeVsOpponent(timeline, opponentTimeline));
    }
    
    // Priorisiere nach Impact
    return insights.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }
  
  private static analyzeTimings(timeline: BuildOrderTimeline): StrategicInsight[] {
    const insights: StrategicInsight[] = [];
    const { actions, analysis, race } = timeline;
    
    // Worker-Produktion Timing
    const workerActions = actions.filter(a => a.category === 'worker');
    if (workerActions.length < 3) {
      insights.push({
        type: 'error',
        category: 'macro',
        title: 'Zu wenig Worker-Produktion',
        description: `Nur ${workerActions.length} Worker gebaut - sollten konstant produziert werden`,
        impact: 'high',
        actionable: 'Baue kontinuierlich Worker für bessere Wirtschaft'
      });
    }
    
    // Erste militärische Einheit
    if (analysis.militaryTiming > 6) {
      insights.push({
        type: 'warning',
        category: 'timing',
        title: 'Sehr späte militärische Produktion',
        description: `Erste Militär-Einheit nach ${analysis.militaryTiming.toFixed(1)} Minuten`,
        impact: 'medium',
        actionable: 'Beginne früher mit militärischer Produktion für bessere Verteidigung'
      });
    }
    
    // Tech-Timing
    if (race === 'Protoss' && analysis.techTiming > 4) {
      insights.push({
        type: 'suggestion',
        category: 'strategy',
        title: 'Tech-Entwicklung könnte früher starten',
        description: 'Cybernetics Core für Upgrades und erweiterte Einheiten',
        impact: 'medium',
        actionable: 'Baue Cybernetics Core früher für Tech-Vorteile'
      });
    }
    
    return insights;
  }
  
  private static analyzeEfficiency(timeline: BuildOrderTimeline): StrategicInsight[] {
    const insights: StrategicInsight[] = [];
    const { actions, analysis } = timeline;
    
    // Build Order Effizienz
    if (analysis.efficiency < 60) {
      insights.push({
        type: 'error',
        category: 'efficiency',
        title: 'Ineffiziente Build Order',
        description: `Nur ${analysis.efficiency}% der Build-Aktionen waren effektiv`,
        impact: 'high',
        actionable: 'Reduziere fehlgeschlagene Build-Versuche und plane besser'
      });
    }
    
    // Supply-Blockaden
    const supplyBuildings = actions.filter(a => 
      a.unitName.includes('Pylon') || 
      a.unitName.includes('Supply') || 
      a.unitName.includes('Overlord')
    );
    
    if (supplyBuildings.length < Math.floor(actions.length / 8)) {
      insights.push({
        type: 'warning',
        category: 'macro',
        title: 'Mögliche Supply-Blockaden',
        description: 'Zu wenige Supply-Gebäude für die Build Order',
        impact: 'medium',
        actionable: 'Baue proaktiv Supply-Gebäude um Blockaden zu vermeiden'
      });
    }
    
    return insights;
  }
  
  private static analyzeRaceSpecific(timeline: BuildOrderTimeline): StrategicInsight[] {
    const insights: StrategicInsight[] = [];
    const { actions, race } = timeline;
    
    switch (race) {
      case 'Protoss':
        insights.push(...this.analyzeProtoss(actions));
        break;
      case 'Terran':
        insights.push(...this.analyzeTerran(actions));
        break;
      case 'Zerg':
        insights.push(...this.analyzeZerg(actions));
        break;
    }
    
    return insights;
  }
  
  private static analyzeProtoss(actions: BuildOrderAction[]): StrategicInsight[] {
    const insights: StrategicInsight[] = [];
    
    // Pylon vor Gateway Check
    const pylon = actions.find(a => a.unitName.includes('Pylon'));
    const gateway = actions.find(a => a.unitName.includes('Gateway'));
    
    if (gateway && (!pylon || pylon.frame > gateway.frame)) {
      insights.push({
        type: 'error',
        category: 'timing',
        title: 'Build Order Fehler: Gateway vor Pylon',
        description: 'Gateway kann nicht ohne Pylon-Power funktionieren',
        impact: 'high',
        actionable: 'Baue immer Pylons vor Produktionsgebäuden'
      });
    }
    
    // Cybernetics Core für Tech
    const cyber = actions.find(a => a.unitName.includes('Cybernetics'));
    const dragoon = actions.find(a => a.unitName.includes('Dragoon'));
    
    if (dragoon && !cyber) {
      insights.push({
        type: 'error',
        category: 'strategy',
        title: 'Dragoons ohne Cybernetics Core',
        description: 'Cybernetics Core wird für Dragoon-Produktion benötigt',
        impact: 'high',
        actionable: 'Baue Cybernetics Core vor erweiterten Einheiten'
      });
    }
    
    return insights;
  }
  
  private static analyzeTerran(actions: BuildOrderAction[]): StrategicInsight[] {
    // Terran-spezifische Analyse
    return [];
  }
  
  private static analyzeZerg(actions: BuildOrderAction[]): StrategicInsight[] {
    // Zerg-spezifische Analyse  
    return [];
  }
  
  private static analyzeVsOpponent(player: BuildOrderTimeline, opponent: BuildOrderTimeline): StrategicInsight[] {
    const insights: StrategicInsight[] = [];
    
    // Timing-Vergleich
    if (player.analysis.militaryTiming > opponent.analysis.militaryTiming + 2) {
      insights.push({
        type: 'warning',
        category: 'strategy',
        title: 'Deutlich langsamere militärische Entwicklung',
        description: `Gegner hatte ${opponent.analysis.militaryTiming.toFixed(1)}min erste Einheit, du ${player.analysis.militaryTiming.toFixed(1)}min`,
        impact: 'high',
        actionable: 'Frühere militärische Produktion für bessere Verteidigung gegen Rushes'
      });
    }
    
    // Wirtschafts-Vergleich
    const playerWorkers = player.actions.filter(a => a.category === 'worker').length;
    const opponentWorkers = opponent.actions.filter(a => a.category === 'worker').length;
    
    if (playerWorkers < opponentWorkers * 0.7) {
      insights.push({
        type: 'suggestion',
        category: 'macro',
        title: 'Schwächere Wirtschaftsentwicklung',
        description: `Gegner baute ${opponentWorkers} Worker, du nur ${playerWorkers}`,
        impact: 'medium',
        actionable: 'Konzentriere dich mehr auf konstante Worker-Produktion'
      });
    }
    
    return insights;
  }
}
