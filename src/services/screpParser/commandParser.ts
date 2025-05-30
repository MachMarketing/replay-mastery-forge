
/**
 * Command Parser basierend auf screp repcmd
 */

import { BinaryReader } from './binaryReader';
import { Command } from './screpCore';

export class CommandParser {
  private reader: BinaryReader;
  private currentFrame: number = 0;

  // Command definitions aus screp
  private static readonly COMMANDS = {
    0x09: { name: 'Select', length: 2, effective: true },
    0x0A: { name: 'Shift Select', length: 2, effective: true },
    0x0B: { name: 'Shift Deselect', length: 2, effective: true },
    0x0C: { name: 'Build', length: 7, effective: true },
    0x0D: { name: 'Vision', length: 2, effective: false },
    0x0E: { name: 'Alliance', length: 4, effective: true },
    0x13: { name: 'Hotkey', length: 2, effective: true },
    0x14: { name: 'Move', length: 4, effective: true },
    0x15: { name: 'Attack', length: 6, effective: true },
    0x16: { name: 'Cancel', length: 0, effective: true },
    0x18: { name: 'Stop', length: 1, effective: true },
    0x1D: { name: 'Train', length: 2, effective: true },
    0x1E: { name: 'Cancel Train', length: 2, effective: true },
    0x1F: { name: 'Cloak', length: 1, effective: true },
    0x20: { name: 'Decloak', length: 1, effective: true },
    0x21: { name: 'Unit Morph', length: 2, effective: true },
    0x2F: { name: 'Research', length: 2, effective: true },
    0x30: { name: 'Cancel Research', length: 0, effective: true },
    0x31: { name: 'Upgrade', length: 2, effective: true },
    0x32: { name: 'Cancel Upgrade', length: 0, effective: true },
    0x34: { name: 'Building Morph', length: 2, effective: true }
  };

  constructor(reader: BinaryReader) {
    this.reader = reader;
  }

  async parseAllCommands(): Promise<Command[]> {
    console.log('[CommandParser] Starting command parsing...');
    const commands: Command[] = [];
    let iterations = 0;
    const maxIterations = 100000; // Schutz vor Endlosschleifen

    while (this.reader.canRead(1) && iterations < maxIterations) {
      iterations++;
      
      try {
        const byte = this.reader.readUInt8();
        
        // Frame sync commands
        if (byte === 0x00) {
          this.currentFrame++;
          continue;
        } else if (byte === 0x01 && this.reader.canRead(1)) {
          this.currentFrame += this.reader.readUInt8();
          continue;
        } else if (byte === 0x02 && this.reader.canRead(2)) {
          const skip = this.reader.readUInt16LE();
          this.currentFrame += skip;
          continue;
        }
        
        // Regular commands
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
      // Unknown command, skip byte
      return null;
    }

    if (!this.reader.canRead(cmdDef.length)) {
      return null;
    }

    // Player ID ist normalerweise das erste Byte nach dem command type
    const playerID = cmdDef.length > 0 ? this.reader.readUInt8() : 0;
    
    // Validate player ID
    if (playerID > 7) {
      // Invalid player ID, backtrack
      this.reader.setPosition(this.reader.getPosition() - 1);
      return null;
    }

    // Parse parameters basierend auf command type
    const parameters = this.parseCommandParameters(commandType, cmdDef.length - 1);
    
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

  private parseCommandParameters(commandType: number, remainingLength: number): any {
    const params: any = {};
    
    switch (commandType) {
      case 0x0C: // Build
        if (remainingLength >= 6) {
          const unitType = this.reader.readUInt16LE();
          const x = this.reader.readUInt16LE();
          const y = this.reader.readUInt16LE();
          params.unitType = unitType;
          params.pos = { x, y };
        }
        break;
        
      case 0x14: // Move
        if (remainingLength >= 3) {
          const x = this.reader.readUInt16LE();
          const y = this.reader.readUInt16LE();
          params.pos = { x, y };
        }
        break;
        
      case 0x15: // Attack
        if (remainingLength >= 5) {
          const x = this.reader.readUInt16LE();
          const y = this.reader.readUInt16LE();
          const target = this.reader.readUInt16LE();
          params.pos = { x, y };
          params.target = target;
        }
        break;
        
      case 0x1D: // Train
        if (remainingLength >= 1) {
          const unitType = this.reader.readUInt16LE();
          params.unitType = unitType;
        }
        break;
        
      case 0x2F: // Research
      case 0x31: // Upgrade
        if (remainingLength >= 1) {
          const techType = this.reader.readUInt8();
          params.techType = techType;
        }
        break;
        
      default:
        // Skip remaining bytes for unknown commands
        if (remainingLength > 0) {
          this.reader.readBytes(remainingLength);
        }
        break;
    }
    
    return params;
  }

  private frameToTimeString(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
