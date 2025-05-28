
/**
 * Enhanced replay decompressor with seRS format support
 */

import * as pako from 'pako';
import { CompressionFormat } from './compressionDetector';

export class ReplayDecompressor {
  /**
   * Decompress replay data based on detected format
   */
  static async decompress(buffer: ArrayBuffer, format: CompressionFormat): Promise<ArrayBuffer> {
    const data = new Uint8Array(buffer);
    
    console.log('[ReplayDecompressor] Decompressing format:', format.type);
    console.log('[ReplayDecompressor] Data offset:', format.dataOffset);
    
    try {
      switch (format.type) {
        case 'seRS':
          return await this.decompressSeRS(data, format);
        
        case 'zlib':
          return await this.decompressZlib(data, format);
        
        case 'pkware':
          return await this.decompressPKWare(data, format);
        
        default:
          console.log('[ReplayDecompressor] No decompression needed');
          return buffer;
      }
    } catch (error) {
      console.error('[ReplayDecompressor] Decompression failed:', error);
      throw new Error(`Decompression failed: ${error.message}`);
    }
  }

  /**
   * Decompress seRS format (StarCraft Remastered compressed replays)
   */
  private static async decompressSeRS(data: Uint8Array, format: CompressionFormat): Promise<ArrayBuffer> {
    console.log('[ReplayDecompressor] Decompressing seRS format...');
    
    // seRS format typically has:
    // - Header (32 bytes)
    // - Compressed data (zlib)
    
    const headerSize = 32;
    if (data.length < headerSize + 10) {
      throw new Error('seRS file too small');
    }
    
    // Extract compressed data (skip seRS header)
    const compressedData = data.slice(headerSize);
    
    console.log('[ReplayDecompressor] Compressed data size:', compressedData.length);
    console.log('[ReplayDecompressor] First 10 bytes of compressed data:', 
      Array.from(compressedData.slice(0, 10))
        .map(b => `0x${b.toString(16).padStart(2, '0')}`)
        .join(' '));
    
    try {
      // Try to decompress with pako (zlib)
      const decompressed = pako.inflate(compressedData);
      console.log('[ReplayDecompressor] seRS decompression successful, size:', decompressed.length);
      
      return decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength);
      
    } catch (error) {
      console.warn('[ReplayDecompressor] pako inflate failed, trying alternative method:', error);
      
      // Try with different zlib window sizes
      const alternatives = [
        () => pako.inflateRaw(compressedData),
        () => pako.inflate(compressedData, { windowBits: 15 }),
        () => pako.inflate(compressedData, { windowBits: -15 })
      ];
      
      for (const alt of alternatives) {
        try {
          const result = alt();
          console.log('[ReplayDecompressor] Alternative decompression successful, size:', result.length);
          return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
        } catch (e) {
          // Continue to next alternative
        }
      }
      
      throw new Error('All seRS decompression methods failed');
    }
  }

  /**
   * Decompress standard zlib format
   */
  private static async decompressZlib(data: Uint8Array, format: CompressionFormat): Promise<ArrayBuffer> {
    console.log('[ReplayDecompressor] Decompressing zlib format...');
    
    const compressedData = data.slice(format.dataOffset);
    
    try {
      const decompressed = pako.inflate(compressedData);
      console.log('[ReplayDecompressor] zlib decompression successful, size:', decompressed.length);
      
      return decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength);
      
    } catch (error) {
      console.error('[ReplayDecompressor] zlib decompression failed:', error);
      throw error;
    }
  }

  /**
   * Decompress PKWare format
   */
  private static async decompressPKWare(data: Uint8Array, format: CompressionFormat): Promise<ArrayBuffer> {
    console.log('[ReplayDecompressor] PKWare decompression not implemented, returning original data');
    
    // PKWare decompression would require additional libraries
    // For now, return original data and let parser handle it
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }

  /**
   * Validate decompressed data
   */
  static validateDecompressed(data: ArrayBuffer): boolean {
    const bytes = new Uint8Array(data);
    
    // Basic validation: check if data looks like replay content
    if (bytes.length < 1000) {
      console.warn('[ReplayDecompressor] Decompressed data too small');
      return false;
    }
    
    // Look for typical replay patterns
    const hasReplayPatterns = this.checkForReplayPatterns(bytes);
    console.log('[ReplayDecompressor] Decompressed data validation:', hasReplayPatterns ? 'PASS' : 'FAIL');
    
    return hasReplayPatterns;
  }

  /**
   * Check for typical StarCraft replay patterns in decompressed data
   */
  private static checkForReplayPatterns(data: Uint8Array): boolean {
    // Look for common replay patterns:
    // - Player names (readable ASCII strings)
    // - Action opcodes in reasonable frequency
    // - Frame markers (0x00 bytes)
    
    let readableChars = 0;
    let actionOpcodes = 0;
    let frameMarkers = 0;
    
    const sampleSize = Math.min(2000, data.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const byte = data[i];
      
      // Count readable ASCII characters
      if (byte >= 32 && byte <= 126) {
        readableChars++;
      }
      
      // Count frame markers
      if (byte === 0x00) {
        frameMarkers++;
      }
      
      // Count action opcodes
      if ([0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x13, 0x14, 0x15, 0x18, 0x1D, 0x1E].includes(byte)) {
        actionOpcodes++;
      }
    }
    
    const readableRatio = readableChars / sampleSize;
    const actionRatio = actionOpcodes / sampleSize;
    const frameRatio = frameMarkers / sampleSize;
    
    console.log('[ReplayDecompressor] Pattern analysis:', {
      readableRatio: readableRatio.toFixed(3),
      actionRatio: actionRatio.toFixed(3),
      frameRatio: frameRatio.toFixed(3)
    });
    
    // Validate ratios are within expected ranges for replay data
    return readableRatio > 0.05 && actionRatio > 0.01 && frameRatio > 0.02;
  }
}
