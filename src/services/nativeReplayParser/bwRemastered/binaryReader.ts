
/**
 * Enhanced Binary Reader for StarCraft: Remastered replays
 * Compatible with screp parsing logic
 */

export interface FormatDetection {
  isCompressed: boolean;
  format: 'legacy' | 'modern' | 'modern121' | 'unknown';
  confidence: number;
}

export class BWBinaryReader {
  private buffer: ArrayBuffer;
  private view: DataView;
  private position: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    console.log('[BWBinaryReader] Initialized with buffer size:', buffer.byteLength);
  }

  // Add data property getter for compatibility
  get data(): DataView {
    return this.view;
  }

  // Position management
  setPosition(position: number): void {
    if (position < 0 || position > this.buffer.byteLength) {
      throw new Error(`Invalid position: ${position} (buffer size: ${this.buffer.byteLength})`);
    }
    this.position = position;
  }

  getPosition(): number {
    return this.position;
  }

  getSize(): number {
    return this.buffer.byteLength;
  }

  getRemainingBytes(): number {
    return this.buffer.byteLength - this.position;
  }

  canRead(bytes: number): boolean {
    return this.position + bytes <= this.buffer.byteLength;
  }

  // Basic data reading
  readUInt8(): number {
    if (!this.canRead(1)) {
      throw new Error(`Cannot read uint8 at position ${this.position}`);
    }
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  readUInt16LE(): number {
    if (!this.canRead(2)) {
      throw new Error(`Cannot read uint16 at position ${this.position}`);
    }
    const value = this.view.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  readUInt32LE(): number {
    if (!this.canRead(4)) {
      throw new Error(`Cannot read uint32 at position ${this.position}`);
    }
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  readInt32LE(): number {
    if (!this.canRead(4)) {
      throw new Error(`Cannot read int32 at position ${this.position}`);
    }
    const value = this.view.getInt32(this.position, true);
    this.position += 4;
    return value;
  }

  // String reading methods
  readFixedString(length: number): string {
    if (!this.canRead(length)) {
      throw new Error(`Cannot read string of length ${length} at position ${this.position}`);
    }

    const bytes = new Uint8Array(this.buffer, this.position, length);
    this.position += length;

    // Convert bytes to string, handling null terminators
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte === 0) break; // Stop at null terminator
      if (byte >= 32 && byte <= 126) { // Printable ASCII
        str += String.fromCharCode(byte);
      }
    }

    return str.trim();
  }

  readNullTerminatedString(maxLength: number = 256): string {
    const startPos = this.position;
    let str = '';
    let length = 0;

    while (length < maxLength && this.canRead(1)) {
      const byte = this.readUInt8();
      length++;
      
      if (byte === 0) break; // Null terminator
      
      if (byte >= 32 && byte <= 126) { // Printable ASCII
        str += String.fromCharCode(byte);
      } else if (str.length > 0) {
        // Stop if we encounter non-printable after starting the string
        this.setPosition(this.position - 1); // Back up one byte
        break;
      }
    }

    return str.trim();
  }

  // Raw data reading
  readBytes(length: number): Uint8Array {
    if (!this.canRead(length)) {
      throw new Error(`Cannot read ${length} bytes at position ${this.position}`);
    }

    const bytes = new Uint8Array(this.buffer, this.position, length);
    this.position += length;
    return bytes;
  }

  readBuffer(length: number): ArrayBuffer {
    if (!this.canRead(length)) {
      throw new Error(`Cannot read buffer of length ${length} at position ${this.position}`);
    }

    const buffer = this.buffer.slice(this.position, this.position + length);
    this.position += length;
    return buffer;
  }

  // Add createHexDump method for debugging
  createHexDump(offset: number, length: number): string {
    const startOffset = Math.max(0, offset);
    const endOffset = Math.min(this.buffer.byteLength, offset + length);
    const actualLength = endOffset - startOffset;
    
    if (actualLength <= 0) {
      return 'No data available at offset';
    }

    const bytes = new Uint8Array(this.buffer, startOffset, actualLength);
    const lines: string[] = [];
    
    for (let i = 0; i < bytes.length; i += 16) {
      const lineBytes = bytes.slice(i, i + 16);
      const hexPart = Array.from(lineBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
        .padEnd(47, ' ');
      
      const asciiPart = Array.from(lineBytes)
        .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
        .join('');
      
      const lineOffset = (startOffset + i).toString(16).padStart(8, '0');
      lines.push(`${lineOffset}: ${hexPart} |${asciiPart}|`);
    }
    
    return lines.join('\n');
  }

  // Format detection based on screp logic
  detectFormat(): FormatDetection {
    const originalPos = this.position;
    
    try {
      this.setPosition(0);
      
      // Check for minimum file size
      if (this.buffer.byteLength < 30) {
        return { isCompressed: false, format: 'unknown', confidence: 0.0 };
      }

      // Read replay ID at offset 12
      this.setPosition(12);
      const replayId = this.readFixedString(4);
      
      console.log('[BWBinaryReader] Replay ID:', replayId);
      
      // Check for valid replay IDs (from screp)
      if (replayId !== 'reRS' && replayId !== 'seRS') {
        return { isCompressed: false, format: 'unknown', confidence: 0.0 };
      }

      // Modern 1.21+ format
      if (replayId === 'seRS') {
        return { isCompressed: true, format: 'modern121', confidence: 0.95 };
      }

      // Pre-1.21 format, check compression type at offset 28
      this.setPosition(28);
      const compressionByte = this.readUInt8();
      const isZlib = compressionByte === 0x78;
      
      console.log('[BWBinaryReader] Compression byte:', '0x' + compressionByte.toString(16));
      
      if (isZlib) {
        return { isCompressed: true, format: 'modern', confidence: 0.90 };
      } else {
        return { isCompressed: true, format: 'legacy', confidence: 0.85 };
      }

    } catch (error) {
      console.error('[BWBinaryReader] Format detection failed:', error);
      return { isCompressed: false, format: 'unknown', confidence: 0.0 };
    } finally {
      this.setPosition(originalPos);
    }
  }

  // Utility methods
  peek(offset: number = 0): number {
    const pos = this.position + offset;
    if (pos >= this.buffer.byteLength) {
      throw new Error(`Cannot peek at position ${pos}`);
    }
    return this.view.getUint8(pos);
  }

  skip(bytes: number): void {
    this.setPosition(this.position + bytes);
  }

  // Create a sub-reader for a specific section
  createSubReader(offset: number, length: number): BWBinaryReader {
    if (offset + length > this.buffer.byteLength) {
      throw new Error(`Sub-reader bounds exceed buffer size`);
    }
    
    const subBuffer = this.buffer.slice(offset, offset + length);
    return new BWBinaryReader(subBuffer);
  }
}
