/**
 * Professioneller SC:R Analyzer - Detaillierte Gameplay-Analyse für Ladder-Verbesserung
 */

import { BuildOrderTimeline, BuildOrderAction } from './buildOrderExtractor';
import { StrategicInsight } from './strategicAnalyzer';

export interface LadderAnalysis {
  overallScore: number;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Pro';
  criticalIssues: StrategicInsight[];
  gameplayTips: string[];
  buildOrderOptimization: string[];
  macroAnalysis: MacroAnalysis;
  microAnalysis: MicroAnalysis;
  strategyRecommendations: string[];
}

export interface MacroAnalysis {
  workerCount: number;
  supplyManagement: 'Excellent' | 'Good' | 'Poor' | 'Critical';
  expansionTiming: number;
  resourceEfficiency: number;
  productionBuildings: number;
}

export interface MicroAnalysis {
  unitControl: 'Excellent' | 'Good' | 'Average' | 'Poor';
  combatEfficiency: number;
  harassmentScore: number;
  defensiveActions: number;
}

export class ProfessionalAnalyzer {
  
  static analyzeLadderPerformance(
    playerTimeline: BuildOrderTimeline, 
    opponentTimeline?: BuildOrderTimeline,
    gameResult?: 'win' | 'loss'
  ): LadderAnalysis {
    
    const macroAnalysis = this.analyzeMacro(playerTimeline);
    const microAnalysis = this.analyzeMicro(playerTimeline);
    const criticalIssues = this.findCriticalIssues(playerTimeline, opponentTimeline);
    const overallScore = this.calculateOverallScore(playerTimeline, macroAnalysis, microAnalysis);
    
    return {
      overallScore,
      skillLevel: this.determineSkillLevel(overallScore),
      criticalIssues,
      gameplayTips: this.generateGameplayTips(playerTimeline, criticalIssues, gameResult),
      buildOrderOptimization: this.optimizeBuildOrder(playerTimeline),
      macroAnalysis,
      microAnalysis,
      strategyRecommendations: this.generateStrategyRecommendations(playerTimeline, opponentTimeline)
    };
  }
  
  private static analyzeMacro(timeline: BuildOrderTimeline): MacroAnalysis {
    const { actions, analysis } = timeline;
    
    // Worker-Analyse
    const workerActions = actions.filter(a => a.category === 'worker');
    const workerCount = workerActions.length;
    
    // Supply-Management
    const supplyBuildings = actions.filter(a => 
      a.unitName.includes('Pylon') || 
      a.unitName.includes('Supply') || 
      a.unitName.includes('Overlord')
    );
    let supplyManagement: MacroAnalysis['supplyManagement'] = 'Poor';
    if (supplyBuildings.length >= Math.floor(actions.length / 6)) supplyManagement = 'Excellent';
    else if (supplyBuildings.length >= Math.floor(actions.length / 8)) supplyManagement = 'Good';
    
    // Expansion Timing
    const expansions = actions.filter(a => 
      a.unitName.includes('Nexus') || 
      a.unitName.includes('Command Center') || 
      a.unitName.includes('Hatchery')
    );
    const expansionTiming = expansions.length > 1 ? expansions[1].frame / 24 : 999;
    
    // Resource Effizienz
    const resourceEfficiency = Math.min(100, analysis.efficiency * 1.2);
    
    // Produktionsgebäude
    const productionBuildings = actions.filter(a => 
      a.unitName.includes('Gateway') || 
      a.unitName.includes('Barracks') || 
      a.unitName.includes('Factory') ||
      a.unitName.includes('Spawning Pool') ||
      a.unitName.includes('Hydralisk Den')
    ).length;
    
    return {
      workerCount,
      supplyManagement,
      expansionTiming,
      resourceEfficiency,
      productionBuildings
    };
  }
  
  private static analyzeMicro(timeline: BuildOrderTimeline): MicroAnalysis {
    const { actions } = timeline;
    
    // Unit Control basiert auf Einheiten-Kommandos
    const unitCommands = actions.filter(a => a.category === 'military');
    let unitControl: MicroAnalysis['unitControl'] = 'Poor';
    if (unitCommands.length > 20) unitControl = 'Excellent';
    else if (unitCommands.length > 15) unitControl = 'Good';
    else if (unitCommands.length > 8) unitControl = 'Average';
    
    // Combat Efficiency (geschätzt basierend auf Aktionen)
    const combatEfficiency = Math.min(100, unitCommands.length * 5);
    
    // Harassment Score
    const harassmentScore = actions.filter(a => 
      a.unitName.includes('Reaver') || 
      a.unitName.includes('Vulture') ||
      a.unitName.includes('Mutalisk') ||
      a.unitName.includes('Dropship')
    ).length * 10;
    
    // Defensive Actions
    const defensiveActions = actions.filter(a => 
      a.unitName.includes('Turret') || 
      a.unitName.includes('Bunker') ||
      a.unitName.includes('Cannon') ||
      a.unitName.includes('Creep Colony')
    ).length;
    
    return {
      unitControl,
      combatEfficiency,
      harassmentScore,
      defensiveActions
    };
  }
  
  private static findCriticalIssues(
    timeline: BuildOrderTimeline, 
    opponentTimeline?: BuildOrderTimeline
  ): StrategicInsight[] {
    const issues: StrategicInsight[] = [];
    const { actions, analysis } = timeline;
    
    // Kritische Build Order Fehler
    if (analysis.efficiency < 50) {
      issues.push({
        type: 'error',
        category: 'efficiency',
        title: 'Schwere Build Order Probleme',
        description: `Nur ${analysis.efficiency}% der Build-Aktionen waren effektiv`,
        impact: 'high',
        actionable: 'Konzentriere dich auf eine einfache, bewährte Build Order und übe sie 10 Spiele lang'
      });
    }
    
    // Worker-Produktion
    const workerActions = actions.filter(a => a.category === 'worker');
    if (workerActions.length < 5) {
      issues.push({
        type: 'error',
        category: 'macro',
        title: 'Kritische Worker-Unterproduktion',
        description: `Nur ${workerActions.length} Worker gebaut - zu wenig für competitive Play`,
        impact: 'high',
        actionable: 'Baue kontinuierlich Worker bis 2-Base Saturation (ca. 40-50 Worker)'
      });
    }
    
    // Timing gegen Gegner
    if (opponentTimeline && analysis.militaryTiming > opponentTimeline.analysis.militaryTiming + 3) {
      issues.push({
        type: 'error',
        category: 'timing',
        title: 'Extrem späte militärische Entwicklung',
        description: 'Gegner war deutlich schneller mit Militär-Einheiten',
        impact: 'high',
        actionable: 'Frühere Aggression oder bessere Scouting für Defensive'
      });
    }
    
    return issues;
  }
  
  private static calculateOverallScore(
    timeline: BuildOrderTimeline,
    macro: MacroAnalysis,
    micro: MicroAnalysis
  ): number {
    let score = 0;
    
    // Effizienz (30 Punkte)
    score += timeline.analysis.efficiency * 0.3;
    
    // Worker Count (25 Punkte)
    score += Math.min(25, macro.workerCount * 2);
    
    // Supply Management (20 Punkte)
    const supplyScores = { Excellent: 20, Good: 15, Poor: 5, Critical: 0 };
    score += supplyScores[macro.supplyManagement];
    
    // Military Timing (15 Punkte)
    if (timeline.analysis.militaryTiming < 3) score += 15;
    else if (timeline.analysis.militaryTiming < 5) score += 10;
    else if (timeline.analysis.militaryTiming < 7) score += 5;
    
    // Unit Control (10 Punkte)
    const unitScores = { Excellent: 10, Good: 7, Average: 4, Poor: 1 };
    score += unitScores[micro.unitControl];
    
    return Math.round(score);
  }
  
  private static determineSkillLevel(score: number): LadderAnalysis['skillLevel'] {
    if (score >= 85) return 'Pro';
    if (score >= 70) return 'Expert';
    if (score >= 55) return 'Advanced';
    if (score >= 35) return 'Intermediate';
    return 'Beginner';
  }
  
  private static generateGameplayTips(
    timeline: BuildOrderTimeline,
    issues: StrategicInsight[],
    gameResult?: 'win' | 'loss'
  ): string[] {
    const tips: string[] = [];
    
    // Basis-Tipps basierend auf Rasse
    switch (timeline.race) {
      case 'Protoss':
        tips.push('Baue immer Pylons vor neuen Gebäuden');
        tips.push('Halte Probe-Produktion konstant');
        tips.push('Scout mit dem ersten Probe nach dem 8. Worker');
        break;
      case 'Terran':
        tips.push('Verwende Hotkeys für Barracks (4) und Factory (5)');
        tips.push('Baue früh Bunker gegen Rushes');
        tips.push('Nutze Scanner Sweeps für Scouting');
        break;
      case 'Zerg':
        tips.push('Injiziere konstant Larven');
        tips.push('Expandiere früher als andere Rassen');
        tips.push('Baue mehr Overlords als nötig');
        break;
    }
    
    // Spezifische Tipps basierend auf Problemen
    if (issues.some(i => i.category === 'efficiency')) {
      tips.push('Lerne eine Standard-Build Order auswendig und übe sie täglich');
    }
    
    if (issues.some(i => i.category === 'macro')) {
      tips.push('Setze Hotkeys für alle Produktionsgebäude');
      tips.push('Checke alle 30 Sekunden: Worker bauen? Supply ok? Geld ausgeben?');
    }
    
    if (gameResult === 'loss') {
      tips.push('Analysiere das Replay: Wo war der Wendepunkt?');
      tips.push('Konzentriere dich auf Basics statt fancy Strategien');
    }
    
    return tips;
  }
  
  private static optimizeBuildOrder(timeline: BuildOrderTimeline): string[] {
    const optimizations: string[] = [];
    const { actions, race } = timeline;
    
    // Erste 10 Aktionen analysieren
    const earlyGame = actions.slice(0, 10);
    
    // Standard Build Orders empfehlen
    switch (race) {
      case 'Protoss':
        optimizations.push('8 Probe -> 9 Pylon -> 12 Gateway -> 13 Zealot');
        optimizations.push('Immer Probe-Produktion zwischen Buildings');
        optimizations.push('Cyber Core nach erstem Gateway für Tech');
        break;
      case 'Terran':
        optimizations.push('8 SCV -> 9 Supply -> 12 Barracks -> 13 Marine');
        optimizations.push('Academy für Medics und Stim');
        optimizations.push('Factory für Tanks gegen Protoss');
        break;
      case 'Zerg':
        optimizations.push('9 Drone -> 9 Overlord -> 12 Spawning Pool');
        optimizations.push('Frühe Expansion nach 6 Zerglings');
        optimizations.push('Hydralisk Den gegen Air-Units');
        break;
    }
    
    return optimizations;
  }
  
  private static generateStrategyRecommendations(
    timeline: BuildOrderTimeline,
    opponentTimeline?: BuildOrderTimeline
  ): string[] {
    const recommendations: string[] = [];
    
    if (opponentTimeline) {
      // Matchup-spezifische Empfehlungen
      const playerRace = timeline.race;
      const opponentRace = opponentTimeline.race;
      const matchup = `${playerRace}v${opponentRace}`;
      
      switch (matchup) {
        case 'ProtossvTerran':
          recommendations.push('Frühe Dragoons gegen Marines');
          recommendations.push('Reavers für Splash Damage');
          recommendations.push('Observers gegen Cloaked Units');
          break;
        case 'ProtossvZerg':
          recommendations.push('Wall-in gegen Zergling Rush');
          recommendations.push('Cannons gegen Mutalisk Harass');
          recommendations.push('High Templars für Storms');
          break;
        case 'TerranvProtoss':
          recommendations.push('Tanks für Defensive');
          recommendations.push('Vultures für Map Control');
          recommendations.push('Science Vessels gegen Arbiters');
          break;
        case 'TerranvZerg':
          recommendations.push('Marines + Medics');
          recommendations.push('Firebats gegen Zerglings');
          recommendations.push('Turrets gegen Mutas');
          break;
        case 'ZergvProtoss':
          recommendations.push('Frühe Expansion');
          recommendations.push('Hydralisks gegen Air-Units');
          recommendations.push('Lurkers für Defensive');
          break;
        case 'ZergvTerran':
          recommendations.push('Muta-Harass');
          recommendations.push('Zerglings für Run-bys');
          recommendations.push('Ultralisks gegen Mech');
          break;
      }
    }
    
    // Allgemeine Strategien
    recommendations.push('Verwende Control Groups für bessere Unit Control');
    recommendations.push('Scout regelmäßig für Information');
    recommendations.push('Expandiere wenn du sicher bist');
    
    return recommendations;
  }
}