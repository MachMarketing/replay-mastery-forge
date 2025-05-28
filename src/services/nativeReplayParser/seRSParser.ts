
/**
 * seRS (StarCraft Remastered) replay parser
 * Based on screp specification and user analysis
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
   * Parse seRS header and extract compressed data
   */
  parseSeRSHeader(): SeRSHeader | null {
    console.log('[SeRSParser] Analyzing file header...');
    
    // Check for seRS magic at offset 12 (0x0C)
    if (this.data.length < 16) {
      console.log('[SeRSParser] File too small for seRS header');
      return null;
    }

    const magicBytes = this.data.slice(12, 16);
    const magic = String.fromCharCode(...magicBytes);
    
    console.log('[SeRSParser] Magic bytes at offset 12:', magic);
    console.log('[SeRSParser] Magic hex:', Array.from(magicBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));

    if (magic !== 'seRS') {
      console.log('[SeRSParser] Not a seRS format file');
      return null;
    }

    // Find zlib header (0x78 0x9C)
    let zlibStart = -1;
    for (let i = 0; i < Math.min(100, this.data.length - 1); i++) {
      if (this.data[i] === 0x78 && this.data[i + 1] === 0x9C) {
        zlibStart = i;
        console.log('[SeRSParser] Found zlib header at offset:', i);
        break;
      }
    }

    if (zlibStart === -1) {
      console.log('[SeRSParser] zlib header not found');
      return null;
    }

    return {
      magic,
      version: 1,
      compressedSize: this.data.length - zlibStart,
      uncompressedSize: 0, // Will be determined after decompression
      zlibStart
    };
  }

  /**
   * Decompress the replay data
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

    try {
      const decompressed = pako.inflate(compressedData);
      console.log('[SeRSParser] Decompression successful');
      console.log('[SeRSParser] Decompressed size:', decompressed.length);
      
      // Log first few bytes of decompressed data
      console.log('[SeRSParser] First 20 bytes of decompressed data:', 
        Array.from(decompressed.slice(0, 20))
          .map(b => `0x${b.toString(16).padStart(2, '0')}`)
          .join(' '));

      return decompressed;
    } catch (error) {
      console.error('[SeRSParser] Decompression failed:', error);
      throw new Error(`seRS decompression failed: ${error.message}`);
    }
  }

  /**
   * Parse the complete seRS file
   */
  parse(): { header: SeRSHeader; decompressedData: Uint8Array } {
    const header = this.parseSeRSHeader();
    if (!header) {
      throw new Error('Not a valid seRS format file');
    }

    const decompressedData = this.decompressReplayData(header);
    
    return { header, decompressedData };
  }
}
