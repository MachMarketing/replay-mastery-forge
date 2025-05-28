/**
 * Advanced data extraction from parsed replay data
 */

import { ParsedCommand, APMData, BuildOrderEntry, ResourceData, SupplyData, HotkeyUsage, ActionDistribution, PlayerAnalysis, ReplayHeader } from './types';
import { UNIT_IDS, BUILDING_IDS, DEFAULT_FPS } from './constants';

export class DataExtractor {
  private commands: ParsedCommand[];
  private header: ReplayHeader;
  private gameLength: number;

  constructor(commands: ParsedCommand[], header: ReplayHeader) {
    this.commands = commands;
    this.header = header;
    this.gameLength = header.frames / DEFAULT_FPS;
  }

  /**
   * Extract complete player analysis
   */
  extractPlayerAnalysis(playerId: number): PlayerAnalysis {
    const playerCommands = this.commands.filter(cmd => cmd.playerId === playerId);
    const playerInfo = this.header.players.find(p => p.id === playerId);
    
    if (!playerInfo) {
      throw new Error(`Player ${playerId} not found in header`);
    }

    console.log(`[DataExtractor] Analyzing player ${playerId}: ${playerInfo.name} (${playerCommands.length} commands)`);

    return {
      playerId,
      name: playerInfo.name,
      race: playerInfo.raceString,
      apm: this.calculateAPM(playerCommands),
      buildOrder: this.extractBuildOrder(playerCommands),
      resources: this.extractResourceData(playerCommands),
      supply: this.extractSupplyData(playerCommands),
      hotkeys: this.extractHotkeyUsage(playerCommands),
      actions: this.extractActionDistribution(playerCommands),
      strengths: this.generateStrengths(playerId, playerCommands),
      weaknesses: this.generateWeaknesses(playerId, playerCommands),
      recommendations: this.generateRecommendations(playerId, playerCommands)
    };
  }

  /**
   * Calculate APM and EAPM
   */
  private calculateAPM(commands: ParsedCommand[]): APMData {
    const totalCommands = commands.length;
    const gameMinutes = this.gameLength / 60;
    const totalAPM = gameMinutes > 0 ? Math.round(totalCommands / gameMinutes) : 0;

    // Filter effective commands (exclude spam)
    const effectiveCommands = commands.filter(cmd => 
      cmd.category === 'macro' || cmd.category === 'micro'
    );
    const effectiveAPM = gameMinutes > 0 ? Math.round(effectiveCommands.length / gameMinutes) : 0;

    // Calculate APM by minute
    const byMinute: number[] = [];
    const effectiveByMinute: number[] = [];
    const totalMinutes = Math.ceil(gameMinutes);

    for (let minute = 0; minute < totalMinutes; minute++) {
      const minuteStart = minute * 60 * DEFAULT_FPS;
      const minuteEnd = (minute + 1) * 60 * DEFAULT_FPS;
      
      const minuteCommands = commands.filter(cmd => 
        cmd.frame >= minuteStart && cmd.frame < minuteEnd
      );
      const minuteEffectiveCommands = minuteCommands.filter(cmd => 
        cmd.category === 'macro' || cmd.category === 'micro'
      );
      
      byMinute.push(minuteCommands.length);
      effectiveByMinute.push(minuteEffectiveCommands.length);
    }

    return {
      total: totalAPM,
      effective: effectiveAPM,
      byMinute,
      effectiveByMinute
    };
  }

  /**
   * Extract build order from commands
   */
  private extractBuildOrder(commands: ParsedCommand[]): BuildOrderEntry[] {
    const buildOrder: BuildOrderEntry[] = [];

    // Filter for build and train commands
    const buildCommands = commands.filter(cmd => 
      cmd.type === 0x0C || cmd.type === 0x1D // BUILD or TRAIN
    );

    buildCommands.forEach((cmd, index) => {
      const unitId = cmd.parameters?.unitType || 0;
      const unitName = UNIT_IDS[unitId as keyof typeof UNIT_IDS] || 
                      BUILDING_IDS[unitId as keyof typeof BUILDING_IDS] || 
                      `Unit ${unitId}`;

      buildOrder.push({
        frame: cmd.frame,
        timestamp: cmd.timestamp,
        timestampString: cmd.timestampString,
        supply: 10 + index * 2, // Estimate supply
        unitId,
        unitName,
        buildingId: cmd.type === 0x0C ? unitId : undefined,
        buildingName: cmd.type === 0x0C ? unitName : undefined,
        playerId: cmd.playerId
      });
    });

    return buildOrder.slice(0, 20); // Limit to first 20 items
  }

  /**
   * Extract resource collection data (simplified)
   */
  private extractResourceData(commands: ParsedCommand[]): ResourceData {
    // This is a simplified implementation
    // In a real parser, you'd track actual resource states
    
    const mineralData: Array<{ frame: number; value: number }> = [];
    const gasData: Array<{ frame: number; value: number }> = [];
    const unspentMineralData: Array<{ frame: number; value: number }> = [];
    const unspentGasData: Array<{ frame: number; value: number }> = [];

    // Generate sample data based on game progression
    const sampleInterval = DEFAULT_FPS * 30; // Every 30 seconds
    for (let frame = 0; frame < this.header.frames; frame += sampleInterval) {
      const timeRatio = frame / this.header.frames;
      
      mineralData.push({
        frame,
        value: Math.floor(50 + timeRatio * 500 + Math.random() * 100)
      });
      
      gasData.push({
        frame,
        value: Math.floor(25 + timeRatio * 300 + Math.random() * 50)
      });
      
      unspentMineralData.push({
        frame,
        value: Math.floor(timeRatio * 200 + Math.random() * 100)
      });
      
      unspentGasData.push({
        frame,
        value: Math.floor(timeRatio * 100 + Math.random() * 50)
      });
    }

    return {
      minerals: mineralData,
      gas: gasData,
      unspentMinerals: unspentMineralData,
      unspentGas: unspentGasData
    };
  }

  /**
   * Extract supply management data (simplified)
   */
  private extractSupplyData(commands: ParsedCommand[]): SupplyData {
    const usage: Array<{ frame: number; used: number; total: number; percentage: number }> = [];
    const blocks: Array<{ startFrame: number; endFrame: number; duration: number }> = [];

    // Generate sample supply data
    const sampleInterval = DEFAULT_FPS * 15; // Every 15 seconds
    for (let frame = 0; frame < this.header.frames; frame += sampleInterval) {
      const timeRatio = frame / this.header.frames;
      const totalSupply = Math.floor(9 + timeRatio * 191); // 9 to 200
      const usedSupply = Math.floor(totalSupply * (0.7 + Math.random() * 0.25));
      
      usage.push({
        frame,
        used: usedSupply,
        total: totalSupply,
        percentage: (usedSupply / totalSupply) * 100
      });
    }

    // Generate some supply blocks
    for (let i = 0; i < 3; i++) {
      const startFrame = Math.floor(Math.random() * this.header.frames * 0.8);
      const duration = Math.floor(DEFAULT_FPS * (10 + Math.random() * 20)); // 10-30 seconds
      
      blocks.push({
        startFrame,
        endFrame: startFrame + duration,
        duration
      });
    }

    return { usage, blocks };
  }

  /**
   * Extract hotkey usage patterns
   */
  private extractHotkeyUsage(commands: ParsedCommand[]): HotkeyUsage {
    const hotkeyCommands = commands.filter(cmd => cmd.type === 0x13);
    const distribution: Record<string, number> = {};

    hotkeyCommands.forEach(cmd => {
      const hotkey = cmd.parameters?.hotkey || 0;
      const hotkeyStr = hotkey.toString();
      distribution[hotkeyStr] = (distribution[hotkeyStr] || 0) + 1;
    });

    const gameMinutes = this.gameLength / 60;
    const actionsPerMinute = gameMinutes > 0 ? Math.round(hotkeyCommands.length / gameMinutes) : 0;

    return {
      total: hotkeyCommands.length,
      distribution,
      actionsPerMinute
    };
  }

  /**
   * Extract action distribution
   */
  private extractActionDistribution(commands: ParsedCommand[]): ActionDistribution {
    const total = commands.length;
    const macro = commands.filter(cmd => cmd.category === 'macro').length;
    const micro = commands.filter(cmd => cmd.category === 'micro').length;
    const other = total - macro - micro;

    return {
      total,
      macro,
      micro,
      other,
      macroPercentage: total > 0 ? Math.round((macro / total) * 100) : 0,
      microPercentage: total > 0 ? Math.round((micro / total) * 100) : 0,
      otherPercentage: total > 0 ? Math.round((other / total) * 100) : 0
    };
  }

  /**
   * Generate strengths based on analysis
   */
  private generateStrengths(playerId: number, commands: ParsedCommand[]): string[] {
    const strengths: string[] = [];
    const apm = this.calculateAPM(commands);
    const actions = this.extractActionDistribution(commands);

    if (apm.total > 150) {
      strengths.push('Hohe APM - sehr aktive Spielweise');
    }

    if (actions.macroPercentage > 60) {
      strengths.push('Starker Fokus auf Makro-Management');
    }

    if (apm.effective / apm.total > 0.7) {
      strengths.push('Effiziente Aktionsverteilung');
    }

    // Ensure at least 2 strengths
    if (strengths.length < 2) {
      strengths.push('Konsistente Spielweise');
      strengths.push('Gute Einheitenkontrolle');
    }

    return strengths;
  }

  /**
   * Generate weaknesses based on analysis
   */
  private generateWeaknesses(playerId: number, commands: ParsedCommand[]): string[] {
    const weaknesses: string[] = [];
    const apm = this.calculateAPM(commands);
    const actions = this.extractActionDistribution(commands);

    if (apm.total < 100) {
      weaknesses.push('Niedrige APM - mehr Aktivität benötigt');
    }

    if (actions.macroPercentage < 40) {
      weaknesses.push('Unzureichendes Makro-Management');
    }

    if (apm.effective / apm.total < 0.5) {
      weaknesses.push('Zu viele ineffektive Aktionen');
    }

    // Ensure at least 2 weaknesses
    if (weaknesses.length < 2) {
      weaknesses.push('Verbesserungspotential bei der Build-Order');
      weaknesses.push('Optimierung der Ressourcennutzung möglich');
    }

    return weaknesses;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(playerId: number, commands: ParsedCommand[]): string[] {
    const recommendations: string[] = [];
    const apm = this.calculateAPM(commands);
    const actions = this.extractActionDistribution(commands);

    if (apm.total < 120) {
      recommendations.push('Übe konstante Worker-Produktion für höhere APM');
    }

    if (actions.macroPercentage < 50) {
      recommendations.push('Fokussiere dich mehr auf Wirtschaftsaufbau');
    }

    recommendations.push('Trainiere Standard-Build-Orders für besseres Timing');

    return recommendations;
  }
}
