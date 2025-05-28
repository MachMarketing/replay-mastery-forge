/**
 * Enhanced Decompression utilities with SmartZlibExtractor integration
 */

import { ReplayFormat } from './compressionDetector';
import { RemasteredDecompressor, DecompressionResult } from './bwapi/remasteredDecompressor';
import * as pako from 'pako';

export class ReplayDecompressor {
  /**
   * Decompress a replay file with enhanced Remastered support
   */
  static async decompress(buffer: ArrayBuffer, format: ReplayFormat): Promise<ArrayBuffer> {
    if (!format.needsDecompression) {
      return buffer;
    }
    
    console.log(`[ReplayDecompressor] Attempting to decompress ${format.type} format`);
    
    try {
      switch (format.type) {
        case 'remastered_zlib':
          return await this.decompressRemasteredWithSmartExtractor(buffer);
        case 'zlib':
          return this.decompressZlib(buffer);
        case 'pkware':
          return await this.decompressPKWare(buffer);
        case 'bzip2':
          return await this.decompressBzip2(buffer);
        default:
          throw new Error(`Unsupported compression type: ${format.type}`);
      }
    } catch (error) {
      console.error('[ReplayDecompressor] Decompression failed:', error);
      throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Enhanced Remastered decompression using SmartZlibExtractor
   */
  private static async decompressRemasteredWithSmartExtractor(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    console.log('[ReplayDecompressor] Using enhanced SmartZlibExtractor for Remastered decompression');
    
    const result: DecompressionResult = await RemasteredDecompressor.decompress(buffer);
    
    if (result.success && result.data) {
      console.log(`[ReplayDecompressor] SmartZlibExtractor decompression successful:`, {
        method: result.method,
        blocks: result.blocks,
        originalSize: result.originalSize,
        decompressedSize: result.decompressedSize,
        quality: result.validation.quality,
        totalCommands: result.extractionResult?.totalCommands || 0
      });
      
      return result.data;
    }
    
    // If SmartZlibExtractor fails, throw error (no more fallbacks needed)
    throw new Error(`SmartZlibExtractor failed: No valid command stream found`);
  }
  
  /**
   * Decompress standard zlib compressed data
   */
  private static decompressZlib(buffer: ArrayBuffer): ArrayBuffer {
    try {
      const uint8Array = new Uint8Array(buffer);
      const decompressed = pako.inflate(uint8Array);
      console.log('[ReplayDecompressor] Standard zlib decompression successful, size:', decompressed.length);
      return decompressed.buffer;
    } catch (error) {
      console.error('[ReplayDecompressor] Standard zlib decompression failed:', error);
      throw error;
    }
  }
  
  /**
   * Decompress PKWare/ZIP compressed data
   */
  private static async decompressPKWare(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      // Try using the browser's built-in DecompressionStream if available
      if ('DecompressionStream' in window) {
        const stream = new DecompressionStream('deflate');
        const response = new Response(buffer);
        const decompressed = await response.body?.pipeThrough(stream);
        if (decompressed) {
          return await new Response(decompressed).arrayBuffer();
        }
      }
      
      // Fallback: Try to extract from ZIP structure
      return this.extractFromZip(buffer);
    } catch (error) {
      console.error('[ReplayDecompressor] PKWare decompression failed:', error);
      throw error;
    }
  }
  
  /**
   * Extract replay data from ZIP structure
   */
  private static extractFromZip(buffer: ArrayBuffer): ArrayBuffer {
    const view = new DataView(buffer);
    const signature = view.getUint32(0, true);
    
    if (signature === 0x04034b50) { // ZIP local file header
      // Skip ZIP header and extract the file content
      let offset = 30; // Basic ZIP header size
      
      // Read filename length and extra field length
      const filenameLength = view.getUint16(26, true);
      const extraFieldLength = view.getUint16(28, true);
      
      offset += filenameLength + extraFieldLength;
      
      // Return the data from offset
      return buffer.slice(offset);
    }
    
    throw new Error('Invalid ZIP structure');
  }
  
  /**
   * Decompress bzip2 compressed data
   */
  private static async decompressBzip2(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // bzip2 decompression would require a specialized library
    throw new Error('bzip2 decompression not yet implemented');
  }
  
  /**
   * Apply offset if the replay header is not at the beginning
   */
  static applyHeaderOffset(buffer: ArrayBuffer, offset: number): ArrayBuffer {
    if (offset === 0) {
      return buffer;
    }
    return buffer.slice(offset);
  }
}
