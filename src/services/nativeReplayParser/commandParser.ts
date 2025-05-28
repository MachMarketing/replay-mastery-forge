
/**
 * Command parser for StarCraft replay files
 */

import { BinaryReader } from './binaryReader';
import { Command, ParsedCommand } from './types';
import { COMMAND_TYPES, DEFAULT_FPS } from './constants';

export class CommandParser {
  private reader: BinaryReader;
  private currentFrame: number = 0;

  constructor(buffer: ArrayBuffer, startPosition: number = 0) {
    this.reader = new BinaryReader(buffer);
    this.reader.setPosition(startPosition);
  }

  /**
   * Parse all commands from the replay
   */
  parseCommands(): ParsedCommand[] {
    console.log('[CommandParser] Starting command parsing');
    const commands: ParsedCommand[] = [];
    let commandCount = 0;

    try {
      while (this.reader.canRead(1) && commandCount < 50000) { // Safety limit
        const command = this.parseNextCommand();
        if (command) {
          commands.push(this.enhanceCommand(command));
          commandCount++;
          
          if (commandCount % 1000 === 0) {
            console.log(`[CommandParser] Parsed ${commandCount} commands`);
          }
        }
      }
    } catch (error) {
      console.log(`[CommandParser] Finished parsing with ${commandCount} commands (${error})`);
    }

    console.log(`[CommandParser] Total commands parsed: ${commands.length}`);
    return commands;
  }

  /**
   * Parse the next command from the stream
   */
  private parseNextCommand(): Command | null {
    if (!this.reader.canRead(1)) {
      return null;
    }

    try {
      const commandByte = this.reader.readByte();
      
      // Handle frame updates
      if (commandByte === 0x00) {
        // Frame increment
        this.currentFrame++;
        return null;
      }
      
      if (commandByte === 0x01) {
        // Frame skip - read how many frames to skip
        if (this.reader.canRead(1)) {
          const skipFrames = this.reader.readByte();
          this.currentFrame += skipFrames;
        }
        return null;
      }
      
      if (commandByte === 0x02) {
        // Large frame skip
        if (this.reader.canRead(2)) {
          const skipFrames = this.reader.readUInt16();
          this.currentFrame += skipFrames;
        }
        return null;
      }

      // Parse actual command
      if (commandByte >= 0x09) {
        return this.parseCommand(commandByte);
      }

      return null;
    } catch (error) {
      // End of stream or parsing error
      return null;
    }
  }

  /**
   * Parse a specific command
   */
  private parseCommand(commandType: number): Command | null {
    try {
      // Read command length (varies by command type)
      const length = this.getCommandLength(commandType);
      if (length === 0) {
        return null;
      }

      // Read player ID (usually first byte after command type)
      let playerId = 0;
      let data: Uint8Array;

      if (this.reader.canRead(length)) {
        const commandData = this.reader.readBytes(length);
        playerId = commandData[0] || 0;
        data = commandData;
      } else {
        return null;
      }

      return {
        frame: this.currentFrame,
        playerId,
        type: commandType,
        typeString: COMMAND_TYPES[commandType as keyof typeof COMMAND_TYPES] || `UNKNOWN_${commandType.toString(16)}`,
        data,
        parameters: this.parseCommandParameters(commandType, data)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the expected length for a command type
   */
  private getCommandLength(commandType: number): number {
    // Common command lengths based on StarCraft replay format
    const lengths: Record<number, number> = {
      0x09: 2,  // SELECT
      0x0A: 2,  // SHIFT_SELECT  
      0x0B: 2,  // SHIFT_DESELECT
      0x0C: 7,  // BUILD
      0x0D: 2,  // VISION
      0x0E: 4,  // ALLIANCE
      0x13: 2,  // HOTKEY
      0x14: 4,  // MOVE
      0x15: 6,  // ATTACK
      0x16: 0,  // CANCEL
      0x17: 0,  // CANCEL_HATCH
      0x18: 1,  // STOP
      0x1D: 2,  // TRAIN
      0x1E: 2,  // CANCEL_TRAIN
      0x1F: 1,  // CLOAK
      0x20: 1,  // DECLOAK
      0x21: 2,  // UNIT_MORPH
      0x23: 1,  // UNSIEGE
      0x24: 1,  // SIEGE
      0x25: 2,  // TRAIN_FIGHTER
      0x27: 1,  // UNLOAD_ALL
      0x28: 4,  // UNLOAD
      0x2A: 1,  // HOLD_POSITION
      0x2B: 1,  // BURROW
      0x2C: 1,  // UNBURROW
      0x2E: 1,  // LIFT
      0x2F: 2,  // RESEARCH
      0x30: 0,  // CANCEL_RESEARCH
      0x31: 2,  // UPGRADE
      0x32: 0,  // CANCEL_UPGRADE
      0x34: 2,  // BUILDING_MORPH
      0x35: 1   // STIM
    };

    return lengths[commandType] || 1;
  }

  /**
   * Parse command-specific parameters
   */
  private parseCommandParameters(commandType: number, data: Uint8Array): any {
    if (data.length === 0) return {};

    try {
      switch (commandType) {
        case 0x0C: // BUILD
          return {
            unitType: data.length > 2 ? data[2] : 0,
            x: data.length > 4 ? data[3] | (data[4] << 8) : 0,
            y: data.length > 6 ? data[5] | (data[6] << 8) : 0
          };
          
        case 0x1D: // TRAIN
          return {
            unitType: data.length > 1 ? data[1] : 0
          };
          
        case 0x14: // MOVE
        case 0x15: // ATTACK
          return {
            x: data.length > 2 ? data[1] | (data[2] << 8) : 0,
            y: data.length > 4 ? data[3] | (data[4] << 8) : 0,
            target: data.length > 6 ? data[5] | (data[6] << 8) : 0
          };
          
        case 0x13: // HOTKEY
          return {
            hotkey: data.length > 1 ? data[1] : 0
          };
          
        default:
          return {};
      }
    } catch (error) {
      return {};
    }
  }

  /**
   * Enhance command with additional metadata
   */
  private enhanceCommand(command: Command): ParsedCommand {
    const timestamp = command.frame / DEFAULT_FPS;
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    const timestampString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return {
      ...command,
      timestamp,
      timestampString,
      category: this.categorizeCommand(command.type)
    };
  }

  /**
   * Categorize command type for analysis
   */
  private categorizeCommand(commandType: number): 'macro' | 'micro' | 'other' {
    const macroCommands = [0x0C, 0x1D, 0x1E, 0x2F, 0x30, 0x31, 0x32, 0x34]; // BUILD, TRAIN, etc.
    const microCommands = [0x14, 0x15, 0x18, 0x2A, 0x2B, 0x2C, 0x35]; // MOVE, ATTACK, etc.
    
    if (macroCommands.includes(commandType)) {
      return 'macro';
    }
    if (microCommands.includes(commandType)) {
      return 'micro';
    }
    return 'other';
  }
}
