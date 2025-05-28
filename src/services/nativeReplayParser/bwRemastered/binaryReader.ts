
/**
 * Enhanced Binary Reader for StarCraft: Brood War Replay files
 * Based on correct .rep file specification from screp
 */

export class BWBinaryReader {
  private data: DataView;
  private position: number = 0;
  private buffer: Uint8Array;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new DataView(arrayBuffer);
    this.buffer = new Uint8Array(arrayBuffer);
    console.log('[BWBinaryReader] Initialized with buffer size:', arrayBuffer.byteLength);
  }

  getPosition(): number {
    return this.position;
  }

  setPosition(pos: number): void {
    this.position = Math.max(0, Math.min(pos, this.buffer.length));
  }

  canRead(bytes: number = 1): boolean {
    return this.position + bytes <= this.buffer.length;
  }

  readUInt8(): number {
    if (!this.canRead(1)) {
      throw new Error(`Cannot read UInt8 at position ${this.position}: end of buffer`);
    }
    const value = this.data.getUint8(this.position);
    this.position += 1;
    return value;
  }

  readUInt16LE(): number {
    if (!this.canRead(2)) {
      throw new Error(`Cannot read UInt16 at position ${this.position}: end of buffer`);
    }
    const value = this.data.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  readUInt32LE(): number {
    if (!this.canRead(4)) {
      throw new Error(`Cannot read UInt32 at position ${this.position}: end of buffer`);
    }
    const value = this.data.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  readBytes(length: number): Uint8Array {
    if (!this.canRead(length)) {
      throw new Error(`Cannot read ${length} bytes at position ${this.position}: end of buffer`);
    }
    const bytes = this.buffer.slice(this.position, this.position + length);
    this.position += length;
    return bytes;
  }

  readFixedString(length: number): string {
    const bytes = this.readBytes(length);
    
    // Find null terminator
    let actualLength = bytes.length;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0) {
        actualLength = i;
        break;
      }
    }
    
    const validBytes = bytes.slice(0, actualLength);
    return this.decodeString(validBytes);
  }

  /**
   * Detect correct .rep file structure based on screp specification
   */
  detectFormat(): { type: string, isCompressed: boolean, headerOffset: number, playerDataOffset: number } {
    const originalPos = this.position;
    this.setPosition(0);
    
    try {
      // Read replay header magic bytes
      const magic = this.readUInt32LE();
      this.setPosition(0);
      
      console.log(`[BWBinaryReader] Magic bytes: 0x${magic.toString(16)}`);
      
      // Check for compressed replay
      if (magic === 0x5453494C) { // "LIST" in little endian
        console.log('[BWBinaryReader] Detected compressed replay');
        return { 
          type: 'compressed', 
          isCompressed: true, 
          headerOffset: 0,
          playerDataOffset: 0x1A1 
        };
      }
      
      // Standard uncompressed replay - correct offsets based on screp
      return { 
        type: 'standard', 
        isCompressed: false, 
        headerOffset: 0,
        playerDataOffset: 0x1A1  // Correct offset for player data in .rep files
      };
      
    } catch (e) {
      console.warn('[BWBinaryReader] Error detecting format:', e);
      return { 
        type: 'unknown', 
        isCompressed: false, 
        headerOffset: 0,
        playerDataOffset: 0x1A1 
      };
    } finally {
      this.setPosition(originalPos);
    }
  }

  /**
   * Decode string with proper encoding handling
   */
  private decodeString(bytes: Uint8Array): string {
    if (bytes.length === 0) return '';
    
    // Remove trailing zeros
    let actualLength = bytes.length;
    for (let i = bytes.length - 1; i >= 0; i--) {
      if (bytes[i] === 0) {
        actualLength = i;
      } else {
        break;
      }
    }
    
    const trimmedBytes = bytes.slice(0, actualLength);
    if (trimmedBytes.length === 0) return '';
    
    // Convert to string - StarCraft uses Windows-1252 encoding typically
    let result = '';
    for (const byte of trimmedBytes) {
      if (byte >= 32 && byte <= 126) {
        // Standard ASCII
        result += String.fromCharCode(byte);
      } else if (byte >= 128 && byte <= 255) {
        // Extended ASCII (Windows-1252)
        result += String.fromCharCode(byte);
      }
    }
    
    return result.trim();
  }

  /**
   * Create hex dump for debugging
   */
  createHexDump(offset: number, length: number): string {
    const bytes: string[] = [];
    const ascii: string[] = [];
    
    for (let i = 0; i < length && offset + i < this.buffer.length; i++) {
      const byte = this.buffer[offset + i];
      bytes.push(byte.toString(16).padStart(2, '0'));
      ascii.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
    }
    
    return `${bytes.join(' ')} | ${ascii.join('')}`;
  }

  skip(bytes: number): void {
    this.position = Math.min(this.position + bytes, this.buffer.length);
  }

  getRemainingBytes(): number {
    return this.buffer.length - this.position;
  }
}
