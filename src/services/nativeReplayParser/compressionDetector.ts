
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
    
    // Read first 32 bytes to get a better analysis
    const magicBytes = reader.readBytes(Math.min(32, buffer.byteLength));
    const magicString = new TextDecoder('latin1').decode(magicBytes.slice(0, 4));
    
    console.log('[CompressionDetector] Full magic analysis (first 32 bytes):');
    console.log('[CompressionDetector] Hex:', Array.from(magicBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
    console.log('[CompressionDetector] ASCII interpretation:', Array.from(magicBytes).map(b => 
      b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'
    ).join(''));
    console.log('[CompressionDetector] Magic string (first 4 bytes):', magicString);
    
    // Check for Brood War Remastered zlib compression pattern
    // Pattern: C2 19 C2 93 indicates zlib-compressed Remastered replay
    if (magicBytes[0] === 0xC2 && magicBytes[1] === 0x19 && 
        magicBytes[2] === 0xC2 && magicBytes[3] === 0x93) {
      console.log('[CompressionDetector] Detected Brood War Remastered zlib compression');
      console.log('[CompressionDetector] Header structure analysis:');
      console.log('[CompressionDetector] Bytes 0-3 (magic):', Array.from(magicBytes.slice(0, 4)).map(b => `0x${b.toString(16)}`).join(' '));
      console.log('[CompressionDetector] Bytes 4-7 (version?):', Array.from(magicBytes.slice(4, 8)).map(b => `0x${b.toString(16)}`).join(' '));
      console.log('[CompressionDetector] Bytes 8-11 (length?):', Array.from(magicBytes.slice(8, 12)).map(b => `0x${b.toString(16)}`).join(' '));
      console.log('[CompressionDetector] Bytes 12-15 (data start?):', Array.from(magicBytes.slice(12, 16)).map(b => `0x${b.toString(16)}`).join(' '));
      
      return {
        type: 'remastered_zlib',
        magicBytes: 'C2 19 C2 93',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for uncompressed StarCraft replay
    if (magicString === 'Repl') {
      console.log('[CompressionDetector] Detected uncompressed StarCraft replay');
      return {
        type: 'uncompressed',
        magicBytes: magicString,
        needsDecompression: false,
        headerOffset: 0
      };
    }
    
    // Check for standard zlib compression (starts with 0x78)
    if (magicBytes[0] === 0x78) {
      console.log('[CompressionDetector] Detected standard zlib compression');
      return {
        type: 'zlib',
        magicBytes: '78',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for PKWare/ZIP compression
    if (magicBytes[0] === 0x50 && magicBytes[1] === 0x4B) {
      console.log('[CompressionDetector] Detected PKWare/ZIP compression');
      return {
        type: 'pkware',
        magicBytes: 'PK',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for bzip2 compression
    if (magicBytes[0] === 0x42 && magicBytes[1] === 0x5A && magicBytes[2] === 0x68) {
      console.log('[CompressionDetector] Detected bzip2 compression');
      return {
        type: 'bzip2',
        magicBytes: 'BZh',
        needsDecompression: true,
        headerOffset: 0
      };
    }
    
    // Check for alternative SC:BW formats by scanning for "Repl"
    if (this.scanForReplayHeader(buffer)) {
      console.log('[CompressionDetector] Found "Repl" signature in file');
      return {
        type: 'uncompressed',
        magicBytes: 'Repl',
        needsDecompression: false,
        headerOffset: this.findReplayHeaderOffset(buffer)
      };
    }
    
    console.log('[CompressionDetector] Unknown format detected');
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
