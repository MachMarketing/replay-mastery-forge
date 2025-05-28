/**
 * Compression and format detection for StarCraft replay files
 * Enhanced with better Remastered detection
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
    
    // Read first 64 bytes for comprehensive analysis
    const magicBytes = reader.readBytes(Math.min(64, buffer.byteLength));
    const magicString = new TextDecoder('latin1').decode(magicBytes.slice(0, 4));
    
    console.log('[CompressionDetector] Comprehensive file analysis:');
    console.log('[CompressionDetector] File size:', buffer.byteLength, 'bytes');
    console.log('[CompressionDetector] First 64 bytes hex:');
    
    // Log in 16-byte chunks for readability
    for (let i = 0; i < Math.min(64, magicBytes.length); i += 16) {
      const chunk = Array.from(magicBytes.slice(i, i + 16));
      const hex = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = chunk.map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
      console.log(`[CompressionDetector] ${i.toString(16).padStart(2, '0')}: ${hex} | ${ascii}`);
    }
    
    console.log('[CompressionDetector] Magic string (first 4 bytes):', magicString);
    
    // Check for Brood War Remastered compression patterns
    if (magicBytes[0] === 0xC2 && magicBytes[1] === 0x19 && 
        magicBytes[2] === 0xC2 && magicBytes[3] === 0x93) {
      console.log('[CompressionDetector] Detected Brood War Remastered format with header signature');
      
      // Look for zlib data in the file
      const hasZlibData = this.findZlibData(magicBytes);
      if (hasZlibData >= 0) {
        console.log(`[CompressionDetector] Found zlib data at offset ${hasZlibData} in header`);
      }
      
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
    
    // Look for zlib data anywhere in the first 64 bytes
    const zlibOffset = this.findZlibData(magicBytes);
    if (zlibOffset >= 0) {
      console.log(`[CompressionDetector] Found zlib signature at offset ${zlibOffset}`);
      return {
        type: 'remastered_zlib',
        magicBytes: `zlib@${zlibOffset}`,
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
    
    console.log('[CompressionDetector] Unknown format detected - might be compressed');
    return {
      type: 'remastered_zlib', // Assume it's a Remastered file that needs decompression
      magicBytes: magicString,
      needsDecompression: true,
      headerOffset: 0
    };
  }
  
  /**
   * Find zlib compression signature in data
   */
  private static findZlibData(data: Uint8Array): number {
    // Look for zlib magic bytes: 0x78 followed by various compression levels
    const zlibHeaders = [0x9c, 0xda, 0x01, 0x5e, 0x2c];
    
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i] === 0x78 && zlibHeaders.includes(data[i + 1])) {
        return i;
      }
    }
    return -1;
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
