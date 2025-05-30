
/**
 * Enhanced Format Detector - Direct port from screp repdecoder.go
 * Detects replay format exactly like the official parser
 */

import { RepFormat } from './repcore/constants';

export interface DetectedFormat {
  format: RepFormat;
  confidence: number;
  isCompressed: boolean;
  headerValid: boolean;
  replayId: string;
  zlibMagic: boolean;
}

export class EnhancedFormatDetector {
  /**
   * Detect replay format exactly like screp's detectRepFormat
   * Based on file header analysis from repdecoder.go
   */
  static detectFormat(fileHeader: Uint8Array): DetectedFormat {
    console.log('[EnhancedFormatDetector] Analyzing file header...');
    console.log('[EnhancedFormatDetector] Header length:', fileHeader.length);
    console.log('[EnhancedFormatDetector] First 30 bytes:', 
      Array.from(fileHeader.slice(0, 30)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    
    if (fileHeader.length < 30) {
      return this.createResult(RepFormat.Unknown, 0.0);
    }

    // Extract replay ID from offset 12 (4 bytes)
    const replayId = new TextDecoder('latin1').decode(fileHeader.slice(12, 16));
    console.log('[EnhancedFormatDetector] Replay ID:', replayId);
    
    // Check for valid replay IDs from screp
    const isValidReplayId = replayId === 'reRS' || replayId === 'seRS';
    if (!isValidReplayId) {
      console.log('[EnhancedFormatDetector] Invalid replay ID, not a SC replay');
      return this.createResult(RepFormat.Unknown, 0.0, false, false, replayId);
    }

    // Modern 1.21+ format detection - "seRS" ID from screp
    if (replayId === 'seRS') {
      console.log('[EnhancedFormatDetector] Detected Modern 1.21+ format');
      return this.createResult(RepFormat.Modern121, 0.95, true, true, replayId, true);
    }

    // Pre-1.21 format, check compressed data block at offset 28
    // This is the exact logic from screp's detectRepFormat
    const compressedBlockStart = fileHeader[28];
    const zlibMagic = compressedBlockStart === 0x78;
    
    console.log('[EnhancedFormatDetector] Compressed block start byte:', '0x' + compressedBlockStart.toString(16));
    console.log('[EnhancedFormatDetector] Zlib magic detected:', zlibMagic);

    if (zlibMagic) {
      // Modern format (1.18-1.20) with zlib compression
      console.log('[EnhancedFormatDetector] Detected Modern format (1.18-1.20)');
      return this.createResult(RepFormat.Modern, 0.90, true, true, replayId, true);
    } else {
      // Legacy format (pre-1.18) with PKWARE compression
      console.log('[EnhancedFormatDetector] Detected Legacy format (pre-1.18)');
      return this.createResult(RepFormat.Legacy, 0.85, true, true, replayId, false);
    }
  }

  /**
   * Enhanced validation with additional checks
   */
  static validateReplayStructure(data: Uint8Array): boolean {
    if (data.length < 100) {
      return false;
    }

    // Check for typical SC replay patterns
    const hasReplayPatterns = this.hasStarCraftPatterns(data);
    const hasValidSections = this.hasValidSectionStructure(data);
    
    return hasReplayPatterns && hasValidSections;
  }

  /**
   * Check for StarCraft-specific patterns in data
   */
  private static hasStarCraftPatterns(data: Uint8Array): boolean {
    const textContent = new TextDecoder('latin1', { fatal: false })
      .decode(data.slice(0, Math.min(2000, data.length)));
    
    // Look for SC-specific strings
    const scPatterns = [
      'StarCraft',
      'Brood War', 
      'Remastered',
      '.scm', '.scx',
      'scenario.chk',
      'Protoss', 'Terran', 'Zerg'
    ];
    
    let patternCount = 0;
    for (const pattern of scPatterns) {
      if (textContent.includes(pattern)) {
        patternCount++;
      }
    }
    
    return patternCount >= 2;
  }

  /**
   * Validate section structure
   */
  private static hasValidSectionStructure(data: Uint8Array): boolean {
    try {
      // Check for section headers and reasonable sizes
      const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
      
      // Look for typical section patterns
      let validSections = 0;
      
      for (let i = 0; i < Math.min(data.length - 8, 1000); i += 4) {
        const value = dataView.getUint32(i, true);
        
        // Check for reasonable section sizes (typical SC replay sections)
        if ((value > 100 && value < 100000) || value === 0x279 || value === 0x04) {
          validSections++;
        }
      }
      
      return validSections >= 3;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create detection result
   */
  private static createResult(
    format: RepFormat,
    confidence: number,
    isCompressed: boolean = false,
    headerValid: boolean = false,
    replayId: string = '',
    zlibMagic: boolean = false
  ): DetectedFormat {
    return {
      format,
      confidence,
      isCompressed,
      headerValid,
      replayId,
      zlibMagic
    };
  }

  /**
   * Get format description for logging
   */
  static getFormatDescription(format: RepFormat): string {
    switch (format) {
      case RepFormat.Legacy: return 'Legacy (pre-1.18) PKWARE compression';
      case RepFormat.Modern: return 'Modern (1.18-1.20) zlib compression';
      case RepFormat.Modern121: return 'Modern (1.21+) enhanced format';
      default: return 'Unknown format';
    }
  }
}
