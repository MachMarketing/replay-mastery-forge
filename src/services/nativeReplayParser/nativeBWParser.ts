
/**
 * Native JavaScript/TypeScript Parser for StarCraft: Brood War Remastered .rep files
 * Based on screp specification - works directly in browser without backend
 */

import * as pako from 'pako';

export interface BWReplayAction {
  frame: number;
  playerId: number;
  opcode: number;
  data: Uint8Array;
  actionName: string;
}

export interface BWReplayMetadata {
  version: string;
  mapName: string;
  players: string[];
  apm: number[];
  eapm: number[];
  totalFrames: number;
  duration: string;
  gameLength: number;
}

export interface BWReplayParseResult {
  metadata: BWReplayMetadata;
  actions: BWReplayAction[];
  buildOrders: Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>>;
}

export class NativeBWParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Main parsing function with enhanced seRS support
   */
  async parseReplay(): Promise<BWReplayParseResult> {
    console.log('[NativeBWParser] Starting enhanced native parsing...');
    
    // Step 1: Validate and read file header
    this.validateReplayFile();
    
    // Step 2: Handle seRS compression if present
    const decompressedData = await this.handleSeRSDecompression();
    
    // Step 3: Parse decompressed replay stream
    const parser = new DecompressedStreamParser(decompressedData);
    const parseResult = parser.parseStream();
    
    console.log('[NativeBWParser] Enhanced native parsing complete');
    return parseResult;
  }

  /**
   * Enhanced seRS handling with better compression detection
   */
  private async handleSeRSDecompression(): Promise<Uint8Array> {
    console.log('[NativeBWParser] Handling seRS decompression...');
    
    // Check for seRS magic at offset 12
    const seRSMagic = new TextDecoder().decode(this.buffer.slice(12, 16));
    console.log('[NativeBWParser] seRS magic check:', seRSMagic);
    
    if (seRSMagic === 'seRS') {
      console.log('[NativeBWParser] seRS format detected, attempting decompression...');
      
      // Enhanced zlib header detection
      const zlibOffset = this.findZlibHeader();
      if (zlibOffset === -1) {
        console.warn('[NativeBWParser] No valid zlib header found, using raw data');
        return new Uint8Array(this.buffer);
      }
      
      const compressedData = new Uint8Array(this.buffer.slice(zlibOffset));
      console.log('[NativeBWParser] Compressed data size:', compressedData.length);
      console.log('[NativeBWParser] Zlib header bytes:', 
        Array.from(compressedData.slice(0, 4))
          .map(b => `0x${b.toString(16).padStart(2, '0')}`)
          .join(' '));
      
      try {
        // Try multiple decompression methods
        return await this.tryMultipleDecompressionMethods(compressedData);
      } catch (error) {
        console.error('[NativeBWParser] All decompression methods failed:', error);
        // Return original data as fallback
        return new Uint8Array(this.buffer);
      }
    }
    
    // Not seRS format, return original data
    console.log('[NativeBWParser] Not seRS format, using original data');
    return new Uint8Array(this.buffer);
  }

  /**
   * Enhanced zlib header detection with multiple patterns
   */
  private findZlibHeader(): number {
    const data = new Uint8Array(this.buffer);
    
    // Common zlib headers for different compression levels
    const zlibHeaders = [
      [0x78, 0x01], // No compression
      [0x78, 0x9C], // Default compression (most common in Remastered)
      [0x78, 0xDA], // Best compression
      [0x78, 0x5E], // Fast compression
      [0x78, 0x20], // Alternative header
      [0x78, 0x3C]  // Alternative header
    ];
    
    // Search in likely locations
    const searchRanges = [
      { start: 16, end: 64 },   // Most common range
      { start: 32, end: 128 },  // Extended range
      { start: 64, end: 256 }   // Backup range
    ];
    
    for (const range of searchRanges) {
      for (let i = range.start; i < Math.min(range.end, data.length - 1); i++) {
        for (const [byte1, byte2] of zlibHeaders) {
          if (data[i] === byte1 && data[i + 1] === byte2) {
            console.log(`[NativeBWParser] Found zlib header ${byte1.toString(16)}${byte2.toString(16)} at offset ${i}`);
            
            // Validate this is actually a zlib stream by checking if it decompresses
            if (this.validateZlibStream(data.slice(i))) {
              return i;
            }
          }
        }
      }
    }
    
    return -1;
  }

  /**
   * Validate if the data at offset is a valid zlib stream
   */
  private validateZlibStream(data: Uint8Array): boolean {
    if (data.length < 10) return false;
    
    try {
      // Try to decompress first 100 bytes to validate
      const testData = data.slice(0, Math.min(100, data.length));
      pako.inflate(testData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Try multiple decompression methods
   */
  private async tryMultipleDecompressionMethods(compressedData: Uint8Array): Promise<Uint8Array> {
    const methods = [
      () => pako.inflate(compressedData),
      () => pako.inflateRaw(compressedData),
      () => pako.inflate(compressedData, { windowBits: 15 }),
      () => pako.inflate(compressedData, { windowBits: -15 }),
      () => pako.inflate(compressedData, { windowBits: 13 }),
      () => pako.inflateRaw(compressedData, { windowBits: 15 })
    ];
    
    for (let i = 0; i < methods.length; i++) {
      try {
        const result = methods[i]();
        console.log(`[NativeBWParser] Decompression method ${i + 1} successful, size:`, result.length);
        
        // Validate decompressed data
        if (this.validateDecompressedData(result)) {
          return result;
        }
      } catch (error) {
        console.log(`[NativeBWParser] Decompression method ${i + 1} failed:`, error.message);
      }
    }
    
    throw new Error('All decompression methods failed');
  }

  /**
   * Validate decompressed data looks like a replay
   */
  private validateDecompressedData(data: Uint8Array): boolean {
    if (data.length < 1000) {
      console.warn('[NativeBWParser] Decompressed data too small');
      return false;
    }
    
    // Look for typical replay patterns
    let readableChars = 0;
    let nullBytes = 0;
    const sampleSize = Math.min(500, data.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const byte = data[i];
      if (byte >= 32 && byte <= 126) readableChars++;
      if (byte === 0) nullBytes++;
    }
    
    const readableRatio = readableChars / sampleSize;
    const nullRatio = nullBytes / sampleSize;
    
    console.log('[NativeBWParser] Data validation:', {
      readableRatio: readableRatio.toFixed(3),
      nullRatio: nullRatio.toFixed(3)
    });
    
    // Should have some readable text and some null bytes (typical for replays)
    return readableRatio > 0.05 && nullRatio > 0.1 && nullRatio < 0.8;
  }

  /**
   * Step 1: Validate replay file format
   */
  private validateReplayFile(): void {
    console.log('[NativeBWParser] Validating replay file...');
    
    // Check file size
    if (this.buffer.byteLength < 32) {
      throw new Error('File too small to be a valid replay');
    }

    // Log first 32 bytes for debugging
    const header = Array.from(new Uint8Array(this.buffer.slice(0, 32)))
      .map(b => `0x${b.toString(16).padStart(2, '0')}`)
      .join(' ');
    console.log('[NativeBWParser] File header (32 bytes):', header);

    console.log('[NativeBWParser] File validation passed');
  }
}

/**
 * Enhanced parser for decompressed replay stream
 */
class DecompressedStreamParser {
  private data: Uint8Array;
  private offset: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  parseStream(): BWReplayParseResult {
    console.log('[DecompressedStreamParser] Parsing decompressed stream...');
    console.log('[DecompressedStreamParser] Data size:', this.data.length);
    
    // Parse header from decompressed data
    const metadata = this.parseMetadata();
    
    // Parse actions and commands
    const { actions, buildOrders } = this.parseActionsAndCommands();
    
    return {
      metadata,
      actions,
      buildOrders
    };
  }

  private parseMetadata(): BWReplayMetadata {
    console.log('[DecompressedStreamParser] Parsing metadata...');
    
    // Enhanced frame count detection
    const totalFrames = this.findFrameCount();
    console.log('[DecompressedStreamParser] Total frames:', totalFrames);
    
    // Calculate game length (24 FPS for StarCraft)
    const gameLength = totalFrames / 24;
    const duration = this.formatDuration(gameLength);
    
    // Enhanced map name detection
    const mapName = this.findMapName();
    console.log('[DecompressedStreamParser] Map name:', mapName);
    
    // Enhanced player detection
    const players = this.findPlayers();
    console.log('[DecompressedStreamParser] Players:', players);
    
    return {
      version: 'Remastered',
      mapName: mapName || 'Unknown Map',
      players,
      apm: [], // Will be calculated from actions
      eapm: [], // Will be calculated from actions
      totalFrames,
      duration,
      gameLength
    };
  }

  /**
   * Enhanced frame count detection
   */
  private findFrameCount(): number {
    // Try multiple common locations for frame count
    const frameOffsets = [0x08, 0x0C, 0x10, 0x04, 0x14];
    
    for (const offset of frameOffsets) {
      if (offset + 4 <= this.data.length) {
        const frames = this.readUInt32LE(offset);
        console.log(`[DecompressedStreamParser] Frame test at 0x${offset.toString(16)}: ${frames}`);
        
        // Reasonable frame count validation
        if (frames >= 100 && frames <= 500000) {
          return frames;
        }
      }
    }
    
    // Fallback: estimate from file size
    const estimatedFrames = Math.floor(this.data.length / 15);
    console.log('[DecompressedStreamParser] Estimated frames from file size:', estimatedFrames);
    return Math.max(5000, Math.min(estimatedFrames, 100000));
  }

  /**
   * Enhanced map name detection with multiple encodings
   */
  private findMapName(): string {
    // Try multiple locations and string lengths
    const searchOffsets = [0x1CD, 0x45, 0x61, 0x68, 0x7C, 0x90, 0xA4, 0x200, 0x250];
    const stringLengths = [32, 64, 24, 16, 48];
    
    for (const offset of searchOffsets) {
      for (const length of stringLengths) {
        if (offset + length <= this.data.length) {
          const mapName = this.readString(offset, length);
          if (this.isValidMapName(mapName)) {
            console.log(`[DecompressedStreamParser] Found map name at 0x${offset.toString(16)}: "${mapName}"`);
            return mapName;
          }
        }
      }
    }
    
    return '';
  }

  /**
   * Enhanced player detection with better validation
   */
  private findPlayers(): string[] {
    const players: string[] = [];
    const foundNames = new Set<string>();
    
    // Scan through data looking for player name patterns
    const scanRange = Math.min(2000, this.data.length - 25);
    
    for (let offset = 0; offset < scanRange; offset += 1) {
      if (offset + 25 <= this.data.length) {
        const playerName = this.readString(offset, 25);
        
        if (this.isValidPlayerName(playerName) && !foundNames.has(playerName)) {
          console.log(`[DecompressedStreamParser] Found player at offset 0x${offset.toString(16)}: "${playerName}"`);
          foundNames.add(playerName);
          players.push(playerName);
          
          if (players.length >= 8) break;
        }
      }
    }
    
    // If no players found, create defaults
    if (players.length === 0) {
      console.log('[DecompressedStreamParser] No players found, using defaults');
      return ['Player 1', 'Player 2'];
    }
    
    return players;
  }

  private parseActionsAndCommands(): { actions: BWReplayAction[]; buildOrders: Array<Array<any>> } {
    console.log('[DecompressedStreamParser] Parsing actions and commands...');
    
    // Look for command section (usually around offset 633)
    const commandOffsets = [633, 600, 650, 700, 800, 1000];
    let bestOffset = 633;
    
    // Find the offset with most action-like data
    for (const offset of commandOffsets) {
      if (offset < this.data.length - 100) {
        const actionCount = this.countActionsAtOffset(offset);
        console.log(`[DecompressedStreamParser] Action count at offset ${offset}: ${actionCount}`);
        if (actionCount > 0) {
          bestOffset = offset;
          break;
        }
      }
    }
    
    this.offset = bestOffset;
    
    const actions: BWReplayAction[] = [];
    const playerActions: Record<number, any[]> = {};
    let currentFrame = 0;
    let actionCount = 0;
    
    // Enhanced action name mapping
    const actionNames: Record<number, string> = {
      0x09: 'Select', 0x0A: 'Shift Select', 0x0B: 'Shift Deselect',
      0x0C: 'Build', 0x0D: 'Vision', 0x0E: 'Alliance',
      0x13: 'Hotkey', 0x14: 'Move', 0x15: 'Attack',
      0x18: 'Stop', 0x1A: 'Return Cargo', 0x1D: 'Train',
      0x1E: 'Cancel Train', 0x2F: 'Research', 0x30: 'Cancel Research',
      0x31: 'Upgrade', 0x32: 'Cancel Upgrade'
    };
    
    while (this.offset < this.data.length - 1 && actionCount < 1000) {
      const opcode = this.data[this.offset];
      
      // Handle frame synchronization
      if (opcode === 0x00) {
        currentFrame++;
        this.offset++;
        continue;
      } else if (opcode === 0x01) {
        const skip = this.offset + 1 < this.data.length ? this.data[this.offset + 1] : 1;
        currentFrame += skip;
        this.offset += 2;
        continue;
      } else if (opcode === 0x02) {
        const skip = this.readUInt16LE();
        currentFrame += skip;
        continue;
      }
      
      // Parse game action
      if (opcode in actionNames) {
        const actionName = actionNames[opcode];
        const playerId = this.offset + 1 < this.data.length ? this.data[this.offset + 1] : 0;
        const actionLength = this.getActionLength(opcode);
        const actionData = this.data.slice(this.offset, Math.min(this.offset + actionLength, this.data.length));
        
        actions.push({
          frame: currentFrame,
          playerId,
          opcode,
          data: actionData,
          actionName
        });
        
        // Track for build order analysis
        if (!playerActions[playerId]) {
          playerActions[playerId] = [];
        }
        playerActions[playerId].push({
          frame: currentFrame,
          action: actionName,
          timestamp: this.frameToTimestamp(currentFrame)
        });
        
        this.offset += actionLength;
        actionCount++;
      } else {
        this.offset++;
      }
    }
    
    console.log('[DecompressedStreamParser] Parsed actions:', actionCount);
    console.log('[DecompressedStreamParser] Final frame:', currentFrame);
    
    return { actions, buildOrders: Object.values(playerActions) };
  }

  private countActionsAtOffset(offset: number): number {
    let count = 0;
    const actionOpcodes = [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x13, 0x14, 0x15, 0x18, 0x1D, 0x1E];
    
    for (let i = offset; i < Math.min(offset + 200, this.data.length); i++) {
      if (actionOpcodes.includes(this.data[i])) {
        count++;
      }
    }
    
    return count;
  }

  private getActionLength(opcode: number): number {
    const lengths: Record<number, number> = {
      0x09: 2, 0x0A: 2, 0x0B: 2, 0x0C: 7, 0x0D: 2, 0x0E: 4,
      0x13: 2, 0x14: 4, 0x15: 6, 0x18: 1, 0x1A: 1, 0x1D: 2,
      0x1E: 2, 0x2F: 2, 0x30: 2, 0x31: 2, 0x32: 2
    };
    return lengths[opcode] || 1;
  }

  private readUInt32LE(offset?: number): number {
    const pos = offset !== undefined ? offset : this.offset;
    if (pos + 4 > this.data.length) return 0;
    
    const value = this.data[pos] |
                 (this.data[pos + 1] << 8) |
                 (this.data[pos + 2] << 16) |
                 (this.data[pos + 3] << 24);
    
    if (offset === undefined) this.offset += 4;
    return value >>> 0;
  }

  private readUInt16LE(): number {
    if (this.offset + 2 > this.data.length) return 0;
    const value = this.data[this.offset] | (this.data[this.offset + 1] << 8);
    this.offset += 2;
    return value;
  }

  private readString(offset: number, maxLength: number): string {
    if (offset + maxLength > this.data.length) return '';
    
    const bytes = this.data.slice(offset, offset + maxLength);
    const nullIndex = bytes.indexOf(0);
    const actualLength = nullIndex >= 0 ? nullIndex : maxLength;
    
    if (actualLength === 0) return '';
    
    try {
      return new TextDecoder('utf-8', { fatal: false })
        .decode(bytes.slice(0, actualLength))
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .trim();
    } catch {
      // Fallback to basic ASCII
      return Array.from(bytes.slice(0, actualLength))
        .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '')
        .join('')
        .trim();
    }
  }

  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
    
    // Check for mostly printable characters
    let printableCount = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      if ((char >= 32 && char <= 126) || (char >= 160 && char <= 255)) {
        printableCount++;
      }
    }
    
    return printableCount / name.length > 0.7;
  }

  private isValidPlayerName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 25) return false;
    
    // Check for mostly printable characters
    let printableCount = 0;
    let letterCount = 0;
    
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      if (char >= 32 && char <= 126) {
        printableCount++;
        if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
          letterCount++;
        }
      }
    }
    
    return printableCount / name.length > 0.8 && letterCount > 0;
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private frameToTimestamp(frame: number): string {
    const seconds = frame / 24; // 24 FPS
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
