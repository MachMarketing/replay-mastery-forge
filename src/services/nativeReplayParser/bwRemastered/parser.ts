
/**
 * StarCraft: Brood War Remastered .rep file parser
 * Based on official format specification from icza/screp and BWAPI
 */

import { BWReplayHeader, BWPlayer, BWCommand, BWReplayData } from './types';
import { RACE_MAPPING, COMMAND_MAPPING, GAME_TYPE_MAPPING, FRAMES_PER_SECOND } from './constants';

export class BWRemasteredParser {
  private data: DataView;
  private position: number = 0;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new DataView(arrayBuffer);
  }

  /**
   * Parse the complete replay file
   */
  parseReplay(): BWReplayData {
    console.log('[BWRemasteredParser] Starting BW Remastered replay parse');
    console.log('[BWRemasteredParser] File size:', this.data.byteLength);

    // Validate minimum file size
    if (this.data.byteLength < 633) {
      throw new Error('File too small to be a valid replay');
    }

    // Parse header (first 633 bytes)
    const header = this.parseHeader();
    console.log('[BWRemasteredParser] Header parsed:', header);

    // Parse players from header section
    const players = this.parsePlayers();
    console.log('[BWRemasteredParser] Players parsed:', players.length);

    // Parse commands starting after header
    const commands = this.parseCommands(200); // Parse more commands for better analysis
    console.log('[BWRemasteredParser] Commands parsed:', commands.length);

    // Calculate game duration
    const durationSeconds = header.totalFrames / FRAMES_PER_SECOND;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return {
      mapName: header.mapName,
      totalFrames: header.totalFrames,
      duration,
      players,
      commands,
      gameType: GAME_TYPE_MAPPING[header.gameType as keyof typeof GAME_TYPE_MAPPING] || 'Unknown'
    };
  }

  /**
   * Parse the replay header according to .rep specification
   */
  private parseHeader(): BWReplayHeader {
    this.position = 0;

    // Read and verify replay ID (4 bytes) - should be "Repl"
    const replayId = this.readString(4);
    if (replayId !== 'Repl') {
      throw new Error(`Invalid replay file - expected "Repl", got "${replayId}"`);
    }

    // Engine version (4 bytes) - skip for now
    this.position = 8;

    // Frame count (4 bytes at offset 0x0C)
    this.position = 0x0C;
    const totalFrames = this.readUInt32LE();

    // Skip to keyframe interval (4 bytes at offset 0x10)
    this.position = 0x10;
    const keyframeInterval = this.readUInt32LE();

    // Skip to map name (32 bytes at offset 0x61)
    this.position = 0x61;
    const mapName = this.readFixedString(32);

    // Game type and sub type (at offset 0x1A1)
    this.position = 0x1A1;
    const gameType = this.readUInt16LE();
    const gameSubType = this.readUInt16LE();

    // Random seed (4 bytes at offset 0x1A5)
    this.position = 0x1A5;
    const seed = this.readUInt32LE();

    // Player count is determined by scanning player slots
    let playerCount = 0;
    const tempPos = this.position;
    this.position = 0x161; // Player data starts here
    
    for (let i = 0; i < 8; i++) {
      const playerStart = 0x161 + (i * 36);
      this.position = playerStart;
      const name = this.readFixedString(24);
      if (name.trim().length > 0) {
        playerCount++;
      }
    }
    
    this.position = tempPos;

    return {
      version: '1.16.1',
      seed,
      totalFrames,
      mapName: mapName.trim() || 'Unknown Map',
      playerCount,
      gameType
    };
  }

  /**
   * Parse player data from the header section
   */
  private parsePlayers(): BWPlayer[] {
    const players: BWPlayer[] = [];
    
    // Player data starts at offset 0x161, each player slot is 36 bytes
    for (let i = 0; i < 8; i++) {
      const playerOffset = 0x161 + (i * 36);
      this.position = playerOffset;
      
      // Player name (24 bytes)
      const name = this.readFixedString(24);
      
      if (name.trim().length === 0) {
        continue; // Skip empty player slot
      }

      // Skip 8 bytes to reach race info
      this.position = playerOffset + 32;
      const race = this.readUInt8();
      
      // Team info
      this.position = playerOffset + 33;
      const team = this.readUInt8();
      
      // Color
      const color = this.readUInt8();

      // Only add players with valid races
      if (race <= 6) {
        players.push({
          name: name.trim(),
          race,
          raceString: RACE_MAPPING[race as keyof typeof RACE_MAPPING] || 'Unknown',
          slotId: i,
          team,
          color
        });
      }
    }

    return players;
  }

  /**
   * Parse commands from the replay data section
   */
  private parseCommands(maxCommands: number = 200): BWCommand[] {
    const commands: BWCommand[] = [];
    let currentFrame = 0;
    let commandCount = 0;

    // Commands start at offset 633 (0x279)
    this.position = 633;

    while (this.position < this.data.byteLength && commandCount < maxCommands) {
      try {
        const commandByte = this.readUInt8();

        // Handle frame synchronization commands
        if (commandByte === 0x00) {
          // Frame advance
          currentFrame++;
          continue;
        } else if (commandByte === 0x01) {
          // Frame skip (next byte contains skip count)
          if (this.position < this.data.byteLength) {
            const skipFrames = this.readUInt8();
            currentFrame += skipFrames;
          }
          continue;
        } else if (commandByte === 0x02) {
          // Large frame skip (next 2 bytes contain skip count)
          if (this.position + 1 < this.data.byteLength) {
            const skipFrames = this.readUInt16LE();
            currentFrame += skipFrames;
          }
          continue;
        }

        // Parse actual game command
        if (commandByte >= 0x09 && commandByte <= 0x48) {
          const command = this.parseCommand(commandByte, currentFrame);
          if (command) {
            commands.push(command);
            commandCount++;
          }
        }
      } catch (error) {
        // End of parseable data or corrupted command
        console.log('[BWRemasteredParser] Command parsing stopped:', error);
        break;
      }
    }

    return commands;
  }

  /**
   * Parse a specific command based on type
   */
  private parseCommand(commandType: number, frame: number): BWCommand | null {
    try {
      const commandLength = this.getCommandLength(commandType);
      if (commandLength === 0 || this.position + commandLength > this.data.byteLength) {
        return null;
      }

      // Save start position
      const commandStart = this.position;
      
      // Most commands start with player ID
      let userId = 0;
      if (commandLength > 0) {
        userId = this.readUInt8();
      }

      // Read remaining command data
      this.position = commandStart;
      const commandData = this.readBytes(commandLength);

      return {
        frame,
        userId,
        type: commandType,
        typeString: COMMAND_MAPPING[commandType as keyof typeof COMMAND_MAPPING] || `Unknown_0x${commandType.toString(16).toUpperCase()}`,
        data: commandData
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the expected length for each command type
   */
  private getCommandLength(commandType: number): number {
    // Command lengths based on BWAPI specification
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
      0x16: 0,   // Cancel
      0x17: 0,   // Cancel Hatch
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

  // Binary reading utility methods
  private readUInt8(): number {
    if (this.position >= this.data.byteLength) {
      throw new Error('End of buffer reached');
    }
    const value = this.data.getUint8(this.position);
    this.position += 1;
    return value;
  }

  private readUInt16LE(): number {
    if (this.position + 1 >= this.data.byteLength) {
      throw new Error('End of buffer reached');
    }
    const value = this.data.getUint16(this.position, true); // true = little endian
    this.position += 2;
    return value;
  }

  private readUInt32LE(): number {
    if (this.position + 3 >= this.data.byteLength) {
      throw new Error('End of buffer reached');
    }
    const value = this.data.getUint32(this.position, true); // true = little endian
    this.position += 4;
    return value;
  }

  private readString(length: number): string {
    if (this.position + length > this.data.byteLength) {
      throw new Error('End of buffer reached');
    }
    const bytes = new Uint8Array(this.data.buffer, this.data.byteOffset + this.position, length);
    this.position += length;
    return new TextDecoder('utf-8').decode(bytes);
  }

  private readFixedString(length: number): string {
    if (this.position + length > this.data.byteLength) {
      throw new Error('End of buffer reached');
    }
    const bytes = new Uint8Array(this.data.buffer, this.data.byteOffset + this.position, length);
    this.position += length;
    
    // Find null terminator
    let actualLength = length;
    for (let i = 0; i < length; i++) {
      if (bytes[i] === 0) {
        actualLength = i;
        break;
      }
    }
    
    return new TextDecoder('utf-8').decode(bytes.slice(0, actualLength));
  }

  private readBytes(length: number): Uint8Array {
    if (this.position + length > this.data.byteLength) {
      throw new Error('End of buffer reached');
    }
    const bytes = new Uint8Array(this.data.buffer, this.data.byteOffset + this.position, length);
    this.position += length;
    return bytes;
  }
}
