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
   * Decompress Brood War Remastered zlib format with proper block handling
   */
  private static decompressRemasteredZlib(buffer: ArrayBuffer): ArrayBuffer {
    console.log('[ReplayDecompressor] Processing Remastered zlib format with block handling');
    const fullView = new Uint8Array(buffer);
    
    // Remastered replays often have a specific structure:
    // Header (32+ bytes) + multiple compressed blocks
    
    // Try to extract the main replay data from the first large zlib block
    const zlibOffset = this.findMainZlibBlock(fullView);
    
    if (zlibOffset >= 0) {
      console.log(`[ReplayDecompressor] Found main zlib block at offset ${zlibOffset}`);
      
      try {
        const compressedData = fullView.slice(zlibOffset);
        
        // Try different decompression methods for Remastered format
        const methods = [
          () => pako.inflate(compressedData),
          () => pako.inflateRaw(compressedData),
          () => {
            // Skip potential header in compressed data
            const dataStart = this.findZlibStart(compressedData);
            return pako.inflate(compressedData.slice(dataStart));
          }
        ];
        
        for (let i = 0; i < methods.length; i++) {
          try {
            const decompressed = methods[i]();
            console.log(`[ReplayDecompressor] Method ${i} successful, size: ${decompressed.length}`);
            
            if (this.validateDecompressedReplay(decompressed)) {
              console.log('[ReplayDecompressor] Decompressed data validation passed!');
              return decompressed.buffer;
            }
          } catch (methodError) {
            console.log(`[ReplayDecompressor] Method ${i} failed:`, methodError);
          }
        }
      } catch (error) {
        console.log(`[ReplayDecompressor] Main block decompression failed:`, error);
      }
    }
    
    // Fallback: try to concatenate all decompressed blocks
    return this.decompressMultipleBlocks(fullView);
  }
  
  /**
   * Find the main zlib block (usually the largest one)
   */
  private static findMainZlibBlock(data: Uint8Array): number {
    const zlibPositions = [];
    
    // Find all zlib positions
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i] === 0x78 && [0x9c, 0xda, 0x01, 0x5e, 0x2c].includes(data[i + 1])) {
        zlibPositions.push(i);
      }
    }
    
    console.log(`[ReplayDecompressor] Found ${zlibPositions.length} zlib blocks`);
    
    // Return the first significant block (usually after header)
    for (const pos of zlibPositions) {
      if (pos >= 32) { // Skip header blocks
        const remainingSize = data.length - pos;
        if (remainingSize > 1000) { // Ensure it's a substantial block
          return pos;
        }
      }
    }
    
    return zlibPositions.length > 0 ? zlibPositions[0] : -1;
  }
  
  /**
   * Find actual zlib start within data
   */
  private static findZlibStart(data: Uint8Array): number {
    for (let i = 0; i < Math.min(100, data.length - 1); i++) {
      if (data[i] === 0x78 && [0x9c, 0xda, 0x01].includes(data[i + 1])) {
        return i;
      }
    }
    return 0;
  }
  
  /**
   * Decompress multiple zlib blocks and concatenate
   */
  private static decompressMultipleBlocks(data: Uint8Array): ArrayBuffer {
    console.log('[ReplayDecompressor] Attempting multi-block decompression');
    
    const blocks: Uint8Array[] = [];
    let totalSize = 0;
    
    // Find and decompress all zlib blocks
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i] === 0x78 && [0x9c, 0xda, 0x01].includes(data[i + 1])) {
        try {
          // Try to find the end of this block
          let blockEnd = i + 100;
          for (let j = i + 10; j < Math.min(i + 10000, data.length); j++) {
            if (data[j] === 0x78 && [0x9c, 0xda, 0x01].includes(data[j + 1])) {
              blockEnd = j;
              break;
            }
          }
          
          const blockData = data.slice(i, blockEnd);
          const decompressed = pako.inflate(blockData);
          
          if (decompressed.length > 10) {
            blocks.push(decompressed);
            totalSize += decompressed.length;
            console.log(`[ReplayDecompressor] Block at ${i}: ${decompressed.length} bytes`);
          }
        } catch (error) {
          // Continue to next block
        }
      }
    }
    
    if (blocks.length > 0) {
      // Concatenate all blocks
      const result = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const block of blocks) {
        result.set(block, offset);
        offset += block.length;
      }
      
      console.log(`[ReplayDecompressor] Concatenated ${blocks.length} blocks: ${result.length} bytes`);
      return result.buffer;
    }
    
    // Final fallback
    throw new Error('Could not decompress any zlib blocks');
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
    
    // Look for "Repl" anywhere in the first 100 bytes
    for (let i = 0; i < Math.min(100, data.length - 4); i++) {
      const testString = new TextDecoder('latin1', { fatal: false }).decode(data.slice(i, i + 4));
      if (testString === 'Repl') {
        console.log(`[ReplayDecompressor] Found "Repl" magic at offset ${i}!`);
        return true;
      }
    }
    
    // Check for valid replay patterns in first 500 bytes
    const textContent = new TextDecoder('latin1', { fatal: false }).decode(data.slice(0, Math.min(500, data.length)));
    
    // Look for StarCraft-specific strings
    const patterns = [
      'StarCraft', 'Brood War', 'scenario.chk', '.scm', '.scx',
      'Protoss', 'Terran', 'Zerg', 'Maps\\'
    ];
    
    let patternCount = 0;
    for (const pattern of patterns) {
      if (textContent.includes(pattern)) {
        patternCount++;
        console.log(`[ReplayDecompressor] Found pattern: ${pattern}`);
      }
    }
    
    const isValid = patternCount >= 2;
    console.log(`[ReplayDecompressor] Validation result: ${isValid} (${patternCount} patterns found)`);
    
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
