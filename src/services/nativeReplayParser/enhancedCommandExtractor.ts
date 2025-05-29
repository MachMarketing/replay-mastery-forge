
/**
 * Enhanced Command Extractor - Kombiniert screp-js mit SC:R spezifischer Hex-Analyse
 */

import { HexAnalyzer } from '../replayParser/hexAnalyzer';
import { RemasteredFormatParser, SCRCommand } from './scRemastered/remasteredFormatParser';

export interface ExtractedCommand {
  frame: number;
  playerId: number;
  commandType: number;
  commandName: string;
  x?: number;
  y?: number;
  unitType?: number;
  targetId?: number;
  rawData: Uint8Array;
  parameters?: Record<string, any>;
}

export interface GameplayMetrics {
  apm: number;
  eapm: number;
  buildOrderTiming: number;
  microIntensity: number;
  macroCycles: number;
  commandDistribution: Record<string, number>;
}

export class EnhancedCommandExtractor {
  private data: Uint8Array;
  private hexAnalyzer: HexAnalyzer;
  
  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new Uint8Array(arrayBuffer);
    this.hexAnalyzer = new HexAnalyzer(arrayBuffer);
    
    console.log('[EnhancedCommandExtractor] Initialized with', arrayBuffer.byteLength, 'bytes');
  }

  /**
   * Extrahiere echte Commands mit SC:R spezifischer Analyse
   */
  extractRealCommands(): ExtractedCommand[] {
    console.log('[EnhancedCommandExtractor] Starting SC:R command extraction...');
    console.log('[EnhancedCommandExtractor] Data buffer size:', this.data.length);
    
    // Verwende den neuen SC:R Parser
    const scrResult = RemasteredFormatParser.parseReplay(this.data.buffer);
    console.log('[EnhancedCommandExtractor] SC:R Parser result:', {
      commands: scrResult.commands.length,
      confidence: scrResult.confidence,
      method: scrResult.method
    });
    
    if (scrResult.commands.length > 50) {
      console.log('[EnhancedCommandExtractor] SC:R Parser successful, converting commands...');
      const commands = this.convertSCRCommands(scrResult.commands);
      console.log('[EnhancedCommandExtractor] Converted', commands.length, 'SC:R commands');
      return commands;
    }
    
    console.log('[EnhancedCommandExtractor] SC:R Parser insufficient, trying legacy methods...');
    return this.extractCommandsLegacy();
  }

  /**
   * Convert SC:R commands to ExtractedCommand format
   */
  private convertSCRCommands(scrCommands: SCRCommand[]): ExtractedCommand[] {
    console.log('[EnhancedCommandExtractor] Converting', scrCommands.length, 'SC:R commands');
    
    const commands: ExtractedCommand[] = [];
    
    for (const scrCmd of scrCommands) {
      const command: ExtractedCommand = {
        frame: scrCmd.frame,
        playerId: scrCmd.playerId,
        commandType: scrCmd.commandId,
        commandName: scrCmd.commandName,
        rawData: scrCmd.rawData,
        parameters: scrCmd.parameters || {}
      };
      
      // Extract coordinates if available
      if (scrCmd.parameters?.x !== undefined) {
        command.x = scrCmd.parameters.x;
      }
      if (scrCmd.parameters?.y !== undefined) {
        command.y = scrCmd.parameters.y;
      }
      
      // Extract unit/structure type
      if (scrCmd.parameters?.unitType !== undefined) {
        command.unitType = scrCmd.parameters.unitType;
      } else if (scrCmd.parameters?.structureType !== undefined) {
        command.unitType = scrCmd.parameters.structureType;
      }
      
      // Extract target ID
      if (scrCmd.parameters?.targetId !== undefined) {
        command.targetId = scrCmd.parameters.targetId;
      }
      
      commands.push(command);
    }
    
    console.log('[EnhancedCommandExtractor] Sample converted commands:', 
      commands.slice(0, 5).map(cmd => ({
        frame: cmd.frame,
        player: cmd.playerId,
        command: cmd.commandName
      }))
    );
    
    return commands;
  }

  /**
   * Legacy extraction methods as fallback
   */
  private extractCommandsLegacy(): ExtractedCommand[] {
    console.log('[EnhancedCommandExtractor] Using legacy extraction methods');
    
    // Verwende die ursprünglichen Methoden als Fallback
    const commandSections = this.findCommandSections();
    console.log('[EnhancedCommandExtractor] Legacy: Found command sections:', commandSections.length);
    
    if (commandSections.length === 0) {
      console.log('[EnhancedCommandExtractor] Legacy: No sections found, trying fallback');
      return this.extractCommandsFallback();
    }
    
    const allCommands: ExtractedCommand[] = [];
    
    for (const section of commandSections) {
      console.log(`[EnhancedCommandExtractor] Legacy: Parsing section at offset ${section.offset}, length ${section.length}`);
      const commands = this.parseCommandSection(section);
      console.log(`[EnhancedCommandExtractor] Legacy: Extracted ${commands.length} commands from section`);
      allCommands.push(...commands);
    }
    
    // Sortiere nach Frame-Zeit
    allCommands.sort((a, b) => a.frame - b.frame);
    
    console.log('[EnhancedCommandExtractor] Legacy: Total extracted commands:', allCommands.length);
    return allCommands;
  }

  /**
   * Fallback-Methode für Command-Extraktion
   */
  private extractCommandsFallback(): ExtractedCommand[] {
    console.log('[EnhancedCommandExtractor] Using fallback extraction method');
    
    // Suche nach typischen SC:R Command-Patterns
    const commands: ExtractedCommand[] = [];
    let currentFrame = 0;
    
    // Bekannte SC:R Signaturen
    const patterns = [
      { signature: [0x0C], name: 'Build', length: 7 },
      { signature: [0x14], name: 'Move', length: 4 },
      { signature: [0x15], name: 'Attack', length: 6 },
      { signature: [0x1D], name: 'Train Unit', length: 2 },
      { signature: [0x2F], name: 'Research Tech', length: 2 },
      { signature: [0x31], name: 'Upgrade', length: 2 }
    ];
    
    for (let i = 0; i < this.data.length - 10; i++) {
      // Frame sync detection
      if (this.data[i] === 0x00) {
        currentFrame++;
        continue;
      } else if (this.data[i] === 0x01 && i + 1 < this.data.length) {
        currentFrame += this.data[i + 1];
        i++;
        continue;
      }
      
      // Pattern matching
      for (const pattern of patterns) {
        if (this.matchesPattern(i, pattern.signature)) {
          const command = this.createFallbackCommand(i, currentFrame, pattern);
          if (command) {
            commands.push(command);
            i += pattern.length - 1; // Skip ahead
            break;
          }
        }
      }
    }
    
    console.log('[EnhancedCommandExtractor] Fallback extraction found', commands.length, 'commands');
    return commands;
  }

  /**
   * Prüfe ob Pattern an Position übereinstimmt
   */
  private matchesPattern(position: number, signature: number[]): boolean {
    if (position + signature.length > this.data.length) return false;
    
    for (let i = 0; i < signature.length; i++) {
      if (this.data[position + i] !== signature[i]) return false;
    }
    return true;
  }

  /**
   * Erstelle Command aus Fallback-Pattern
   */
  private createFallbackCommand(position: number, frame: number, pattern: any): ExtractedCommand | null {
    if (position + pattern.length > this.data.length) return null;
    
    const playerId = position + 1 < this.data.length ? this.data[position + 1] % 8 : 0; // Player ID modulo 8
    
    return {
      frame,
      playerId,
      commandType: this.data[position],
      commandName: pattern.name,
      rawData: this.data.slice(position, position + pattern.length),
      parameters: this.extractParameters(position, pattern)
    };
  }

  /**
   * Extrahiere Parameter aus Command
   */
  private extractParameters(position: number, pattern: any): Record<string, any> {
    const params: Record<string, any> = {};
    
    try {
      if (pattern.name === 'Build' && position + 6 < this.data.length) {
        params.x = this.data[position + 2] | (this.data[position + 3] << 8);
        params.y = this.data[position + 4] | (this.data[position + 5] << 8);
        params.unitType = this.data[position + 6];
      } else if (pattern.name === 'Move' && position + 3 < this.data.length) {
        params.x = this.data[position + 2] | (this.data[position + 3] << 8);
      } else if (pattern.name === 'Train Unit' && position + 1 < this.data.length) {
        params.unitType = this.data[position + 1];
      }
    } catch (error) {
      console.log('[EnhancedCommandExtractor] Error extracting parameters:', error);
    }
    
    return params;
  }

  /**
   * Finde Command-Sektionen durch Signatur-Erkennung
   */
  private findCommandSections(): Array<{offset: number, length: number}> {
    const sections: Array<{offset: number, length: number}> = [];
    
    // SC:R Command-Signaturen
    const commandSignatures = [
      [0x00], // Frame sync
      [0x01], // Extended frame sync
      [0x02], // Large frame sync
      [0x09], // Select units
      [0x0A], // Shift select
      [0x0B], // Deselect
      [0x0C], // Build
      [0x14], // Move
      [0x15], // Attack
      [0x1A], // Use tech
      [0x1D], // Train unit
      [0x2F], // Research
      [0x31], // Upgrade
      [0x35]  // Hotkey assignment
    ];
    
    let currentSectionStart = -1;
    let consecutiveCommands = 0;
    
    for (let i = 0; i < this.data.length - 10; i++) {
      const byte = this.data[i];
      
      // Prüfe ob dies ein Command-Byte ist
      const isCommand = commandSignatures.some(sig => sig[0] === byte);
      
      if (isCommand) {
        if (currentSectionStart === -1) {
          currentSectionStart = i;
        }
        consecutiveCommands++;
      } else {
        // Ende einer Command-Sektion?
        if (currentSectionStart !== -1 && consecutiveCommands > 10) {
          sections.push({
            offset: currentSectionStart,
            length: i - currentSectionStart
          });
          console.log(`[EnhancedCommandExtractor] Found command section: offset ${currentSectionStart}, length ${i - currentSectionStart}`);
        }
        currentSectionStart = -1;
        consecutiveCommands = 0;
      }
    }
    
    // Handle final section
    if (currentSectionStart !== -1 && consecutiveCommands > 10) {
      sections.push({
        offset: currentSectionStart,
        length: this.data.length - currentSectionStart
      });
    }
    
    return sections;
  }

  /**
   * Parse eine Command-Sektion
   */
  private parseCommandSection(section: {offset: number, length: number}): ExtractedCommand[] {
    const commands: ExtractedCommand[] = [];
    let position = section.offset;
    const endPosition = section.offset + section.length;
    let currentFrame = 0;
    
    while (position < endPosition && position < this.data.length - 1) {
      const byte = this.data[position];
      
      // Frame Synchronisation
      if (byte === 0x00) {
        currentFrame++;
        position++;
        continue;
      } else if (byte === 0x01 && position + 1 < this.data.length) {
        currentFrame += this.data[position + 1];
        position += 2;
        continue;
      } else if (byte === 0x02 && position + 2 < this.data.length) {
        const frameInc = this.data[position + 1] | (this.data[position + 2] << 8);
        currentFrame += frameInc;
        position += 3;
        continue;
      }
      
      // Parse Command
      const command = this.parseIndividualCommand(position, currentFrame, endPosition);
      if (command) {
        commands.push(command);
        position += command.rawData.length;
      } else {
        position++;
      }
    }
    
    return commands;
  }

  /**
   * Parse einen einzelnen Command
   */
  private parseIndividualCommand(position: number, frame: number, maxPosition: number): ExtractedCommand | null {
    if (position >= maxPosition || position >= this.data.length) return null;
    
    const commandType = this.data[position];
    const commandInfo = this.getCommandInfo(commandType);
    
    if (!commandInfo) return null;
    
    const commandLength = commandInfo.length;
    if (position + commandLength > maxPosition || position + commandLength > this.data.length) {
      return null;
    }
    
    // Extrahiere Player ID (meist 2. Byte)
    const playerId = position + 1 < this.data.length ? this.data[position + 1] % 8 : 0;
    
    // Extrahiere zusätzliche Daten basierend auf Command-Typ
    let x, y, unitType, targetId;
    const parameters: Record<string, any> = {};
    
    if (commandInfo.hasCoordinates && position + 4 < this.data.length) {
      x = this.data[position + 2] | (this.data[position + 3] << 8);
      y = this.data[position + 4] | (this.data[position + 5] << 8);
      parameters.x = x;
      parameters.y = y;
    }
    
    if (commandInfo.hasUnitType && position + commandInfo.unitTypeOffset < this.data.length) {
      unitType = this.data[position + commandInfo.unitTypeOffset];
      parameters.unitType = unitType;
    }
    
    return {
      frame,
      playerId,
      commandType,
      commandName: commandInfo.name,
      x,
      y,
      unitType,
      targetId,
      rawData: this.data.slice(position, position + commandLength),
      parameters
    };
  }

  /**
   * Command-Informationen basierend auf SC:R Spezifikation
   */
  private getCommandInfo(commandType: number): {name: string, length: number, hasCoordinates?: boolean, hasUnitType?: boolean, unitTypeOffset?: number} | null {
    const commandMap: Record<number, any> = {
      0x09: { name: 'Select Units', length: 2 },
      0x0A: { name: 'Shift Select', length: 2 },
      0x0B: { name: 'Deselect', length: 2 },
      0x0C: { name: 'Build', length: 7, hasCoordinates: true, hasUnitType: true, unitTypeOffset: 6 },
      0x14: { name: 'Move', length: 4, hasCoordinates: true },
      0x15: { name: 'Attack', length: 6, hasCoordinates: true },
      0x1A: { name: 'Use Tech', length: 4 },
      0x1D: { name: 'Train Unit', length: 2, hasUnitType: true, unitTypeOffset: 1 },
      0x2F: { name: 'Research Tech', length: 2 },
      0x31: { name: 'Upgrade', length: 2 },
      0x35: { name: 'Assign Hotkey', length: 2 }
    };
    
    return commandMap[commandType] || null;
  }

  /**
   * Berechne echte Gameplay-Metriken aus Commands
   */
  calculateGameplayMetrics(commands: ExtractedCommand[], totalFrames: number): Record<number, GameplayMetrics> {
    const playerMetrics: Record<number, GameplayMetrics> = {};
    const gameMinutes = totalFrames / 23.81 / 60;
    
    // Gruppiere Commands nach Spieler
    const playerCommands: Record<number, ExtractedCommand[]> = {};
    commands.forEach(cmd => {
      if (!playerCommands[cmd.playerId]) {
        playerCommands[cmd.playerId] = [];
      }
      playerCommands[cmd.playerId].push(cmd);
    });
    
    // Berechne Metriken für jeden Spieler
    Object.entries(playerCommands).forEach(([playerIdStr, playerCmds]) => {
      const playerId = parseInt(playerIdStr);
      
      // Grundlegende APM/EAPM
      const totalActions = playerCmds.length;
      const apm = Math.round(totalActions / gameMinutes);
      
      // EAPM (Economic Actions Per Minute) - nur Build/Train/Research
      const economicActions = playerCmds.filter(cmd => 
        ['Build', 'Train Unit', 'Research Tech', 'Upgrade'].includes(cmd.commandName)
      ).length;
      const eapm = Math.round(economicActions / gameMinutes);
      
      // Build Order Timing (Zeit bis erste wichtige Einheit)
      const firstTrain = playerCmds.find(cmd => cmd.commandName === 'Train Unit');
      const buildOrderTiming = firstTrain ? firstTrain.frame / 23.81 : 0;
      
      // Micro-Intensität (Move/Attack Actions)
      const microActions = playerCmds.filter(cmd => 
        ['Move', 'Attack', 'Use Tech'].includes(cmd.commandName)
      ).length;
      const microIntensity = Math.round(microActions / gameMinutes);
      
      // Makro-Zyklen (Build/Train Frequenz)
      const macroActions = playerCmds.filter(cmd => 
        ['Build', 'Train Unit'].includes(cmd.commandName)
      );
      const macroCycles = macroActions.length;
      
      // Command-Verteilung
      const commandDistribution: Record<string, number> = {};
      playerCmds.forEach(cmd => {
        commandDistribution[cmd.commandName] = (commandDistribution[cmd.commandName] || 0) + 1;
      });
      
      playerMetrics[playerId] = {
        apm,
        eapm,
        buildOrderTiming,
        microIntensity,
        macroCycles,
        commandDistribution
      };
    });
    
    return playerMetrics;
  }

  /**
   * Generiere Gameplay-Analyse aus echten Daten
   */
  generateGameplayAnalysis(commands: ExtractedCommand[], metrics: Record<number, GameplayMetrics>): Record<number, {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    buildOrderQuality: string;
    playstyle: string;
  }> {
    const analysis: Record<number, any> = {};
    
    Object.entries(metrics).forEach(([playerIdStr, metric]) => {
      const playerId = parseInt(playerIdStr);
      const playerCommands = commands.filter(cmd => cmd.playerId === playerId);
      
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const recommendations: string[] = [];
      
      // APM Analyse
      if (metric.apm > 200) {
        strengths.push('Sehr hohe Aktionsgeschwindigkeit');
      } else if (metric.apm < 80) {
        weaknesses.push('Niedrige Aktionsgeschwindigkeit');
        recommendations.push('Trainiere Hotkeys und schnellere Einheitenproduktion');
      }
      
      // EAPM Analyse
      if (metric.eapm > 60) {
        strengths.push('Starke Wirtschaftsführung');
      } else if (metric.eapm < 30) {
        weaknesses.push('Schwache Wirtschaftsführung');
        recommendations.push('Fokussiere auf kontinuierliche Worker- und Gebäudeproduktion');
      }
      
      // Build Order Timing
      let buildOrderQuality = 'Standard';
      if (metric.buildOrderTiming < 60) {
        buildOrderQuality = 'Sehr schnell';
        strengths.push('Excellente Build Order Ausführung');
      } else if (metric.buildOrderTiming > 120) {
        buildOrderQuality = 'Langsam';
        weaknesses.push('Langsame Build Order');
        recommendations.push('Übe optimierte Build Orders für deine Rasse');
      }
      
      // Micro vs Makro Balance
      const microMacroRatio = metric.microIntensity / (metric.macroCycles || 1);
      let playstyle = 'Ausgewogen';
      
      if (microMacroRatio > 3) {
        playstyle = 'Micro-fokussiert';
        strengths.push('Starke Einheitenkontrolle');
        recommendations.push('Achte mehr auf Makro-Management');
      } else if (microMacroRatio < 0.5) {
        playstyle = 'Makro-fokussiert';
        strengths.push('Starkes Wirtschaftsmanagement');
        recommendations.push('Verbessere Einheitenkontrolle und Positionierung');
      }
      
      // Command-Verteilung Analyse
      const buildRatio = (metric.commandDistribution['Build'] || 0) / playerCommands.length;
      if (buildRatio > 0.3) {
        strengths.push('Aktiver Gebäudebau');
      } else if (buildRatio < 0.1) {
        weaknesses.push('Zu wenig Gebäudebau');
        recommendations.push('Baue mehr Produktionsgebäude für bessere Einheitenproduktion');
      }
      
      analysis[playerId] = {
        strengths,
        weaknesses,
        recommendations,
        buildOrderQuality,
        playstyle
      };
    });
    
    return analysis;
  }
}
