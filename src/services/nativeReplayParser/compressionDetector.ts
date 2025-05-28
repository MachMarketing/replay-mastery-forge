
/**
 * Enhanced compression detection for StarCraft replays
 * Updated for Remastered format changes and new compression methods
 */

export interface ReplayFormat {
  type: 'uncompressed' | 'zlib' | 'remastered_zlib' | 'pkware' | 'bzip2' | 'unknown';
  needsDecompression: boolean;
  headerOffset: number;
  confidence: number;
  version: string;
  isRemastered: boolean;
}

export class CompressionDetector {
  /**
   * Detect the compression format and version of a StarCraft replay
   */
  static detectFormat(buffer: ArrayBuffer): ReplayFormat {
    const view = new Uint8Array(buffer);
    const dataView = new DataView(buffer);
    
    console.log('[CompressionDetector] Analyzing file format...');
    console.log('[CompressionDetector] File size:', buffer.byteLength);
    console.log('[CompressionDetector] First 16 bytes:', 
      Array.from(view.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Check for uncompressed replay first
    const uncompressedResult = this.checkUncompressed(view);
    if (uncompressedResult.confidence > 0.8) {
      return uncompressedResult;
    }
    
    // Check for Remastered-specific zlib compression
    const remasteredResult = this.checkRemasteredZlib(view, dataView);
    if (remasteredResult.confidence > 0.7) {
      return remasteredResult;
    }
    
    // Check for standard zlib
    const zlibResult = this.checkStandardZlib(view);
    if (zlibResult.confidence > 0.6) {
      return zlibResult;
    }
    
    // Check for PKWare/ZIP compression
    const pkwareResult = this.checkPKWare(view, dataView);
    if (pkwareResult.confidence > 0.5) {
      return pkwareResult;
    }
    
    // Check for bzip2
    const bzip2Result = this.checkBzip2(view);
    if (bzip2Result.confidence > 0.5) {
      return bzip2Result;
    }
    
    // Default fallback
    console.warn('[CompressionDetector] Could not determine format, using unknown');
    return {
      type: 'unknown',
      needsDecompression: false,
      headerOffset: 0,
      confidence: 0.1,
      version: 'Unknown',
      isRemastered: false
    };
  }
  
  /**
   * Check for uncompressed replay format
   */
  private static checkUncompressed(data: Uint8Array): ReplayFormat {
    let confidence = 0;
    let isRemastered = false;
    let version = 'Classic';
    
    // Look for "Repl" magic bytes at various offsets
    const magicOffsets = [0, 4, 8, 12, 16, 32];
    let foundMagic = false;
    let headerOffset = 0;
    
    for (const offset of magicOffsets) {
      if (offset + 4 <= data.length) {
        const magic = new TextDecoder('latin1').decode(data.slice(offset, offset + 4));
        if (magic === 'Repl') {
          foundMagic = true;
          headerOffset = offset;
          confidence += 0.4;
          break;
        }
      }
    }
    
    // Check for StarCraft-specific strings
    const textContent = new TextDecoder('latin1', { fatal: false })
      .decode(data.slice(0, Math.min(1000, data.length)));
    
    if (textContent.includes('StarCraft')) confidence += 0.2;
    if (textContent.includes('Brood War')) {
      confidence += 0.1;
      isRemastered = true;
      version = 'Brood War';
    }
    if (textContent.includes('scenario.chk')) confidence += 0.1;
    if (textContent.includes('Protoss') || textContent.includes('Terran') || textContent.includes('Zerg')) {
      confidence += 0.1;
    }
    
    // Check version indicators
    if (data.length > 8) {
      const versionBytes = new DataView(data.buffer).getUint32(4, true);
      if (versionBytes >= 74) {
        version = 'Remastered 1.23+';
        isRemastered = true;
        confidence += 0.1;
      }
    }
    
    return {
      type: 'uncompressed',
      needsDecompression: false,
      headerOffset,
      confidence,
      version,
      isRemastered
    };
  }
  
  /**
   * Check for Remastered-specific zlib compression
   */
  private static checkRemasteredZlib(data: Uint8Array, dataView: DataView): ReplayFormat {
    let confidence = 0;
    let headerOffset = 0;
    
    // Remastered often has a specific structure with multiple zlib blocks
    const zlibHeaders = this.findZlibHeaders(data);
    
    if (zlibHeaders.length > 1) {
      confidence += 0.3; // Multiple zlib blocks suggest Remastered
    }
    
    // Check for Remastered-specific file structure
    if (data.length > 100) {
      // Look for extended header patterns
      const hasExtendedHeader = this.hasRemasteredHeader(data);
      if (hasExtendedHeader) {
        confidence += 0.3;
      }
      
      // Check for UTF-8 encoded strings (Remastered feature)
      const hasUTF8 = this.hasUTF8Content(data.slice(0, 500));
      if (hasUTF8) {
        confidence += 0.2;
      }
    }
    
    // Find the main zlib block offset
    if (zlibHeaders.length > 0) {
      headerOffset = zlibHeaders[0];
      confidence += 0.2;
    }
    
    return {
      type: 'remastered_zlib',
      needsDecompression: confidence > 0.5,
      headerOffset,
      confidence,
      version: 'Remastered',
      isRemastered: true
    };
  }
  
  /**
   * Check for standard zlib compression
   */
  private static checkStandardZlib(data: Uint8Array): ReplayFormat {
    let confidence = 0;
    let headerOffset = 0;
    
    const zlibHeaders = this.findZlibHeaders(data);
    
    if (zlibHeaders.length === 1) {
      confidence += 0.4; // Single zlib block suggests classic format
      headerOffset = zlibHeaders[0];
    } else if (zlibHeaders.length > 1) {
      confidence += 0.2; // Multiple blocks possible but less likely for classic
      headerOffset = zlibHeaders[0];
    }
    
    // Check zlib header validity
    if (zlibHeaders.length > 0) {
      const header = (data[zlibHeaders[0]] << 8) | data[zlibHeaders[0] + 1];
      if ((header & 0x0F00) === 0x0800 && (header % 31) === 0) {
        confidence += 0.2; // Valid zlib header
      }
    }
    
    return {
      type: 'zlib',
      needsDecompression: confidence > 0.3,
      headerOffset,
      confidence,
      version: 'Classic',
      isRemastered: false
    };
  }
  
  /**
   * Check for PKWare/ZIP compression
   */
  private static checkPKWare(data: Uint8Array, dataView: DataView): ReplayFormat {
    let confidence = 0;
    
    // Check for ZIP local file header
    if (data.length >= 4) {
      const signature = dataView.getUint32(0, true);
      if (signature === 0x04034b50) { // ZIP local file header
        confidence += 0.6;
      }
    }
    
    // Check for PKWare signature
    if (data.length >= 2) {
      if (data[0] === 0x50 && data[1] === 0x4B) {
        confidence += 0.3;
      }
    }
    
    return {
      type: 'pkware',
      needsDecompression: confidence > 0.3,
      headerOffset: 0,
      confidence,
      version: 'Classic',
      isRemastered: false
    };
  }
  
  /**
   * Check for bzip2 compression
   */
  private static checkBzip2(data: Uint8Array): ReplayFormat {
    let confidence = 0;
    
    // Check for bzip2 magic bytes
    if (data.length >= 3) {
      if (data[0] === 0x42 && data[1] === 0x5A && data[2] === 0x68) {
        confidence += 0.7;
      }
    }
    
    return {
      type: 'bzip2',
      needsDecompression: confidence > 0.5,
      headerOffset: 0,
      confidence,
      version: 'Classic',
      isRemastered: false
    };
  }
  
  /**
   * Find all zlib header positions in the data
   */
  private static findZlibHeaders(data: Uint8Array): number[] {
    const positions: number[] = [];
    
    for (let i = 0; i < data.length - 1; i++) {
      // Check for zlib magic bytes
      if (data[i] === 0x78 && [0x9c, 0xda, 0x01, 0x5e, 0x2c].includes(data[i + 1])) {
        positions.push(i);
      }
    }
    
    return positions;
  }
  
  /**
   * Check if the file has Remastered-specific header structure
   */
  private static hasRemasteredHeader(data: Uint8Array): boolean {
    // Remastered files typically have extended headers and specific patterns
    if (data.length < 200) return false;
    
    // Look for extended header indicators
    const header = data.slice(0, 200);
    
    // Check for specific byte patterns that indicate Remastered format
    let remasteredPatterns = 0;
    
    // Pattern 1: Extended version info
    for (let i = 0; i < header.length - 4; i++) {
      const value = new DataView(header.buffer, i, 4).getUint32(0, true);
      if (value >= 74 && value < 1000) { // Remastered version range
        remasteredPatterns++;
        break;
      }
    }
    
    // Pattern 2: Look for longer player name sections (Remastered supports longer names)
    const nullSequences = this.countNullSequences(header);
    if (nullSequences > 5) {
      remasteredPatterns++;
    }
    
    return remasteredPatterns >= 1;
  }
  
  /**
   * Check if data contains UTF-8 encoded content (Remastered feature)
   */
  private static hasUTF8Content(data: Uint8Array): boolean {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
      // Look for non-ASCII characters that would indicate UTF-8 usage
      return /[^\x00-\x7F]/.test(text);
    } catch {
      return false;
    }
  }
  
  /**
   * Count null byte sequences in header
   */
  private static countNullSequences(data: Uint8Array): number {
    let count = 0;
    let inSequence = false;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0) {
        if (!inSequence) {
          count++;
          inSequence = true;
        }
      } else {
        inSequence = false;
      }
    }
    
    return count;
  }
}
