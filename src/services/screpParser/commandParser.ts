
/**
 * Command Parser - EXAKT nach screp GitHub repo
 * https://github.com/icza/screp/blob/main/rep/repdecoder.go
 */

import { BinaryReader } from './binaryReader';
import { Command } from './types';
import { ScrepConstants } from './constants';

export class CommandParser {
  private reader: BinaryReader;
  private currentFrame: number = 0;

  constructor(reader: BinaryReader) {
    this.reader = reader;
  }

  async parseAllCommands(): Promise<Command[]> {
    console.log('[CommandParser] Starting command parsing (screp repo style)...');
    const commands: Command[] = [];
    let iterations = 0;
    const maxIterations = 200000; // Für längere Replays

    while (this.reader.canRead(1) && iterations < maxIterations) {
      iterations++;
      
      try {
        const byte = this.reader.readUInt8();
        
        // Frame sync commands - EXAKT nach screp repo
        if (byte === 0x00) {
          // Frame increment
          this.currentFrame++;
          continue;
        } else if (byte === 0x01 && this.reader.canRead(1)) {
          // Frame skip (1 byte)
          const skip = this.reader.readUInt8();
          this.currentFrame += skip;
          continue;
        } else if (byte === 0x02 && this.reader.canRead(2)) {
          // Frame skip (2 bytes)
          const skip = this.reader.readUInt16LE();
          this.currentFrame += skip;
          continue;
        } else if (byte === 0x03 && this.reader.canRead(4)) {
          // Frame skip (4 bytes)
          const skip = this.reader.readUInt32LE();
          this.currentFrame += skip;
          continue;
        }
        
        // Regular command parsing
        const command = this.parseCommand(byte);
        if (command) {
          commands.push(command);
        }
        
      } catch (error) {
        console.warn('[CommandParser] Parse error at iteration', iterations, ':', error);
        break;
      }
    }

    console.log('[CommandParser] Parsed', commands.length, 'commands in', iterations, 'iterations');
    return commands;
  }

  private parseCommand(commandType: number): Command | null {
    const cmdDef = ScrepConstants.getCommandDefinition(commandType);
    
    if (!cmdDef) {
      // Unknown command - skip
      return null;
    }
    
    if (!this.reader.canRead(1)) {
      return null;
    }

    const playerID = this.reader.readUInt8();
    
    // Validate Player ID
    if (playerID > 11) { // 0-7 für Spieler, 8-11 für Computer
      this.reader.setPosition(this.reader.getPosition() - 1);
      return null;
    }

    // Parameter lesen
    const parameters = this.parseCommandParameters(commandType, cmdDef.length);
    
    return {
      frame: this.currentFrame,
      type: commandType,
      playerID,
      typeString: cmdDef.name,
      parameters,
      effective: cmdDef.effective,
      ineffKind: cmdDef.effective ? '' : 'spam',
      time: this.frameToTimeString(this.currentFrame)
    };
  }

  private parseCommandParameters(commandType: number, length: number): any {
    const parameters: any = {};
    
    if (length === 0) {
      return parameters;
    }
    
    if (!this.reader.canRead(length)) {
      return parameters;
    }
    
    // Spezielle Parameter für Commands - nach screp repo
    switch (commandType) {
      case 0x0C: // Build
        if (length >= 6) {
          parameters.unitTypeId = this.reader.readUInt16LE();
          parameters.x = this.reader.readUInt16LE();
          parameters.y = this.reader.readUInt16LE();
          parameters.unitName = ScrepConstants.getUnitName(parameters.unitTypeId);
        }
        break;
        
      case 0x14: // Move/Right Click
        if (length >= 4) {
          parameters.x = this.reader.readUInt16LE();
          parameters.y = this.reader.readUInt16LE();
        }
        break;
        
      case 0x15: // Attack/Targeted Order
        if (length >= 6) {
          parameters.x = this.reader.readUInt16LE();
          parameters.y = this.reader.readUInt16LE();
          parameters.targetUnitId = this.reader.readUInt16LE();
        }
        break;
        
      case 0x1E: // Train
        if (length >= 2) {
          parameters.unitTypeId = this.reader.readUInt16LE();
          parameters.unitName = ScrepConstants.getUnitName(parameters.unitTypeId);
        }
        break;
        
      case 0x2F: // Tech
      case 0x31: // Upgrade
        if (length >= 2) {
          parameters.techId = this.reader.readUInt16LE();
          parameters.techName = ScrepConstants.getTechName(parameters.techId);
        }
        break;
        
      case 0x13: // Hotkey
        if (length >= 2) {
          parameters.hotkey = this.reader.readUInt8();
          parameters.action = this.reader.readUInt8();
        }
        break;
        
      default:
        // Für andere Commands: raw bytes
        if (length > 0) {
          const bytes = this.reader.readBytes(length);
          parameters.raw = Array.from(bytes);
        }
        break;
    }
    
    return parameters;
  }

  private frameToTimeString(frame: number): string {
    const totalSeconds = Math.floor(frame / 24); // 24 FPS für StarCraft
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
