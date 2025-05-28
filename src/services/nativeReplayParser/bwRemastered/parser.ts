
/**
 * StarCraft: Brood War Remastered .rep file parser
 * Based on the official replay format specification
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

    // Parse header (first 520 bytes)
    const header = this.parseHeader();
    console.log('[BWRemasteredParser] Header parsed:', header);

    // Parse players
    const players = this.parsePlayers();
    console.log('[BWRemasteredParser] Players parsed:', players.length);

    // Parse commands (starting after header + player data)
    this.position = 633; // Standard command start position
    const commands = this.parseCommands(100); // Parse first 100 commands for analysis
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
   * Parse the replay header (520 bytes)
   */
  private parseHeader(): BWReplayHeader {
    this.position = 0;

    // Check for replay signature at different positions
    let foundSignature = false;
    let signaturePosition = 0;

    // Try common positions where the header might start
    const tryPositions = [0, 8, 16, 32];
    
    for (const pos of tryPositions) {
      this.position = pos;
      if (this.position + 4 < this.data.byteLength) {
        const magic = this.readString(4);
        if (magic === 'Repl') {
          foundSignature = true;
          signaturePosition = pos;
          break;
        }
      }
    }

    if (!foundSignature) {
      // If no standard signature found, scan the file
      console.log('[BWRemasteredParser] No standard signature found, scanning file...');
      this.position = this.findReplayStart();
    } else {
      this.position = signaturePosition;
    }

    console.log('[BWRemasteredParser] Replay data starts at position:', this.position);

    // Skip magic bytes
    this.position += 4;

    // Read version info
    const version = this.readUInt32LE().toString();
    
    // Skip to frame count (offset 0x0C from start)
    this.position = signaturePosition + 0x0C;
    const totalFrames = this.readUInt32LE();

    // Skip to map name (offset 0x61 from start)
    this.position = signaturePosition + 0x61;
    const mapName = this.readString(32).replace(/\0/g, '').trim();

    // Game type info
    this.position = signaturePosition + 0x1A1;
    const gameType = this.readUInt8();

    return {
      version,
      seed: 0, // Will be calculated if needed
      totalFrames,
      mapName: mapName || 'Unknown Map',
      playerCount: 0, // Will be set after parsing players
      gameType
    };
  }

  /**
   * Parse player data
   */
  private parsePlayers(): BWPlayer[] {
    const players: BWPlayer[] = [];
    
    // Players start at offset 0x161
    this.position = 0x161;

    for (let i = 0; i < 8; i++) {
      const startPos = this.position;
      
      // Player name (24 bytes)
      const name = this.readString(24).replace(/\0/g, '').trim();
      
      if (name.length === 0) {
        // Skip empty player slot
        this.position = startPos + 36;
        continue;
      }

      // Skip 8 bytes to race
      this.position = startPos + 32;
      const race = this.readUInt8();
      
      // Team and color
      this.position = startPos + 33;
      const team = this.readUInt8();
      const color = this.readUInt8();

      if (race <= 6) { // Valid race
        players.push({
          name,
          race,
          raceString: RACE_MAPPING[race as keyof typeof RACE_MAPPING] || 'Unknown',
          slotId: i,
          team,
          color
        });
      }

      // Move to next player slot (36 bytes per player)
      this.position = startPos + 36;
    }

    return players;
  }

  /**
   * Parse commands from the replay
   */
  private parseCommands(maxCommands: number = 100): BWCommand[] {
    const commands: BWCommand[] = [];
    let currentFrame = 0;
    let commandCount = 0;

    while (this.position < this.data.byteLength && commandCount < maxCommands) {
      try {
        const commandByte = this.readUInt8();

        // Handle frame updates
        if (commandByte === 0x00) {
          currentFrame++;
          continue;
        } else if (commandByte === 0x01) {
          // Frame skip
          const skipFrames = this.readUInt8();
          currentFrame += skipFrames;
          continue;
        } else if (commandByte === 0x02) {
          // Large frame skip
          const skipFrames = this.readUInt16LE();
          currentFrame += skipFrames;
          continue;
        }

        // Parse actual command
        if (commandByte >= 0x09) {
          const command = this.parseCommand(commandByte, currentFrame);
          if (command) {
            commands.push(command);
            commandCount++;
          }
        }
      } catch (error) {
        // End of parseable data
        break;
      }
    }

    return commands;
  }

  /**
   * Parse a specific command
   */
  private parseCommand(commandType: number, frame: number): BWCommand | null {
    try {
      // Get command length
      const length = this.getCommandLength(commandType);
      if (length === 0) return null;

      // Save position to read command data
      const startPos = this.position;
      
      // Read user ID (usually first byte)
      const userId = this.readUInt8();
      
      // Reset to start and read all data
      this.position = startPos;
      const commandData = this.readBytes(length);

      return {
        frame,
        userId,
        type: commandType,
        typeString: COMMAND_MAPPING[commandType as keyof typeof COMMAND_MAPPING] || `Unknown_0x${commandType.toString(16)}`,
        data: commandData
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get expected command length
   */
  private getCommandLength(commandType: number): number {
    const lengths: Record<number, number> = {
      0x09: 2,  // Select
      0x0A: 2,  // Shift Select
      0x0B: 2,  // Shift Deselect
      0x0C: 7,  // Build
      0x0D: 2,  // Vision
      0x0E: 4,  // Alliance
      0x13: 2,  // Hotkey
      0x14: 4,  // Move
      0x15: 6,  // Attack
      0x16: 0,  // Cancel
      0x18: 1,  // Stop
      0x1D: 2,  // Train
      0x1E: 2,  // Cancel Train
      0x1F: 1,  // Cloak
      0x20: 1,  // Decloak
      0x21: 2,  // Unit Morph
      0x23: 1,  // Unsiege
      0x24: 1,  // Siege
      0x2A: 1,  // Hold Position
      0x2B: 1,  // Burrow
      0x2C: 1,  // Unburrow
      0x2F: 2,  // Research
      0x31: 2,  // Upgrade
      0x34: 2,  // Building Morph
      0x35: 1   // Stim
    };

    return lengths[commandType] || 1;
  }

  /**
   * Find where replay data starts by scanning for patterns
   */
  private findReplayStart(): number {
    // Look for the "Repl" signature anywhere in the first 1KB
    for (let i = 0; i < Math.min(1024, this.data.byteLength - 4); i++) {
      this.position = i;
      const chunk = this.readString(4);
      if (chunk === 'Repl') {
        return i;
      }
    }
    
    // If not found, start from beginning
    return 0;
  }

  // Utility methods for reading binary data
  private readUInt8(): number {
    const value = this.data.getUint8(this.position);
    this.position += 1;
    return value;
  }

  private readUInt16LE(): number {
    const value = this.data.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  private readUInt32LE(): number {
    const value = this.data.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  private readString(length: number): string {
    const bytes = new Uint8Array(this.data.buffer, this.position, length);
    this.position += length;
    return new TextDecoder('utf-8').decode(bytes);
  }

  private readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.data.buffer, this.position, length);
    this.position += length;
    return bytes;
  }
}
