
/**
 * Command Parser - EXAKT nach screp GitHub repo
 * Basiert auf: https://github.com/icza/screp/blob/main/rep/repdecoder.go
 */

import { BinaryReader } from './binaryReader';
import { Command } from './screpCore';

export class CommandParser {
  private reader: BinaryReader;
  private currentFrame: number = 0;

  // Command definitions EXAKT aus screp GitHub repo
  private static readonly COMMANDS = {
    0x09: { name: 'Select', length: 2, effective: true },
    0x0A: { name: 'Shift Select', length: 2, effective: true },
    0x0B: { name: 'Shift Deselect', length: 2, effective: true },
    0x0C: { name: 'Build', length: 7, effective: true },
    0x0D: { name: 'Vision', length: 2, effective: false },
    0x0E: { name: 'Ally', length: 4, effective: true },
    0x13: { name: 'Hotkey', length: 2, effective: true },
    0x14: { name: 'Move', length: 4, effective: true },
    0x15: { name: 'Attack', length: 6, effective: true },
    0x18: { name: 'Cancel', length: 0, effective: true },
    0x19: { name: 'Cancel Hatch', length: 0, effective: true },
    0x1A: { name: 'Stop', length: 0, effective: true },
    0x1B: { name: 'Carrier Stop', length: 0, effective: true },
    0x1C: { name: 'Reaver Stop', length: 0, effective: true },
    0x1D: { name: 'Return Cargo', length: 0, effective: true },
    0x1E: { name: 'Train', length: 2, effective: true },
    0x1F: { name: 'Cancel Train', length: 2, effective: true },
    0x20: { name: 'Cloak', length: 0, effective: true },
    0x21: { name: 'Decloak', length: 0, effective: true },
    0x22: { name: 'Unit Morph', length: 2, effective: true },
    0x23: { name: 'Unsiege', length: 0, effective: true },
    0x24: { name: 'Siege', length: 0, effective: true },
    0x25: { name: 'Train Fighter', length: 0, effective: true },
    0x27: { name: 'Unload All', length: 0, effective: true },
    0x28: { name: 'Unload', length: 2, effective: true },
    0x29: { name: 'Merge Archon', length: 0, effective: true },
    0x2A: { name: 'Hold Position', length: 0, effective: true },
    0x2B: { name: 'Burrow', length: 0, effective: true },
    0x2C: { name: 'Unburrow', length: 0, effective: true },
    0x2D: { name: 'Cancel Nuke', length: 0, effective: true },
    0x2E: { name: 'Lift', length: 4, effective: true },
    0x2F: { name: 'Tech', length: 2, effective: true },
    0x30: { name: 'Cancel Tech', length: 0, effective: true },
    0x31: { name: 'Upgrade', length: 2, effective: true },
    0x32: { name: 'Cancel Upgrade', length: 0, effective: true },
    0x33: { name: 'Cancel Addon', length: 0, effective: true },
    0x34: { name: 'Building Morph', length: 2, effective: true },
    0x35: { name: 'Stim', length: 0, effective: true },
    0x36: { name: 'Sync', length: 6, effective: false }
  };

  constructor(reader: BinaryReader) {
    this.reader = reader;
  }

  async parseAllCommands(): Promise<Command[]> {
    console.log('[CommandParser] Starting command parsing (screp repo style)...');
    const commands: Command[] = [];
    let iterations = 0;
    const maxIterations = 100000; // Erhöht für längere Replays

    while (this.reader.canRead(1) && iterations < maxIterations) {
      iterations++;
      
      try {
        const byte = this.reader.readUInt8();
        
        // Frame sync commands EXAKT nach screp repo
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
    const cmdDef = CommandParser.COMMANDS[commandType as keyof typeof CommandParser.COMMANDS];
    
    if (!cmdDef) {
      // Unbekannter Command - skip
      return null;
    }
    
    if (!this.reader.canRead(cmdDef.length + 1)) {
      return null;
    }

    const playerID = this.reader.readUInt8();
    
    // Validiere Player ID
    if (playerID > 11) { // 0-7 für Spieler, 8-11 für Computer
      this.reader.setPosition(this.reader.getPosition() - 1);
      return null;
    }

    // Parameter lesen basierend auf Command-Typ
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
    
    // Spezielle Parameter für verschiedene Commands
    switch (commandType) {
      case 0x0C: // Build
        if (length >= 6) {
          parameters.unitType = this.reader.readUInt16LE();
          parameters.x = this.reader.readUInt16LE();
          parameters.y = this.reader.readUInt16LE();
        }
        break;
        
      case 0x14: // Move
        if (length >= 4) {
          parameters.x = this.reader.readUInt16LE();
          parameters.y = this.reader.readUInt16LE();
        }
        break;
        
      case 0x15: // Attack
        if (length >= 6) {
          parameters.x = this.reader.readUInt16LE();
          parameters.y = this.reader.readUInt16LE();
          parameters.targetUnit = this.reader.readUInt16LE();
        }
        break;
        
      case 0x1E: // Train
        if (length >= 2) {
          parameters.unitType = this.reader.readUInt16LE();
        }
        break;
        
      case 0x2F: // Tech
      case 0x31: // Upgrade
        if (length >= 2) {
          parameters.techType = this.reader.readUInt16LE();
        }
        break;
        
      default:
        // Für andere Commands: einfach bytes lesen
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
