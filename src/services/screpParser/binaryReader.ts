/**
 * Binary Reader für screp parsing - optimiert nach screp repo
 */

export class BinaryReader {
  private view: DataView;
  private position: number = 0;
  private length: number;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.length = buffer.byteLength;
  }

  setPosition(pos: number): void {
    this.position = Math.max(0, Math.min(pos, this.length));
  }

  getPosition(): number {
    return this.position;
  }

  getLength(): number {
    return this.length;
  }

  canRead(bytes: number): boolean {
    return this.position + bytes <= this.length;
  }

  readUInt8(): number {
    if (!this.canRead(1)) {
      throw new Error(`Cannot read UInt8 at position ${this.position}`);
    }
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  readUInt16LE(): number {
    if (!this.canRead(2)) {
      throw new Error(`Cannot read UInt16LE at position ${this.position}`);
    }
    const value = this.view.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  readUInt32LE(): number {
    if (!this.canRead(4)) {
      throw new Error(`Cannot read UInt32LE at position ${this.position}`);
    }
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  readBytes(length: number): Uint8Array {
    if (!this.canRead(length)) {
      throw new Error(`Cannot read ${length} bytes at position ${this.position}`);
    }
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.position, length);
    this.position += length;
    return bytes;
  }

  readFixedString(length: number): string {
    const bytes = this.readBytes(length);
    let str = '';
    for (let i = 0; i < bytes.length && bytes[i] !== 0; i++) {
      if (bytes[i] >= 32 && bytes[i] <= 126) {
        str += String.fromCharCode(bytes[i]);
      }
    }
    return str;
  }

  readNullTerminatedString(maxLength: number): string {
    let str = '';
    for (let i = 0; i < maxLength && this.canRead(1); i++) {
      const byte = this.readUInt8();
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) {
        str += String.fromCharCode(byte);
      }
    }
    return str;
  }

  peek(offset: number = 0): number {
    const pos = this.position + offset;
    if (pos >= this.length) return 0;
    return this.view.getUint8(pos);
  }

  skip(bytes: number): void {
    this.position = Math.min(this.position + bytes, this.length);
  }
}