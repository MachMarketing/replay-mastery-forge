
/**
 * Enhanced Command Extractor with RepCore integration and EAPM analysis
 */

import { BWBinaryReader } from './bwRemastered/binaryReader';
import { getCommandName } from './bwRemastered/enhancedConstants';
import { 
  analyzeCommandEffectiveness, 
  IneffKind, 
  ineffKindToString,
  calculateEAPM 
} from './bwRemastered/repcore/ineffKind';
import { framesToTimeString } from './bwRemastered/repcore/types';

interface EnhancedCommand {
  frame: number;
  playerId: number;
  commandId: number;
  commandName: string;
  parameters?: any;
  timeString: string;
  ineffKind: IneffKind;
  effective: boolean;
  ineffectiveReason?: string;
}

export class EnhancedCommandExtractor {
  private reader: BWBinaryReader;
  private commands: EnhancedCommand[] = [];
  
  constructor(buffer: ArrayBuffer) {
    this.reader = new BWBinaryReader(buffer);
  }

  extractRealCommands(): any[] {
    console.log('[EnhancedCommandExtractor] Starting enhanced extraction with EAPM analysis');
    
    try {
      this.findAndParseCommandSection();
      this.analyzeCommandEffectiveness();
      
      console.log('[EnhancedCommandExtractor] Enhanced extraction completed:', {
        totalCommands: this.commands.length,
        effectiveCommands: this.commands.filter(cmd => cmd.effective).length,
        ineffectiveCommands: this.commands.filter(cmd => !cmd.effective).length
      });
      
      return this.commands.map(cmd => ({
        frame: cmd.frame,
        playerId: cmd.playerId,
        commandId: cmd.commandId,
        commandName: cmd.commandName,
        parameters: cmd.parameters,
        timeString: cmd.timeString,
        ineffKind: cmd.ineffKind,
        effective: cmd.effective,
        ineffectiveReason: cmd.ineffectiveReason
      }));
      
    } catch (error) {
      console.error('[EnhancedCommandExtractor] Extraction failed:', error);
      return [];
    }
  }

  private findAndParseCommandSection(): void {
    const possibleOffsets = [633, 637, 641, 645, 649, 653];
    
    for (const offset of possibleOffsets) {
      if (offset < this.reader.getBuffer().byteLength - 100) {
        this.reader.setPosition(offset);
        
        if (this.looksLikeCommandSection(offset)) {
          console.log(`[EnhancedCommandExtractor] Found command section at offset ${offset}`);
          this.parseCommandsFromOffset(offset);
          return;
        }
      }
    }
    
    // Fallback
    console.log('[EnhancedCommandExtractor] Using fallback offset 633');
    this.reader.setPosition(633);
    this.parseCommandsFromOffset(633);
  }

  private looksLikeCommandSection(offset: number): boolean {
    this.reader.setPosition(offset);
    
    if (!this.reader.canRead(50)) {
      return false;
    }
    
    const sample = this.reader.readBytes(50);
    let commandLikeBytes = 0;
    
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      if ([0x00, 0x01, 0x02, 0x0C, 0x14, 0x1D, 0x20, 0x11, 0x13].includes(byte)) {
        commandLikeBytes++;
      }
    }
    
    return commandLikeBytes >= 5;
  }

  private parseCommandsFromOffset(offset: number): void {
    this.reader.setPosition(offset);
    let commandCount = 0;
    const maxCommands = 10000;
    
    while (this.reader.canRead(8) && commandCount < maxCommands) {
      try {
        const command = this.parseNextCommand();
        if (command) {
          this.commands.push(command);
          commandCount++;
        } else {
          break;
        }
      } catch (error) {
        console.warn('[EnhancedCommandExtractor] Command parsing error:', error);
        break;
      }
    }
    
    console.log(`[EnhancedCommandExtractor] Parsed ${commandCount} commands`);
  }

  private parseNextCommand(): EnhancedCommand | null {
    if (!this.reader.canRead(4)) {
      return null;
    }

    // Read frame (4 bytes)
    const frame = this.reader.readUInt32LE();
    
    if (!this.reader.canRead(2)) {
      return null;
    }

    // Read command header
    const commandId = this.reader.readUInt8();
    const playerId = this.reader.readUInt8();

    // Skip invalid commands
    if (commandId === 0 && playerId === 0) {
      return null;
    }

    const commandName = getCommandName(commandId);
    const timeString = framesToTimeString(frame);

    // Parse parameters based on command type
    const parameters = this.parseCommandParameters(commandId);

    return {
      frame,
      playerId,
      commandId,
      commandName,
      parameters,
      timeString,
      ineffKind: IneffKind.Effective, // Will be analyzed later
      effective: true, // Will be analyzed later
    };
  }

  private parseCommandParameters(commandId: number): any {
    const params: any = {};

    try {
      switch (commandId) {
        case 0x09: // Select
        case 0x0A: // Shift Select
          if (this.reader.canRead(2)) {
            params.unitCount = this.reader.readUInt16LE();
          }
          break;
          
        case 0x0C: // Build
          if (this.reader.canRead(4)) {
            params.unitType = this.reader.readUInt16LE();
            params.x = this.reader.readUInt16LE();
            params.y = this.reader.readUInt16LE();
          }
          break;
          
        case 0x13: // Hotkey
          if (this.reader.canRead(2)) {
            params.hotkey = this.reader.readUInt8();
            params.action = this.reader.readUInt8();
          }
          break;
          
        case 0x14: // Right Click
          if (this.reader.canRead(4)) {
            params.x = this.reader.readUInt16LE();
            params.y = this.reader.readUInt16LE();
          }
          break;
          
        case 0x1F: // Train
        case 0x20: // Cancel Train
          if (this.reader.canRead(2)) {
            params.unitType = this.reader.readUInt16LE();
          }
          break;
          
        default:
          // Skip unknown parameter bytes
          if (this.reader.canRead(2)) {
            const byte1 = this.reader.readUInt8();
            const byte2 = this.reader.readUInt8();
            if (byte1 !== 0 || byte2 !== 0) {
              params.data = [byte1, byte2];
            }
          }
          break;
      }
    } catch (error) {
      console.warn(`[EnhancedCommandExtractor] Parameter parsing error for command ${commandId}:`, error);
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }

  private analyzeCommandEffectiveness(): void {
    console.log('[EnhancedCommandExtractor] Starting EAPM effectiveness analysis');
    
    // Group commands by player for analysis
    const playerCommands: { [playerId: number]: EnhancedCommand[] } = {};
    
    for (const command of this.commands) {
      if (!playerCommands[command.playerId]) {
        playerCommands[command.playerId] = [];
      }
      playerCommands[command.playerId].push(command);
    }

    // Analyze effectiveness for each player
    for (const [playerId, commands] of Object.entries(playerCommands)) {
      console.log(`[EnhancedCommandExtractor] Analyzing player ${playerId} with ${commands.length} commands`);
      
      // Sort by frame
      commands.sort((a, b) => a.frame - b.frame);
      
      // Analyze each command
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const previousCommands = commands.slice(0, i);
        
        command.ineffKind = analyzeCommandEffectiveness(command, previousCommands);
        command.effective = command.ineffKind === IneffKind.Effective;
        
        if (!command.effective) {
          command.ineffectiveReason = ineffKindToString(command.ineffKind);
        }
      }
      
      const effectiveCount = commands.filter(cmd => cmd.effective).length;
      const efficiency = commands.length > 0 ? Math.round((effectiveCount / commands.length) * 100) : 0;
      
      console.log(`[EnhancedCommandExtractor] Player ${playerId} effectiveness:`, {
        total: commands.length,
        effective: effectiveCount,
        efficiency: `${efficiency}%`
      });
    }
  }
}
