
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
    console.log('[ReplayDecompressor] Full buffer hex dump (first 32 bytes):');
    const fullView = new Uint8Array(buffer);
    console.log(Array.from(fullView.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // The format appears to be:
    // C2 19 C2 93 - Magic header (4 bytes)
    // 01 00 00 00 - Version or flags (4 bytes) 
    // 04 00 00 00 - Length or type (4 bytes)
    // Then the actual compressed data starts
    
    // Try different starting positions based on the structure analysis
    const startPositions = [8, 12, 16, 20];
    
    for (const startPos of startPositions) {
      try {
        console.log(`[ReplayDecompressor] Trying decompression from offset ${startPos}`);
        const compressedData = new Uint8Array(buffer, startPos);
        console.log(`[ReplayDecompressor] Compressed data size: ${compressedData.length}`);
        console.log(`[ReplayDecompressor] First 16 bytes of compressed data:`, 
          Array.from(compressedData.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        // Try both inflate and inflateRaw
        const decompressed = pako.inflate(compressedData);
        console.log('[ReplayDecompressor] Decompression successful! Size:', decompressed.length);
        
        // Check if we got valid replay data
        const headerCheck = new TextDecoder('latin1').decode(decompressed.slice(0, 4));
        console.log('[ReplayDecompressor] Decompressed header:', headerCheck);
        
        if (headerCheck === 'Repl' || this.looksLikeReplayData(decompressed)) {
          console.log('[ReplayDecompressor] Valid replay data detected!');
          return decompressed.buffer;
        }
        
      } catch (error) {
        console.log(`[ReplayDecompressor] Offset ${startPos} failed:`, error);
        
        // Try inflateRaw if inflate failed
        try {
          const compressedData = new Uint8Array(buffer, startPos);
          const decompressed = pako.inflateRaw(compressedData);
          console.log('[ReplayDecompressor] InflateRaw successful! Size:', decompressed.length);
          
          const headerCheck = new TextDecoder('latin1').decode(decompressed.slice(0, 4));
          console.log('[ReplayDecompressor] InflateRaw header:', headerCheck);
          
          if (headerCheck === 'Repl' || this.looksLikeReplayData(decompressed)) {
            console.log('[ReplayDecompressor] Valid replay data detected with inflateRaw!');
            return decompressed.buffer;
          }
        } catch (rawError) {
          console.log(`[ReplayDecompressor] InflateRaw at offset ${startPos} also failed:`, rawError);
        }
      }
    }
    
    throw new Error('Could not decompress Remastered zlib data from any offset');
  }
  
  /**
   * Check if decompressed data looks like valid replay data
   */
  private static looksLikeReplayData(data: Uint8Array): boolean {
    if (data.length < 100) return false;
    
    // Look for common replay patterns
    const dataString = new TextDecoder('latin1', { fatal: false }).decode(data.slice(0, 200));
    
    // Check for common StarCraft strings
    const patterns = [
      'StarCraft', 'Brood War', 'Maps\\', 'scenario.chk', 
      'Protoss', 'Terran', 'Zerg', 'Player'
    ];
    
    return patterns.some(pattern => dataString.includes(pattern));
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
