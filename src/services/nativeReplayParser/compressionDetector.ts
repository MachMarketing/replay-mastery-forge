/**
 * Enhanced compression detector for StarCraft replay files
 * Handles various compression formats including PKWare and zlib
 */

export interface CompressionFormat {
  type: 'none' | 'pkware' | 'zlib' | 'seRS' | 'unknown';
  needsDecompression: boolean;
  headerOffset: number;
  dataOffset: number;
  confidence: number;
}

export class CompressionDetector {
  /**
   * Detect compression format with enhanced detection
   */
  static detectFormat(buffer: ArrayBuffer): CompressionFormat {
    const data = new Uint8Array(buffer);
    const view = new DataView(buffer);
    
    console.log('[CompressionDetector] Analyzing file format...');
    console.log('[CompressionDetector] File size:', data.length, 'bytes');
    
    // Check first 16 bytes
    const header = Array.from(data.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    console.log('[CompressionDetector] Header:', header);
    
    // Enhanced seRS detection (from console logs)
    if (this.detectSeRSFormat(data, view)) {
      return {
        type: 'seRS',
        needsDecompression: true,
        headerOffset: 0,
        dataOffset: 32, // Data typically starts after 32-byte header
        confidence: 0.95
      };
    }
    
    // PKWare detection
    if (this.detectPKWareFormat(data, view)) {
      return {
        type: 'pkware',
        needsDecompression: true,
        headerOffset: 0,
        dataOffset: this.findPKWareDataOffset(data),
        confidence: 0.9
      };
    }
    
    // zlib detection
    if (this.detectZlibFormat(data)) {
      return {
        type: 'zlib',
        needsDecompression: true,
        headerOffset: 0,
        dataOffset: this.findZlibDataOffset(data),
        confidence: 0.8
      };
    }
    
    // No compression detected
    console.log('[CompressionDetector] No compression detected');
    return {
      type: 'none',
      needsDecompression: false,
      headerOffset: 0,
      dataOffset: 0,
      confidence: 0.7
    };
  }

  /**
   * Enhanced seRS format detection based on console log patterns
   */
  private static detectSeRSFormat(data: Uint8Array, view: DataView): boolean {
    // From console logs, we see "seRS" in the header at offset 12-15
    if (data.length >= 16) {
      const headerStr = String.fromCharCode(...data.slice(12, 16));
      if (headerStr === 'seRS') {
        console.log('[CompressionDetector] seRS compression signature found at offset 12');
        return true;
      }
    }
    
    // Alternative seRS detection patterns
    for (let i = 0; i < Math.min(100, data.length - 4); i++) {
      const str = String.fromCharCode(...data.slice(i, i + 4));
      if (str === 'seRS') {
        console.log('[CompressionDetector] seRS signature found at offset', i);
        return true;
      }
    }
    
    // Check for zlib magic bytes after seRS header (0x78 0x9c from logs)
    if (data.length >= 34 && data[32] === 0x78 && data[33] === 0x9c) {
      console.log('[CompressionDetector] zlib data found after seRS header');
      return true;
    }
    
    return false;
  }

  /**
   * PKWare compression detection
   */
  private static detectPKWareFormat(data: Uint8Array, view: DataView): boolean {
    if (data.length < 8) return false;
    
    // PKWare signature: "PK" or specific version headers
    const pk1 = data[0] === 0x50 && data[1] === 0x4B;
    const pk2 = data[0] === 0x04 && data[1] === 0x03 && data[2] === 0x14 && data[3] === 0x00;
    
    if (pk1 || pk2) {
      console.log('[CompressionDetector] PKWare compression detected');
      return true;
    }
    
    return false;
  }

  /**
   * zlib format detection
   */
  private static detectZlibFormat(data: Uint8Array): boolean {
    if (data.length < 2) return false;
    
    // Common zlib headers
    const zlibHeaders = [
      [0x78, 0x01], // No compression
      [0x78, 0x9C], // Default compression (seen in logs)
      [0x78, 0xDA], // Best compression
      [0x78, 0x5E]  // Fast compression
    ];
    
    // Check at beginning and common offsets
    const checkOffsets = [0, 32, 64, 128]; // seRS typically has zlib data at offset 32
    
    for (const offset of checkOffsets) {
      if (offset + 1 < data.length) {
        const header = [data[offset], data[offset + 1]];
        
        for (const zlibHeader of zlibHeaders) {
          if (header[0] === zlibHeader[0] && header[1] === zlibHeader[1]) {
            console.log(`[CompressionDetector] zlib header found at offset ${offset}:`, 
              header.map(b => `0x${b.toString(16)}`).join(' '));
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Find PKWare data offset
   */
  private static findPKWareDataOffset(data: Uint8Array): number {
    // PKWare files typically have variable header sizes
    // Look for the actual compressed data start
    return 30; // Common PKWare header size
  }

  /**
   * Find zlib data offset
   */
  private static findZlibDataOffset(data: Uint8Array): number {
    const zlibHeaders = [[0x78, 0x01], [0x78, 0x9C], [0x78, 0xDA], [0x78, 0x5E]];
    
    for (let i = 0; i < Math.min(200, data.length - 1); i++) {
      for (const header of zlibHeaders) {
        if (data[i] === header[0] && data[i + 1] === header[1]) {
          return i;
        }
      }
    }
    
    return 0;
  }
}
