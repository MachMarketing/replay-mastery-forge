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
    console.log('[CommandParser] Starting command parsing...');
    const commands: Command[] = [];
    let iterations = 0;
    const maxIterations = 1000000;

    while (this.reader.canRead(1) && iterations < maxIterations) {
      iterations++;
      
      try {
        const byte = this.reader.readUInt8();
        
        // Frame sync commands - EXAKT nach screp
        if (byte === 0x00) {
          this.currentFrame++;
          continue;
        } else if (byte === 0x01) {
          if (!this.reader.canRead(1)) break;
          const skip = this.reader.readUInt8();
          this.currentFrame += skip;
          continue;
        } else if (byte === 0x02) {
          if (!this.reader.canRead(2)) break;
          const skip = this.reader.readUInt16LE();
          this.currentFrame += skip;
          continue;
        } else if (byte === 0x03) {
          if (!this.reader.canRead(4)) break;
          const skip = this.reader.readUInt32LE();
          this.currentFrame += skip;
          continue;
        }
        
        // Regular command
        const command = this.parseCommand(byte);
        if (command) {
          commands.push(command);
        }
        
      } catch (error) {
        if (iterations < 1000) {
          console.warn('[CommandParser] Early error:', error);
          break;
        }
        continue;
      }
    }

    console.log('[CommandParser] Parsed', commands.length, 'commands');
    return commands;
  }

  private parseCommand(commandType: number): Command | null {
    const cmdDef = ScrepConstants.getCommandDefinition(commandType);
    
    if (!cmdDef) {
      // Unbekannter Command - versuche Player ID zu überspringen
      if (this.reader.canRead(1)) {
        const possiblePlayerId = this.reader.peek();
        if (possiblePlayerId <= 11) {
          this.reader.readUInt8();
        }
      }
      return null;
    }
    
    if (!this.reader.canRead(1)) return null;

    const playerID = this.reader.readUInt8();
    
    // Validate Player ID (0-11)
    if (playerID > 11) {
      this.reader.setPosition(this.reader.getPosition() - 1);
      return null;
    }

    // Parse parameters
    const parameters = this.parseCommandParameters(commandType, cmdDef.length);
    
    return {
      frame: this.currentFrame,
      type: commandType,
      playerID,
      typeString: cmdDef.name,
      parameters,
      effective: cmdDef.effective,
      ineffKind: cmdDef.effective ? '' : this.getIneffKind(commandType),
      time: this.frameToTimeString(this.currentFrame),
      rawData: new Uint8Array([commandType, playerID])
    };
  }

  private parseCommandParameters(commandType: number, length: number): any {
    const parameters: any = {};
    
    if (length === 0) return parameters;
    if (!this.reader.canRead(length)) {
      console.warn('[CommandParser] Cannot read parameters for command', commandType);
      return parameters;
    }
    
    // Store current position for raw data extraction
    const startPos = this.reader.getPosition();
    
    switch (commandType) {
      case 0x0C: // Build
        if (length >= 6) {
          parameters.unitTypeId = this.reader.readUInt16LE();
          parameters.x = this.reader.readUInt16LE();
          parameters.y = this.reader.readUInt16LE();
          parameters.unitName = ScrepConstants.getUnitName(parameters.unitTypeId);
          parameters.commandType = 'build';
        }
        break;
        
      case 0x1E: // Train
        if (length >= 2) {
          parameters.unitTypeId = this.reader.readUInt16LE();
          parameters.unitName = ScrepConstants.getUnitName(parameters.unitTypeId);
          parameters.commandType = 'train';
        }
        break;
        
      case 0x22: // Unit Morph
        if (length >= 2) {
          parameters.unitTypeId = this.reader.readUInt16LE();
          parameters.unitName = ScrepConstants.getUnitName(parameters.unitTypeId);
          parameters.commandType = 'morph';
        }
        break;
        
      case 0x34: // Building Morph
        if (length >= 2) {
          parameters.unitTypeId = this.reader.readUInt16LE();
          parameters.unitName = ScrepConstants.getUnitName(parameters.unitTypeId);
          parameters.commandType = 'building_morph';
        }
        break;
        
      case 0x2F: // Tech
        if (length >= 2) {
          parameters.techId = this.reader.readUInt16LE();
          parameters.techName = ScrepConstants.getTechName(parameters.techId);
          parameters.commandType = 'tech';
        }
        break;
        
      case 0x31: // Upgrade
        if (length >= 2) {
          parameters.upgradeId = this.reader.readUInt16LE();
          parameters.upgradeName = ScrepConstants.getTechName(parameters.upgradeId);
          parameters.commandType = 'upgrade';
        }
        break;
        
      case 0x14: // Move
      case 0x17: // Right Click
        if (length >= 4) {
          parameters.x = this.reader.readUInt16LE();
          parameters.y = this.reader.readUInt16LE();
        }
        break;
        
      case 0x15: // Attack
        if (length >= 6) {
          parameters.x = this.reader.readUInt16LE();
          parameters.y = this.reader.readUInt16LE();
          parameters.targetUnitId = this.reader.readUInt16LE();
        }
        break;
        
      case 0x13: // Hotkey
        if (length >= 2) {
          parameters.hotkey = this.reader.readUInt8();
          parameters.action = this.reader.readUInt8();
        }
        break;
        
      case 0x09: // Select
      case 0x0A: // Shift Select
      case 0x0B: // Shift Deselect
        if (length >= 2) {
          parameters.count = this.reader.readUInt8();
          parameters.unitType = this.reader.readUInt8();
        }
        break;
        
      case 0x4B: // Chat - Variable length
        // Chat has variable length, read until we find reasonable data
        try {
          const chatData = this.reader.readBytes(Math.min(length, 80));
          parameters.message = new TextDecoder('utf-8', { fatal: false }).decode(chatData);
        } catch {
          this.reader.skip(length);
        }
        break;
        
      default:
        // Raw bytes für andere Commands
        if (length > 0 && length <= 32) {
          const bytes = this.reader.readBytes(length);
          parameters.raw = Array.from(bytes);
        } else if (length > 0) {
          this.reader.skip(length);
        }
        break;
    }
    
    return parameters;
  }

  private getIneffKind(commandType: number): string {
    // Klassifizierung nach screp IneffKind
    switch (commandType) {
      case 0x0D: // Vision
      case 0x0F: // Game Speed
      case 0x10: // Pause
      case 0x11: // Resume
        return 'ui';
      case 0x36: // Sync
        return 'sync';
      case 0x48: // Minimap Ping
        return 'ui';
      case 0x4B: // Chat
      case 0x5B: // Chat To Allies
      case 0x5C: // Chat To All
        return 'chat';
      default:
        return 'spam';
    }
  }

  private frameToTimeString(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}