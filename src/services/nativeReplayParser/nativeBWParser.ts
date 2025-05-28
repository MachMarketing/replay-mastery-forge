
/**
 * Simplified Native JavaScript Parser for StarCraft: Brood War Remastered
 * Fixed version without build errors
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
    console.log('[NativeBWParser] Starting parsing...');
    
    this.validateReplayFile();
    const decompressedData = await this.handleDecompression();
    const parser = new StreamParser(decompressedData);
    
    return parser.parseStream();
  }

  /**
   * Handle decompression if needed
   */
  private async handleDecompression(): Promise<Uint8Array> {
    const seRSMagic = new TextDecoder().decode(this.buffer.slice(12, 16));
    
    if (seRSMagic === 'seRS') {
      console.log('[NativeBWParser] seRS format detected');
      
      const zlibOffset = this.findZlibHeader();
      if (zlibOffset === -1) {
        return new Uint8Array(this.buffer);
      }
      
      const compressedData = new Uint8Array(this.buffer.slice(zlibOffset));
      return this.tryDecompression(compressedData);
    }
    
    return new Uint8Array(this.buffer);
  }

  private findZlibHeader(): number {
    const data = new Uint8Array(this.buffer);
    const zlibHeaders = [[0x78, 0x9C], [0x78, 0x01], [0x78, 0xDA]];
    
    for (let i = 16; i < Math.min(128, data.length - 1); i++) {
      for (const [byte1, byte2] of zlibHeaders) {
        if (data[i] === byte1 && data[i + 1] === byte2) {
          if (this.validateZlibStream(data.slice(i))) {
            return i;
          }
        }
      }
    }
    return -1;
  }

  private validateZlibStream(data: Uint8Array): boolean {
    if (data.length < 10) return false;
    try {
      const testData = data.slice(0, Math.min(100, data.length));
      pako.inflate(testData);
      return true;
    } catch {
      return false;
    }
  }

  private async tryDecompression(compressedData: Uint8Array): Promise<Uint8Array> {
    const methods = [
      () => pako.inflate(compressedData),
      () => pako.inflateRaw(compressedData),
      () => pako.inflate(compressedData, { windowBits: 15 }),
      () => pako.inflate(compressedData, { windowBits: -15 })
    ];
    
    for (let i = 0; i < methods.length; i++) {
      try {
        const result = methods[i]();
        if (this.validateDecompressedData(result)) {
          return result;
        }
      } catch (error: any) {
        console.log(`[NativeBWParser] Method ${i + 1} failed:`, error.message);
      }
    }
    
    throw new Error('All decompression methods failed');
  }

  private validateDecompressedData(data: Uint8Array): boolean {
    if (data.length < 1000) return false;
    
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
    
    return readableRatio > 0.05 && nullRatio > 0.1 && nullRatio < 0.8;
  }

  private validateReplayFile(): void {
    if (this.buffer.byteLength < 32) {
      throw new Error('File too small to be a valid replay');
    }
  }
}

/**
 * Stream parser for decompressed data
 */
class StreamParser {
  private data: Uint8Array;
  private offset: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  parseStream(): BWReplayParseResult {
    console.log('[StreamParser] Parsing stream, size:', this.data.length);
    
    const metadata = this.parseMetadata();
    const { actions, buildOrders } = this.parseActions();
    
    return { metadata, actions, buildOrders };
  }

  private parseMetadata(): BWReplayMetadata {
    const totalFrames = this.findFrameCount();
    const gameLength = totalFrames / 24;
    const duration = this.formatDuration(gameLength);
    const mapName = this.findMapName();
    const players = this.findPlayers();
    
    return {
      version: 'Remastered',
      mapName: mapName || 'Unknown Map',
      players,
      apm: [],
      eapm: [],
      totalFrames,
      duration,
      gameLength
    };
  }

  private findFrameCount(): number {
    const frameOffsets = [0x08, 0x0C, 0x10, 0x04];
    
    for (const offset of frameOffsets) {
      if (offset + 4 <= this.data.length) {
        const frames = this.readUInt32LE(offset);
        if (frames >= 100 && frames <= 500000) {
          return frames;
        }
      }
    }
    
    const estimated = Math.floor(this.data.length / 15);
    return Math.max(5000, Math.min(estimated, 100000));
  }

  private findMapName(): string {
    const searchOffsets = [0x1CD, 0x45, 0x61, 0x68];
    
    for (const offset of searchOffsets) {
      if (offset + 32 <= this.data.length) {
        const mapName = this.readString(offset, 32);
        if (this.isValidMapName(mapName)) {
          return mapName;
        }
      }
    }
    return '';
  }

  private findPlayers(): string[] {
    const players: string[] = [];
    const foundNames = new Set<string>();
    const scanRange = Math.min(2000, this.data.length - 25);
    
    for (let offset = 0; offset < scanRange; offset += 1) {
      if (offset + 25 <= this.data.length) {
        const playerName = this.readString(offset, 25);
        
        if (this.isValidPlayerName(playerName) && !foundNames.has(playerName)) {
          foundNames.add(playerName);
          players.push(playerName);
          
          if (players.length >= 8) break;
        }
      }
    }
    
    return players.length > 0 ? players : ['Player 1', 'Player 2'];
  }

  private parseActions(): { actions: BWReplayAction[]; buildOrders: Array<Array<any>> } {
    const actions: BWReplayAction[] = [];
    const playerActions: Record<number, any[]> = {};
    
    // Simple action parsing
    this.offset = 633;
    let currentFrame = 0;
    let actionCount = 0;
    
    const actionNames: Record<number, string> = {
      0x09: 'Select', 0x0A: 'Shift Select', 0x0C: 'Build',
      0x13: 'Hotkey', 0x14: 'Move', 0x15: 'Attack'
    };
    
    while (this.offset < this.data.length - 1 && actionCount < 500) {
      const opcode = this.data[this.offset];
      
      if (opcode === 0x00) {
        currentFrame++;
        this.offset++;
        continue;
      }
      
      if (opcode in actionNames) {
        const actionName = actionNames[opcode];
        const playerId = this.offset + 1 < this.data.length ? this.data[this.offset + 1] : 0;
        const actionData = this.data.slice(this.offset, this.offset + 2);
        
        actions.push({
          frame: currentFrame,
          playerId,
          opcode,
          data: actionData,
          actionName
        });
        
        if (!playerActions[playerId]) {
          playerActions[playerId] = [];
        }
        playerActions[playerId].push({
          frame: currentFrame,
          action: actionName,
          timestamp: this.frameToTimestamp(currentFrame)
        });
        
        this.offset += 2;
        actionCount++;
      } else {
        this.offset++;
      }
    }
    
    return { actions, buildOrders: Object.values(playerActions) };
  }

  private readUInt32LE(offset: number): number {
    if (offset + 4 > this.data.length) return 0;
    return this.data[offset] | (this.data[offset + 1] << 8) | 
           (this.data[offset + 2] << 16) | (this.data[offset + 3] << 24);
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
      return Array.from(bytes.slice(0, actualLength))
        .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '')
        .join('')
        .trim();
    }
  }

  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
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
    const seconds = frame / 24;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
