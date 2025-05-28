/**
 * Enhanced command parser for StarCraft: Brood War Remastered replays
 * Now includes aggressive raw command extraction when decompression fails
 */

import { BWBinaryReader } from './binaryReader';
import { BWCommand } from './types';
import { BWAPICommandEngine, BWAPI_COMMAND_LENGTHS, COMMAND_NAMES } from '../bwapi/commandEngine';
import { RemasteredDecompressor } from '../bwapi/remasteredDecompressor';
import { RawCommandExtractor } from '../bwapi/rawCommandExtractor';

export class BWCommandParser {
  private reader: BWBinaryReader;
  private currentFrame: number = 0;
  private debugMode: boolean = true;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
  }

  /**
   * Parse commands with ultra-aggressive detection using multiple strategies
   */
  async parseCommands(maxCommands: number = 10000): Promise<BWCommand[]> {
    console.log('[BWCommandParser] Starting ultra-aggressive command parsing');
    const commands: BWCommand[] = [];
    
    try {
      // Strategy 1: Try traditional decompression + parsing
      const traditionalCommands = this.tryTraditionalParsing(maxCommands);
      if (traditionalCommands.length > 100) {
        console.log(`[BWCommandParser] Traditional parsing successful: ${traditionalCommands.length} commands`);
        return traditionalCommands;
      }
      
      // Strategy 2: Use raw command extractor on the entire buffer
      console.log('[BWCommandParser] Traditional parsing failed, using raw extraction...');
      const rawResult = await RawCommandExtractor.extractCommands(this.reader.data.buffer);
      
      if (rawResult.commands.length > 50) {
        console.log(`[BWCommandParser] Raw extraction successful: ${rawResult.commands.length} commands`);
        return this.convertRawCommands(rawResult.commands);
      }
      
      // Strategy 3: Fallback to pattern scanning
      console.log('[BWCommandParser] Raw extraction insufficient, trying pattern scanning...');
      const patternCommands = this.tryPatternScanning(maxCommands);
      if (patternCommands.length > 0) {
        return patternCommands;
      }
      
    } catch (error) {
      console.log('[BWCommandParser] All parsing strategies failed:', error);
    }

    console.log('[BWCommandParser] No commands extracted, returning empty array');
    return [];
  }

  /**
   * Try traditional decompression and parsing
   */
  private tryTraditionalParsing(maxCommands: number): BWCommand[] {
    console.log('[BWCommandParser] Trying traditional decompression + parsing');
    
    try {
      // Multiple parsing strategies to catch all commands
      return this.findAndProcessCommandSections(maxCommands);
    } catch (error) {
      console.log('[BWCommandParser] Traditional parsing failed:', error);
      return [];
    }
  }

  /**
   * Convert raw commands to BWCommand format
   */
  private convertRawCommands(rawCommands: any[]): BWCommand[] {
    console.log('[BWCommandParser] Converting raw commands to BWCommand format');
    
    return rawCommands.map(rawCmd => ({
      frame: rawCmd.frame,
      userId: rawCmd.playerId,
      type: rawCmd.commandId,
      typeString: rawCmd.commandName,
      data: rawCmd.data,
      parameters: rawCmd.parameters
    }));
  }

  /**
   * Try pattern scanning as last resort
   */
  private tryPatternScanning(maxCommands: number): BWCommand[] {
    console.log('[BWCommandParser] Trying pattern scanning as last resort');
    
    const commands: BWCommand[] = [];
    const dataSize = this.reader.getRemainingBytes();
    const startPos = this.reader.getPosition();
    
    // Scan through data looking for command-like patterns
    for (let offset = 0; offset < Math.min(dataSize, 20000); offset += 8) {
      this.reader.setPosition(startPos + offset);
      
      if (this.reader.canRead(20)) {
        const localCommands = this.parseAggressiveCommands(50);
        if (localCommands.length > 3) {
          commands.push(...localCommands);
          if (commands.length >= maxCommands) break;
        }
      }
    }
    
    this.reader.setPosition(startPos);
    console.log(`[BWCommandParser] Pattern scanning found ${commands.length} commands`);
    return commands;
  }

  /**
   * Multiple command section detection strategies
   */
  private findAndProcessCommandSections(maxCommands: number): BWCommand[] {
    const commands: BWCommand[] = [];
    const dataSize = this.reader.getRemainingBytes();
    console.log('[BWCommandParser] Available data size:', dataSize);
    
    // Strategy 1: Try decompression first
    this.tryDecompressionAndParse(commands, maxCommands);
    
    // Strategy 2: Scan for command patterns in raw data
    if (commands.length < 50) {
      console.log('[BWCommandParser] Low command count, trying raw data parsing...');
      this.scanForCommandPatterns(commands, maxCommands);
    }
    
    // Strategy 3: Brute force scan with different offsets
    if (commands.length < 100) {
      console.log('[BWCommandParser] Still low command count, trying brute force scan...');
      this.bruteForceCommandScan(commands, maxCommands);
    }
    
    return commands;
  }

  /**
   * Try decompression and parse decompressed data
   */
  private tryDecompressionAndParse(commands: BWCommand[], maxCommands: number): void {
    const currentPos = this.reader.getPosition();
    const sampleSize = Math.min(1000, this.reader.getRemainingBytes());
    const sample = this.reader.readBytes(sampleSize);
    this.reader.setPosition(currentPos);
    
    if (RemasteredDecompressor.isLikelyCompressed(sample)) {
      console.log('[BWCommandParser] Detected compressed data, attempting decompression...');
      try {
        const decompressed = RemasteredDecompressor.decompressBlock(sample);
        const decompressedReader = new BWBinaryReader(decompressed);
        this.parseCommandsFromReader(decompressedReader, commands, maxCommands);
        return;
      } catch (error) {
        console.log('[BWCommandParser] Decompression failed, continuing with raw data:', error);
      }
    }
    
    // Parse raw data if no decompression
    this.parseCommandsFromReader(this.reader, commands, maxCommands);
  }

  /**
   * Scan for command patterns in data
   */
  private scanForCommandPatterns(commands: BWCommand[], maxCommands: number): void {
    const startPos = this.reader.getPosition();
    const dataSize = this.reader.getRemainingBytes();
    
    // Look for command-like patterns
    for (let offset = 0; offset < Math.min(dataSize - 100, 5000); offset += 1) {
      this.reader.setPosition(startPos + offset);
      
      if (this.reader.canRead(10)) {
        const testBytes = this.reader.readBytes(10);
        this.reader.setPosition(startPos + offset);
        
        // Check if this looks like a command sequence
        if (this.looksLikeCommandSequence(testBytes)) {
          console.log(`[BWCommandParser] Found potential command sequence at offset ${offset}`);
          const foundCommands = this.parseCommandsFromReader(this.reader, [], Math.min(maxCommands - commands.length, 1000));
          commands.push(...foundCommands);
          
          if (commands.length >= maxCommands) break;
        }
      }
    }
    
    this.reader.setPosition(startPos);
  }

  /**
   * Brute force scan with aggressive command detection
   */
  private bruteForceCommandScan(commands: BWCommand[], maxCommands: number): void {
    const startPos = this.reader.getPosition();
    const dataSize = this.reader.getRemainingBytes();
    
    console.log('[BWCommandParser] Starting brute force scan...');
    
    for (let offset = 0; offset < Math.min(dataSize - 50, 10000); offset += 4) {
      this.reader.setPosition(startPos + offset);
      
      if (this.reader.canRead(20)) {
        // Try to parse commands from this position
        const localCommands = this.parseAggressiveCommands(50);
        if (localCommands.length > 5) {
          console.log(`[BWCommandParser] Found ${localCommands.length} commands at offset ${offset}`);
          commands.push(...localCommands);
          
          if (commands.length >= maxCommands) break;
        }
      }
    }
    
    this.reader.setPosition(startPos);
  }

  /**
   * Check if byte sequence looks like commands
   */
  private looksLikeCommandSequence(bytes: Uint8Array): boolean {
    let commandLikeBytes = 0;
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      
      // Check for known command IDs or frame updates
      if (BWAPI_COMMAND_LENGTHS[byte] !== undefined || 
          [0x00, 0x01, 0x02].includes(byte)) {
        commandLikeBytes++;
      }
    }
    
    return commandLikeBytes >= 3; // At least 3 command-like bytes
  }

  /**
   * Parse commands from a specific reader
   */
  private parseCommandsFromReader(reader: BWBinaryReader, commands: BWCommand[], maxCommands: number): BWCommand[] {
    const localCommands: BWCommand[] = [];
    let commandCount = 0;
    
    while (reader.canRead(1) && commandCount < maxCommands) {
      const command = this.parseNextCommandFromReader(reader);
      if (command) {
        localCommands.push(command);
        commandCount++;
        
        if (commandCount % 100 === 0) {
          console.log(`[BWCommandParser] Parsed ${commandCount} commands from reader`);
        }
      }
    }
    
    commands.push(...localCommands);
    return localCommands;
  }

  /**
   * Aggressive command parsing with more liberal detection
   */
  private parseAggressiveCommands(maxLocal: number): BWCommand[] {
    const commands: BWCommand[] = [];
    let count = 0;
    
    while (this.reader.canRead(1) && count < maxLocal) {
      try {
        const command = this.parseNextCommandFromReader(this.reader);
        if (command) {
          commands.push(command);
          count++;
        }
      } catch (error) {
        // Skip problematic bytes and continue
        if (this.reader.canRead(1)) {
          this.reader.readUInt8();
        }
      }
    }
    
    return commands;
  }

  /**
   * Parse the next command from reader with enhanced detection
   */
  private parseNextCommandFromReader(reader: BWBinaryReader): BWCommand | null {
    if (!reader.canRead(1)) {
      return null;
    }

    try {
      const commandByte = reader.readUInt8();
      
      // Handle frame updates
      if (commandByte === 0x00) {
        this.currentFrame++;
        return null;
      }
      
      if (commandByte === 0x01) {
        if (reader.canRead(1)) {
          const skipFrames = reader.readUInt8();
          this.currentFrame += skipFrames;
        }
        return null;
      }
      
      if (commandByte === 0x02) {
        if (reader.canRead(2)) {
          const skipFrames = reader.readUInt16LE();
          this.currentFrame += skipFrames;
        }
        return null;
      }

      // Parse actual command
      return this.parseCommand(reader, commandByte);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse command with enhanced parameter extraction
   */
  private parseCommand(reader: BWBinaryReader, commandType: number): BWCommand | null {
    try {
      const length = this.getCorrectCommandLength(commandType);
      
      if (length === undefined) {
        // Unknown command, try to skip safely
        return null;
      }
      
      if (length === 0) {
        // Variable length command
        return this.parseVariableLengthCommand(reader, commandType);
      }

      if (!reader.canRead(length)) {
        return null;
      }

      const commandData = reader.readBytes(length);
      const userId = commandData.length > 0 ? commandData[0] : 0;
      
      return {
        frame: this.currentFrame,
        userId,
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
   * CORRECT BWAPI Command Lengths based on official documentation
   */
  private getCorrectCommandLength(commandType: number): number | undefined {
    const CORRECT_BWAPI_LENGTHS: Record<number, number> = {
      // Frame synchronization
      0x00: 0,   // Frame Increment (no additional data)
      0x01: 1,   // Frame Skip (1 byte count)
      0x02: 2,   // Large Frame Skip (2 byte count)
      
      // Core game commands with CORRECT lengths
      0x09: 2,   // Select Units (2 bytes)
      0x0A: 2,   // Shift Select (2 bytes)
      0x0B: 2,   // Shift Deselect (2 bytes)
      0x0C: 10,  // Build (10 bytes) - CORRECTED from 7
      0x0D: 2,   // Vision (2 bytes)
      0x0E: 4,   // Cancel Construction (4 bytes)
      0x0F: 2,   // Cancel Morph (2 bytes)
      0x10: 1,   // Stop (1 byte)
      0x11: 10,  // Attack Move (10 bytes) - CORRECTED
      0x12: 2,   // Cheat (2 bytes)
      0x13: 10,  // Right Click Move (10 bytes) - CORRECTED
      0x14: 6,   // Train (6 bytes) - CORRECTED from 4
      0x15: 6,   // Attack (6 bytes)
      0x16: 1,   // Cancel (1 byte)
      0x17: 1,   // Cancel Hatch (1 byte)
      0x18: 1,   // Stop (1 byte)
      0x19: 1,   // Carrier Stop (1 byte)
      0x1A: 6,   // Use Tech (6 bytes)
      0x1B: 10,  // Use Tech Position (10 bytes)
      0x1C: 1,   // Return Cargo (1 byte)
      0x1D: 6,   // Train Unit (6 bytes) - CORRECTED from 2
      0x1E: 2,   // Cancel Train (2 bytes)
      0x1F: 1,   // Cloak (1 byte)
      0x20: 6,   // Build Self/Morph (6 bytes) - CORRECTED from 10
      0x21: 2,   // Unit Morph (2 bytes)
      0x22: 2,   // Unload (2 bytes)
      0x23: 1,   // Unsiege (1 byte)
      0x24: 1,   // Siege (1 byte)
      0x25: 2,   // Train Fighter (2 bytes)
      0x26: 1,   // Unload All (1 byte)
      0x27: 1,   // Unload All (1 byte)
      0x28: 2,   // Unload (2 bytes)
      0x29: 1,   // Merge Archon (1 byte)
      0x2A: 1,   // Hold Position (1 byte)
      0x2B: 1,   // Burrow (1 byte)
      0x2C: 1,   // Unburrow (1 byte)
      0x2D: 1,   // Cancel Nuke (1 byte)
      0x2E: 1,   // Lift (1 byte)
      0x2F: 2,   // Research (2 bytes)
      0x30: 2,   // Cancel Research (2 bytes)
      0x31: 2,   // Upgrade (2 bytes)
      0x32: 2,   // Cancel Upgrade (2 bytes)
      0x33: 2,   // Cancel Addon (2 bytes)
      0x34: 2,   // Building Morph (2 bytes)
      0x35: 1,   // Stim (1 byte)
      0x36: 1,   // Sync (1 byte)
      
      // Network commands
      0x37: 1,   // Voice Enable1
      0x38: 1,   // Voice Enable2
      0x39: 1,   // Voice Squelch1
      0x3A: 1,   // Voice Squelch2
      0x3B: 1,   // Start Game
      0x3C: 1,   // Download Percentage
      0x3D: 4,   // Change Game Slot
      0x3E: 4,   // New Net Player
      0x3F: 1,   // Joined Game
      0x40: 2,   // Change Race
      0x41: 2,   // Team Game Team
      0x42: 2,   // UMS Team
      0x43: 2,   // Melee Team
      0x44: 4,   // Swap Players
      0x45: 4,   // Saved Data
      0x48: 10   // Load Game
    };
    
    return CORRECT_BWAPI_LENGTHS[commandType];
  }

  /**
   * Enhanced command-stream detection using "Sync Frame Flooding"
   */
  private findCommandStreamStart(data: Uint8Array): number {
    console.log('[BWCommandParser] Using Sync Frame Flooding detection...');
    
    // Look for patterns of frame sync bytes followed by actual commands
    for (let offset = 500; offset < Math.min(data.length - 100, 3000); offset++) {
      let syncCount = 0;
      let commandCount = 0;
      
      // Check for sync flooding pattern
      for (let i = 0; i < 50 && offset + i < data.length; i++) {
        const byte = data[offset + i];
        
        if (byte === 0x00 || byte === 0x01) {
          syncCount++;
        } else if ([0x0C, 0x14, 0x1D, 0x20].includes(byte)) {
          commandCount++;
        }
      }
      
      // Good pattern: multiple syncs followed by build commands
      if (syncCount >= 5 && commandCount >= 2) {
        console.log(`[BWCommandParser] Found command stream at offset ${offset} (${syncCount} syncs, ${commandCount} commands)`);
        return offset;
      }
    }
    
    console.log('[BWCommandParser] No clear command stream found, using default offset');
    return 633; // Fallback to standard offset
  }

  /**
   * Enhanced command parameter parsing with correct unit mappings
   */
  private parseCommandParameters(commandType: number, data: Uint8Array): any {
    if (data.length === 0) return {};

    try {
      switch (commandType) {
        case 0x0C: // Build - 10 bytes
          return this.parseBuildCommand(data);
          
        case 0x14: // Train - 6 bytes  
        case 0x1D: // Train Unit - 6 bytes
          return this.parseTrainCommand(data);
          
        case 0x20: // Build Self/Morph - 6 bytes (corrected)
          return this.parseMorphCommand(data);
          
        case 0x11: // Attack Move - 10 bytes
        case 0x13: // Right Click - 10 bytes
          return this.parseMoveCommand(data);
          
        case 0x15: // Attack - 6 bytes
          return this.parseAttackCommand(data);
          
        case 0x1A: // Use Tech - 6 bytes
        case 0x1B: // Use Tech Position - 10 bytes
          return this.parseTechCommand(data);
          
        case 0x09: // Select - 2 bytes
        case 0x0A: // Shift Select - 2 bytes  
        case 0x0B: // Shift Deselect - 2 bytes
          return this.parseSelectCommand(data);
          
        default:
          return {};
      }
    } catch (error) {
      return {};
    }
  }

  private parseBuildCommand(data: Uint8Array): any {
    if (data.length < 10) return {};
    return {
      playerId: data[1],
      unitTypeId: data[2] | (data[3] << 8),
      x: data[4] | (data[5] << 8),
      y: data[6] | (data[7] << 8),
      flags: data[8] | (data[9] << 8)
    };
  }

  private parseTrainCommand(data: Uint8Array): any {
    if (data.length < 6) return {};
    return {
      playerId: data[1],
      unitTypeId: data[2] | (data[3] << 8),
      flags: data[4] | (data[5] << 8)
    };
  }

  private parseMorphCommand(data: Uint8Array): any {
    if (data.length < 6) return {};
    return {
      playerId: data[1],
      unitTypeId: data[2] | (data[3] << 8),
      targetId: data[4] | (data[5] << 8)
    };
  }

  private parseMoveCommand(data: Uint8Array): any {
    if (data.length < 10) return {};
    return {
      playerId: data[1],
      x: data[2] | (data[3] << 8),
      y: data[4] | (data[5] << 8),
      targetId: data[6] | (data[7] << 8),
      flags: data[8] | (data[9] << 8)
    };
  }

  private parseAttackCommand(data: Uint8Array): any {
    if (data.length < 6) return {};
    return {
      playerId: data[1],
      x: data[2] | (data[3] << 8),
      y: data[4] | (data[5] << 8)
    };
  }

  private parseTechCommand(data: Uint8Array): any {
    if (data.length < 6) return {};
    return {
      playerId: data[1],
      techId: data[2] | (data[3] << 8),
      targetId: data.length >= 6 ? data[4] | (data[5] << 8) : 0
    };
  }

  private parseSelectCommand(data: Uint8Array): any {
    if (data.length < 2) return {};
    return {
      playerId: data[1]
    };
  }

  /**
   * Log detailed command statistics
   */
  private logCommandStatistics(commands: BWCommand[]): void {
    if (!this.debugMode) return;
    
    const stats: Record<string, number> = {};
    const buildCommands = [];
    
    for (const command of commands) {
      const typeName = command.typeString;
      stats[typeName] = (stats[typeName] || 0) + 1;
      
      // Collect build/train commands for debugging
      if ([0x0C, 0x14, 0x1D, 0x20].includes(command.type)) {
        buildCommands.push({
          type: command.typeString,
          frame: command.frame,
          parameters: command.parameters
        });
      }
    }
    
    console.log('[BWCommandParser] Command statistics:', stats);
    console.log('[BWCommandParser] Build/Train commands found:', buildCommands.length);
    
    if (buildCommands.length > 0) {
      console.log('[BWCommandParser] First 10 build commands:', buildCommands.slice(0, 10));
    }
  }
}
