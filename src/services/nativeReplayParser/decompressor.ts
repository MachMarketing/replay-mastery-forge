
/**
 * Decompression utilities for StarCraft replay files
 */

import { ReplayFormat } from './compressionDetector';

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
        case 'pkware':
          return await this.decompressPKWare(buffer);
        case 'zlib':
          return await this.decompressZlib(buffer);
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
   * Decompress zlib compressed data
   */
  private static async decompressZlib(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      if ('DecompressionStream' in window) {
        const stream = new DecompressionStream('deflate');
        const response = new Response(buffer);
        const decompressed = await response.body?.pipeThrough(stream);
        if (decompressed) {
          return await new Response(decompressed).arrayBuffer();
        }
      }
      throw new Error('DecompressionStream not available');
    } catch (error) {
      console.error('[ReplayDecompressor] Zlib decompression failed:', error);
      throw error;
    }
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
