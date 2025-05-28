
/**
 * Remastered Zlib Decompressor basierend auf screp-js Implementierung
 * Speziell für StarCraft: Brood War Remastered Format
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
   * Hauptfunktion für Remastered Zlib Decompression
   */
  static async decompress(buffer: ArrayBuffer): Promise<DecompressionResult> {
    console.log('[RemasteredDecompressor] Starting Remastered-specific decompression');
    
    const originalSize = buffer.byteLength;
    const uint8Array = new Uint8Array(buffer);
    
    // Versuche verschiedene screp-js-basierte Methoden
    const methods = [
      () => this.decompressMultipleZlibBlocks(uint8Array),
      () => this.decompressWithProgressive(uint8Array),
      () => this.decompressWithSkipHeaders(uint8Array),
      () => this.decompressRawZlib(uint8Array)
    ];
    
    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`[RemasteredDecompressor] Trying method ${i + 1}...`);
        const result = methods[i]();
        
        if (result && result.byteLength > 1000) {
          const validation = this.validateDecompressedData(new Uint8Array(result));
          
          if (validation.quality !== 'invalid') {
            console.log(`[RemasteredDecompressor] Success with method ${i + 1}!`);
            return {
              success: true,
              data: result,
              method: `Method ${i + 1}`,
              blocks: i + 1,
              originalSize,
              decompressedSize: result.byteLength,
              validation
            };
          }
        }
      } catch (error) {
        console.log(`[RemasteredDecompressor] Method ${i + 1} failed:`, error);
      }
    }
    
    console.warn('[RemasteredDecompressor] All decompression methods failed');
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
   * Methode 1: Multiple Zlib Blocks basierend auf screp-js
   */
  private static decompressMultipleZlibBlocks(data: Uint8Array): ArrayBuffer | null {
    const zlibBlocks: Uint8Array[] = [];
    let totalDecompressedSize = 0;
    
    // Finde alle Zlib-Block-Starts (erweiterte Signatur-Erkennung)
    const zlibSignatures = [
      [0x78, 0x9C], // Standard deflate
      [0x78, 0xDA], // Best compression
      [0x78, 0x01], // No compression
      [0x78, 0x5E], // Fast compression
      [0x78, 0x2C]  // Alternative
    ];
    
    for (let i = 0; i < data.length - 1; i++) {
      for (const signature of zlibSignatures) {
        if (data[i] === signature[0] && data[i + 1] === signature[1]) {
          try {
            // Bestimme Block-Ende dynamisch
            let blockEnd = this.findZlibBlockEnd(data, i);
            if (blockEnd === -1) {
              blockEnd = Math.min(i + 50000, data.length); // Fallback
            }
            
            const blockData = data.slice(i, blockEnd);
            const decompressed = pako.inflate(blockData);
            
            if (decompressed.length > 100) {
              zlibBlocks.push(decompressed);
              totalDecompressedSize += decompressed.length;
              console.log(`[RemasteredDecompressor] Found valid zlib block at ${i}: ${decompressed.length} bytes`);
              
              // Springe zum Ende des aktuellen Blocks
              i = blockEnd - 1;
              break;
            }
          } catch (error) {
            // Continue searching
          }
        }
      }
    }
    
    if (zlibBlocks.length === 0) {
      return null;
    }
    
    // Kombiniere alle Blöcke
    const combined = new Uint8Array(totalDecompressedSize);
    let offset = 0;
    
    for (const block of zlibBlocks) {
      combined.set(block, offset);
      offset += block.length;
    }
    
    console.log(`[RemasteredDecompressor] Combined ${zlibBlocks.length} blocks: ${combined.length} bytes`);
    return combined.buffer;
  }

  /**
   * Methode 2: Progressive Decompression mit verschiedenen Offsets
   */
  private static decompressWithProgressive(data: Uint8Array): ArrayBuffer | null {
    // Teste verschiedene Start-Offsets für Remastered Header-Variationen
    const testOffsets = [0, 32, 64, 128, 256, 512];
    
    for (const offset of testOffsets) {
      if (offset >= data.length) continue;
      
      try {
        const slicedData = data.slice(offset);
        
        // Suche nach dem ersten Zlib-Header im Slice
        for (let i = 0; i < Math.min(1000, slicedData.length - 1); i++) {
          if (slicedData[i] === 0x78 && [0x9C, 0xDA, 0x01].includes(slicedData[i + 1])) {
            const zlibData = slicedData.slice(i);
            const decompressed = pako.inflate(zlibData);
            
            if (decompressed.length > 1000) {
              console.log(`[RemasteredDecompressor] Progressive success at offset ${offset + i}`);
              return decompressed.buffer;
            }
          }
        }
      } catch (error) {
        // Try next offset
      }
    }
    
    return null;
  }

  /**
   * Methode 3: Überspringe bekannte Remastered Header-Strukturen
   */
  private static decompressWithSkipHeaders(data: Uint8Array): ArrayBuffer | null {
    // Remastered-spezifische Header-Patterns erkennen und überspringen
    const headerPatterns = [
      'LIST', 'RIFF', 'WAVE', 'FMT ', 'DATA'
    ];
    
    for (let skipBytes = 0; skipBytes < Math.min(2000, data.length); skipBytes += 16) {
      try {
        const testData = data.slice(skipBytes);
        
        // Prüfe auf Header-Pattern am aktuellen Offset
        let foundPattern = false;
        for (const pattern of headerPatterns) {
          const patternBytes = new TextEncoder().encode(pattern);
          if (testData.length >= patternBytes.length) {
            let matches = true;
            for (let i = 0; i < patternBytes.length; i++) {
              if (testData[i] !== patternBytes[i]) {
                matches = false;
                break;
              }
            }
            if (matches) {
              foundPattern = true;
              break;
            }
          }
        }
        
        if (!foundPattern && testData[0] === 0x78 && [0x9C, 0xDA, 0x01].includes(testData[1])) {
          const decompressed = pako.inflate(testData);
          
          if (decompressed.length > 1000) {
            console.log(`[RemasteredDecompressor] Header skip success at ${skipBytes}`);
            return decompressed.buffer;
          }
        }
      } catch (error) {
        // Continue to next skip position
      }
    }
    
    return null;
  }

  /**
   * Methode 4: Standard Zlib als Fallback
   */
  private static decompressRawZlib(data: Uint8Array): ArrayBuffer | null {
    try {
      const decompressed = pako.inflate(data);
      console.log(`[RemasteredDecompressor] Raw zlib success: ${decompressed.length} bytes`);
      return decompressed.buffer;
    } catch (error) {
      return null;
    }
  }

  /**
   * Finde das Ende eines Zlib-Blocks
   */
  private static findZlibBlockEnd(data: Uint8Array, start: number): number {
    // Suche nach dem nächsten Zlib-Header oder Ende der Daten
    for (let i = start + 10; i < Math.min(start + 100000, data.length - 1); i++) {
      if (data[i] === 0x78 && [0x9C, 0xDA, 0x01].includes(data[i + 1])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Validiere dekomprimierte Daten auf StarCraft-spezifische Strukturen
   */
  private static validateDecompressedData(data: Uint8Array): {
    hasReplayMagic: boolean;
    hasStarcraftStrings: boolean;
    hasCommandStructure: boolean;
    quality: 'excellent' | 'good' | 'poor' | 'invalid';
  } {
    const textContent = new TextDecoder('latin1', { fatal: false }).decode(data.slice(0, Math.min(2000, data.length)));
    
    // Prüfe auf "Repl" Magic
    const hasReplayMagic = textContent.includes('Repl') || data[0] === 0x52 && data[1] === 0x65 && data[2] === 0x70 && data[3] === 0x6C;
    
    // Prüfe auf StarCraft-spezifische Strings
    const starcraftPatterns = [
      'StarCraft', 'Brood War', 'scenario.chk', '.scm', '.scx',
      'Protoss', 'Terran', 'Zerg', 'Maps\\', 'replay'
    ];
    
    let patternCount = 0;
    for (const pattern of starcraftPatterns) {
      if (textContent.toLowerCase().includes(pattern.toLowerCase())) {
        patternCount++;
      }
    }
    const hasStarcraftStrings = patternCount >= 2;
    
    // Prüfe auf Command-ähnliche Strukturen (Byte-Patterns die wie Commands aussehen)
    let commandLikePatterns = 0;
    for (let i = 0; i < Math.min(1000, data.length - 2); i++) {
      const byte = data[i];
      // Prüfe auf bekannte Command-IDs
      if ([0x0C, 0x1D, 0x14, 0x15, 0x09, 0x0A, 0x0B].includes(byte)) {
        commandLikePatterns++;
      }
    }
    const hasCommandStructure = commandLikePatterns >= 5;
    
    // Bestimme Qualität
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
