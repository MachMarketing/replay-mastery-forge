
/**
 * Command Parser - Exakt nach screp GitHub repo
 */

import { BinaryReader } from './binaryReader';
import { Command } from './screpCore';

export class CommandParser {
  private reader: BinaryReader;
  private currentFrame: number = 0;

  // Command definitions aus screp GitHub repo
  private static readonly COMMANDS = {
    0x09: { name: 'Select', length: 2, effective: true },
    0x0A: { name: 'Shift Select', length: 2, effective: true },
    0x0B: { name: 'Shift Deselect', length: 2, effective: true },
    0x0C: { name: 'Build', length: 7, effective: true },
    0x14: { name: 'Move', length: 4, effective: true },
    0x15: { name: 'Attack', length: 6, effective: true },
    0x1D: { name: 'Train', length: 2, effective: true }
  };

  constructor(reader: BinaryReader) {
    this.reader = reader;
  }

  async parseAllCommands(): Promise<Command[]> {
    console.log('[CommandParser] Starting command parsing...');
    const commands: Command[] = [];
    let iterations = 0;
    const maxIterations = 50000;

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

    console.log('[CommandParser] Parsed', commands.length, 'commands');
    return commands;
  }

  private parseCommand(commandType: number): Command | null {
    const cmdDef = CommandParser.COMMANDS[commandType as keyof typeof CommandParser.COMMANDS];
    
    if (!cmdDef || !this.reader.canRead(cmdDef.length)) {
      return null;
    }

    const playerID = this.reader.readUInt8();
    
    if (playerID > 7) {
      this.reader.setPosition(this.reader.getPosition() - 1);
      return null;
    }

    // Skip remaining bytes for now
    if (cmdDef.length > 1) {
      this.reader.readBytes(cmdDef.length - 1);
    }
    
    return {
      frame: this.currentFrame,
      type: commandType,
      playerID,
      typeString: cmdDef.name,
      parameters: {},
      effective: cmdDef.effective,
      ineffKind: cmdDef.effective ? '' : 'spam',
      time: this.frameToTimeString(this.currentFrame)
    };
  }

  private frameToTimeString(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
