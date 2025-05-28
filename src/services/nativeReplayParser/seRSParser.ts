
/**
 * seRS (StarCraft Remastered) replay parser
 * Simplified and fixed version
 */

import * as pako from 'pako';

export interface SeRSHeader {
  magic: string;
  version: number;
  compressedSize: number;
  uncompressedSize: number;
  zlibStart: number;
}

export class SeRSParser {
  private data: Uint8Array;

  constructor(buffer: ArrayBuffer) {
    this.data = new Uint8Array(buffer);
  }

  /**
   * Parse seRS header with enhanced validation
   */
  parseSeRSHeader(): SeRSHeader | null {
    console.log('[SeRSParser] Analyzing file header...');
    console.log('[SeRSParser] File size:', this.data.length, 'bytes');
    
    // Check minimum file size
    if (this.data.length < 16) {
      console.log('[SeRSParser] File too small for seRS header');
      return null;
    }

    // Check for seRS magic at offset 12 (0x0C)
    const magicBytes = this.data.slice(12, 16);
    const magic = String.fromCharCode(...magicBytes);
    
    console.log('[SeRSParser] Magic bytes at offset 12:', magic);

    if (magic !== 'seRS') {
      console.log('[SeRSParser] Not a seRS format file');
      return null;
    }

    // Find zlib header
    const zlibStart = this.findValidZlibHeader();
    if (zlibStart === -1) {
      console.log('[SeRSParser] No valid zlib header found');
      return null;
    }

    console.log('[SeRSParser] Valid seRS header found with zlib at offset:', zlibStart);
    return {
      magic,
      version: 1,
      compressedSize: this.data.length - zlibStart,
      uncompressedSize: 0,
      zlibStart
    };
  }

  /**
   * Find valid zlib header
   */
  private findValidZlibHeader(): number {
    console.log('[SeRSParser] Searching for valid zlib header...');
    
    // Common zlib headers
    const zlibHeaders = [
      { bytes: [0x78, 0x9C], name: 'Default compression' },
      { bytes: [0x78, 0x01], name: 'No compression' },
      { bytes: [0x78, 0xDA], name: 'Best compression' }
    ];
    
    // Search in common range
    for (let i = 16; i < Math.min(128, this.data.length - 10); i++) {
      for (const header of zlibHeaders) {
        if (this.data[i] === header.bytes[0] && this.data[i + 1] === header.bytes[1]) {
          console.log(`[SeRSParser] Found ${header.name} at offset ${i}`);
          
          if (this.validateZlibAtOffset(i)) {
            console.log(`[SeRSParser] Validated zlib stream at offset ${i}`);
            return i;
          }
        }
      }
    }
    
    return -1;
  }

  /**
   * Validate if there's a valid zlib stream at the given offset
   */
  private validateZlibAtOffset(offset: number): boolean {
    if (offset + 10 > this.data.length) return false;
    
    try {
      const testData = this.data.slice(offset, Math.min(offset + 100, this.data.length));
      pako.inflate(testData);
      return true;
    } catch (error: any) {
      console.log(`[SeRSParser] Validation failed at offset ${offset}:`, error.message);
      return false;
    }
  }

  /**
   * Decompress the replay data
   */
  decompressReplayData(header: SeRSHeader): Uint8Array {
    console.log('[SeRSParser] Decompressing replay data...');
    console.log('[SeRSParser] Compressed data starts at offset:', header.zlibStart);

    const compressedData = this.data.slice(header.zlibStart);
    
    // Try multiple decompression methods
    const methods = [
      () => pako.inflate(compressedData),
      () => pako.inflateRaw(compressedData),
      () => pako.inflate(compressedData, { windowBits: 15 }),
      () => pako.inflate(compressedData, { windowBits: -15 })
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`[SeRSParser] Trying decompression method ${i + 1}`);
        const decompressed = methods[i]();
        
        console.log('[SeRSParser] Decompression successful, size:', decompressed.length);
        
        if (this.validateDecompressedData(decompressed)) {
          console.log('[SeRSParser] Decompressed data validation passed');
          return decompressed;
        }
      } catch (error: any) {
        console.log(`[SeRSParser] Method ${i + 1} failed:`, error.message);
      }
    }

    throw new Error('All seRS decompression methods failed');
  }

  /**
   * Validate decompressed data
   */
  private validateDecompressedData(data: Uint8Array): boolean {
    if (data.length < 500) {
      console.warn('[SeRSParser] Decompressed data too small:', data.length);
      return false;
    }
    
    // Check for reasonable data patterns
    let readableChars = 0;
    let nullBytes = 0;
    const sampleSize = Math.min(1000, data.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const byte = data[i];
      if (byte >= 32 && byte <= 126) readableChars++;
      if (byte === 0) nullBytes++;
    }
    
    const readableRatio = readableChars / sampleSize;
    const nullRatio = nullBytes / sampleSize;
    
    console.log('[SeRSParser] Data validation ratios:', {
      readable: readableRatio.toFixed(3),
      nulls: nullRatio.toFixed(3)
    });
    
    return readableRatio > 0.05 && nullRatio > 0.05 && nullRatio < 0.8;
  }

  /**
   * Parse the complete seRS file
   */
  parse(): { header: SeRSHeader; decompressedData: Uint8Array } {
    console.log('[SeRSParser] Starting seRS parsing...');
    
    const header = this.parseSeRSHeader();
    if (!header) {
      throw new Error('Not a valid seRS format file');
    }

    const decompressedData = this.decompressReplayData(header);
    
    console.log('[SeRSParser] seRS parsing complete');
    return { header, decompressedData };
  }

  /**
   * Static method to check if file is seRS format
   */
  static isSeRSFormat(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 16) return false;
    
    const data = new Uint8Array(buffer);
    const magic = String.fromCharCode(...data.slice(12, 16));
    return magic === 'seRS';
  }
}
