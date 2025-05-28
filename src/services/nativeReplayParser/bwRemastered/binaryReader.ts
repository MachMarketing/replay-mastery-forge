
/**
 * Enhanced Binary Reader for StarCraft: Brood War Replay files
 * Based on icza/screp specification and real .rep file analysis
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
   * Detect file format by analyzing magic bytes and structure
   */
  detectFormat(): { type: string, isCompressed: boolean, playerDataOffset: number } {
    const originalPos = this.position;
    this.setPosition(0);
    
    // Read first few bytes to detect format
    const firstBytes = this.readBytes(Math.min(32, this.buffer.length));
    this.setPosition(originalPos);
    
    // Check for different StarCraft replay formats
    const magicStr = String.fromCharCode(...firstBytes.slice(0, 4));
    
    if (magicStr === 'PKed') {
      // Compressed replay
      return { type: 'compressed', isCompressed: true, playerDataOffset: 0x279 };
    } else if (magicStr === 'Repl') {
      // Standard uncompressed replay
      return { type: 'standard', isCompressed: false, playerDataOffset: 0x279 };
    } else {
      // Try to detect by content analysis
      return this.analyzeUnknownFormat(firstBytes);
    }
  }

  private analyzeUnknownFormat(firstBytes: Uint8Array): { type: string, isCompressed: boolean, playerDataOffset: number } {
    // Look for player name patterns starting at different offsets
    const possibleOffsets = [0x161, 0x1A1, 0x279, 0x200];
    
    for (const offset of possibleOffsets) {
      if (this.hasValidPlayerDataAt(offset)) {
        console.log(`[BWBinaryReader] Detected player data at offset 0x${offset.toString(16)}`);
        return { type: 'detected', isCompressed: false, playerDataOffset: offset };
      }
    }
    
    // Default fallback
    return { type: 'unknown', isCompressed: false, playerDataOffset: 0x1A1 };
  }

  private hasValidPlayerDataAt(offset: number): boolean {
    if (offset + 200 > this.buffer.length) return false;
    
    const originalPos = this.position;
    this.setPosition(offset);
    
    try {
      // Check if there are readable strings that look like player names
      for (let i = 0; i < 8; i++) {
        const slotOffset = offset + (i * 36); // Try 36-byte slots
        if (slotOffset + 25 > this.buffer.length) break;
        
        this.setPosition(slotOffset);
        const nameBytes = this.readBytes(25);
        const name = this.decodeString(nameBytes);
        
        // Valid player name should be 1-25 characters, printable ASCII/Latin
        if (name.length >= 1 && name.length <= 25 && this.isPrintableString(name)) {
          this.setPosition(originalPos);
          return true;
        }
      }
    } catch (e) {
      // Error reading, not valid
    }
    
    this.setPosition(originalPos);
    return false;
  }

  /**
   * Try multiple encodings to decode string properly
   */
  private decodeString(bytes: Uint8Array): string {
    // Remove trailing zeros first
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
    
    // Try different encodings in order of preference
    const encodings = ['windows-1252', 'iso-8859-1', 'utf-8'];
    
    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: true });
        const result = decoder.decode(trimmedBytes);
        
        // Check if result contains mostly printable characters
        if (this.isPrintableString(result)) {
          return result.trim();
        }
      } catch (e) {
        // Try next encoding
      }
    }
    
    // Fallback: manual ASCII conversion
    let result = '';
    for (const byte of trimmedBytes) {
      if (byte >= 32 && byte <= 126) {
        result += String.fromCharCode(byte);
      } else if (byte >= 160 && byte <= 255) {
        result += String.fromCharCode(byte);
      }
    }
    
    return result.trim();
  }

  private isPrintableString(str: string): boolean {
    if (str.length === 0) return false;
    
    let printableCount = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      if ((char >= 32 && char <= 126) || (char >= 160 && char <= 255) || char === 9 || char === 10 || char === 13) {
        printableCount++;
      }
    }
    
    // At least 80% should be printable
    return (printableCount / str.length) >= 0.8;
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
