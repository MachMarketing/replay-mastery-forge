
/**
 * Enhanced screp-js Integration - Kombiniert screp-js mit Command-Extraktion
 */

import { ScrepJsWrapper } from './screpJsWrapper';
import { EnhancedCommandExtractor } from './enhancedCommandExtractor';

export interface EnhancedReplayAnalysis {
  // Basis-Daten von screp-js
  header: {
    mapName: string;
    duration: string;
    frames: number;
    gameType: string;
  };
  players: Array<{
    name: string;
    race: string;
    team: number;
    color: number;
  }>;
  
  // Erweiterte Command-Analyse
  realCommands: any[];
  gameplayMetrics: Record<number, any>;
  gameplayAnalysis: Record<number, any>;
  
  // Qualitätsindikatoren
  dataQuality: {
    commandsExtracted: number;
    realDataPercentage: number;
    analysisReliability: 'high' | 'medium' | 'low';
  };
}

export class EnhancedScrepIntegration {
  /**
   * Vollständige Analyse mit screp-js + Command-Extraktion
   */
  static async analyzeReplay(file: File): Promise<EnhancedReplayAnalysis> {
    console.log('[EnhancedScrepIntegration] Starting comprehensive replay analysis...');
    
    const arrayBuffer = await file.arrayBuffer();
    
    // 1. Basis-Analyse mit screp-js
    const screpWrapper = ScrepJsWrapper.getInstance();
    const screpResult = await screpWrapper.parseReplay(file);
    
    console.log('[EnhancedScrepIntegration] screp-js analysis complete:', {
      mapName: screpResult.header.mapName,
      players: screpResult.players.length,
      duration: screpResult.header.duration
    });
    
    // 2. Erweiterte Command-Extraktion
    const commandExtractor = new EnhancedCommandExtractor(arrayBuffer);
    const realCommands = commandExtractor.extractRealCommands();
    
    console.log('[EnhancedScrepIntegration] Command extraction complete:', realCommands.length, 'commands');
    
    // 3. Gameplay-Metriken berechnen
    const gameplayMetrics = commandExtractor.calculateGameplayMetrics(
      realCommands, 
      screpResult.header.frames
    );
    
    console.log('[EnhancedScrepIntegration] Gameplay metrics calculated for players:', Object.keys(gameplayMetrics));
    
    // 4. Gameplay-Analyse generieren
    const gameplayAnalysis = commandExtractor.generateGameplayAnalysis(realCommands, gameplayMetrics);
    
    // 5. Datenqualität bewerten
    const dataQuality = this.assessDataQuality(screpResult, realCommands, gameplayMetrics);
    
    console.log('[EnhancedScrepIntegration] Analysis complete. Data quality:', dataQuality.analysisReliability);
    
    return {
      header: {
        mapName: screpResult.header.mapName,
        duration: screpResult.header.duration,
        frames: screpResult.header.frames,
        gameType: screpResult.header.gameType
      },
      players: screpResult.players.map(p => ({
        name: p.name,
        race: p.race,
        team: p.team,
        color: p.color
      })),
      realCommands,
      gameplayMetrics,
      gameplayAnalysis,
      dataQuality
    };
  }

  /**
   * Bewerte die Qualität der extrahierten Daten
   */
  private static assessDataQuality(
    screpResult: any, 
    commands: any[], 
    metrics: Record<number, any>
  ): { commandsExtracted: number; realDataPercentage: number; analysisReliability: 'high' | 'medium' | 'low' } {
    const commandsExtracted = commands.length;
    const playersWithMetrics = Object.keys(metrics).length;
    const expectedPlayers = screpResult.players.length;
    
    // Berechne Datenqualität
    let realDataPercentage = 0;
    let reliability: 'high' | 'medium' | 'low' = 'low';
    
    if (commandsExtracted > 100 && playersWithMetrics >= expectedPlayers) {
      realDataPercentage = Math.min(100, (commandsExtracted / 500) * 100);
      
      if (realDataPercentage > 80) {
        reliability = 'high';
      } else if (realDataPercentage > 40) {
        reliability = 'medium';
      }
    }
    
    return {
      commandsExtracted,
      realDataPercentage: Math.round(realDataPercentage),
      analysisReliability: reliability
    };
  }
}
