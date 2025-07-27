/**
 * Unified StarCraft Remastered Replay Parser
 * Consolidates all parser implementations into a single, reliable parser
 */

import { BWRemasteredParser } from '../nativeReplayParser/bwRemastered/parser';
import { BWBinaryReader } from '../nativeReplayParser/bwRemastered/binaryReader';

export interface UnifiedReplayData {
  mapName: string;
  totalFrames: number;
  duration: string;
  players: Array<{
    name: string;
    race: string;
    apm: number;
    team: number;
    color: number;
  }>;
  buildOrder: Array<{
    frame: number;
    time: string;
    action: string;
    unit?: string;
    building?: string;
    supply: number;
  }>;
  commands: Array<{
    frame: number;
    userId: number;
    type: number;
    typeString: string;
  }>;
  gameType: string;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export class UnifiedReplayParser {
  /**
   * Parse a StarCraft Remastered replay file
   */
  static async parseReplay(buffer: ArrayBuffer): Promise<UnifiedReplayData> {
    console.log('[UnifiedParser] Starting SC:R replay parsing');
    console.log('[UnifiedParser] Buffer size:', buffer.byteLength);

    try {
      // Use the BWRemastered parser as the primary parser
      const parser = new BWRemasteredParser(buffer);
      const replayData = await parser.parseReplay();

      // Convert to unified format
      const result: UnifiedReplayData = {
        mapName: replayData.mapName,
        totalFrames: replayData.totalFrames,
        duration: replayData.duration,
        players: replayData.players.map((player, index) => ({
          name: player.name,
          race: player.raceString,
          apm: this.calculatePlayerAPM(replayData.commands, player.slotId),
          team: player.team,
          color: player.color
        })),
        buildOrder: this.extractBuildOrder(replayData.commands, replayData.players),
        commands: replayData.commands.map(cmd => ({
          frame: cmd.frame,
          userId: cmd.userId,
          type: cmd.type,
          typeString: cmd.typeString
        })),
        gameType: replayData.gameType,
        analysis: this.generateAnalysis(replayData.commands, replayData.players)
      };

      console.log('[UnifiedParser] Parsing completed successfully');
      return result;

    } catch (error) {
      console.error('[UnifiedParser] Parsing failed:', error);
      throw new Error(`Unified parsing failed: ${error}`);
    }
  }

  /**
   * Calculate APM for a specific player
   */
  private static calculatePlayerAPM(commands: any[], playerId: number): number {
    const playerCommands = commands.filter(cmd => cmd.userId === playerId);
    
    // Filter out sync commands for APM calculation
    const actionCommands = playerCommands.filter(cmd => 
      ![0x00, 0x01, 0x02, 0x36].includes(cmd.type)
    );
    
    if (commands.length === 0) return 0;
    
    const maxFrame = Math.max(...commands.map(c => c.frame));
    const gameMinutes = maxFrame / (23.81 * 60); // SC:R FPS
    
    return gameMinutes > 0 ? Math.round(actionCommands.length / gameMinutes) : 0;
  }

  /**
   * Extract build order from commands
   */
  private static extractBuildOrder(commands: any[], players: any[]): any[] {
    const buildOrder: any[] = [];
    
    // Filter for build commands (simplified)
    const buildCommands = commands.filter(cmd => 
      [0x0C, 0x14, 0x1E, 0x20].includes(cmd.type) // Build/train commands
    );

    buildCommands.forEach(cmd => {
      const timeString = this.frameToTime(cmd.frame);
      
      buildOrder.push({
        frame: cmd.frame,
        time: timeString,
        action: this.getActionString(cmd.type),
        unit: this.getUnitString(cmd.type),
        building: this.getBuildingString(cmd.type),
        supply: Math.floor(cmd.frame / 100) // Simplified supply calculation
      });
    });

    return buildOrder.sort((a, b) => a.frame - b.frame);
  }

  /**
   * Generate analysis based on commands and players
   */
  private static generateAnalysis(commands: any[], players: any[]): any {
    const analysis = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      recommendations: [] as string[]
    };

    // Basic analysis logic
    const totalCommands = commands.length;
    const gameLength = Math.max(...commands.map(c => c.frame)) / (23.81 * 60);

    if (totalCommands / gameLength > 150) {
      analysis.strengths.push('High APM - Good micro management');
    } else if (totalCommands / gameLength < 50) {
      analysis.weaknesses.push('Low APM - Consider increasing actions per minute');
      analysis.recommendations.push('Practice hotkeys and unit control');
    }

    // Early game analysis
    const earlyCommands = commands.filter(c => c.frame < 23.81 * 60 * 5); // First 5 minutes
    if (earlyCommands.length < 100) {
      analysis.weaknesses.push('Slow early game development');
      analysis.recommendations.push('Focus on faster early game build execution');
    }

    return analysis;
  }

  /**
   * Helper methods
   */
  private static frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private static getActionString(type: number): string {
    const actions: Record<number, string> = {
      0x0C: 'Build',
      0x14: 'Train Unit',
      0x1E: 'Research',
      0x20: 'Upgrade'
    };
    return actions[type] || 'Action';
  }

  private static getUnitString(type: number): string {
    // Simplified unit mapping
    return type === 0x14 ? 'Unit' : undefined;
  }

  private static getBuildingString(type: number): string {
    // Simplified building mapping
    return type === 0x0C ? 'Building' : undefined;
  }
}