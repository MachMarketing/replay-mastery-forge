
/**
 * Enhanced Binary Reader for StarCraft: Brood War Replay files
 * Based on icza/screp specification
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
   * Try multiple encodings to decode string properly
   */
  private decodeString(bytes: Uint8Array): string {
    // Try different encodings in order of preference
    const encodings = ['windows-1252', 'iso-8859-1', 'utf-8'];
    
    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: true });
        const result = decoder.decode(bytes);
        
        // Check if result contains only printable characters
        if (this.isPrintableString(result)) {
          return result.trim();
        }
      } catch (e) {
        // Try next encoding
      }
    }
    
    // Fallback: manual ASCII conversion
    let result = '';
    for (const byte of bytes) {
      if (byte >= 32 && byte <= 126) {
        result += String.fromCharCode(byte);
      } else if (byte >= 160 && byte <= 255) {
        result += String.fromCharCode(byte);
      }
    }
    
    return result.trim();
  }

  private isPrintableString(str: string): boolean {
    // Check if string contains mostly printable characters
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
