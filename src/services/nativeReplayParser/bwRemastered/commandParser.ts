
/**
 * Enhanced command parser for StarCraft: Brood War Remastered replays
 * Updated with BWAPI-conform command lengths and Remastered decompression
 */

import { BWBinaryReader } from './binaryReader';
import { BWCommand } from './types';
import { BWAPICommandEngine, BWAPI_COMMAND_LENGTHS, COMMAND_NAMES } from '../bwapi/commandEngine';
import { RemasteredDecompressor } from '../bwapi/remasteredDecompressor';

export class BWCommandParser {
  private reader: BWBinaryReader;
  private currentFrame: number = 0;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
  }

  /**
   * Parse commands with enhanced Remastered support and BWAPI-conform lengths
   */
  parseCommands(maxCommands: number = 1000): BWCommand[] {
    console.log('[BWCommandParser] Starting enhanced command parsing with BWAPI compliance');
    const commands: BWCommand[] = [];
    let commandCount = 0;

    try {
      // Try to find command section with enhanced detection
      this.findCommandSection();
      
      while (this.reader.canRead(1) && commandCount < maxCommands) {
        const command = this.parseNextCommand();
        if (command) {
          commands.push(command);
          commandCount++;
          
          if (commandCount % 100 === 0) {
            console.log(`[BWCommandParser] Parsed ${commandCount} commands, current frame: ${this.currentFrame}`);
          }
        }
      }
    } catch (error) {
      console.log(`[BWCommandParser] Command parsing completed with ${commandCount} commands:`, error);
    }

    console.log(`[BWCommandParser] Enhanced command parsing finished: ${commands.length} total commands`);
    return commands;
  }

  /**
   * Enhanced command section detection for Remastered
   */
  private findCommandSection(): void {
    console.log('[BWCommandParser] Searching for command section with Remastered support...');
    
    const dataSize = this.reader.getRemainingBytes();
    console.log('[BWCommandParser] Available data size:', dataSize);
    
    if (dataSize < 100) {
      console.log('[BWCommandParser] Data too small, using current position');
      return;
    }

    // Try decompression if we detect compressed blocks
    const currentPos = this.reader.getPosition();
    const sample = this.reader.readBytes(Math.min(100, dataSize));
    this.reader.setPosition(currentPos);
    
    // Check for Remastered compressed patterns
    if (RemasteredDecompressor.isCompressedBlock(sample)) {
      console.log('[BWCommandParser] Detected compressed Remastered data, attempting decompression...');
      try {
        const decompressed = RemasteredDecompressor.decompressBlock(sample);
        console.log('[BWCommandParser] Successfully decompressed block, size:', decompressed.byteLength);
        
        // Create new reader with decompressed data
        this.reader = new BWBinaryReader(decompressed);
        return;
      } catch (error) {
        console.log('[BWCommandParser] Decompression failed, using raw data:', error);
      }
    }

    // Pattern-based command section detection
    const patterns = [
      new Uint8Array([0x00]), // Frame increment
      new Uint8Array([0x09]), // Select command
      new Uint8Array([0x0C]), // Build command
      new Uint8Array([0x14])  // Train command
    ];

    for (let pos = 0; pos < Math.min(dataSize - 50, 2000); pos++) {
      this.reader.setPosition(currentPos + pos);
      const byte = this.reader.readByte();
      
      if (patterns.some(pattern => pattern[0] === byte)) {
        // Validate by checking if we can parse a few commands
        if (this.validateCommandSequence(3)) {
          console.log(`[BWCommandParser] Found command section at position ${currentPos + pos}`);
          this.reader.setPosition(currentPos + pos);
          return;
        }
      }
    }
    
    console.log('[BWCommandParser] Command section detection failed, using current position');
    this.reader.setPosition(currentPos);
  }

  /**
   * Validate command sequence for better detection
   */
  private validateCommandSequence(count: number): boolean {
    const startPos = this.reader.getPosition();
    let validCommands = 0;
    
    try {
      for (let i = 0; i < count; i++) {
        if (!this.reader.canRead(1)) break;
        
        const cmdByte = this.reader.readByte();
        
        // Frame commands
        if (cmdByte === 0x00 || cmdByte === 0x01 || cmdByte === 0x02) {
          if (cmdByte === 0x01 && this.reader.canRead(1)) {
            this.reader.readByte(); // Skip frame count
          } else if (cmdByte === 0x02 && this.reader.canRead(2)) {
            this.reader.readUInt16(); // Skip large frame count
          }
          validCommands++;
          continue;
        }
        
        // Regular commands
        const length = BWAPI_COMMAND_LENGTHS[cmdByte] || 1;
        if (length > 0 && this.reader.canRead(length)) {
          this.reader.readBytes(length);
          validCommands++;
        } else {
          break;
        }
      }
    } catch (error) {
      // Validation failed
    }
    
    this.reader.setPosition(startPos);
    return validCommands >= count * 0.7; // At least 70% valid
  }

  /**
   * Parse the next command with BWAPI-conform structure
   */
  private parseNextCommand(): BWCommand | null {
    if (!this.reader.canRead(1)) {
      return null;
    }

    try {
      const commandByte = this.reader.readByte();
      
      // Handle frame updates with correct BWAPI logic
      if (commandByte === 0x00) {
        this.currentFrame++;
        return null;
      }
      
      if (commandByte === 0x01) {
        if (this.reader.canRead(1)) {
          const skipFrames = this.reader.readByte();
          this.currentFrame += skipFrames;
        }
        return null;
      }
      
      if (commandByte === 0x02) {
        if (this.reader.canRead(2)) {
          const skipFrames = this.reader.readUInt16();
          this.currentFrame += skipFrames;
        }
        return null;
      }

      // Parse actual command with BWAPI-conform lengths
      return this.parseCommand(commandByte);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse command with BWAPI-conform byte lengths
   */
  private parseCommand(commandType: number): BWCommand | null {
    try {
      const length = BWAPI_COMMAND_LENGTHS[commandType] || 1;
      
      if (length === 0) {
        // Variable length command - handle specially
        return this.parseVariableLengthCommand(commandType);
      }

      if (!this.reader.canRead(length)) {
        return null;
      }

      const commandData = this.reader.readBytes(length);
      const playerId = commandData[0] || 0;
      
      return {
        frame: this.currentFrame,
        userId: playerId, // BWCommand compatibility
        playerId,
        type: commandType,
        typeString: COMMAND_NAMES[commandType] || `UNKNOWN_${commandType.toString(16)}`,
        data: commandData,
        parameters: this.parseCommandParameters(commandType, commandData)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Handle variable length commands
   */
  private parseVariableLengthCommand(commandType: number): BWCommand | null {
    // Most variable length commands have at least 1 byte for player ID
    if (!this.reader.canRead(1)) {
      return null;
    }

    const playerId = this.reader.readByte();
    
    return {
      frame: this.currentFrame,
      userId: playerId,
      playerId,
      type: commandType,
      typeString: COMMAND_NAMES[commandType] || `UNKNOWN_${commandType.toString(16)}`,
      data: new Uint8Array([playerId]),
      parameters: {}
    };
  }

  /**
   * Enhanced command parameter parsing with BWAPI-conform structure
   */
  private parseCommandParameters(commandType: number, data: Uint8Array): any {
    if (data.length === 0) return {};

    try {
      switch (commandType) {
        case 0x0C: // Build - 10 bytes
          return BWAPICommandEngine.parseBuildCommand(data);
          
        case 0x14: // Train - 6 bytes  
        case 0x1D: // Train Unit - 6 bytes
          return BWAPICommandEngine.parseTrainCommand(data);
          
        case 0x20: // Build Self/Morph - 10 bytes
          return BWAPICommandEngine.parseBuildSelfCommand(data);
          
        case 0x15: // Attack Move - 6 bytes
          return {
            x: data.length > 2 ? data[1] | (data[2] << 8) : 0,
            y: data.length > 4 ? data[3] | (data[4] << 8) : 0,
            target: data.length > 6 ? data[5] | (data[6] << 8) : 0
          };
          
        case 0x13: // Hotkey - 2 bytes
          return {
            hotkey: data.length > 1 ? data[1] : 0
          };
          
        case 0x09: // Select - 2 bytes
        case 0x0A: // Shift Select - 2 bytes  
        case 0x0B: // Shift Deselect - 2 bytes
          return {
            unitCount: data.length > 1 ? data[1] : 0
          };
          
        default:
          return {};
      }
    } catch (error) {
      return {};
    }
  }
}
