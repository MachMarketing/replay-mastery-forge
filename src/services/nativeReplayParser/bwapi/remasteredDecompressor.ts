
/**
 * Enhanced Remastered Decompressor with SmartZlibExtractor integration
 */

import { SmartZlibExtractor, ExtractionResult } from './smartZlibExtractor';

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
  extractionResult?: ExtractionResult;
}

export class RemasteredDecompressor {
  /**
   * Enhanced Remastered decompression using SmartZlibExtractor
   */
  static async decompress(buffer: ArrayBuffer): Promise<DecompressionResult> {
    console.log('[RemasteredDecompressor] Starting enhanced decompression with SmartZlibExtractor');
    
    const originalSize = buffer.byteLength;
    const uint8Array = new Uint8Array(buffer);
    
    try {
      // Use SmartZlibExtractor as primary method
      const extractionResult = SmartZlibExtractor.extractAndAssembleStream(uint8Array);
      
      if (extractionResult.success && extractionResult.combinedStream.length > 1000) {
        const validation = this.validateDecompressedData(extractionResult.combinedStream);
        
        console.log('[RemasteredDecompressor] SmartZlibExtractor success!');
        console.log(`  - Stream size: ${extractionResult.combinedStream.length}`);
        console.log(`  - Commands found: ${extractionResult.totalCommands}`);
        console.log(`  - Validation score: ${extractionResult.validationScore}`);
        console.log(`  - Quality: ${validation.quality}`);
        
        return {
          success: true,
          data: extractionResult.combinedStream.buffer,
          method: 'SmartZlibExtractor',
          blocks: extractionResult.blocks.length,
          originalSize,
          decompressedSize: extractionResult.combinedStream.length,
          validation,
          extractionResult
        };
      }
      
      console.warn('[RemasteredDecompressor] SmartZlibExtractor failed, trying fallback methods');
      
      // Fallback to legacy methods if SmartZlibExtractor fails
      return await this.legacyDecompress(uint8Array, originalSize);
      
    } catch (error) {
      console.error('[RemasteredDecompressor] SmartZlibExtractor error:', error);
      return await this.legacyDecompress(uint8Array, originalSize);
    }
  }

  /**
   * Legacy decompression methods as fallback
   */
  private static async legacyDecompress(uint8Array: Uint8Array, originalSize: number): Promise<DecompressionResult> {
    console.log('[RemasteredDecompressor] Using legacy decompression methods');
    
    // Try a simple zlib extraction as last resort
    try {
      const pako = await import('pako');
      
      // Look for the largest zlib block
      for (let i = 32; i < Math.min(uint8Array.length - 1000, 5000); i++) {
        if (uint8Array[i] === 0x78 && [0x9C, 0xDA, 0x01].includes(uint8Array[i + 1])) {
          try {
            const remainingData = uint8Array.slice(i);
            const decompressed = pako.inflate(remainingData);
            
            if (decompressed.length > 1000) {
              const validation = this.validateDecompressedData(decompressed);
              
              if (validation.quality !== 'invalid') {
                console.log('[RemasteredDecompressor] Legacy method found valid data');
                return {
                  success: true,
                  data: decompressed.buffer,
                  method: 'Legacy Zlib',
                  blocks: 1,
                  originalSize,
                  decompressedSize: decompressed.length,
                  validation
                };
              }
            }
          } catch (error) {
            // Continue searching
          }
        }
      }
    } catch (error) {
      console.error('[RemasteredDecompressor] Legacy decompression failed:', error);
    }
    
    // Complete failure
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
    const commandIds = [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x11, 0x13, 0x14, 0x15, 0x1D, 0x20];
    
    for (let i = 0; i < Math.min(5000, data.length - 2); i++) {
      const byte = data[i];
      if (commandIds.includes(byte)) {
        commandLikePatterns++;
      }
    }
    const hasCommandStructure = commandLikePatterns >= 50; // Increased threshold for better validation
    
    // Determine quality
    let quality: 'excellent' | 'good' | 'poor' | 'invalid';
    if (hasCommandStructure && commandLikePatterns > 200) {
      quality = 'excellent';
    } else if (hasCommandStructure && commandLikePatterns > 100) {
      quality = 'good';
    } else if (hasCommandStructure || hasStarcraftStrings || hasReplayMagic) {
      quality = 'poor';
    } else {
      quality = 'invalid';
    }
    
    console.log(`[RemasteredDecompressor] Validation: Commands=${commandLikePatterns}, SC=${hasStarcraftStrings}, Magic=${hasReplayMagic}, Quality=${quality}`);
    
    return {
      hasReplayMagic,
      hasStarcraftStrings,
      hasCommandStructure,
      quality
    };
  }

  /**
   * Enhanced compression detection
   */
  static isLikelyCompressed(data: Uint8Array): boolean {
    if (data.length < 2) return false;
    
    // Check for zlib signatures
    const zlibSignatures = [
      [0x78, 0x9C], [0x78, 0xDA], [0x78, 0x01], [0x78, 0x5E], [0x78, 0x2C]
    ];
    
    for (const signature of zlibSignatures) {
      if (data[0] === signature[0] && data[1] === signature[1]) {
        return true;
      }
    }
    
    return false;
  }
}
