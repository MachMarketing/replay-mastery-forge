
/**
 * StarCraft: Brood War Remastered .rep file parser
 * Based on icza/screp and BWAPI specification
 */

import { BWReplayHeader, BWPlayer, BWCommand, BWReplayData } from './types';
import { RACE_MAPPING, COMMAND_MAPPING, GAME_TYPE_MAPPING, FRAMES_PER_SECOND } from './constants';

export class BWRemasteredParser {
  private data: DataView;
  private position: number = 0;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new DataView(arrayBuffer);
    console.log('[BWRemasteredParser] Buffer size:', arrayBuffer.byteLength);
  }

  /**
   * Parse the complete replay file
   */
  parseReplay(): BWReplayData {
    console.log('[BWRemasteredParser] Starting BW Remastered replay parse');

    // Validate minimum file size (header is 633 bytes)
    if (this.data.byteLength < 633) {
      throw new Error('File too small to be a valid replay');
    }

    // Parse header
    const header = this.parseHeader();
    console.log('[BWRemasteredParser] Header parsed:', header);

    // Parse players
    const players = this.parsePlayers();
    console.log('[BWRemasteredParser] Players parsed:', players);

    // Parse commands
    const commands = this.parseCommands(500);
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
   * Parse replay header according to icza/screp specification
   */
  private parseHeader(): BWReplayHeader {
    console.log('[BWRemasteredParser] Parsing header...');
    
    // Reset position
    this.position = 0;

    // Check replay magic "Repl" at offset 0
    const magic = this.readFixedString(4);
    console.log('[BWRemasteredParser] Magic:', magic);
    if (magic !== 'Repl') {
      throw new Error(`Invalid replay file - expected "Repl", got "${magic}"`);
    }

    // Engine version at offset 4 (4 bytes)
    this.position = 4;
    const engineVersion = this.readUInt32LE();
    console.log('[BWRemasteredParser] Engine version:', engineVersion);

    // Frame count at offset 0x0C (12)
    this.position = 0x0C;
    const totalFrames = this.readUInt32LE();
    console.log('[BWRemasteredParser] Total frames:', totalFrames);

    // Map name at offset 0x68 (104), 32 bytes
    this.position = 0x68;
    const mapName = this.readFixedString(32);
    console.log('[BWRemasteredParser] Map name raw:', this.debugHexDump(0x68, 32));
    console.log('[BWRemasteredParser] Map name:', mapName);

    // Game type at offset 0x1C0 (448)
    this.position = 0x1C0;
    const gameType = this.readUInt16LE();
    console.log('[BWRemasteredParser] Game type:', gameType);

    // Random seed at offset 0x1C4 (452)
    this.position = 0x1C4;
    const seed = this.readUInt32LE();
    console.log('[BWRemasteredParser] Seed:', seed);

    return {
      version: '1.16.1',
      seed,
      totalFrames,
      mapName: this.cleanString(mapName),
      playerCount: 0, // Will be determined during player parsing
      gameType
    };
  }

  /**
   * Parse player data according to icza/screp specification
   */
  private parsePlayers(): BWPlayer[] {
    console.log('[BWRemasteredParser] Parsing players...');
    const players: BWPlayer[] = [];
    
    // Player data starts at offset 0x1A1 (417)
    // Each player slot is 37 bytes (not 36!)
    const playerDataStart = 0x1A1;
    
    for (let i = 0; i < 8; i++) {
      const playerOffset = playerDataStart + (i * 37);
      console.log(`[BWRemasteredParser] Parsing player slot ${i} at offset 0x${playerOffset.toString(16)}`);
      
      this.position = playerOffset;
      
      // Player name (25 bytes, null-terminated)
      const name = this.readPlayerName(25);
      console.log(`[BWRemasteredParser] Player ${i} name: "${name}"`);
      
      if (name.length === 0) {
        console.log(`[BWRemasteredParser] Player slot ${i} is empty, skipping`);
        continue;
      }

      // Skip to race info (at offset +32 from player start)
      this.position = playerOffset + 32;
      const race = this.readUInt8();
      console.log(`[BWRemasteredParser] Player ${i} race: ${race}`);
      
      // Team (at offset +33)
      const team = this.readUInt8();
      console.log(`[BWRemasteredParser] Player ${i} team: ${team}`);
      
      // Color (at offset +34)
      const color = this.readUInt8();
      console.log(`[BWRemasteredParser] Player ${i} color: ${color}`);

      // Debug: Show hex dump of this player slot
      console.log(`[BWRemasteredParser] Player ${i} hex dump:`, this.debugHexDump(playerOffset, 37));

      const raceString = RACE_MAPPING[race as keyof typeof RACE_MAPPING] || 'Unknown';
      
      players.push({
        name: this.cleanString(name),
        race,
        raceString,
        slotId: i,
        team,
        color
      });
    }

    console.log('[BWRemasteredParser] Found players:', players.map(p => `${p.name} (${p.raceString})`));
    return players;
  }

  /**
   * Read player name with multiple encoding attempts
   */
  private readPlayerName(length: number): string {
    const bytes = this.readBytes(length);
    
    // Find null terminator
    let actualLength = length;
    for (let i = 0; i < length; i++) {
      if (bytes[i] === 0) {
        actualLength = i;
        break;
      }
    }
    
    const nameBytes = bytes.slice(0, actualLength);
    
    // Try different encodings
    const encodings = ['utf-8', 'windows-1252', 'iso-8859-1'];
    
    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: true });
        const decoded = decoder.decode(nameBytes);
        if (decoded && /^[\x20-\x7E\u00A0-\u00FF]*$/.test(decoded)) {
          return decoded.trim();
        }
      } catch (e) {
        // Try next encoding
      }
    }
    
    // Fallback: manual ASCII conversion
    let result = '';
    for (let i = 0; i < nameBytes.length; i++) {
      const byte = nameBytes[i];
      if (byte >= 32 && byte <= 126) {
        result += String.fromCharCode(byte);
      } else if (byte >= 160 && byte <= 255) {
        result += String.fromCharCode(byte);
      }
    }
    
    return result.trim();
  }

  /**
   * Parse commands from replay data
   */
  private parseCommands(maxCommands: number = 500): BWCommand[] {
    console.log('[BWRemasteredParser] Parsing commands...');
    const commands: BWCommand[] = [];
    let currentFrame = 0;
    let commandCount = 0;

    // Commands start after header at offset 633 (0x279)
    this.position = 633;
    console.log('[BWRemasteredParser] Starting command parsing at position:', this.position);

    while (this.position < this.data.byteLength && commandCount < maxCommands) {
      try {
        const commandByte = this.readUInt8();

        // Handle frame synchronization
        if (commandByte === 0x00) {
          // Single frame advance
          currentFrame++;
          continue;
        } else if (commandByte === 0x01) {
          // Frame skip with count in next byte
          if (this.position < this.data.byteLength) {
            const skipFrames = this.readUInt8();
            currentFrame += skipFrames;
          }
          continue;
        } else if (commandByte === 0x02) {
          // Large frame skip with count in next 2 bytes
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
        } else {
          // Unknown command, skip it
          console.log(`[BWRemasteredParser] Unknown command: 0x${commandByte.toString(16)}`);
        }
      } catch (error) {
        console.log('[BWRemasteredParser] Command parsing stopped due to error:', error);
        break;
      }
    }

    console.log(`[BWRemasteredParser] Parsed ${commands.length} commands, last frame: ${currentFrame}`);
    return commands;
  }

  /**
   * Parse individual command
   */
  private parseCommand(commandType: number, frame: number): BWCommand | null {
    try {
      const commandLength = this.getCommandLength(commandType);
      
      if (commandLength === 0) {
        // Variable length or unknown command
        return {
          frame,
          userId: 0,
          type: commandType,
          typeString: COMMAND_MAPPING[commandType as keyof typeof COMMAND_MAPPING] || `Unknown_0x${commandType.toString(16)}`,
          data: new Uint8Array([])
        };
      }

      if (this.position + commandLength > this.data.byteLength) {
        return null;
      }

      // Save start position for data reading
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
        typeString: COMMAND_MAPPING[commandType as keyof typeof COMMAND_MAPPING] || `Unknown_0x${commandType.toString(16)}`,
        data: commandData
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get expected command length based on BWAPI specification
   */
  private getCommandLength(commandType: number): number {
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

  /**
   * Clean string by removing null bytes and trimming
   */
  private cleanString(str: string): string {
    return str.replace(/\0/g, '').trim();
  }

  /**
   * Debug helper: Create hex dump of buffer region
   */
  private debugHexDump(offset: number, length: number): string {
    const bytes: string[] = [];
    for (let i = 0; i < length && offset + i < this.data.byteLength; i++) {
      const byte = this.data.getUint8(offset + i);
      bytes.push(byte.toString(16).padStart(2, '0'));
    }
    return bytes.join(' ');
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
    const value = this.data.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  private readUInt32LE(): number {
    if (this.position + 3 >= this.data.byteLength) {
      throw new Error('End of buffer reached');
    }
    const value = this.data.getUint32(this.position, true);
    this.position += 4;
    return value;
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
