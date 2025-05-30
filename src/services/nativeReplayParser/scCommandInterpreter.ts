/**
 * SC Command Interpreter - Interprets raw commands into human-readable actions
 */

import { framesToTimeString } from './bwRemastered/enhancedConstants';

export interface InterpretedCommand {
  frame: number;
  time: string;
  timestamp: string; // Add for UI compatibility
  playerIndex: number;
  commandType: string;
  actionType: 'build' | 'train' | 'move' | 'attack' | 'select' | 'hotkey' | 'research' | 'upgrade' | 'unknown';
  actionName: string; // Add for UI compatibility
  details: string;
  position?: { x: number; y: number };
  targetUnit?: string;
  buildingType?: string;
  unitType?: string;
  unitName?: string; // Add for UI compatibility
  isMicroAction: boolean;
  isEconomicAction: boolean;
  estimatedSupply: number;
  ineffective?: boolean;
  ineffectiveReason?: string;
  priority?: 'critical' | 'important' | 'normal' | 'low'; // Add for UI compatibility
}

export class SCCommandInterpreter {
  static interpretCommand(command: any, previousCommands: InterpretedCommand[]): InterpretedCommand {
    const { frame, playerId, commandName, parameters } = command;
    const time = framesToTimeString(frame);
    let actionType: InterpretedCommand['actionType'] = 'unknown';
    let details = `Unknown command: ${commandName}`;
    let isMicroAction = false;
    let isEconomicAction = false;
    let buildingType: string | undefined;
    let unitType: string | undefined;
    let unitName: string | undefined;
    let priority: 'critical' | 'important' | 'normal' | 'low' = 'normal';

    switch (commandName) {
      case 'Right Click':
        actionType = 'attack';
        isMicroAction = true;
        priority = 'important';
        details = `Attack at x=${parameters?.x}, y=${parameters?.y}`;
        break;

      case 'Move':
        actionType = 'move';
        isMicroAction = true;
        priority = 'important';
        details = `Move to x=${parameters?.x}, y=${parameters?.y}`;
        break;

      case 'Build':
        actionType = 'build';
        isEconomicAction = true;
        priority = 'critical';
        buildingType = this.getBuildingName(parameters?.unitType);
        unitName = buildingType;
        details = `Build ${buildingType} at x=${parameters?.x}, y=${parameters?.y}`;
        break;

      case 'Train':
        actionType = 'train';
        isEconomicAction = true;
        priority = 'critical';
        unitType = this.getUnitName(parameters?.unitType);
        unitName = unitType;
        details = `Train ${unitType}`;
        break;

      case 'Select':
      case 'Shift Select':
        actionType = 'select';
        isMicroAction = true;
        priority = 'low';
        details = `Select ${parameters?.unitCount} units`;
        break;

      case 'Hotkey':
        actionType = 'hotkey';
        isMicroAction = true;
        priority = 'normal';
        details = `Hotkey ${parameters?.hotkey} action ${parameters?.action}`;
        break;

      default:
        priority = 'low';
        break;
    }

    const estimatedSupply = this.estimateSupply(frame, previousCommands);

    return {
      frame,
      time,
      timestamp: time, // UI compatibility
      playerIndex: playerId,
      commandType: commandName,
      actionType,
      actionName: details, // UI compatibility
      details,
      position: parameters ? { x: parameters.x || 0, y: parameters.y || 0 } : undefined,
      buildingType,
      unitType,
      unitName, // UI compatibility
      isMicroAction,
      isEconomicAction,
      estimatedSupply,
      priority // UI compatibility
    };
  }

  static analyzeGameplay(commands: InterpretedCommand[]): any {
    const buildOrder = commands.filter(cmd => cmd.actionType === 'build' || cmd.actionType === 'train')
      .map(cmd => ({
        time: cmd.time,
        action: cmd.details,
        supply: cmd.estimatedSupply,
        unit: cmd.unitType || cmd.buildingType || 'Unknown',
        cost: this.getUnitCost(cmd.unitType || cmd.buildingType)
      }));

    let economicActions = 0;
    let microActions = 0;
    commands.forEach(cmd => {
      if (cmd.isEconomicAction) economicActions++;
      if (cmd.isMicroAction) microActions++;
    });

    const apmBreakdown = {
      economic: economicActions,
      micro: microActions,
      selection: commands.filter(cmd => cmd.actionType === 'select').length,
      spam: commands.filter(cmd => cmd.commandType === 'Unknown').length,
      effective: commands.filter(cmd => !cmd.ineffective).length
    };

    const microEvents = commands.filter(cmd => cmd.isMicroAction)
      .map(cmd => ({
        time: cmd.time,
        action: cmd.details,
        intensity: 1
      }));

    const economicEfficiency = economicActions > 0 ?
      Math.round((economicActions / commands.length) * 100) : 0;

    let playstyle = 'balanced';
    if (economicEfficiency > 70) {
      playstyle = 'economic';
    } else if (microActions > 70) {
      playstyle = 'aggressive';
    }

    return {
      buildOrder,
      apmBreakdown,
      microEvents,
      economicEfficiency,
      playstyle
    };
  }

  private static estimateSupply(frame: number, previousCommands: InterpretedCommand[]): number {
    const relevantCommands = previousCommands.filter(cmd => cmd.frame <= frame);
    return Math.max(9, Math.floor(relevantCommands.length / 3) + 9);
  }

  private static getUnitName(unitType: any): string {
    const unitMap: Record<number, string> = {
      0: 'Marine', 7: 'SCV', 64: 'Probe', 43: 'Drone',
      106: 'Command Center', 154: 'Nexus', 131: 'Hatchery'
    };
    return unitMap[unitType] || 'Unknown Unit';
  }

  private static getBuildingName(buildingType: any): string {
    const buildingMap: Record<number, string> = {
      106: 'Command Center', 154: 'Nexus', 131: 'Hatchery'
    };
    return buildingMap[buildingType] || 'Unknown Building';
  }

  private static getUnitCost(unitName: string | undefined): { minerals: number; gas: number } | undefined {
    const costMap: Record<string, { minerals: number; gas: number }> = {
      'Marine': { minerals: 50, gas: 0 },
      'SCV': { minerals: 50, gas: 0 },
      'Probe': { minerals: 50, gas: 0 },
      'Drone': { minerals: 25, gas: 0 },
    };
    return costMap[unitName || ''] || undefined;
  }
}
