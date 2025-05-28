
/**
 * Enhanced Remastered Decompressor with improved zlib handling
 */

import * as pako from 'pako';

export interface DecompressionResult {
  success: boolean;
  data: ArrayBuffer | null;
  method: string;
  blocks: number;
  originalSize: number;
  decompressedSize: number;
  validation: {
    hasReplayMagic: boolean;
    hasStarcraftStrings: boolean;
    hasCommandStructure: boolean;
    quality: 'excellent' | 'good' | 'poor' | 'invalid';
  };
}

export class RemasteredDecompressor {
  /**
   * Enhanced compression detection
   */
  static isLikelyCompressed(data: Uint8Array): boolean {
    if (data.length < 2) return false;
    
    // Check for zlib signatures
    const zlibSignatures = [
      [0x78, 0x9C], // Standard deflate
      [0x78, 0xDA], // Best compression
      [0x78, 0x01], // No compression
      [0x78, 0x5E], // Fast compression
      [0x78, 0x2C]  // Alternative
    ];
    
    for (const signature of zlibSignatures) {
      if (data[0] === signature[0] && data[1] === signature[1]) {
        return true;
      }
    }
    
    // Additional heuristics
    const textContent = new TextDecoder('latin1', { fatal: false }).decode(data.slice(0, Math.min(100, data.length)));
    return textContent.includes('LIST') || textContent.includes('RIFF') || this.hasCompressionPatterns(data);
  }

  /**
   * Check for compression patterns
   */
  private static hasCompressionPatterns(data: Uint8Array): boolean {
    let lowEntropyBytes = 0;
    let repeatedBytes = 0;
    
    for (let i = 0; i < Math.min(100, data.length - 1); i++) {
      if (data[i] === data[i + 1]) {
        repeatedBytes++;
      }
      if (data[i] < 32 || data[i] > 126) {
        lowEntropyBytes++;
      }
    }
    
    return (lowEntropyBytes / Math.min(100, data.length)) > 0.3 || 
           (repeatedBytes / Math.min(99, data.length - 1)) > 0.2;
  }

  /**
   * Decompress a single block with improved error handling
   */
  static decompressBlock(data: Uint8Array): ArrayBuffer {
    try {
      const decompressed = pako.inflate(data);
      return decompressed.buffer;
    } catch (error) {
      throw new Error(`Failed to decompress block: ${error}`);
    }
  }

  /**
   * Enhanced Remastered decompression with better zlib handling
   */
  static async decompress(buffer: ArrayBuffer): Promise<DecompressionResult> {
    console.log('[RemasteredDecompressor] Starting enhanced Remastered decompression');
    
    const originalSize = buffer.byteLength;
    const uint8Array = new Uint8Array(buffer);
    
    // Try multiple decompression strategies
    const methods = [
      () => this.decompressWithImprovedZlibDetection(uint8Array),
      () => this.decompressWithHeaderSkipping(uint8Array),
      () => this.decompressWithAlternativeInflate(uint8Array),
      () => this.decompressRawZlibWithFallbacks(uint8Array),
      () => this.decompressWithBruteForce(uint8Array)
    ];
    
    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`[RemasteredDecompressor] Trying enhanced method ${i + 1}...`);
        const result = methods[i]();
        
        if (result && result.byteLength > 1000) {
          const validation = this.validateDecompressedData(new Uint8Array(result));
          
          if (validation.quality !== 'invalid') {
            console.log(`[RemasteredDecompressor] Success with enhanced method ${i + 1}!`);
            return {
              success: true,
              data: result,
              method: `Enhanced Method ${i + 1}`,
              blocks: i + 1,
              originalSize,
              decompressedSize: result.byteLength,
              validation
            };
          }
        }
      } catch (error) {
        console.log(`[RemasteredDecompressor] Enhanced method ${i + 1} failed:`, error);
      }
    }
    
    console.warn('[RemasteredDecompressor] All enhanced decompression methods failed');
    return {
      success: false,
      data: null,
      method: 'none',
      blocks: 0,
      originalSize,
      decompressedSize: 0,
      validation: {
        hasReplayMagic: false,
        hasStarcraftStrings: false,
        hasCommandStructure: false,
        quality: 'invalid'
      }
    };
  }

  /**
   * Method 1: Improved zlib detection with better header handling
   */
  private static decompressWithImprovedZlibDetection(data: Uint8Array): ArrayBuffer | null {
    console.log('[RemasteredDecompressor] Method 1: Improved zlib detection');
    
    const zlibBlocks: Uint8Array[] = [];
    let totalDecompressedSize = 0;
    
    // Enhanced zlib signature detection
    const zlibSignatures = [
      [0x78, 0x9C], [0x78, 0xDA], [0x78, 0x01], 
      [0x78, 0x5E], [0x78, 0x2C], [0x1F, 0x8B] // Add gzip signature
    ];
    
    for (let i = 0; i < data.length - 1; i++) {
      for (const signature of zlibSignatures) {
        if (data[i] === signature[0] && data[i + 1] === signature[1]) {
          try {
            // Try different block sizes
            const blockSizes = [
              Math.min(65536, data.length - i), // 64KB max
              Math.min(32768, data.length - i), // 32KB
              Math.min(16384, data.length - i), // 16KB
              Math.min(8192, data.length - i),  // 8KB
              data.length - i // Remaining data
            ];
            
            for (const blockSize of blockSizes) {
              try {
                const blockData = data.slice(i, i + blockSize);
                const decompressed = pako.inflate(blockData);
                
                if (decompressed.length > 100) {
                  zlibBlocks.push(decompressed);
                  totalDecompressedSize += decompressed.length;
                  console.log(`[RemasteredDecompressor] Decompressed block at ${i}, size: ${decompressed.length}`);
                  i += blockSize - 1; // Skip processed data
                  break;
                }
              } catch (e) {
                // Try next block size
              }
            }
          } catch (error) {
            // Continue searching
          }
        }
      }
    }
    
    if (zlibBlocks.length > 0) {
      const combined = new Uint8Array(totalDecompressedSize);
      let offset = 0;
      
      for (const block of zlibBlocks) {
        combined.set(block, offset);
        offset += block.length;
      }
      
      console.log(`[RemasteredDecompressor] Combined ${zlibBlocks.length} blocks: ${combined.length} bytes`);
      return combined.buffer;
    }
    
    return null;
  }

  /**
   * Method 2: Skip various header types before decompression
   */
  private static decompressWithHeaderSkipping(data: Uint8Array): ArrayBuffer | null {
    console.log('[RemasteredDecompressor] Method 2: Header skipping');
    
    // Try skipping different amounts of header data
    const skipSizes = [0, 32, 64, 128, 256, 512, 1024];
    
    for (const skipSize of skipSizes) {
      if (skipSize >= data.length) continue;
      
      try {
        const skippedData = data.slice(skipSize);
        
        // Try multiple inflation methods on skipped data
        const inflationMethods = [
          () => pako.inflate(skippedData),
          () => pako.inflateRaw(skippedData),
          () => pako.ungzip(skippedData) // Try gzip
        ];
        
        for (const method of inflationMethods) {
          try {
            const decompressed = method();
            if (decompressed.length > 1000) {
              console.log(`[RemasteredDecompressor] Header skip success at ${skipSize} bytes`);
              return decompressed.buffer;
            }
          } catch (e) {
            // Try next method
          }
        }
      } catch (error) {
        // Try next skip size
      }
    }
    
    return null;
  }

  /**
   * Method 3: Alternative inflate with different options
   */
  private static decompressWithAlternativeInflate(data: Uint8Array): ArrayBuffer | null {
    console.log('[RemasteredDecompressor] Method 3: Alternative inflate');
    
    // Try different pako options
    const inflateOptions = [
      { windowBits: 15 },     // Default zlib
      { windowBits: -15 },    // Raw deflate
      { windowBits: 15 + 16 }, // gzip
      { windowBits: 15 + 32 }, // Auto-detect
      {}                       // Default options
    ];
    
    for (const options of inflateOptions) {
      try {
        const decompressed = pako.inflate(data, options);
        if (decompressed.length > 1000) {
          console.log(`[RemasteredDecompressor] Alternative inflate success with options:`, options);
          return decompressed.buffer;
        }
      } catch (error) {
        // Try next option
      }
    }
    
    return null;
  }

  /**
   * Method 4: Raw zlib with multiple fallbacks
   */
  private static decompressRawZlibWithFallbacks(data: Uint8Array): ArrayBuffer | null {
    console.log('[RemasteredDecompressor] Method 4: Raw zlib with fallbacks');
    
    const methods = [
      () => pako.inflate(data),
      () => pako.inflateRaw(data),
      () => pako.inflate(data.slice(2)), // Skip potential zlib header
      () => pako.inflateRaw(data.slice(2))
    ];
    
    for (let i = 0; i < methods.length; i++) {
      try {
        const decompressed = methods[i]();
        if (decompressed.length > 1000) {
          console.log(`[RemasteredDecompressor] Raw zlib fallback ${i + 1} success`);
          return decompressed.buffer;
        }
      } catch (error) {
        // Try next method
      }
    }
    
    return null;
  }

  /**
   * Method 5: Brute force - try decompression at many offsets
   */
  private static decompressWithBruteForce(data: Uint8Array): ArrayBuffer | null {
    console.log('[RemasteredDecompressor] Method 5: Brute force');
    
    const bestBlocks: Uint8Array[] = [];
    let totalSize = 0;
    
    // Try decompression starting at many different offsets
    for (let offset = 0; offset < Math.min(data.length - 100, 5000); offset += 16) {
      try {
        const remaining = data.slice(offset);
        const decompressed = pako.inflate(remaining);
        
        if (decompressed.length > 500) {
          bestBlocks.push(decompressed);
          totalSize += decompressed.length;
          console.log(`[RemasteredDecompressor] Brute force block at offset ${offset}: ${decompressed.length} bytes`);
          
          // Stop if we have enough data
          if (totalSize > 50000) break;
        }
      } catch (error) {
        // Continue to next offset
      }
    }
    
    if (bestBlocks.length > 0) {
      const combined = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const block of bestBlocks) {
        combined.set(block, offset);
        offset += block.length;
      }
      
      console.log(`[RemasteredDecompressor] Brute force combined ${bestBlocks.length} blocks: ${combined.length} bytes`);
      return combined.buffer;
    }
    
    return null;
  }

  /**
   * Validate decompressed data quality
   */
  private static validateDecompressedData(data: Uint8Array): {
    hasReplayMagic: boolean;
    hasStarcraftStrings: boolean;
    hasCommandStructure: boolean;
    quality: 'excellent' | 'good' | 'poor' | 'invalid';
  } {
    const textContent = new TextDecoder('latin1', { fatal: false }).decode(data.slice(0, Math.min(2000, data.length)));
    
    // Check for "Repl" magic
    const hasReplayMagic = textContent.includes('Repl') || 
                          (data.length >= 4 && data[0] === 0x52 && data[1] === 0x65 && data[2] === 0x70 && data[3] === 0x6C);
    
    // Check for StarCraft-specific strings
    const starcraftPatterns = [
      'StarCraft', 'Brood War', 'scenario.chk', '.scm', '.scx',
      'Protoss', 'Terran', 'Zerg', 'Maps\\', 'replay', 'staredit'
    ];
    
    let patternCount = 0;
    for (const pattern of starcraftPatterns) {
      if (textContent.toLowerCase().includes(pattern.toLowerCase())) {
        patternCount++;
      }
    }
    const hasStarcraftStrings = patternCount >= 2;
    
    // Check for command-like structures
    let commandLikePatterns = 0;
    const commandIds = [0x0C, 0x1D, 0x14, 0x15, 0x09, 0x0A, 0x0B, 0x11, 0x13, 0x20];
    
    for (let i = 0; i < Math.min(2000, data.length - 2); i++) {
      const byte = data[i];
      if (commandIds.includes(byte)) {
        commandLikePatterns++;
      }
    }
    const hasCommandStructure = commandLikePatterns >= 10;
    
    // Determine quality
    let quality: 'excellent' | 'good' | 'poor' | 'invalid';
    if (hasReplayMagic && hasStarcraftStrings && hasCommandStructure) {
      quality = 'excellent';
    } else if ((hasReplayMagic || hasStarcraftStrings) && hasCommandStructure) {
      quality = 'good';
    } else if (hasReplayMagic || hasStarcraftStrings || hasCommandStructure) {
      quality = 'poor';
    } else {
      quality = 'invalid';
    }
    
    console.log(`[RemasteredDecompressor] Validation: Magic=${hasReplayMagic}, SC=${hasStarcraftStrings}, Cmd=${hasCommandStructure}, Quality=${quality}`);
    
    return {
      hasReplayMagic,
      hasStarcraftStrings,
      hasCommandStructure,
      quality
    };
  }
}
