
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
   * Main parsing function
   */
  async parseReplay(): Promise<BWReplayParseResult> {
    console.log('[NativeBWParser] Starting native parsing...');
    
    // Step 1: Validate and read file header
    this.validateReplayFile();
    
    // Step 2: Extract and decompress zlib data
    const decompressedData = this.extractAndDecompress();
    
    // Step 3: Parse decompressed replay stream
    const parser = new DecompressedStreamParser(decompressedData);
    const parseResult = parser.parseStream();
    
    console.log('[NativeBWParser] Native parsing complete');
    return parseResult;
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

    // Magic check for "Repl" at offset 0
    const magic = new TextDecoder().decode(this.buffer.slice(0, 4));
    console.log('[NativeBWParser] Magic bytes:', magic);
    
    if (magic !== 'Repl') {
      throw new Error('Invalid Replay File - missing "Repl" magic');
    }

    // Check for "seRS" at offset 0x0C (12)
    const compressionMagic = new TextDecoder().decode(this.buffer.slice(12, 16));
    console.log('[NativeBWParser] Compression magic:', compressionMagic);
    
    if (compressionMagic !== 'seRS') {
      throw new Error('Replay stream not found - missing "seRS" magic');
    }

    console.log('[NativeBWParser] File validation passed');
  }

  /**
   * Step 2: Extract and decompress zlib data
   */
  private extractAndDecompress(): Uint8Array {
    console.log('[NativeBWParser] Extracting and decompressing zlib data...');
    
    // Find zlib header (typically 0x78 0x9C)
    let zlibOffset = -1;
    const searchRange = Math.min(100, this.buffer.byteLength - 1);
    
    for (let i = 20; i < searchRange; i++) {
      const byte1 = this.view.getUint8(i);
      const byte2 = this.view.getUint8(i + 1);
      
      if (byte1 === 0x78 && byte2 === 0x9C) {
        zlibOffset = i;
        console.log('[NativeBWParser] Found zlib header at offset:', i);
        break;
      }
    }

    if (zlibOffset === -1) {
      // Try default offset 32 as fallback
      zlibOffset = 32;
      console.warn('[NativeBWParser] zlib header not found, using default offset 32');
    }

    // Extract compressed data
    const compressedData = new Uint8Array(this.buffer.slice(zlibOffset));
    console.log('[NativeBWParser] Compressed data size:', compressedData.length);
    
    // Log first few bytes
    console.log('[NativeBWParser] First 10 compressed bytes:', 
      Array.from(compressedData.slice(0, 10))
        .map(b => `0x${b.toString(16).padStart(2, '0')}`)
        .join(' '));

    try {
      const decompressed = pako.inflate(compressedData);
      console.log('[NativeBWParser] Decompression successful, size:', decompressed.length);
      
      // Log first few decompressed bytes
      console.log('[NativeBWParser] First 20 decompressed bytes:', 
        Array.from(decompressed.slice(0, 20))
          .map(b => `0x${b.toString(16).padStart(2, '0')}`)
          .join(' '));
      
      return decompressed;
    } catch (error) {
      console.error('[NativeBWParser] Decompression failed:', error);
      throw new Error(`zlib decompression failed: ${(error as Error).message}`);
    }
  }
}

/**
 * Parser for decompressed replay stream
 */
class DecompressedStreamParser {
  private data: Uint8Array;
  private offset: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  parseStream(): BWReplayParseResult {
    console.log('[DecompressedStreamParser] Parsing decompressed stream...');
    
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
    
    // Skip initial bytes and read frame count
    this.offset = 0x04;
    const totalFrames = this.readUInt32LE();
    console.log('[DecompressedStreamParser] Total frames:', totalFrames);
    
    // Calculate game length (24 FPS)
    const gameLength = totalFrames / 24;
    const duration = this.formatDuration(gameLength);
    
    // Parse map name (at offset 0x1CD according to screp docs)
    this.offset = 0x1CD;
    const mapName = this.readNullTerminatedString(25);
    console.log('[DecompressedStreamParser] Map name:', mapName);
    
    // Parse players (at offset 0x161 according to screp docs)
    this.offset = 0x161;
    const players = this.parsePlayers();
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

  private parsePlayers(): string[] {
    const players: string[] = [];
    
    // Parse up to 12 player slots (each 36 bytes according to screp)
    for (let i = 0; i < 12; i++) {
      const playerOffset = this.offset + (i * 36);
      
      if (playerOffset + 25 > this.data.length) break;
      
      // Read player name (25 bytes)
      const nameBytes = this.data.slice(playerOffset, playerOffset + 25);
      const nullIndex = nameBytes.indexOf(0);
      const nameLength = nullIndex >= 0 ? nullIndex : 25;
      
      if (nameLength > 0) {
        const name = new TextDecoder('utf-8', { fatal: false })
          .decode(nameBytes.slice(0, nameLength))
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
          .trim();
        
        if (name && name !== 'Computer' && name.length > 0) {
          players.push(name);
          console.log(`[DecompressedStreamParser] Found player: ${name}`);
        }
      }
    }
    
    return players;
  }

  private parseActionsAndCommands(): { actions: BWReplayAction[]; buildOrders: Array<Array<any>> } {
    console.log('[DecompressedStreamParser] Parsing actions and commands...');
    
    // Commands typically start at offset 633 (0x279) for Remastered
    this.offset = 633;
    
    const actions: BWReplayAction[] = [];
    const playerActions: Record<number, any[]> = {};
    let currentFrame = 0;
    let actionCount = 0;
    
    // Action name mapping
    const actionNames: Record<number, string> = {
      0x09: 'Select',
      0x0A: 'Shift Select',
      0x0B: 'Shift Deselect',
      0x0C: 'Build',
      0x0D: 'Vision',
      0x0E: 'Alliance',
      0x13: 'Hotkey',
      0x14: 'Move',
      0x15: 'Attack',
      0x18: 'Stop',
      0x1A: 'Return Cargo',
      0x1D: 'Train',
      0x1E: 'Cancel Train',
      0x2F: 'Research',
      0x30: 'Cancel Research',
      0x31: 'Upgrade',
      0x32: 'Cancel Upgrade'
    };
    
    while (this.offset < this.data.length - 1 && actionCount < 5000) {
      const opcode = this.data[this.offset];
      
      // Handle frame synchronization
      if (opcode === 0x00) {
        currentFrame++;
        this.offset++;
        continue;
      } else if (opcode === 0x01) {
        const skip = this.data[this.offset + 1] || 1;
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
        const startOffset = this.offset;
        const actionName = actionNames[opcode];
        
        // Read player ID (typically next byte)
        const playerId = this.offset + 1 < this.data.length ? this.data[this.offset + 1] : 0;
        
        // Read action data based on opcode
        const actionLength = this.getActionLength(opcode);
        const actionData = this.data.slice(startOffset, Math.min(startOffset + actionLength, this.data.length));
        
        actions.push({
          frame: currentFrame,
          playerId,
          opcode,
          data: actionData,
          actionName
        });
        
        // Track for APM calculation
        if (!playerActions[playerId]) {
          playerActions[playerId] = [];
        }
        playerActions[playerId].push({
          frame: currentFrame,
          action: actionName
        });
        
        this.offset += actionLength;
        actionCount++;
      } else {
        this.offset++;
      }
    }
    
    console.log('[DecompressedStreamParser] Parsed actions:', actionCount);
    console.log('[DecompressedStreamParser] Final frame:', currentFrame);
    
    // Convert player actions to build orders
    const buildOrders = Object.values(playerActions);
    
    return { actions, buildOrders };
  }

  private getActionLength(opcode: number): number {
    const lengths: Record<number, number> = {
      0x09: 2, 0x0A: 2, 0x0B: 2, 0x0C: 7, 0x0D: 2, 0x0E: 4,
      0x13: 2, 0x14: 4, 0x15: 6, 0x18: 1, 0x1A: 1, 0x1D: 2,
      0x1E: 2, 0x2F: 2, 0x30: 2, 0x31: 2, 0x32: 2
    };
    return lengths[opcode] || 1;
  }

  private readUInt32LE(): number {
    if (this.offset + 4 > this.data.length) return 0;
    const value = this.data[this.offset] |
                 (this.data[this.offset + 1] << 8) |
                 (this.data[this.offset + 2] << 16) |
                 (this.data[this.offset + 3] << 24);
    this.offset += 4;
    return value >>> 0;
  }

  private readUInt16LE(): number {
    if (this.offset + 2 > this.data.length) return 0;
    const value = this.data[this.offset] | (this.data[this.offset + 1] << 8);
    this.offset += 2;
    return value;
  }

  private readNullTerminatedString(maxLength: number): string {
    if (this.offset + maxLength > this.data.length) return '';
    
    const bytes = this.data.slice(this.offset, this.offset + maxLength);
    const nullIndex = bytes.indexOf(0);
    const actualLength = nullIndex >= 0 ? nullIndex : maxLength;
    
    this.offset += maxLength;
    
    if (actualLength === 0) return '';
    
    return new TextDecoder('utf-8', { fatal: false })
      .decode(bytes.slice(0, actualLength))
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .trim();
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
