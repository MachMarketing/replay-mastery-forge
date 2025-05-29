
/**
 * StarCraft: Remastered Format Parser
 * Speziell für das moderne SC:R .rep Format entwickelt
 */

import { RawCommandExtractor } from '../bwapi/rawCommandExtractor';

export interface SCRCommand {
  frame: number;
  playerId: number;
  commandId: number;
  commandName: string;
  parameters: any;
  rawData: Uint8Array;
}

export interface SCRParseResult {
  commands: SCRCommand[];
  playerCommands: Record<number, SCRCommand[]>;
  totalFrames: number;
  confidence: 'high' | 'medium' | 'low';
  method: string;
}

export class RemasteredFormatParser {
  private static readonly SCR_SIGNATURES = {
    // SC:R spezifische Command IDs (unterscheiden sich von Classic)
    0x48: 'Select Units',
    0x49: 'Shift Select', 
    0x4A: 'Build Structure',
    0x4B: 'Train Unit',
    0x4C: 'Move Command',
    0x4D: 'Attack Command',
    0x4E: 'Stop Command',
    0x4F: 'Hold Position',
    0x50: 'Patrol',
    0x51: 'Research Technology',
    0x52: 'Upgrade',
    0x53: 'Use Ability',
    0x54: 'Cancel Construction',
    0x55: 'Cancel Training',
    0x56: 'Set Rally Point',
    0x57: 'Lift Building',
    0x58: 'Land Building',
    0x59: 'Load Unit',
    0x5A: 'Unload Unit',
    0x5B: 'Morph Unit',
    0x5C: 'Burrow',
    0x5D: 'Unburrow',
    0x5E: 'Cloak',
    0x5F: 'Decloak'
  };

  /**
   * Parse SC:R specific replay format
   */
  static parseReplay(buffer: ArrayBuffer): SCRParseResult {
    console.log('[RemasteredFormatParser] Starting SC:R format parsing');
    console.log('[RemasteredFormatParser] Buffer size:', buffer.byteLength);
    
    const strategies = [
      () => this.parseModernFormat(buffer),
      () => this.parseCompressedSections(buffer),
      () => this.parseWithRawExtractor(buffer)
    ];

    let bestResult: SCRParseResult | null = null;
    let maxCommands = 0;

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`[RemasteredFormatParser] Trying strategy ${i + 1}...`);
        const result = strategies[i]();
        
        if (result && result.commands.length > maxCommands) {
          maxCommands = result.commands.length;
          bestResult = result;
          console.log(`[RemasteredFormatParser] Strategy ${i + 1} found ${result.commands.length} commands`);
        }
        
        if (result && result.commands.length > 100) {
          console.log(`[RemasteredFormatParser] Found sufficient commands, stopping`);
          break;
        }
      } catch (error) {
        console.log(`[RemasteredFormatParser] Strategy ${i + 1} failed:`, error);
      }
    }

    if (!bestResult) {
      console.log('[RemasteredFormatParser] All strategies failed, creating empty result');
      return this.createEmptyResult();
    }

    return bestResult;
  }

  /**
   * Parse modern SC:R format
   */
  private static parseModernFormat(buffer: ArrayBuffer): SCRParseResult {
    console.log('[RemasteredFormatParser] Parsing modern SC:R format');
    
    const uint8Array = new Uint8Array(buffer);
    const commands: SCRCommand[] = [];
    
    // SC:R verwendet oft strukturierte Blöcke
    const blockHeaders = this.findStructuredBlocks(uint8Array);
    console.log(`[RemasteredFormatParser] Found ${blockHeaders.length} structured blocks`);
    
    for (const block of blockHeaders) {
      const blockCommands = this.parseStructuredBlock(uint8Array, block);
      commands.push(...blockCommands);
      console.log(`[RemasteredFormatParser] Block at ${block.offset}: ${blockCommands.length} commands`);
    }

    return this.buildResult(commands, 'modern-format');
  }

  /**
   * Find structured blocks in SC:R format
   */
  private static findStructuredBlocks(data: Uint8Array): Array<{offset: number, size: number}> {
    const blocks: Array<{offset: number, size: number}> = [];
    
    // SC:R oft mit 4-byte aligned blocks
    for (let i = 0; i < data.length - 16; i += 4) {
      // Look for potential block headers
      const dword = data[i] | (data[i+1] << 8) | (data[i+2] << 16) | (data[i+3] << 24);
      
      // Common SC:R block sizes
      if (dword > 100 && dword < 50000 && dword % 4 === 0) {
        const blockSize = dword;
        if (i + blockSize < data.length) {
          // Validate block content
          const blockData = data.slice(i + 4, i + 4 + Math.min(blockSize, 1000));
          if (this.isLikelyCommandBlock(blockData)) {
            blocks.push({ offset: i + 4, size: blockSize });
            i += blockSize; // Skip this block
          }
        }
      }
    }
    
    return blocks;
  }

  /**
   * Check if data looks like SC:R commands
   */
  private static isLikelyCommandBlock(data: Uint8Array): boolean {
    let commandCount = 0;
    
    for (let i = 0; i < Math.min(data.length - 4, 500); i++) {
      const byte = data[i];
      if (this.SCR_SIGNATURES[byte as keyof typeof this.SCR_SIGNATURES]) {
        commandCount++;
      }
    }
    
    return commandCount >= 10; // At least 10 potential commands
  }

  /**
   * Parse structured block
   */
  private static parseStructuredBlock(data: Uint8Array, block: {offset: number, size: number}): SCRCommand[] {
    const commands: SCRCommand[] = [];
    let position = block.offset;
    const endPosition = Math.min(block.offset + block.size, data.length);
    let currentFrame = 0;
    
    while (position < endPosition - 8) {
      // SC:R frame sync (different from classic)
      if (data[position] === 0xFF && data[position + 1] === 0xFF) {
        // Frame increment
        currentFrame += data[position + 2] | (data[position + 3] << 8);
        position += 4;
        continue;
      }
      
      // Check for SC:R command
      const commandId = data[position];
      const commandName = this.SCR_SIGNATURES[commandId as keyof typeof this.SCR_SIGNATURES];
      
      if (commandName && position + 8 < endPosition) {
        const playerId = data[position + 1];
        
        // Only accept valid player IDs
        if (playerId <= 7) {
          const command = this.parseModernCommand(data, position, currentFrame, commandId, commandName, playerId);
          if (command) {
            commands.push(command);
            position += this.getCommandLength(commandId);
          } else {
            position++;
          }
        } else {
          position++;
        }
      } else {
        position++;
      }
    }
    
    return commands;
  }

  /**
   * Parse individual modern command
   */
  private static parseModernCommand(
    data: Uint8Array, 
    position: number, 
    frame: number, 
    commandId: number, 
    commandName: string, 
    playerId: number
  ): SCRCommand | null {
    const commandLength = this.getCommandLength(commandId);
    
    if (position + commandLength > data.length) {
      return null;
    }
    
    const rawData = data.slice(position, position + commandLength);
    const parameters = this.parseModernParameters(commandId, rawData);
    
    return {
      frame,
      playerId,
      commandId,
      commandName,
      parameters,
      rawData
    };
  }

  /**
   * Get command length for SC:R format
   */
  private static getCommandLength(commandId: number): number {
    const lengths: Record<number, number> = {
      0x48: 4,  // Select Units
      0x49: 4,  // Shift Select
      0x4A: 12, // Build Structure
      0x4B: 8,  // Train Unit
      0x4C: 8,  // Move Command
      0x4D: 10, // Attack Command
      0x4E: 4,  // Stop Command
      0x4F: 4,  // Hold Position
      0x50: 8,  // Patrol
      0x51: 6,  // Research Technology
      0x52: 6,  // Upgrade
      0x53: 8,  // Use Ability
      0x54: 4,  // Cancel Construction
      0x55: 4,  // Cancel Training
      0x56: 8,  // Set Rally Point
      0x57: 4,  // Lift Building
      0x58: 8,  // Land Building
      0x59: 6,  // Load Unit
      0x5A: 6,  // Unload Unit
      0x5B: 6,  // Morph Unit
      0x5C: 4,  // Burrow
      0x5D: 4,  // Unburrow
      0x5E: 4,  // Cloak
      0x5F: 4   // Decloak
    };
    
    return lengths[commandId] || 4;
  }

  /**
   * Parse modern command parameters
   */
  private static parseModernParameters(commandId: number, rawData: Uint8Array): any {
    const params: any = {};
    
    try {
      switch (commandId) {
        case 0x4A: // Build Structure
          if (rawData.length >= 12) {
            params.structureType = rawData[2] | (rawData[3] << 8);
            params.x = rawData[4] | (rawData[5] << 8);
            params.y = rawData[6] | (rawData[7] << 8);
          }
          break;
          
        case 0x4B: // Train Unit
          if (rawData.length >= 8) {
            params.unitType = rawData[2] | (rawData[3] << 8);
            params.buildingId = rawData[4] | (rawData[5] << 8);
          }
          break;
          
        case 0x4C: // Move Command
        case 0x50: // Patrol
          if (rawData.length >= 8) {
            params.x = rawData[2] | (rawData[3] << 8);
            params.y = rawData[4] | (rawData[5] << 8);
          }
          break;
          
        case 0x4D: // Attack Command
          if (rawData.length >= 10) {
            params.x = rawData[2] | (rawData[3] << 8);
            params.y = rawData[4] | (rawData[5] << 8);
            params.targetId = rawData[6] | (rawData[7] << 8);
          }
          break;
          
        case 0x51: // Research Technology
        case 0x52: // Upgrade
          if (rawData.length >= 6) {
            params.techType = rawData[2] | (rawData[3] << 8);
          }
          break;
      }
    } catch (error) {
      console.warn('[RemasteredFormatParser] Error parsing parameters:', error);
    }
    
    return params;
  }

  /**
   * Parse compressed sections
   */
  private static parseCompressedSections(buffer: ArrayBuffer): SCRParseResult {
    console.log('[RemasteredFormatParser] Parsing compressed sections');
    
    // Delegate to RawCommandExtractor for compressed parsing
    return RawCommandExtractor.extractCommands(buffer).then(result => {
      const commands: SCRCommand[] = result.commands.map(cmd => ({
        frame: cmd.frame,
        playerId: cmd.playerId,
        commandId: cmd.commandId,
        commandName: cmd.commandName,
        parameters: cmd.parameters,
        rawData: cmd.data
      }));
      
      return this.buildResult(commands, 'compressed-sections');
    }).catch(() => this.createEmptyResult());
  }

  /**
   * Parse with raw extractor as fallback
   */
  private static parseWithRawExtractor(buffer: ArrayBuffer): SCRParseResult {
    console.log('[RemasteredFormatParser] Using raw extractor fallback');
    
    const uint8Array = new Uint8Array(buffer);
    const commands: SCRCommand[] = [];
    
    // Simple pattern matching for any command-like structures
    for (let i = 0; i < uint8Array.length - 8; i++) {
      const byte = uint8Array[i];
      
      if (byte >= 0x40 && byte <= 0x7F) { // SC:R command range
        const playerId = uint8Array[i + 1];
        
        if (playerId <= 7) {
          const command: SCRCommand = {
            frame: Math.floor(i / 100), // Rough frame estimate
            playerId,
            commandId: byte,
            commandName: this.SCR_SIGNATURES[byte as keyof typeof this.SCR_SIGNATURES] || `Unknown_${byte}`,
            parameters: {},
            rawData: uint8Array.slice(i, i + 4)
          };
          
          commands.push(command);
          i += 3; // Skip ahead
        }
      }
    }
    
    return this.buildResult(commands, 'raw-extractor');
  }

  /**
   * Build result object
   */
  private static buildResult(commands: SCRCommand[], method: string): SCRParseResult {
    const playerCommands: Record<number, SCRCommand[]> = {};
    let maxFrame = 0;
    
    for (const command of commands) {
      if (!playerCommands[command.playerId]) {
        playerCommands[command.playerId] = [];
      }
      playerCommands[command.playerId].push(command);
      maxFrame = Math.max(maxFrame, command.frame);
    }
    
    let confidence: 'high' | 'medium' | 'low';
    if (commands.length > 500) {
      confidence = 'high';
    } else if (commands.length > 100) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
    
    console.log(`[RemasteredFormatParser] Method ${method}: ${commands.length} commands, confidence: ${confidence}`);
    
    return {
      commands,
      playerCommands,
      totalFrames: maxFrame,
      confidence,
      method
    };
  }

  /**
   * Create empty result
   */
  private static createEmptyResult(): SCRParseResult {
    return {
      commands: [],
      playerCommands: {},
      totalFrames: 0,
      confidence: 'low',
      method: 'failed'
    };
  }
}
