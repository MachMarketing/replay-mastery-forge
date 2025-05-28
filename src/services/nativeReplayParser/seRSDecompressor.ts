
/**
 * Enhanced seRS decompressor with multiple decompression strategies
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
   * Enhanced decompression with multiple fallback strategies
   */
  decompress(): SeRSDecompressionResult {
    console.log('[SeRSDecompressor] Starting enhanced seRS decompression...');
    console.log('[SeRSDecompressor] File size:', this.data.length);
    
    // Verify seRS header
    if (!this.verifySeRSHeader()) {
      return { success: false, error: 'Not a valid seRS file' };
    }

    // Find zlib data start with enhanced detection
    const zlibStart = this.findZlibStartEnhanced();
    if (zlibStart === -1) {
      return { success: false, error: 'No zlib data found' };
    }

    console.log('[SeRSDecompressor] Enhanced zlib detection at offset:', zlibStart);

    // Extract compressed data
    const compressedData = this.data.slice(zlibStart);
    console.log('[SeRSDecompressor] Compressed data size:', compressedData.length);
    
    // Log first 16 bytes for debugging
    console.log('[SeRSDecompressor] First 16 bytes:', 
      Array.from(compressedData.slice(0, 16))
        .map(b => `0x${b.toString(16).padStart(2, '0')}`)
        .join(' '));

    // Try enhanced decompression strategies
    const strategies = this.getDecompressionStrategies();
    
    for (const strategy of strategies) {
      try {
        console.log(`[SeRSDecompressor] Trying strategy: ${strategy.name}...`);
        const result = strategy.decompress(compressedData);
        
        if (result && result.length > 1000) {
          console.log(`[SeRSDecompressor] Strategy ${strategy.name} produced ${result.length} bytes`);
          
          if (this.validateDecompressedDataEnhanced(result)) {
            console.log(`[SeRSDecompressor] SUCCESS with ${strategy.name}`);
            return { 
              success: true, 
              data: result, 
              method: strategy.name 
            };
          } else {
            console.log(`[SeRSDecompressor] Strategy ${strategy.name} failed validation`);
          }
        }
      } catch (error) {
        console.log(`[SeRSDecompressor] Strategy ${strategy.name} failed:`, error);
      }
    }

    return { success: false, error: 'All enhanced decompression strategies failed' };
  }

  /**
   * Get comprehensive decompression strategies
   */
  private getDecompressionStrategies() {
    return [
      {
        name: 'pako.inflate (default)',
        decompress: (data: Uint8Array) => pako.inflate(data)
      },
      {
        name: 'pako.inflate (windowBits: -15)',
        decompress: (data: Uint8Array) => pako.inflate(data, { windowBits: -15 })
      },
      {
        name: 'pako.inflate (windowBits: 15)',
        decompress: (data: Uint8Array) => pako.inflate(data, { windowBits: 15 })
      },
      {
        name: 'pako.inflateRaw',
        decompress: (data: Uint8Array) => pako.inflateRaw(data)
      },
      {
        name: 'pako.inflate (chunkSize: 1024)',
        decompress: (data: Uint8Array) => pako.inflate(data, { chunkSize: 1024 })
      },
      {
        name: 'pako.inflate (chunkSize: 4096)',
        decompress: (data: Uint8Array) => pako.inflate(data, { chunkSize: 4096 })
      },
      {
        name: 'pako.inflate (strategy: Z_DEFAULT_STRATEGY)',
        decompress: (data: Uint8Array) => pako.inflate(data, { strategy: 0 })
      },
      {
        name: 'pako.inflate (level: 6)',
        decompress: (data: Uint8Array) => pako.inflate(data, { level: 6 })
      },
      {
        name: 'Skip first 2 bytes + pako.inflate',
        decompress: (data: Uint8Array) => pako.inflate(data.slice(2))
      },
      {
        name: 'Skip first 4 bytes + pako.inflate',
        decompress: (data: Uint8Array) => pako.inflate(data.slice(4))
      }
    ];
  }

  /**
   * Enhanced zlib start detection
   */
  private findZlibStartEnhanced(): number {
    const zlibHeaders = [
      [0x78, 0x9C], // Default compression
      [0x78, 0x01], // No compression
      [0x78, 0xDA], // Best compression
      [0x78, 0x5E], // Fast compression
      [0x78, 0x20], // Alternative header
      [0x08, 0x1D]  // Alternative pattern
    ];

    // Extended search range
    const searchOffsets = [32, 28, 30, 34, 36, 24, 26, 38, 40, 16, 20, 44, 48];
    
    for (const offset of searchOffsets) {
      if (offset + 1 < this.data.length) {
        for (const [byte1, byte2] of zlibHeaders) {
          if (this.data[offset] === byte1 && this.data[offset + 1] === byte2) {
            console.log(`[SeRSDecompressor] Enhanced zlib header found at ${offset}: 0x${byte1.toString(16)} 0x${byte2.toString(16)}`);
            return offset;
          }
        }
      }
    }

    // Fallback: scan for any potential zlib pattern
    for (let i = 16; i < Math.min(64, this.data.length - 1); i++) {
      if (this.data[i] === 0x78) {
        const next = this.data[i + 1];
        if ([0x01, 0x5E, 0x9C, 0xDA, 0x20].includes(next)) {
          console.log(`[SeRSDecompressor] Fallback zlib pattern at ${i}: 0x78 0x${next.toString(16)}`);
          return i;
        }
      }
    }

    return -1;
  }

  /**
   * Enhanced validation of decompressed data
   */
  private validateDecompressedDataEnhanced(data: Uint8Array): boolean {
    if (data.length < 1000) {
      console.log('[SeRSDecompressor] Data too small:', data.length);
      return false;
    }

    // Enhanced pattern detection
    let readableChars = 0;
    let frameMarkers = 0;
    let actionBytes = 0;
    let nullBytes = 0;
    let playerNameCandidates = 0;
    
    const sampleSize = Math.min(3000, data.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const byte = data[i];
      
      // Count readable ASCII
      if (byte >= 32 && byte <= 126) {
        readableChars++;
        
        // Look for potential player names (sequences of readable chars)
        if (i > 0 && data[i-1] >= 32 && data[i-1] <= 126) {
          let nameLength = 0;
          for (let j = i; j < Math.min(i + 25, data.length) && data[j] >= 32 && data[j] <= 126; j++) {
            nameLength++;
          }
          if (nameLength >= 3 && nameLength <= 20) {
            playerNameCandidates++;
          }
        }
      }
      
      // Count frame markers
      if (byte === 0x00) {
        frameMarkers++;
        nullBytes++;
      }
      
      // Count action opcodes
      if ([0x09, 0x0A, 0x0C, 0x13, 0x14, 0x15, 0x1D, 0x1E, 0x2F, 0x31].includes(byte)) {
        actionBytes++;
      }
    }

    const readableRatio = readableChars / sampleSize;
    const frameRatio = frameMarkers / sampleSize;
    const actionRatio = actionBytes / sampleSize;
    const nullRatio = nullBytes / sampleSize;

    console.log('[SeRSDecompressor] Enhanced validation metrics:', {
      readable: readableRatio.toFixed(3),
      frames: frameRatio.toFixed(3),
      actions: actionRatio.toFixed(3),
      nulls: nullRatio.toFixed(3),
      playerNames: playerNameCandidates
    });

    // Enhanced validation criteria
    const hasGoodReadableRatio = readableRatio > 0.03 && readableRatio < 0.5;
    const hasFrameMarkers = frameRatio > 0.01;
    const hasActionBytes = actionRatio > 0.003;
    const hasReasonableNulls = nullRatio > 0.1 && nullRatio < 0.8;
    const hasPlayerNames = playerNameCandidates > 0;

    const isValid = hasGoodReadableRatio && hasFrameMarkers && hasActionBytes && hasReasonableNulls && hasPlayerNames;
    
    console.log('[SeRSDecompressor] Enhanced validation result:', isValid, {
      readableOK: hasGoodReadableRatio,
      framesOK: hasFrameMarkers,
      actionsOK: hasActionBytes,
      nullsOK: hasReasonableNulls,
      namesOK: hasPlayerNames
    });
    
    return isValid;
  }

  /**
   * Verify seRS header signature
   */
  private verifySeRSHeader(): boolean {
    if (this.data.length < 16) return false;
    
    // Check for "seRS" at offset 12
    const magic = String.fromCharCode(...this.data.slice(12, 16));
    const isValid = magic === 'seRS';
    console.log('[SeRSDecompressor] seRS header check:', isValid, `"${magic}"`);
    return isValid;
  }
}
