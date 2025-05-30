
/**
 * Binary Reader für screp parsing
 */

export class BinaryReader {
  private view: DataView;
  private position: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  setPosition(pos: number): void {
    this.position = pos;
  }

  getPosition(): number {
    return this.position;
  }

  canRead(bytes: number): boolean {
    return this.position + bytes <= this.view.byteLength;
  }

  readUInt8(): number {
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  readUInt16LE(): number {
    const value = this.view.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  readUInt32LE(): number {
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.view.buffer, this.position, length);
    this.position += length;
    return bytes;
  }

  readFixedString(length: number): string {
    const bytes = this.readBytes(length);
    let str = '';
    for (let i = 0; i < bytes.length && bytes[i] !== 0; i++) {
      str += String.fromCharCode(bytes[i]);
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
}
