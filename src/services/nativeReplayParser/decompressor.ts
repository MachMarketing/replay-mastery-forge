/**
 * Decompression utilities for StarCraft replay files
 * Enhanced with pako for zlib decompression
 */

import { ReplayFormat } from './compressionDetector';
import * as pako from 'pako';

export class ReplayDecompressor {
  /**
   * Decompress a replay file based on its detected format
   */
  static async decompress(buffer: ArrayBuffer, format: ReplayFormat): Promise<ArrayBuffer> {
    if (!format.needsDecompression) {
      return buffer;
    }
    
    console.log(`[ReplayDecompressor] Attempting to decompress ${format.type} format`);
    
    try {
      switch (format.type) {
        case 'remastered_zlib':
          return this.decompressRemasteredZlib(buffer);
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
   * Decompress Brood War Remastered zlib format
   */
  private static decompressRemasteredZlib(buffer: ArrayBuffer): ArrayBuffer {
    console.log('[ReplayDecompressor] Processing Remastered zlib format');
    
    // Skip the first 16 bytes which contain metadata/header
    const dataStart = 16;
    const uint8Array = new Uint8Array(buffer, dataStart);
    
    console.log('[ReplayDecompressor] Compressed data size:', uint8Array.length);
    console.log('[ReplayDecompressor] First few compressed bytes:', 
      Array.from(uint8Array.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    try {
      // Use pako to decompress the zlib data
      const decompressed = pako.inflate(uint8Array);
      console.log('[ReplayDecompressor] Decompressed size:', decompressed.length);
      console.log('[ReplayDecompressor] First few decompressed bytes:', 
        Array.from(decompressed.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      // Check if we now have a valid replay header
      const headerCheck = new TextDecoder('latin1').decode(decompressed.slice(0, 4));
      console.log('[ReplayDecompressor] Decompressed header:', headerCheck);
      
      return decompressed.buffer;
    } catch (error) {
      console.error('[ReplayDecompressor] Pako decompression failed:', error);
      
      // Try alternative decompression approach - maybe the data starts at different offset
      for (const offset of [0, 8, 12, 20, 24]) {
        try {
          console.log(`[ReplayDecompressor] Trying offset ${offset}`);
          const alternativeData = new Uint8Array(buffer, offset);
          const result = pako.inflate(alternativeData);
          console.log(`[ReplayDecompressor] Success with offset ${offset}, size:`, result.length);
          return result.buffer;
        } catch (e) {
          console.log(`[ReplayDecompressor] Offset ${offset} failed:`, e);
          continue;
        }
      }
      
      throw error;
    }
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
      // This is a simplified ZIP parser - real implementation would be more robust
      let offset = 30; // Basic ZIP header size
      
      // Read filename length and extra field length
      const filenameLength = view.getUint16(26, true);
      const extraFieldLength = view.getUint16(28, true);
      
      offset += filenameLength + extraFieldLength;
      
      // Try different decompression methods
      const compressedData = buffer.slice(offset);
      
      // For now, return the data as-is and let the header parser handle it
      return compressedData;
    }
    
    throw new Error('Invalid ZIP structure');
  }
  
  /**
   * Decompress bzip2 compressed data
   */
  private static async decompressBzip2(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // bzip2 decompression would require a specialized library
    // For now, we'll return an error
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
