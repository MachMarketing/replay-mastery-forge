/**
 * Decompression utilities for StarCraft replay files
 * Enhanced with better Remastered format handling
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
   * Decompress Brood War Remastered zlib format with improved detection
   */
  private static decompressRemasteredZlib(buffer: ArrayBuffer): ArrayBuffer {
    console.log('[ReplayDecompressor] Processing Remastered zlib format with improved detection');
    const fullView = new Uint8Array(buffer);
    
    // Log the complete header structure for analysis
    console.log('[ReplayDecompressor] Complete header analysis:');
    for (let i = 0; i < Math.min(64, fullView.length); i += 16) {
      const chunk = Array.from(fullView.slice(i, i + 16));
      const hex = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = chunk.map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
      console.log(`[ReplayDecompressor] ${i.toString(16).padStart(4, '0')}: ${hex} | ${ascii}`);
    }
    
    // Look for zlib magic bytes (0x78) throughout the file
    const zlibPositions = [];
    for (let i = 0; i < fullView.length - 1; i++) {
      if (fullView[i] === 0x78 && (fullView[i + 1] === 0x9c || fullView[i + 1] === 0xda || fullView[i + 1] === 0x01)) {
        zlibPositions.push(i);
        console.log(`[ReplayDecompressor] Found zlib header at offset ${i}: 0x${fullView[i].toString(16)} 0x${fullView[i + 1].toString(16)}`);
      }
    }
    
    // Try decompression from each found zlib position
    for (const pos of zlibPositions) {
      try {
        console.log(`[ReplayDecompressor] Attempting decompression from zlib position ${pos}`);
        const compressedData = fullView.slice(pos);
        const decompressed = pako.inflate(compressedData);
        
        console.log(`[ReplayDecompressor] Successfully decompressed from position ${pos}, size: ${decompressed.length}`);
        
        // Validate the decompressed data
        if (this.validateDecompressedReplay(decompressed)) {
          console.log('[ReplayDecompressor] Decompressed data validation passed!');
          return decompressed.buffer;
        }
        
      } catch (error) {
        console.log(`[ReplayDecompressor] Decompression failed at position ${pos}:`, error);
      }
    }
    
    // If no zlib headers found, try other approaches
    if (zlibPositions.length === 0) {
      console.log('[ReplayDecompressor] No standard zlib headers found, trying alternative approaches');
      
      // Try to find and decompress potential compressed sections
      const potentialOffsets = [12, 16, 20, 24, 28, 32, 36, 40, 44, 48];
      
      for (const offset of potentialOffsets) {
        if (offset >= fullView.length) continue;
        
        try {
          console.log(`[ReplayDecompressor] Trying alternative decompression from offset ${offset}`);
          const compressedData = fullView.slice(offset);
          
          // Try different decompression methods
          const methods = [
            () => pako.inflate(compressedData),
            () => pako.inflateRaw(compressedData),
            () => pako.inflate(compressedData, { windowBits: -15 }),
            () => pako.inflate(compressedData, { windowBits: 15 })
          ];
          
          for (let i = 0; i < methods.length; i++) {
            try {
              const decompressed = methods[i]();
              console.log(`[ReplayDecompressor] Method ${i} successful from offset ${offset}, size: ${decompressed.length}`);
              
              if (this.validateDecompressedReplay(decompressed)) {
                console.log('[ReplayDecompressor] Alternative decompression validation passed!');
                return decompressed.buffer;
              }
            } catch (methodError) {
              // Continue to next method
            }
          }
          
        } catch (error) {
          // Continue to next offset
        }
      }
    }
    
    // Last resort: try to extract uncompressed sections
    console.log('[ReplayDecompressor] All decompression attempts failed, trying to extract raw data');
    return this.extractRawReplayData(buffer);
  }
  
  /**
   * Validate if decompressed data looks like a valid StarCraft replay
   */
  private static validateDecompressedReplay(data: Uint8Array): boolean {
    if (data.length < 1000) {
      console.log('[ReplayDecompressor] Data too small:', data.length);
      return false;
    }
    
    // Check for "Repl" magic at the start
    const startString = new TextDecoder('latin1', { fatal: false }).decode(data.slice(0, 4));
    if (startString === 'Repl') {
      console.log('[ReplayDecompressor] Found "Repl" magic at start!');
      return true;
    }
    
    // Look for "Repl" anywhere in the first 1000 bytes
    for (let i = 0; i < Math.min(1000, data.length - 4); i++) {
      const testString = new TextDecoder('latin1', { fatal: false }).decode(data.slice(i, i + 4));
      if (testString === 'Repl') {
        console.log(`[ReplayDecompressor] Found "Repl" magic at offset ${i}!`);
        return true;
      }
    }
    
    // Check for common StarCraft strings in the first 2000 bytes
    const textContent = new TextDecoder('latin1', { fatal: false }).decode(data.slice(0, Math.min(2000, data.length)));
    const requiredPatterns = ['StarCraft', 'Brood War', 'scenario.chk'];
    const optionalPatterns = ['Maps\\', 'Player', 'Protoss', 'Terran', 'Zerg'];
    
    let requiredMatches = 0;
    let optionalMatches = 0;
    
    for (const pattern of requiredPatterns) {
      if (textContent.includes(pattern)) {
        requiredMatches++;
        console.log(`[ReplayDecompressor] Found required pattern: ${pattern}`);
      }
    }
    
    for (const pattern of optionalPatterns) {
      if (textContent.includes(pattern)) {
        optionalMatches++;
        console.log(`[ReplayDecompressor] Found optional pattern: ${pattern}`);
      }
    }
    
    const isValid = requiredMatches >= 1 || optionalMatches >= 2;
    console.log(`[ReplayDecompressor] Validation result: ${isValid} (required: ${requiredMatches}, optional: ${optionalMatches})`);
    
    return isValid;
  }
  
  /**
   * Extract raw replay data as fallback
   */
  private static extractRawReplayData(buffer: ArrayBuffer): ArrayBuffer {
    console.log('[ReplayDecompressor] Extracting raw replay data as fallback');
    
    // Return the buffer as-is but skip the initial header
    const view = new Uint8Array(buffer);
    
    // Try to find any recognizable replay patterns and return from there
    for (let i = 0; i < Math.min(1000, view.length - 4); i++) {
      const chunk = new TextDecoder('latin1', { fatal: false }).decode(view.slice(i, i + 4));
      if (chunk === 'Repl' || chunk.includes('StarCraft')) {
        console.log(`[ReplayDecompressor] Found replay data at offset ${i}`);
        return buffer.slice(i);
      }
    }
    
    // If nothing found, return from a reasonable offset
    const fallbackOffset = Math.min(32, view.length / 4);
    console.log(`[ReplayDecompressor] Using fallback offset ${fallbackOffset}`);
    return buffer.slice(fallbackOffset);
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
