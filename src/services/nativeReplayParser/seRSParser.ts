
/**
 * seRS (StarCraft Remastered) replay parser
 * Completely rewritten with enhanced compression detection and error handling
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

    // Log first 32 bytes for debugging
    const headerHex = Array.from(this.data.slice(0, Math.min(32, this.data.length)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    console.log('[SeRSParser] Header hex:', headerHex);

    // Check for seRS magic at offset 12 (0x0C)
    const magicBytes = this.data.slice(12, 16);
    const magic = String.fromCharCode(...magicBytes);
    
    console.log('[SeRSParser] Magic bytes at offset 12:', magic);
    console.log('[SeRSParser] Magic hex:', Array.from(magicBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));

    if (magic !== 'seRS') {
      console.log('[SeRSParser] Not a seRS format file');
      return null;
    }

    // Enhanced zlib header detection
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
      uncompressedSize: 0, // Will be determined after decompression
      zlibStart
    };
  }

  /**
   * Enhanced zlib header detection with validation
   */
  private findValidZlibHeader(): number {
    console.log('[SeRSParser] Searching for valid zlib header...');
    
    // Common zlib headers with their compression levels
    const zlibHeaders = [
      { bytes: [0x78, 0x9C], name: 'Default compression' },
      { bytes: [0x78, 0x01], name: 'No compression' },
      { bytes: [0x78, 0xDA], name: 'Best compression' },
      { bytes: [0x78, 0x5E], name: 'Fast compression' },
      { bytes: [0x78, 0x20], name: 'Alternative header 1' },
      { bytes: [0x78, 0x3C], name: 'Alternative header 2' }
    ];
    
    // Search in multiple ranges (seRS files can have variable header sizes)
    const searchRanges = [
      { start: 16, end: 64, priority: 1 },   // Most common
      { start: 32, end: 128, priority: 2 },  // Alternative
      { start: 64, end: 256, priority: 3 }   // Fallback
    ];
    
    for (const range of searchRanges) {
      console.log(`[SeRSParser] Searching range ${range.start}-${range.end} (priority ${range.priority})`);
      
      for (let i = range.start; i < Math.min(range.end, this.data.length - 10); i++) {
        for (const header of zlibHeaders) {
          if (this.data[i] === header.bytes[0] && this.data[i + 1] === header.bytes[1]) {
            console.log(`[SeRSParser] Found ${header.name} at offset ${i}`);
            
            // Validate this is actually a valid zlib stream
            if (this.validateZlibAtOffset(i)) {
              console.log(`[SeRSParser] Validated zlib stream at offset ${i}`);
              return i;
            } else {
              console.log(`[SeRSParser] Invalid zlib stream at offset ${i}`);
            }
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
      // Try to decompress first few bytes to validate
      const testData = this.data.slice(offset, Math.min(offset + 100, this.data.length));
      pako.inflate(testData);
      return true;
    } catch (error) {
      console.log(`[SeRSParser] Validation failed at offset ${offset}:`, error.message);
      return false;
    }
  }

  /**
   * Decompress the replay data with multiple fallback methods
   */
  decompressReplayData(header: SeRSHeader): Uint8Array {
    console.log('[SeRSParser] Decompressing replay data...');
    console.log('[SeRSParser] Compressed data starts at offset:', header.zlibStart);
    console.log('[SeRSParser] Compressed data size:', header.compressedSize);

    const compressedData = this.data.slice(header.zlibStart);
    
    // Log first few bytes of compressed data
    console.log('[SeRSParser] First 10 bytes of compressed data:', 
      Array.from(compressedData.slice(0, 10))
        .map(b => `0x${b.toString(16).padStart(2, '0')}`)
        .join(' '));

    // Try multiple decompression methods in order of likelihood
    const decompressionMethods = [
      {
        name: 'Standard inflate',
        method: () => pako.inflate(compressedData)
      },
      {
        name: 'Raw inflate',
        method: () => pako.inflateRaw(compressedData)
      },
      {
        name: 'Inflate with window 15',
        method: () => pako.inflate(compressedData, { windowBits: 15 })
      },
      {
        name: 'Inflate with window -15',
        method: () => pako.inflate(compressedData, { windowBits: -15 })
      },
      {
        name: 'Inflate with window 13',
        method: () => pako.inflate(compressedData, { windowBits: 13 })
      },
      {
        name: 'Raw inflate with window 15',
        method: () => pako.inflateRaw(compressedData, { windowBits: 15 })
      }
    ];

    for (const decomp of decompressionMethods) {
      try {
        console.log(`[SeRSParser] Trying: ${decomp.name}`);
        const decompressed = decomp.method();
        
        console.log('[SeRSParser] Decompression successful with:', decomp.name);
        console.log('[SeRSParser] Decompressed size:', decompressed.length);
        
        // Validate decompressed data
        if (this.validateDecompressedData(decompressed)) {
          console.log('[SeRSParser] Decompressed data validation passed');
          
          // Log first few bytes of decompressed data
          console.log('[SeRSParser] First 20 bytes of decompressed data:', 
            Array.from(decompressed.slice(0, 20))
              .map(b => `0x${b.toString(16).padStart(2, '0')}`)
              .join(' '));

          return decompressed;
        } else {
          console.warn('[SeRSParser] Decompressed data failed validation with:', decomp.name);
        }
      } catch (error) {
        console.log(`[SeRSParser] ${decomp.name} failed:`, error.message);
      }
    }

    throw new Error('All seRS decompression methods failed');
  }

  /**
   * Validate decompressed data looks like a replay
   */
  private validateDecompressedData(data: Uint8Array): boolean {
    if (data.length < 500) {
      console.warn('[SeRSParser] Decompressed data too small:', data.length);
      return false;
    }
    
    // Check for typical replay patterns
    let readableChars = 0;
    let nullBytes = 0;
    let actionBytes = 0;
    
    const sampleSize = Math.min(1000, data.length);
    const actionOpcodes = [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x13, 0x14, 0x15, 0x18, 0x1D, 0x1E];
    
    for (let i = 0; i < sampleSize; i++) {
      const byte = data[i];
      
      if (byte >= 32 && byte <= 126) readableChars++;
      if (byte === 0) nullBytes++;
      if (actionOpcodes.includes(byte)) actionBytes++;
    }
    
    const readableRatio = readableChars / sampleSize;
    const nullRatio = nullBytes / sampleSize;
    const actionRatio = actionBytes / sampleSize;
    
    console.log('[SeRSParser] Data validation ratios:', {
      readable: readableRatio.toFixed(3),
      nulls: nullRatio.toFixed(3),
      actions: actionRatio.toFixed(3)
    });
    
    // Should have reasonable amounts of each type of data
    return readableRatio > 0.05 && nullRatio > 0.05 && nullRatio < 0.8;
  }

  /**
   * Parse the complete seRS file with enhanced error handling
   */
  parse(): { header: SeRSHeader; decompressedData: Uint8Array } {
    console.log('[SeRSParser] === STARTING ENHANCED seRS PARSING ===');
    
    const header = this.parseSeRSHeader();
    if (!header) {
      throw new Error('Not a valid seRS format file');
    }

    console.log('[SeRSParser] seRS header validated successfully');
    const decompressedData = this.decompressReplayData(header);
    
    console.log('[SeRSParser] === seRS PARSING COMPLETE ===');
    console.log('[SeRSParser] Final result:', {
      originalSize: this.data.length,
      decompressedSize: decompressedData.length,
      compressionRatio: (this.data.length / decompressedData.length).toFixed(2)
    });
    
    return { header, decompressedData };
  }

  /**
   * Static method to quickly check if a file is seRS format
   */
  static isSeRSFormat(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 16) return false;
    
    const data = new Uint8Array(buffer);
    const magic = String.fromCharCode(...data.slice(12, 16));
    return magic === 'seRS';
  }
}
