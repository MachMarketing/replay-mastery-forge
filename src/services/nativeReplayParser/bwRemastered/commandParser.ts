
/**
 * StarCraft: Brood War Remastered Command Parser
 * Based on icza/screp specification
 */

import { BWBinaryReader } from './binaryReader';
import { BWCommand } from './types';
import { COMMAND_MAPPING } from './constants';

export class BWCommandParser {
  private reader: BWBinaryReader;
  private commandsStartOffset: number;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
    // Commands start after header at offset 633 (0x279)
    this.commandsStartOffset = 633;
  }

  parseCommands(maxCommands: number = 1000): BWCommand[] {
    console.log('[BWCommandParser] Starting command parse...');
    console.log('[BWCommandParser] Commands start at offset:', `0x${this.commandsStartOffset.toString(16)}`);
    
    const commands: BWCommand[] = [];
    let currentFrame = 0;
    let commandCount = 0;
    
    this.reader.setPosition(this.commandsStartOffset);
    
    while (this.reader.canRead(1) && commandCount < maxCommands) {
      try {
        const commandByte = this.reader.readUInt8();
        
        // Handle frame synchronization commands
        if (commandByte === 0x00) {
          // Single frame advance
          currentFrame++;
          continue;
        } else if (commandByte === 0x01) {
          // Frame skip with count in next byte
          if (this.reader.canRead(1)) {
            const skipFrames = this.reader.readUInt8();
            currentFrame += skipFrames;
            console.log(`[BWCommandParser] Frame skip: +${skipFrames} (frame ${currentFrame})`);
          }
          continue;
        } else if (commandByte === 0x02) {
          // Large frame skip with count in next 2 bytes
          if (this.reader.canRead(2)) {
            const skipFrames = this.reader.readUInt16LE();
            currentFrame += skipFrames;
            console.log(`[BWCommandParser] Large frame skip: +${skipFrames} (frame ${currentFrame})`);
          }
          continue;
        }
        
        // Parse actual game command
        const command = this.parseGameCommand(commandByte, currentFrame);
        if (command) {
          commands.push(command);
          commandCount++;
          
          // Log first few commands for debugging
          if (commandCount <= 10) {
            console.log(`[BWCommandParser] Command ${commandCount}:`, {
              frame: command.frame,
              type: `0x${command.type.toString(16)}`,
              typeString: command.typeString,
              userId: command.userId
            });
          }
        }
        
      } catch (error) {
        console.warn('[BWCommandParser] Command parsing error:', error);
        break;
      }
    }
    
    console.log(`[BWCommandParser] Parsed ${commands.length} commands, final frame: ${currentFrame}`);
    return commands;
  }

  private parseGameCommand(commandType: number, frame: number): BWCommand | null {
    try {
      const commandLength = this.getCommandLength(commandType);
      const commandName = COMMAND_MAPPING[commandType as keyof typeof COMMAND_MAPPING] || `Unknown_0x${commandType.toString(16)}`;
      
      // Save current position
      const startPos = this.reader.getPosition() - 1; // -1 because we already read the command byte
      
      // For commands with known length, read the data
      let userId = 0;
      let commandData = new Uint8Array([commandType]);
      
      if (commandLength > 1 && this.reader.canRead(commandLength - 1)) {
        // Read remaining command data
        const remainingData = this.reader.readBytes(commandLength - 1);
        
        // First byte after command type is usually user/player ID
        if (remainingData.length > 0) {
          userId = remainingData[0];
        }
        
        // Combine command type with remaining data
        commandData = new Uint8Array([commandType, ...remainingData]);
      } else if (commandLength === 0) {
        // Variable length command - try to determine length
        const variableData = this.readVariableLengthCommand(commandType);
        if (variableData.length > 1) {
          userId = variableData[1];
        }
        commandData = variableData;
      }
      
      return {
        frame,
        userId,
        type: commandType,
        typeString: commandName,
        data: commandData
      };
      
    } catch (error) {
      console.warn(`[BWCommandParser] Failed to parse command 0x${commandType.toString(16)}:`, error);
      return null;
    }
  }

  private readVariableLengthCommand(commandType: number): Uint8Array {
    // For unknown/variable length commands, read a reasonable amount
    const maxVariableLength = 32;
    const availableBytes = Math.min(maxVariableLength, this.reader.getRemainingBytes());
    
    if (availableBytes > 0) {
      return new Uint8Array([commandType, ...this.reader.readBytes(Math.min(8, availableBytes))]);
    }
    
    return new Uint8Array([commandType]);
  }

  private getCommandLength(commandType: number): number {
    // Based on BWAPI and screp specifications
    const commandLengths: Record<number, number> = {
      0x09: 2,   // Select
      0x0A: 2,   // Shift Select  
      0x0B: 2,   // Shift Deselect
      0x0C: 7,   // Build
      0x0D: 2,   // Vision
      0x0E: 4,   // Alliance
      0x13: 2,   // Hotkey
      0x14: 4,   // Move
      0x15: 6,   // Attack
      0x16: 0,   // Cancel (variable)
      0x17: 0,   // Cancel Hatch (variable)
      0x18: 1,   // Stop
      0x19: 1,   // Carrier Stop
      0x1A: 1,   // Reaver Stop
      0x1B: 1,   // Order Nothing
      0x1C: 1,   // Return Cargo
      0x1D: 2,   // Train
      0x1E: 2,   // Cancel Train
      0x1F: 1,   // Cloak
      0x20: 1,   // Decloak
      0x21: 2,   // Unit Morph
      0x23: 1,   // Unsiege
      0x24: 1,   // Siege
      0x25: 2,   // Train Fighter
      0x27: 1,   // Unload All
      0x28: 2,   // Unload
      0x29: 1,   // Merge Archon
      0x2A: 1,   // Hold Position
      0x2B: 1,   // Burrow
      0x2C: 1,   // Unburrow
      0x2D: 1,   // Cancel Nuke
      0x2E: 1,   // Lift
      0x2F: 2,   // Research
      0x30: 2,   // Cancel Research
      0x31: 2,   // Upgrade
      0x32: 2,   // Cancel Upgrade
      0x33: 2,   // Cancel Addon
      0x34: 2,   // Building Morph
      0x35: 1,   // Stim
      0x48: 10   // Load Game
    };

    return commandLengths[commandType] || 1;
  }
}
