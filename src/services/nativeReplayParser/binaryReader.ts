/**
 * Binary data reader for StarCraft replay files
 */

export class BinaryReader {
  private buffer: Uint8Array;
  private position: number = 0;

  constructor(buffer: ArrayBuffer | Uint8Array) {
    this.buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  }

  /**
   * Get current position in the buffer
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * Set position in the buffer
   */
  setPosition(position: number): void {
    this.position = Math.max(0, Math.min(position, this.buffer.length));
  }

  /**
   * Get the underlying buffer
   */
  getBuffer(): Uint8Array {
    return this.buffer;
  }

  /**
   * Check if we can read more bytes
   */
  canRead(bytes: number = 1): boolean {
    return this.position + bytes <= this.buffer.length;
  }

  /**
   * Read a single byte
   */
  readByte(): number {
    if (!this.canRead(1)) {
      throw new Error('Cannot read byte: end of buffer');
    }
    return this.buffer[this.position++];
  }

  /**
   * Read multiple bytes
   */
  readBytes(count: number): Uint8Array {
    if (!this.canRead(count)) {
      throw new Error(`Cannot read ${count} bytes: end of buffer`);
    }
    const result = this.buffer.slice(this.position, this.position + count);
    this.position += count;
    return result;
  }

  /**
   * Read a 16-bit unsigned integer (little endian)
   */
  readUInt16(): number {
    if (!this.canRead(2)) {
      throw new Error('Cannot read UInt16: end of buffer');
    }
    const result = this.buffer[this.position] | (this.buffer[this.position + 1] << 8);
    this.position += 2;
    return result;
  }

  /**
   * Read a 32-bit unsigned integer (little endian)
   */
  readUInt32(): number {
    if (!this.canRead(4)) {
      throw new Error('Cannot read UInt32: end of buffer');
    }
    const result = this.buffer[this.position] |
                  (this.buffer[this.position + 1] << 8) |
                  (this.buffer[this.position + 2] << 16) |
                  (this.buffer[this.position + 3] << 24);
    this.position += 4;
    return result >>> 0; // Convert to unsigned
  }

  /**
   * Read a null-terminated string
   */
  readString(maxLength?: number): string {
    const start = this.position;
    let length = 0;
    
    // Find null terminator or maxLength
    while (this.canRead(1) && this.buffer[this.position + length] !== 0) {
      length++;
      if (maxLength && length >= maxLength) {
        break;
      }
    }
    
    const stringBytes = this.readBytes(length);
    
    // Skip null terminator if present
    if (this.canRead(1) && this.buffer[this.position] === 0) {
      this.position++;
    }
    
    // Convert bytes to string
    return new TextDecoder('utf-8').decode(stringBytes);
  }

  /**
   * Read a fixed-length string
   */
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
    
    return new TextDecoder('utf-8').decode(bytes.slice(0, actualLength));
  }

  /**
   * Skip bytes
   */
  skip(count: number): void {
    this.position = Math.min(this.position + count, this.buffer.length);
  }

  /**
   * Get remaining bytes in buffer
   */
  getRemainingBytes(): number {
    return this.buffer.length - this.position;
  }

  /**
   * Read all remaining bytes
   */
  readRemaining(): Uint8Array {
    return this.readBytes(this.getRemainingBytes());
  }

  /**
   * Create a new reader for a subset of the current buffer
   */
  slice(start: number, length?: number): BinaryReader {
    const end = length ? start + length : this.buffer.length;
    return new BinaryReader(this.buffer.slice(start, end));
  }
}
