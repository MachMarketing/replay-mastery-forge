/**
 * SC Command Interpreter - Interprets raw commands into human-readable actions
 */

import { framesToTimeString } from './bwRemastered/enhancedConstants';

export interface InterpretedCommand {
  frame: number;
  time: string;
  playerIndex: number;
  commandType: string;
  actionType: 'build' | 'train' | 'move' | 'attack' | 'select' | 'hotkey' | 'research' | 'upgrade' | 'unknown';
  details: string;
  position?: { x: number; y: number };
  targetUnit?: string;
  buildingType?: string;
  unitType?: string;
  isMicroAction: boolean;
  isEconomicAction: boolean;
  estimatedSupply: number;
  ineffective?: boolean;
  ineffectiveReason?: string;
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

    switch (commandName) {
      case 'Right Click':
        actionType = 'attack';
        isMicroAction = true;
        details = `Attack at x=${parameters?.x}, y=${parameters?.y}`;
        break;

      case 'Move':
        actionType = 'move';
        isMicroAction = true;
        details = `Move to x=${parameters?.x}, y=${parameters?.y}`;
        break;

      case 'Build':
        actionType = 'build';
        isEconomicAction = true;
        buildingType = this.getBuildingName(parameters?.unitType);
        details = `Build ${buildingType} at x=${parameters?.x}, y=${parameters?.y}`;
        break;

      case 'Train':
        actionType = 'train';
        isEconomicAction = true;
        unitType = this.getUnitName(parameters?.unitType);
        details = `Train ${unitType}`;
        break;

      case 'Select':
      case 'Shift Select':
        actionType = 'select';
        isMicroAction = true;
        details = `Select ${parameters?.unitCount} units`;
        break;

      case 'Hotkey':
        actionType = 'hotkey';
        isMicroAction = true;
        details = `Hotkey ${parameters?.hotkey} action ${parameters?.action}`;
        break;

      default:
        break;
    }

    const estimatedSupply = this.estimateSupply(frame, previousCommands);

    return {
      frame,
      time,
      playerIndex: playerId,
      commandType: commandName,
      actionType,
      details,
      position: parameters ? { x: parameters.x || 0, y: parameters.y || 0 } : undefined,
      buildingType,
      unitType,
      isMicroAction,
      isEconomicAction,
      estimatedSupply
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
