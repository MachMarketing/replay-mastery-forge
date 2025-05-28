/**
 * Smart Zlib Extractor - Robust decompression for SC:BW Remastered .rep files
 * Browser-compatible version using pako instead of Node.js zlib
 * Based on advanced zlib header validation and command stream analysis
 */

import * as pako from 'pako';

export interface ZlibBlock {
  offset: number;
  raw: Uint8Array;
  decompressed?: Uint8Array;
  method?: string;
  error?: string;
  size: number;
}

export interface ExtractionResult {
  success: boolean;
  combinedStream: Uint8Array;
  blocks: ZlibBlock[];
  totalCommands: number;
  validationScore: number;
}

export class SmartZlibExtractor {
  /**
   * Validate zlib header with CMF+FLG checksum (Schritt 1)
   */
  private static isValidZlibHeader(buf: Uint8Array, offset: number): boolean {
    if (offset + 1 >= buf.length) return false;
    
    const cmf = buf[offset];
    const flg = buf[offset + 1];
    
    // CMF Check: Compression Method (bits 0-3) must be deflate (8)
    if ((cmf & 0x0F) !== 0x08) return false;
    
    // FLG Check: Header checksum validation
    const isValid = ((cmf << 8) + flg) % 31 === 0;
    
    if (isValid) {
      console.log(`[SmartZlibExtractor] Valid zlib header found at offset ${offset}: CMF=0x${cmf.toString(16)}, FLG=0x${flg.toString(16)}`);
    }
    
    return isValid;
  }

  /**
   * Enhanced decompression with multiple strategies
   */
  private static decompressBlock(
    block: Uint8Array,
    offset: number
  ): { success: boolean; result: Uint8Array | null; error?: string; method?: string } {
    console.log(`[SmartZlibExtractor] Trying decompression at offset ${offset}, block size ${block.length}`);
    
    // Strategy 1: Standard inflate
    try {
      const result = pako.inflate(block);
      console.log(`[SmartZlibExtractor] SUCCESS with inflate: ${result.length} bytes decompressed`);
      return { success: true, result, method: 'inflate' };
    } catch (err) {
      console.log(`[SmartZlibExtractor] inflate failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Strategy 2: Raw inflate
    try {
      const result = pako.inflateRaw(block);
      console.log(`[SmartZlibExtractor] SUCCESS with inflateRaw: ${result.length} bytes decompressed`);
      return { success: true, result, method: 'inflateRaw' };
    } catch (err) {
      console.log(`[SmartZlibExtractor] inflateRaw failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Strategy 3: Try skipping zlib header (inflate raw on data after header)
    if (block.length > 2) {
      try {
        const withoutHeader = block.slice(2);
        const result = pako.inflateRaw(withoutHeader);
        console.log(`[SmartZlibExtractor] SUCCESS with inflateRaw (no header): ${result.length} bytes decompressed`);
        return { success: true, result, method: 'inflateRaw_noheader' };
      } catch (err) {
        console.log(`[SmartZlibExtractor] inflateRaw (no header) failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Strategy 4: Try different chunk sizes starting from the header
    for (let skipBytes = 0; skipBytes < Math.min(10, block.length - 50); skipBytes++) {
      try {
        const shifted = block.slice(skipBytes);
        const result = pako.inflateRaw(shifted);
        console.log(`[SmartZlibExtractor] SUCCESS with inflateRaw (skip ${skipBytes}): ${result.length} bytes decompressed`);
        return { success: true, result, method: `inflateRaw_skip${skipBytes}` };
      } catch (err) {
        // Continue trying
      }
    }
    
    return { 
      success: false, 
      result: null,
      error: 'All decompression strategies failed'
    };
  }

  /**
   * Count frame sync bytes (0x00) (Schritt 3)
   */
  private static countFrameSyncs(buf: Uint8Array): number {
    return buf.filter(b => b === 0x00).length;
  }

  /**
   * Count valid StarCraft command IDs - Updated with correct BWAPI commands (Schritt 3)
   */
  private static countValidCommandIDs(buf: Uint8Array): number {
    const validCommands = new Set([
      // Core BWAPI commands based on your specification
      0x0C, // Build
      0x0D, // Vision
      0x0F, // Cancel Build/Morph
      0x10, // Stop
      0x11, // Attack Move
      0x13, // Right Click
      0x14, // Train
      0x16, // Cancel
      0x1A, // Use Tech
      0x1D, // Train Unit
      0x20, // Build Self (Drone-Morph)
      0x21, // Unit Morph
      0x22, // Unload
      0x23, // Unsiege
      0x24, // Siege
      0x25, // Train Fighter
      // Additional important commands
      0x09, // Select
      0x0A, // Shift Select
      0x0B, // Shift Deselect
      0x0E, // Alliance
      0x15, // Attack
      0x1B, // Use Tech Position
      0x1F, // Cloak
      0x2F, // Research
      0x31, // Upgrade
    ]);
    
    return buf.filter(b => validCommands.has(b)).length;
  }

  /**
   * Validate if data looks like a StarCraft command stream (Schritt 3)
   */
  private static isLikelyCommandStream(data: Uint8Array | null): boolean {
    if (!data || data.length < 50) {
      console.log(`[SmartZlibExtractor] Command stream validation failed: ${!data ? 'null data' : `too short (${data.length} bytes)`}`);
      return false;
    }
    
    const frameSyncs = this.countFrameSyncs(data);
    const validCommands = this.countValidCommandIDs(data);
    const frameSyncRatio = frameSyncs / data.length;
    
    console.log(`[SmartZlibExtractor] Command stream validation: ${validCommands} valid commands, ${frameSyncs} frame syncs (${(frameSyncRatio * 100).toFixed(1)}% ratio), ${data.length} bytes total`);
    
    // Frame syncs should be 5-70% of data, with at least 10 valid commands
    const isValid = frameSyncRatio > 0.05 && frameSyncRatio < 0.7 && validCommands > 10;
    
    console.log(`[SmartZlibExtractor] Command stream ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
  }

  /**
   * Enhanced zlib block extraction with aggressive search
   */
  public static extractZlibBlocks(buf: Uint8Array): ZlibBlock[] {
    console.log(`[SmartZlibExtractor] Starting ENHANCED zlib block extraction on ${buf.length} bytes`);
    const results: ZlibBlock[] = [];
    let headersFound = 0;
    
    // More aggressive search - look through more of the file
    for (let i = 16; i < buf.length - 100; i++) {
      if (!this.isValidZlibHeader(buf, i)) continue;
      
      headersFound++;
      console.log(`[SmartZlibExtractor] Found zlib header #${headersFound} at offset ${i}`);
      
      // Try a much wider range of block sizes
      const blockSizes = [128, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096, 6144, 8192, 12288, 16384];
      let blockFound = false;
      
      for (const blockSize of blockSizes) {
        if (i + blockSize > buf.length) continue;
        
        const slice = buf.slice(i, i + blockSize);
        const decompResult = this.decompressBlock(slice, i);
        
        if (decompResult.success && decompResult.result && this.isLikelyCommandStream(decompResult.result)) {
          console.log(`[SmartZlibExtractor] ✅ SUCCESS! Valid block at ${i}, size ${blockSize}, method: ${decompResult.method}`);
          results.push({
            offset: i,
            raw: slice,
            decompressed: decompResult.result,
            method: decompResult.method,
            size: blockSize
          });
          i += blockSize - 1; // Skip processed data
          blockFound = true;
          break;
        }
      }
      
      if (!blockFound) {
        console.log(`[SmartZlibExtractor] ❌ No valid block found at offset ${i} despite valid header`);
        
        // Try to decompress anyway to see what we get
        const slice = buf.slice(i, Math.min(i + 2048, buf.length));
        const decompResult = this.decompressBlock(slice, i);
        if (decompResult.success && decompResult.result) {
          console.log(`[SmartZlibExtractor] 🔍 Decompressed ${decompResult.result.length} bytes but failed validation`);
          console.log(`[SmartZlibExtractor] 🔍 First 50 bytes:`, Array.from(decompResult.result.slice(0, 50)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        }
      }
    }
    
    console.log(`[SmartZlibExtractor] 📊 SUMMARY: Found ${headersFound} zlib headers, extracted ${results.length} valid blocks`);
    return results;
  }

  /**
   * Extract and assemble complete command stream (Schritt 5)
   */
  public static extractAndAssembleStream(buf: Uint8Array): ExtractionResult {
    console.log('[SmartZlibExtractor] 🚀 Starting ENHANCED stream assembly');
    
    const blocks = this.extractZlibBlocks(buf);
    const validBlocks = blocks.filter(b => b.decompressed && b.decompressed.length > 0);
    
    if (validBlocks.length === 0) {
      console.warn('[SmartZlibExtractor] ❌ No valid blocks found - trying fallback raw extraction');
      
      // Fallback: Look for raw command patterns without decompression
      const rawCommands = this.findRawCommandPatterns(buf);
      if (rawCommands > 20) {
        console.log(`[SmartZlibExtractor] 🔧 Found ${rawCommands} raw command patterns, using raw data`);
        return {
          success: true,
          combinedStream: buf.slice(100), // Skip header
          blocks: [],
          totalCommands: rawCommands,
          validationScore: 50
        };
      }
      
      return {
        success: false,
        combinedStream: new Uint8Array(0),
        blocks: [],
        totalCommands: 0,
        validationScore: 0
      };
    }
    
    // Calculate total length and assemble
    const totalLength = validBlocks.reduce((acc, b) => acc + b.decompressed!.length, 0);
    const combinedStream = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const block of validBlocks) {
      combinedStream.set(block.decompressed!, offset);
      offset += block.decompressed!.length;
    }
    
    // Validate combined stream
    const totalCommands = this.countValidCommandIDs(combinedStream);
    const frameSyncs = this.countFrameSyncs(combinedStream);
    const validationScore = this.calculateValidationScore(combinedStream);
    
    console.log(`[SmartZlibExtractor] 🎯 Assembly complete:`);
    console.log(`  - Blocks assembled: ${validBlocks.length}`);
    console.log(`  - Total stream size: ${combinedStream.length}`);
    console.log(`  - Total commands: ${totalCommands}`);
    console.log(`  - Frame syncs: ${frameSyncs}`);
    console.log(`  - Validation score: ${validationScore}`);
    
    return {
      success: totalCommands > 20, // More realistic threshold
      combinedStream,
      blocks: validBlocks,
      totalCommands,
      validationScore
    };
  }

  /**
   * Find raw command patterns in uncompressed data as fallback
   */
  private static findRawCommandPatterns(buf: Uint8Array): number {
    console.log('[SmartZlibExtractor] 🔧 Searching for raw command patterns as fallback');
    
    let commandCount = 0;
    const validCommands = new Set([0x0C, 0x14, 0x1D, 0x20, 0x11, 0x13, 0x09, 0x0A, 0x0B]);
    
    for (let i = 0; i < buf.length - 10; i++) {
      if (validCommands.has(buf[i])) {
        // Check if it looks like a real command (followed by reasonable data)
        const nextBytes = buf.slice(i + 1, i + 10);
        if (this.looksLikeValidCommandContext(buf[i], nextBytes)) {
          commandCount++;
        }
      }
    }
    
    console.log(`[SmartZlibExtractor] 🔧 Found ${commandCount} potential raw commands`);
    return commandCount;
  }

  /**
   * Check if the context around a command byte looks valid
   */
  private static looksLikeValidCommandContext(commandByte: number, nextBytes: Uint8Array): boolean {
    // Basic heuristics for command validation
    if (nextBytes.length < 2) return false;
    
    // Player ID should be reasonable (0-11)
    const playerId = nextBytes[0];
    if (playerId > 11) return false;
    
    // For build commands, check if coordinates look reasonable
    if (commandByte === 0x0C && nextBytes.length >= 6) {
      const x = nextBytes[2] | (nextBytes[3] << 8);
      const y = nextBytes[4] | (nextBytes[5] << 8);
      return x < 2048 && y < 2048; // Reasonable map coordinates
    }
    
    return true;
  }

  /**
   * Calculate validation score for command stream quality
   */
  private static calculateValidationScore(data: Uint8Array): number {
    if (data.length === 0) return 0;
    
    const commands = this.countValidCommandIDs(data);
    const frameSyncs = this.countFrameSyncs(data);
    const frameSyncRatio = frameSyncs / data.length;
    
    // Score based on command density and frame sync ratio
    let score = 0;
    
    // Command density (more commands = better)
    if (commands > 1000) score += 40;
    else if (commands > 500) score += 35;
    else if (commands > 200) score += 30;
    else if (commands > 100) score += 25;
    else if (commands > 50) score += 15;
    
    // Frame sync ratio (should be reasonable)
    if (frameSyncRatio > 0.05 && frameSyncRatio < 0.7) score += 30;
    else if (frameSyncRatio > 0.02 && frameSyncRatio < 0.8) score += 20;
    else if (frameSyncRatio > 0.01) score += 10;
    
    // Stream length (reasonable size)
    if (data.length > 10000) score += 20;
    else if (data.length > 5000) score += 15;
    else if (data.length > 1000) score += 10;
    else if (data.length > 500) score += 5;
    
    // Diversity check (not all same bytes)
    const uniqueBytes = new Set(data.slice(0, Math.min(1000, data.length))).size;
    if (uniqueBytes > 50) score += 10;
    else if (uniqueBytes > 30) score += 8;
    else if (uniqueBytes > 20) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Quick extraction for testing - Browser-friendly interface
   */
  public static quickExtract(buf: Uint8Array): Uint8Array {
    const result = this.extractAndAssembleStream(buf);
    return result.combinedStream;
  }

  /**
   * Browser-friendly file processing
   */
  public static async processReplayFile(file: File): Promise<ExtractionResult> {
    console.log(`[SmartZlibExtractor] Processing replay file: ${file.name}`);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(buffer);
          const result = this.extractAndAssembleStream(uint8Array);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
}
