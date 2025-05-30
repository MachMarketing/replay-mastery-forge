
/**
 * Enhanced Command Extractor with Complete screp Integration
 * Now uses SectionBasedParser and CompleteCommandParser for 100% compatibility
 */

import { SectionBasedParser } from './sectionBasedParser';
import { CompleteCommandParser } from './completeCommandParser';
import { EnhancedFormatDetector } from './enhancedFormatDetector';
import { RepFormat, framesToTimeString } from './repcore/constants';

export interface EnhancedCommandResult {
  commands: any[];
  totalFrames: number;
  format: RepFormat;
  parseErrors: number;
  eapmData: {
    eapm: number;
    totalEffective: number;
    totalCommands: number;
    efficiency: number;
  };
  header: any;
  sections: any[];
}

export class EnhancedCommandExtractor {
  private buffer: ArrayBuffer;
  
  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
  }

  /**
   * Extract commands using complete screp-compatible pipeline
   */
  async extractCommands(): Promise<EnhancedCommandResult> {
    console.log('[EnhancedCommandExtractor] Starting screp-compatible extraction');
    console.log('[EnhancedCommandExtractor] Buffer size:', this.buffer.byteLength);
    
    try {
      // Phase 1: Format Detection
      const formatResult = EnhancedFormatDetector.detectFormat(new Uint8Array(this.buffer.slice(0, 30)));
      console.log('[EnhancedCommandExtractor] Format detection:', formatResult);
      
      if (formatResult.format === RepFormat.Unknown || formatResult.confidence < 0.5) {
        throw new Error(`Invalid replay format. Confidence: ${formatResult.confidence}`);
      }
      
      // Phase 2: Section-based Parsing
      const sectionParser = new SectionBasedParser(this.buffer);
      const parsedReplay = await sectionParser.parseReplay();
      
      console.log('[EnhancedCommandExtractor] Section parsing complete:', {
        format: parsedReplay.format,
        sectionsCount: parsedReplay.sections.length,
        playersCount: parsedReplay.header.players.length,
        mapName: parsedReplay.header.map
      });
      
      // Phase 3: Command Extraction from Commands Section
      const commandsSection = parsedReplay.sections.find(s => s.name === 'Commands');
      if (!commandsSection || commandsSection.data.length === 0) {
        console.warn('[EnhancedCommandExtractor] No commands section found');
        return this.createEmptyResult(parsedReplay);
      }
      
      // Phase 4: Complete Command Parsing
      const commandParser = new CompleteCommandParser(commandsSection.data);
      const parseResult = commandParser.parseCommands();
      
      console.log('[EnhancedCommandExtractor] Command parsing complete:', {
        totalCommands: parseResult.commands.length,
        totalFrames: parseResult.totalFrames,
        parseErrors: parseResult.parseErrors,
        eapm: parseResult.eapmData.eapm,
        efficiency: parseResult.eapmData.efficiency
      });
      
      // Phase 5: Convert to enhanced format
      const enhancedCommands = this.convertToEnhancedFormat(parseResult.commands);
      
      return {
        commands: enhancedCommands,
        totalFrames: parseResult.totalFrames,
        format: parsedReplay.format,
        parseErrors: parseResult.parseErrors,
        eapmData: parseResult.eapmData,
        header: parsedReplay.header,
        sections: parsedReplay.sections
      };
      
    } catch (error) {
      console.error('[EnhancedCommandExtractor] Extraction failed:', error);
      throw new Error(`Enhanced extraction failed: ${error}`);
    }
  }

  /**
   * Convert parsed commands to enhanced format for UI compatibility
   */
  private convertToEnhancedFormat(commands: any[]): any[] {
    return commands.map(cmd => ({
      frame: cmd.frame,
      playerId: cmd.playerID,
      commandId: cmd.type,
      commandName: cmd.typeString,
      parameters: cmd.parameters,
      timeString: cmd.time,
      ineffKind: cmd.ineffKind,
      effective: cmd.effective,
      ineffectiveReason: cmd.ineffectiveReason,
      
      // Additional enhanced fields
      timestamp: cmd.time,
      actionType: this.getActionType(cmd.type, cmd.typeString),
      actionName: this.getActionName(cmd.typeString, cmd.parameters),
      isMicroAction: this.isMicroAction(cmd.type),
      isEconomicAction: this.isEconomicAction(cmd.type),
      priority: this.getCommandPriority(cmd.type),
      unitName: this.getUnitName(cmd.parameters),
      position: cmd.parameters?.pos,
      details: this.formatCommandDetails(cmd.typeString, cmd.parameters)
    }));
  }

  /**
   * Determine action type from command
   */
  private getActionType(commandType: number, commandName: string): string {
    const buildCommands = ['Build', 'Train', 'Train Unit', 'Building Morph'];
    const moveCommands = ['Move', 'Right Click', 'Attack Move', 'Patrol'];
    const selectCommands = ['Select', 'Shift Select', 'Shift Deselect'];
    const techCommands = ['Research', 'Upgrade'];
    
    if (buildCommands.some(cmd => commandName.includes(cmd))) return 'build';
    if (commandName.includes('Train')) return 'train';
    if (moveCommands.some(cmd => commandName.includes(cmd))) return 'move';
    if (commandName.includes('Attack')) return 'attack';
    if (selectCommands.some(cmd => commandName.includes(cmd))) return 'select';
    if (commandName.includes('Hotkey')) return 'hotkey';
    if (techCommands.some(cmd => commandName.includes(cmd))) return 'research';
    
    return 'unknown';
  }

  /**
   * Get action name for UI
   */
  private getActionName(commandName: string, parameters: any): string {
    if (parameters?.unit) {
      return `${commandName} ${parameters.unit}`;
    }
    if (parameters?.pos) {
      return `${commandName} at (${parameters.pos.x}, ${parameters.pos.y})`;
    }
    if (parameters?.message) {
      return `Chat: ${parameters.message.substring(0, 30)}...`;
    }
    return commandName;
  }

  /**
   * Check if command is micro action
   */
  private isMicroAction(commandType: number): boolean {
    const microCommands = [0x14, 0x09, 0x0A, 0x0B, 0x13, 0x15, 0x16, 0x10, 0x2A, 0x17];
    return microCommands.includes(commandType);
  }

  /**
   * Check if command is economic action
   */
  private isEconomicAction(commandType: number): boolean {
    const economicCommands = [0x0C, 0x1F, 0x1D, 0x2F, 0x31, 0x34, 0x21];
    return economicCommands.includes(commandType);
  }

  /**
   * Get command priority
   */
  private getCommandPriority(commandType: number): 'critical' | 'important' | 'normal' | 'low' {
    const criticalCommands = [0x0C, 0x1F, 0x1D]; // Build, Train
    const importantCommands = [0x14, 0x15, 0x16, 0x11]; // Move, Attack
    const lowCommands = [0x09, 0x0A, 0x0B]; // Select commands
    
    if (criticalCommands.includes(commandType)) return 'critical';
    if (importantCommands.includes(commandType)) return 'important';
    if (lowCommands.includes(commandType)) return 'low';
    return 'normal';
  }

  /**
   * Extract unit name from parameters
   */
  private getUnitName(parameters: any): string | undefined {
    return parameters?.unit || parameters?.techName || parameters?.upgradeName;
  }

  /**
   * Format command details
   */
  private formatCommandDetails(commandName: string, parameters: any): string {
    if (parameters?.pos && parameters?.unit) {
      return `${commandName} ${parameters.unit} at (${parameters.pos.x}, ${parameters.pos.y})`;
    }
    if (parameters?.unit) {
      return `${commandName} ${parameters.unit}`;
    }
    if (parameters?.pos) {
      return `${commandName} at (${parameters.pos.x}, ${parameters.pos.y})`;
    }
    if (parameters?.count) {
      return `${commandName} ${parameters.count} units`;
    }
    if (parameters?.message) {
      return `Chat: ${parameters.message}`;
    }
    return commandName;
  }

  /**
   * Create empty result for failed parsing
   */
  private createEmptyResult(parsedReplay: any): EnhancedCommandResult {
    return {
      commands: [],
      totalFrames: 0,
      format: parsedReplay.format,
      parseErrors: 0,
      eapmData: {
        eapm: 0,
        totalEffective: 0,
        totalCommands: 0,
        efficiency: 0
      },
      header: parsedReplay.header,
      sections: parsedReplay.sections
    };
  }
}
