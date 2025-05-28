
/**
 * Dedicated seRS decompressor with robust error handling
 */

import * as pako from 'pako';

export interface SeRSDecompressionResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
  method?: string;
}

export class SeRSDecompressor {
  private data: Uint8Array;

  constructor(buffer: ArrayBuffer) {
    this.data = new Uint8Array(buffer);
  }

  /**
   * Main decompression method with multiple fallbacks
   */
  decompress(): SeRSDecompressionResult {
    console.log('[SeRSDecompressor] Starting seRS decompression...');
    console.log('[SeRSDecompressor] File size:', this.data.length);
    
    // Verify seRS header
    if (!this.verifySeRSHeader()) {
      return { success: false, error: 'Not a valid seRS file' };
    }

    // Find zlib data start
    const zlibStart = this.findZlibStart();
    if (zlibStart === -1) {
      return { success: false, error: 'No zlib data found' };
    }

    console.log('[SeRSDecompressor] zlib data starts at offset:', zlibStart);

    // Extract compressed data
    const compressedData = this.data.slice(zlibStart);
    console.log('[SeRSDecompressor] Compressed data size:', compressedData.length);

    // Try different decompression methods
    const methods = [
      { name: 'pako.inflate', fn: () => pako.inflate(compressedData) },
      { name: 'pako.inflateRaw', fn: () => pako.inflateRaw(compressedData) },
      { name: 'pako.inflate with window -15', fn: () => pako.inflate(compressedData, { windowBits: -15 }) },
      { name: 'pako.inflate with window 15', fn: () => pako.inflate(compressedData, { windowBits: 15 }) }
    ];

    for (const method of methods) {
      try {
        console.log(`[SeRSDecompressor] Trying ${method.name}...`);
        const result = method.fn();
        
        if (result && result.length > 1000) {
          console.log(`[SeRSDecompressor] Success with ${method.name}, size: ${result.length}`);
          
          if (this.validateDecompressedData(result)) {
            return { 
              success: true, 
              data: result, 
              method: method.name 
            };
          }
        }
      } catch (error) {
        console.log(`[SeRSDecompressor] ${method.name} failed:`, error);
      }
    }

    return { success: false, error: 'All decompression methods failed' };
  }

  /**
   * Verify seRS header signature
   */
  private verifySeRSHeader(): boolean {
    if (this.data.length < 16) return false;
    
    // Check for "seRS" at offset 12
    const magic = String.fromCharCode(...this.data.slice(12, 16));
    return magic === 'seRS';
  }

  /**
   * Find zlib data start with enhanced detection
   */
  private findZlibStart(): number {
    const zlibHeaders = [
      [0x78, 0x9C], // Default compression (from logs)
      [0x78, 0x01], // No compression
      [0x78, 0xDA], // Best compression
      [0x78, 0x5E]  // Fast compression
    ];

    // Common seRS offsets
    const searchOffsets = [32, 28, 30, 34, 36];
    
    for (const offset of searchOffsets) {
      if (offset + 1 < this.data.length) {
        for (const [byte1, byte2] of zlibHeaders) {
          if (this.data[offset] === byte1 && this.data[offset + 1] === byte2) {
            console.log(`[SeRSDecompressor] Found zlib header at offset ${offset}: 0x${byte1.toString(16)} 0x${byte2.toString(16)}`);
            return offset;
          }
        }
      }
    }

    return -1;
  }

  /**
   * Validate decompressed data quality
   */
  private validateDecompressedData(data: Uint8Array): boolean {
    if (data.length < 1000) {
      console.log('[SeRSDecompressor] Decompressed data too small:', data.length);
      return false;
    }

    // Check for readable content and typical replay patterns
    let readableChars = 0;
    let frameMarkers = 0;
    let actionBytes = 0;
    
    const sampleSize = Math.min(2000, data.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const byte = data[i];
      
      // Count readable ASCII
      if (byte >= 32 && byte <= 126) readableChars++;
      
      // Count frame markers
      if (byte === 0x00) frameMarkers++;
      
      // Count action opcodes
      if ([0x09, 0x0A, 0x0C, 0x13, 0x14, 0x15, 0x1D].includes(byte)) actionBytes++;
    }

    const readableRatio = readableChars / sampleSize;
    const frameRatio = frameMarkers / sampleSize;
    const actionRatio = actionBytes / sampleSize;

    console.log('[SeRSDecompressor] Data validation:', {
      readable: readableRatio.toFixed(3),
      frames: frameRatio.toFixed(3),
      actions: actionRatio.toFixed(3)
    });

    // Validate ratios
    const isValid = readableRatio > 0.05 && frameRatio > 0.02 && actionRatio > 0.005;
    console.log('[SeRSDecompressor] Validation result:', isValid);
    
    return isValid;
  }
}
