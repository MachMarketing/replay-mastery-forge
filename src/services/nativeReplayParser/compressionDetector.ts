
/**
 * Compression and format detection for StarCraft replay files
 * Enhanced to detect zlib-compressed Remastered replays
 */

import { BinaryReader } from './binaryReader';

export interface ReplayFormat {
  type: 'uncompressed' | 'pkware' | 'zlib' | 'bzip2' | 'remastered_zlib' | 'unknown';
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
    
    // Check for Brood War Remastered zlib compression pattern
    // Pattern: C2 19 C2 93 indicates zlib-compressed Remastered replay
    if (magicBytes[0] === 0xC2 && magicBytes[1] === 0x19 && 
        magicBytes[2] === 0xC2 && magicBytes[3] === 0x93) {
      console.log('[CompressionDetector] Detected Brood War Remastered zlib compression');
      return {
        type: 'remastered_zlib',
        magicBytes: 'C2 19 C2 93',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for uncompressed StarCraft replay
    if (magicString === 'Repl') {
      return {
        type: 'uncompressed',
        magicBytes: magicString,
        needsDecompression: false,
        headerOffset: 0
      };
    }
    
    // Check for standard zlib compression (starts with 0x78)
    if (magicBytes[0] === 0x78) {
      return {
        type: 'zlib',
        magicBytes: '78',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for PKWare/ZIP compression
    if (magicBytes[0] === 0x50 && magicBytes[1] === 0x4B) {
      return {
        type: 'pkware',
        magicBytes: 'PK',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for bzip2 compression
    if (magicBytes[0] === 0x42 && magicBytes[1] === 0x5A && magicBytes[2] === 0x68) {
      return {
        type: 'bzip2',
        magicBytes: 'BZh',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for alternative SC:BW formats by scanning for "Repl"
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
