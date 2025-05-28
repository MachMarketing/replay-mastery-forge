
/**
 * Compression and format detection for StarCraft replay files
 */

import { BinaryReader } from './binaryReader';

export interface ReplayFormat {
  type: 'uncompressed' | 'pkware' | 'zlib' | 'bzip2' | 'unknown';
  magicBytes: string;
  needsDecompression: boolean;
  headerOffset: number;
}

export class CompressionDetector {
  /**
   * Detect the format and compression of a replay file
   */
  static detectFormat(buffer: ArrayBuffer): ReplayFormat {
    const reader = new BinaryReader(buffer);
    
    // Read first 16 bytes to check magic signatures
    const magicBytes = reader.readBytes(Math.min(16, buffer.byteLength));
    const magicString = new TextDecoder('latin1').decode(magicBytes.slice(0, 4));
    
    console.log('[CompressionDetector] Magic bytes:', Array.from(magicBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    console.log('[CompressionDetector] Magic string:', magicString);
    
    // Check for uncompressed StarCraft replay
    if (magicString === 'Repl') {
      return {
        type: 'uncompressed',
        magicBytes: magicString,
        needsDecompression: false,
        headerOffset: 0
      };
    }
    
    // Check for PKWare/ZIP compression (common in SC:BW)
    if (magicBytes[0] === 0x50 && magicBytes[1] === 0x4B) { // "PK"
      return {
        type: 'pkware',
        magicBytes: 'PK',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for zlib compression
    if (magicBytes[0] === 0x78) { // zlib magic
      return {
        type: 'zlib',
        magicBytes: '78',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for bzip2 compression
    if (magicBytes[0] === 0x42 && magicBytes[1] === 0x5A && magicBytes[2] === 0x68) { // "BZh"
      return {
        type: 'bzip2',
        magicBytes: 'BZh',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for alternative SC:BW formats
    // Some replays might have a different header structure
    if (this.scanForReplayHeader(buffer)) {
      return {
        type: 'uncompressed',
        magicBytes: 'Repl',
        needsDecompression: false,
        headerOffset: this.findReplayHeaderOffset(buffer)
      };
    }
    
    return {
      type: 'unknown',
      magicBytes: magicString,
      needsDecompression: false,
      headerOffset: 0
    };
  }
  
  /**
   * Scan buffer for "Repl" signature that might be offset
   */
  private static scanForReplayHeader(buffer: ArrayBuffer): boolean {
    const reader = new BinaryReader(buffer);
    const searchLength = Math.min(1024, buffer.byteLength); // Search first 1KB
    
    for (let i = 0; i < searchLength - 4; i++) {
      reader.setPosition(i);
      const chunk = reader.readFixedString(4);
      if (chunk === 'Repl') {
        console.log('[CompressionDetector] Found "Repl" at offset:', i);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Find the offset where the replay header starts
   */
  private static findReplayHeaderOffset(buffer: ArrayBuffer): number {
    const reader = new BinaryReader(buffer);
    const searchLength = Math.min(1024, buffer.byteLength);
    
    for (let i = 0; i < searchLength - 4; i++) {
      reader.setPosition(i);
      const chunk = reader.readFixedString(4);
      if (chunk === 'Repl') {
        return i;
      }
    }
    return 0;
  }
}
