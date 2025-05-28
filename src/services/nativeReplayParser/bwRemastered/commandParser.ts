
/**
 * StarCraft: Brood War Remastered Command Parser
 * Updated with correct BWAPI command lengths and Remastered FPS
 */

import { BWBinaryReader } from './binaryReader';
import { BWCommand } from './types';
import { COMMAND_MAPPING } from './constants';
import { 
  BWAPICommand, 
  BWAPI_COMMAND_LENGTHS, 
  COMMAND_NAMES, 
  BWAPICommandEngine,
  REMASTERED_FPS
} from '../bwapi/commandEngine';

export class BWCommandParser {
  private reader: BWBinaryReader;
  private commandsStartOffset: number;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
    // Für dekomprimierte Daten beginnen Commands normalerweise nach Header
    this.commandsStartOffset = 633;
  }

  /**
   * Parse Commands mit verbesserter BWAPI-Conformität
   */
  parseCommands(maxCommands: number = 10000): BWAPICommand[] {
    console.log('[BWCommandParser] Starting BWAPI-conform command parse...');
    console.log('[BWCommandParser] Commands start at offset:', `0x${this.commandsStartOffset.toString(16)}`);
    
    const commands: BWAPICommand[] = [];
    let currentFrame = 0;
    let commandCount = 0;
    let consecutiveErrors = 0;
    
    this.reader.setPosition(this.commandsStartOffset);
    
    while (this.reader.canRead(1) && commandCount < maxCommands && consecutiveErrors < 50) {
      try {
        const commandByte = this.reader.readUInt8();
        
        // Handle frame synchronization mit korrekter BWAPI-Spezifikation
        if (commandByte === 0x00) {
          // Single frame advance
          currentFrame++;
          consecutiveErrors = 0;
          continue;
        } else if (commandByte === 0x01) {
          // Frame skip with count in next byte
          if (this.reader.canRead(1)) {
            const skipFrames = this.reader.readUInt8();
            currentFrame += skipFrames;
            if (skipFrames > 100) {
              console.log(`[BWCommandParser] Large frame skip: +${skipFrames} (frame ${currentFrame})`);
            }
          }
          consecutiveErrors = 0;
          continue;
        } else if (commandByte === 0x02) {
          // Large frame skip with count in next 2 bytes
          if (this.reader.canRead(2)) {
            const skipFrames = this.reader.readUInt16LE();
            currentFrame += skipFrames;
            console.log(`[BWCommandParser] Very large frame skip: +${skipFrames} (frame ${currentFrame})`);
          }
          consecutiveErrors = 0;
          continue;
        }
        
        // Validate command ID mit BWAPI-bekannten Commands
        if (!BWAPI_COMMAND_LENGTHS.hasOwnProperty(commandByte)) {
          consecutiveErrors++;
          if (consecutiveErrors <= 10) {
            console.log(`[BWCommandParser] Unknown command ID: 0x${commandByte.toString(16)} at frame ${currentFrame}`);
          }
          continue;
        }
        
        // Parse game command mit korrekten BWAPI-Längen
        const command = this.parseGameCommandBWAPI(commandByte, currentFrame);
        if (command) {
          commands.push(command);
          commandCount++;
          consecutiveErrors = 0;
          
          // Log wichtige Commands für Debugging
          if (commandCount <= 20 || [0x0C, 0x1D, 0x14, 0x20, 0x21, 0x34].includes(commandByte)) {
            console.log(`[BWCommandParser] Command ${commandCount}:`, {
              frame: command.frame,
              cmdId: `0x${command.cmdId.toString(16)}`,
              type: command.typeString,
              playerId: command.playerId,
              category: command.category,
              isEffective: command.isEffectiveAction
            });
          }
        } else {
          consecutiveErrors++;
        }
        
      } catch (error) {
        consecutiveErrors++;
        console.warn('[BWCommandParser] Command parsing error at position', this.reader.getPosition(), ':', error);
        
        // Versuche Recovery durch skip von einigen Bytes
        if (this.reader.canRead(2)) {
          this.reader.readBytes(2);
        } else {
          break;
        }
      }
    }
    
    // Validiere Command-Plausibilität
    const gameDurationMinutes = currentFrame / REMASTERED_FPS / 60;
    const validation = BWAPICommandEngine.validateCommandCount(commands.length, gameDurationMinutes, 8);
    
    console.log(`[BWCommandParser] Parse complete:`, {
      totalCommands: commands.length,
      finalFrame: currentFrame,
      gameDuration: `${gameDurationMinutes.toFixed(1)} minutes`,
      validationQuality: validation.quality,
      isRealistic: validation.isRealistic,
      expectedRange: validation.expectedRange
    });
    
    return commands;
  }

  /**
   * Parse einzelner Game Command mit BWAPI-Spezifikation
   */
  private parseGameCommandBWAPI(commandType: number, frame: number): BWAPICommand | null {
    try {
      const commandLength = BWAPI_COMMAND_LENGTHS[commandType] || 1;
      const commandName = COMMAND_NAMES[commandType] || `Unknown_0x${commandType.toString(16)}`;
      
      // Für Commands mit Länge 0 (variable) verwende minimale Länge
      const actualLength = commandLength === 0 ? 1 : commandLength;
      
      if (!this.reader.canRead(actualLength)) {
        console.warn(`[BWCommandParser] Cannot read ${actualLength} bytes for command 0x${commandType.toString(16)}`);
        return null;
      }
      
      // Lese Command-Daten
      let commandData = new Uint8Array([commandType]);
      let playerId = 0;
      
      if (actualLength > 1) {
        const remainingData = this.reader.readBytes(actualLength - 1);
        commandData = new Uint8Array([commandType, ...remainingData]);
        
        // Player ID ist meist das erste Byte nach Command Type
        if (remainingData.length > 0) {
          playerId = remainingData[0];
        }
      }
      
      // Parse Command-spezifische Parameter
      const parameters = this.parseCommandParameters(commandType, commandData);
      
      // Kategorisiere Command
      const category = BWAPICommandEngine.categorizeCommand(commandType);
      const isEffectiveAction = BWAPICommandEngine.isEffectiveAction(commandType);
      
      return {
        frame,
        playerId,
        cmdId: commandType,
        typeString: commandName,
        data: commandData,
        parameters,
        category,
        isEffectiveAction
      };
      
    } catch (error) {
      console.warn(`[BWCommandParser] Failed to parse command 0x${commandType.toString(16)}:`, error);
      return null;
    }
  }

  /**
   * Parse Command-spezifische Parameter basierend auf BWAPI-Strukturen
   */
  private parseCommandParameters(commandType: number, data: Uint8Array): any {
    try {
      switch (commandType) {
        case 0x0C: // Build (10 bytes)
          return BWAPICommandEngine.parseBuildCommand(data);
          
        case 0x14: // Train (6 bytes)
        case 0x1D: // Train Unit (6 bytes)
          return BWAPICommandEngine.parseTrainCommand(data);
          
        case 0x20: // Build Self/Morph (10 bytes)
          return BWAPICommandEngine.parseBuildSelfCommand(data);
          
        case 0x15: // Attack Move (6 bytes)
          if (data.length >= 6) {
            return {
              playerId: data[1],
              x: data[2] | (data[3] << 8),
              y: data[4] | (data[5] << 8)
            };
          }
          break;
          
        case 0x13: // Hotkey Assignment (2 bytes)
          if (data.length >= 2) {
            return {
              playerId: data[1],
              hotkey: data[1] & 0x0F // Lower 4 bits
            };
          }
          break;
          
        case 0x2F: // Research (2 bytes)
        case 0x31: // Upgrade (2 bytes)
          if (data.length >= 2) {
            return {
              playerId: data[1],
              techType: data[1]
            };
          }
          break;
          
        default:
          return {};
      }
    } catch (error) {
      console.warn(`[BWCommandParser] Parameter parsing failed for 0x${commandType.toString(16)}:`, error);
      return {};
    }
    
    return {};
  }

  /**
   * Dynamische Command-Start-Offset-Detection für dekomprimierte Daten
   */
  detectCommandsOffset(): number {
    const originalPos = this.reader.getPosition();
    
    // Teste verschiedene bekannte Offsets für dekomprimierte Remastered-Daten
    const testOffsets = [633, 500, 400, 300, 200, 100, 0];
    
    for (const offset of testOffsets) {
      try {
        this.reader.setPosition(offset);
        
        // Suche nach Command-Pattern
        let validCommands = 0;
        let testPos = 0;
        
        while (testPos < 100 && this.reader.canRead(1)) {
          const byte = this.reader.readUInt8();
          testPos++;
          
          // Frame-Sync oder bekannte Commands
          if ([0x00, 0x01, 0x02].includes(byte) || BWAPI_COMMAND_LENGTHS.hasOwnProperty(byte)) {
            validCommands++;
          }
        }
        
        if (validCommands >= 5) {
          console.log(`[BWCommandParser] Detected commands start at offset ${offset} (${validCommands} valid commands found)`);
          this.reader.setPosition(originalPos);
          return offset;
        }
      } catch (error) {
        // Continue to next offset
      }
    }
    
    this.reader.setPosition(originalPos);
    console.warn('[BWCommandParser] Could not detect commands offset, using default 633');
    return 633;
  }
}
