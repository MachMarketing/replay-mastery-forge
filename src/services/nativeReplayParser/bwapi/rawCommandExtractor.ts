
/**
 * Raw Command Extractor - Extracts commands directly from compressed replay data
 * Based on BWAPI command structure analysis
 */

import { BWBinaryReader } from '../bwRemastered/binaryReader';

export interface RawCommand {
  frame: number;
  playerId: number;
  commandId: number;
  commandName: string;
  data: Uint8Array;
  parameters: any;
  category: 'build' | 'train' | 'move' | 'attack' | 'select' | 'other';
}

export interface RawExtractionResult {
  commands: RawCommand[];
  totalFrames: number;
  playerCommands: Record<number, RawCommand[]>;
  extractionMethod: string;
  confidence: 'high' | 'medium' | 'low';
}

export class RawCommandExtractor {
  private static readonly BWAPI_COMMANDS = {
    0x09: { name: 'Select', length: 2, category: 'select' as const },
    0x0A: { name: 'Shift Select', length: 2, category: 'select' as const },
    0x0B: { name: 'Shift Deselect', length: 2, category: 'select' as const },
    0x0C: { name: 'Build', length: 7, category: 'build' as const },
    0x0D: { name: 'Vision', length: 2, category: 'other' as const },
    0x0E: { name: 'Alliance', length: 4, category: 'other' as const },
    0x13: { name: 'Hotkey', length: 2, category: 'select' as const },
    0x14: { name: 'Move', length: 4, category: 'move' as const },
    0x15: { name: 'Attack', length: 6, category: 'attack' as const },
    0x16: { name: 'Cancel', length: 0, category: 'other' as const },
    0x17: { name: 'Cancel Hatch', length: 0, category: 'other' as const },
    0x18: { name: 'Stop', length: 1, category: 'other' as const },
    0x1D: { name: 'Train', length: 2, category: 'train' as const },
    0x1E: { name: 'Cancel Train', length: 2, category: 'other' as const },
    0x1F: { name: 'Cloak', length: 1, category: 'other' as const },
    0x20: { name: 'Decloak', length: 1, category: 'other' as const },
    0x21: { name: 'Unit Morph', length: 2, category: 'build' as const },
    0x2F: { name: 'Research', length: 2, category: 'build' as const },
    0x30: { name: 'Cancel Research', length: 0, category: 'other' as const },
    0x31: { name: 'Upgrade', length: 2, category: 'build' as const },
    0x32: { name: 'Cancel Upgrade', length: 0, category: 'other' as const },
    0x34: { name: 'Building Morph', length: 2, category: 'build' as const }
  };

  /**
   * Extract commands using multiple aggressive strategies
   */
  static async extractCommands(buffer: ArrayBuffer): Promise<RawExtractionResult> {
    console.log('[RawCommandExtractor] Starting aggressive raw command extraction');
    console.log('[RawCommandExtractor] Buffer size:', buffer.byteLength);

    const strategies = [
      () => this.extractFromDecompressedSections(buffer),
      () => this.extractFromCommandPatterns(buffer),
      () => this.extractFromZlibStreams(buffer),
      () => this.extractFromBruteForce(buffer)
    ];

    let bestResult: RawExtractionResult | null = null;
    let maxCommands = 0;

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`[RawCommandExtractor] Trying strategy ${i + 1}...`);
        const result = strategies[i]();
        
        if (result && result.commands.length > maxCommands) {
          maxCommands = result.commands.length;
          bestResult = result;
          console.log(`[RawCommandExtractor] Strategy ${i + 1} found ${result.commands.length} commands`);
        }
        
        // If we found a good amount of commands, we can stop
        if (result && result.commands.length > 500) {
          console.log(`[RawCommandExtractor] Found sufficient commands (${result.commands.length}), stopping`);
          break;
        }
      } catch (error) {
        console.log(`[RawCommandExtractor] Strategy ${i + 1} failed:`, error);
      }
    }

    if (!bestResult || bestResult.commands.length < 50) {
      console.log('[RawCommandExtractor] All strategies failed or found too few commands');
      return this.createFallbackResult();
    }

    return bestResult;
  }

  /**
   * Strategy 1: Extract from decompressed sections
   */
  private static extractFromDecompressedSections(buffer: ArrayBuffer): RawExtractionResult {
    console.log('[RawCommandExtractor] Strategy 1: Decompressed sections');
    const commands: RawCommand[] = [];
    const uint8Array = new Uint8Array(buffer);
    
    // Look for small decompressible sections that might contain commands
    for (let offset = 0; offset < uint8Array.length - 1000; offset += 512) {
      if (uint8Array[offset] === 0x78 && [0x9C, 0xDA, 0x01].includes(uint8Array[offset + 1])) {
        try {
          // Try to decompress small sections
          const sectionSize = Math.min(2048, uint8Array.length - offset);
          const section = uint8Array.slice(offset, offset + sectionSize);
          
          const pako = require('pako');
          const decompressed = pako.inflate(section);
          
          if (decompressed.length > 100) {
            const sectionCommands = this.parseCommandsFromData(decompressed, 0);
            commands.push(...sectionCommands);
            console.log(`[RawCommandExtractor] Decompressed section at ${offset}: ${sectionCommands.length} commands`);
          }
        } catch (error) {
          // Continue to next section
        }
      }
    }

    return this.buildResult(commands, 'decompressed-sections');
  }

  /**
   * Strategy 2: Look for command patterns in raw data
   */
  private static extractFromCommandPatterns(buffer: ArrayBuffer): RawExtractionResult {
    console.log('[RawCommandExtractor] Strategy 2: Command patterns');
    const commands: RawCommand[] = [];
    const uint8Array = new Uint8Array(buffer);
    
    // Scan for command sequences that might be uncompressed
    for (let offset = 0; offset < uint8Array.length - 50; offset++) {
      const potentialCommands = this.scanForCommandSequence(uint8Array, offset, 100);
      if (potentialCommands.length > 5) {
        commands.push(...potentialCommands);
        console.log(`[RawCommandExtractor] Found command sequence at offset ${offset}: ${potentialCommands.length} commands`);
        offset += 200; // Skip ahead to avoid duplicates
      }
    }

    return this.buildResult(commands, 'pattern-matching');
  }

  /**
   * Strategy 3: Extract from individual zlib streams
   */
  private static extractFromZlibStreams(buffer: ArrayBuffer): RawExtractionResult {
    console.log('[RawCommandExtractor] Strategy 3: Individual zlib streams');
    const commands: RawCommand[] = [];
    const uint8Array = new Uint8Array(buffer);
    
    // Find all zlib headers and try to decompress each individually
    for (let offset = 0; offset < uint8Array.length - 100; offset++) {
      if (uint8Array[offset] === 0x78 && [0x9C, 0xDA, 0x01, 0x5E, 0x2C].includes(uint8Array[offset + 1])) {
        try {
          // Try different block sizes
          const blockSizes = [512, 1024, 2048, 4096];
          
          for (const blockSize of blockSizes) {
            if (offset + blockSize <= uint8Array.length) {
              try {
                const block = uint8Array.slice(offset, offset + blockSize);
                const pako = require('pako');
                const decompressed = pako.inflate(block);
                
                if (decompressed.length > 50) {
                  const blockCommands = this.parseCommandsFromData(decompressed, 0);
                  if (blockCommands.length > 0) {
                    commands.push(...blockCommands);
                    console.log(`[RawCommandExtractor] Zlib block at ${offset} (size ${blockSize}): ${blockCommands.length} commands`);
                    break; // Found good data, try next offset
                  }
                }
              } catch (error) {
                // Try next block size
              }
            }
          }
        } catch (error) {
          // Continue to next zlib header
        }
      }
    }

    return this.buildResult(commands, 'zlib-streams');
  }

  /**
   * Strategy 4: Brute force scan for command-like patterns
   */
  private static extractFromBruteForce(buffer: ArrayBuffer): RawExtractionResult {
    console.log('[RawCommandExtractor] Strategy 4: Brute force');
    const commands: RawCommand[] = [];
    const uint8Array = new Uint8Array(buffer);
    
    // Look for any byte sequences that resemble command structures
    let currentFrame = 0;
    
    for (let offset = 500; offset < Math.min(uint8Array.length - 20, 10000); offset++) {
      const byte = uint8Array[offset];
      
      // Frame sync bytes
      if (byte === 0x00) {
        currentFrame++;
        continue;
      } else if (byte === 0x01 && offset + 1 < uint8Array.length) {
        currentFrame += uint8Array[offset + 1];
        offset++;
        continue;
      } else if (byte === 0x02 && offset + 2 < uint8Array.length) {
        const skip = uint8Array[offset + 1] | (uint8Array[offset + 2] << 8);
        currentFrame += skip;
        offset += 2;
        continue;
      }
      
      // Check for command bytes
      if (this.BWAPI_COMMANDS[byte as keyof typeof this.BWAPI_COMMANDS]) {
        const command = this.BWAPI_COMMANDS[byte as keyof typeof this.BWAPI_COMMANDS];
        
        if (offset + command.length < uint8Array.length) {
          const playerId = command.length > 0 ? uint8Array[offset + 1] : 0;
          
          // Only accept valid player IDs
          if (playerId <= 7) {
            const data = uint8Array.slice(offset, offset + Math.max(1, command.length));
            
            commands.push({
              frame: currentFrame,
              playerId,
              commandId: byte,
              commandName: command.name,
              data,
              parameters: this.parseCommandParameters(byte, data),
              category: command.category
            });
            
            offset += Math.max(0, command.length - 1);
          }
        }
      }
    }

    return this.buildResult(commands, 'brute-force');
  }

  /**
   * Scan for command sequence at specific offset
   */
  private static scanForCommandSequence(data: Uint8Array, startOffset: number, maxBytes: number): RawCommand[] {
    const commands: RawCommand[] = [];
    let currentFrame = 0;
    let offset = startOffset;
    const endOffset = Math.min(startOffset + maxBytes, data.length);
    
    while (offset < endOffset - 5) {
      const byte = data[offset];
      
      // Frame sync
      if (byte === 0x00) {
        currentFrame++;
        offset++;
        continue;
      } else if (byte === 0x01 && offset + 1 < endOffset) {
        currentFrame += data[offset + 1];
        offset += 2;
        continue;
      }
      
      // Command
      if (this.BWAPI_COMMANDS[byte as keyof typeof this.BWAPI_COMMANDS]) {
        const command = this.BWAPI_COMMANDS[byte as keyof typeof this.BWAPI_COMMANDS];
        
        if (offset + command.length < endOffset) {
          const playerId = command.length > 0 ? data[offset + 1] : 0;
          
          if (playerId <= 7) {
            const cmdData = data.slice(offset, offset + Math.max(1, command.length));
            
            commands.push({
              frame: currentFrame,
              playerId,
              commandId: byte,
              commandName: command.name,
              data: cmdData,
              parameters: this.parseCommandParameters(byte, cmdData),
              category: command.category
            });
            
            offset += Math.max(1, command.length);
          } else {
            offset++;
          }
        } else {
          offset++;
        }
      } else {
        offset++;
      }
    }
    
    return commands;
  }

  /**
   * Parse commands from decompressed data
   */
  private static parseCommandsFromData(data: Uint8Array, startFrame: number): RawCommand[] {
    const reader = new BWBinaryReader(data.buffer);
    const commands: RawCommand[] = [];
    let currentFrame = startFrame;
    
    try {
      while (reader.canRead(1)) {
        const byte = reader.readUInt8();
        
        // Frame sync
        if (byte === 0x00) {
          currentFrame++;
          continue;
        } else if (byte === 0x01 && reader.canRead(1)) {
          currentFrame += reader.readUInt8();
          continue;
        } else if (byte === 0x02 && reader.canRead(2)) {
          currentFrame += reader.readUInt16LE();
          continue;
        }
        
        // Command
        if (this.BWAPI_COMMANDS[byte as keyof typeof this.BWAPI_COMMANDS]) {
          const command = this.BWAPI_COMMANDS[byte as keyof typeof this.BWAPI_COMMANDS];
          
          if (reader.canRead(command.length)) {
            const cmdData = reader.readBytes(Math.max(1, command.length));
            const playerId = command.length > 0 ? cmdData[0] : 0;
            
            if (playerId <= 7) {
              commands.push({
                frame: currentFrame,
                playerId,
                commandId: byte,
                commandName: command.name,
                data: cmdData,
                parameters: this.parseCommandParameters(byte, cmdData),
                category: command.category
              });
            }
          }
        }
      }
    } catch (error) {
      // End of data
    }
    
    return commands;
  }

  /**
   * Parse command parameters
   */
  private static parseCommandParameters(commandId: number, data: Uint8Array): any {
    try {
      switch (commandId) {
        case 0x0C: // Build
          return {
            unitTypeId: data.length > 2 ? data[2] : 0,
            x: data.length > 4 ? data[3] | (data[4] << 8) : 0,
            y: data.length > 6 ? data[5] | (data[6] << 8) : 0
          };
          
        case 0x1D: // Train
          return {
            unitTypeId: data.length > 1 ? data[1] : 0
          };
          
        case 0x14: // Move
        case 0x15: // Attack
          return {
            x: data.length > 2 ? data[1] | (data[2] << 8) : 0,
            y: data.length > 4 ? data[3] | (data[4] << 8) : 0
          };
          
        case 0x13: // Hotkey
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
   * Build result with analysis
   */
  private static buildResult(commands: RawCommand[], method: string): RawExtractionResult {
    // Group by player
    const playerCommands: Record<number, RawCommand[]> = {};
    let maxFrame = 0;
    
    for (const command of commands) {
      if (!playerCommands[command.playerId]) {
        playerCommands[command.playerId] = [];
      }
      playerCommands[command.playerId].push(command);
      maxFrame = Math.max(maxFrame, command.frame);
    }
    
    // Determine confidence
    let confidence: 'high' | 'medium' | 'low';
    if (commands.length > 1000) {
      confidence = 'high';
    } else if (commands.length > 200) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
    
    console.log(`[RawCommandExtractor] Method ${method}: ${commands.length} commands, confidence: ${confidence}`);
    
    return {
      commands,
      totalFrames: maxFrame,
      playerCommands,
      extractionMethod: method,
      confidence
    };
  }

  /**
   * Create fallback result when all strategies fail
   */
  private static createFallbackResult(): RawExtractionResult {
    return {
      commands: [],
      totalFrames: 0,
      playerCommands: {},
      extractionMethod: 'fallback',
      confidence: 'low'
    };
  }
}
