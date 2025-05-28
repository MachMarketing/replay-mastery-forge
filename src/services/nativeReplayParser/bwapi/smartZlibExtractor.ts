
/**
 * Smart Zlib Extractor - Robust decompression for SC:BW Remastered .rep files
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
   * Validate zlib header with CMF+FLG checksum
   */
  private static isValidZlibHeader(buf: Uint8Array, offset: number): boolean {
    if (offset + 1 >= buf.length) return false;
    
    const cmf = buf[offset];
    const flg = buf[offset + 1];
    
    // CMF Check: Compression Method (bits 0-3) must be deflate (8)
    if ((cmf & 0x0F) !== 0x08) return false;
    
    // FLG Check: Header checksum validation
    return ((cmf << 8) + flg) % 31 === 0;
  }

  /**
   * Decompress block with both inflate methods - Fixed to always return result
   */
  private static decompressBlock(
    block: Uint8Array,
    useRaw: boolean
  ): { success: boolean; result: Uint8Array | null; error?: string } {
    try {
      const result = useRaw 
        ? pako.inflateRaw(block)
        : pako.inflate(block);
      
      return { success: true, result };
    } catch (err) {
      return { 
        success: false, 
        result: null,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Count frame sync bytes (0x00)
   */
  private static countFrameSyncs(buf: Uint8Array): number {
    return buf.filter(b => b === 0x00).length;
  }

  /**
   * Count valid StarCraft command IDs
   */
  private static countValidCommandIDs(buf: Uint8Array): number {
    const validCommands = new Set([
      0x09, // Select
      0x0A, // Shift Select
      0x0B, // Shift Deselect
      0x0C, // Build
      0x0D, // Vision
      0x0E, // Alliance
      0x11, // Burrow
      0x13, // Hotkey
      0x14, // Move
      0x15, // Attack
      0x16, // Cancel
      0x17, // Cancel Hatch
      0x18, // Stop
      0x1A, // Unit Morph
      0x1D, // Train
      0x1E, // Cancel Train
      0x1F, // Cloak
      0x20, // Decloak
      0x21, // Unit Morph
      0x24, // Research
      0x25, // Upgrade
      0x2F, // Research
      0x30, // Cancel Research
      0x31, // Upgrade
      0x32, // Cancel Upgrade
      0x34  // Building Morph
    ]);
    
    return buf.filter(b => validCommands.has(b)).length;
  }

  /**
   * Validate if data looks like a StarCraft command stream - Fixed null handling
   */
  private static isLikelyCommandStream(data: Uint8Array | null): boolean {
    if (!data || data.length < 50) return false;
    
    const frameSyncs = this.countFrameSyncs(data);
    const validCommands = this.countValidCommandIDs(data);
    const frameSyncRatio = frameSyncs / data.length;
    
    // Frame syncs should be 10-70% of data, with at least 10 valid commands
    return frameSyncRatio > 0.1 && frameSyncRatio < 0.7 && validCommands > 10;
  }

  /**
   * Extract all valid zlib blocks from buffer
   */
  public static extractZlibBlocks(buf: Uint8Array): ZlibBlock[] {
    console.log('[SmartZlibExtractor] Starting zlib block extraction');
    const results: ZlibBlock[] = [];
    
    for (let i = 32; i < buf.length - 100; i++) {
      if (!this.isValidZlibHeader(buf, i)) continue;
      
      // Try different block sizes
      const blockSizes = [128, 256, 512, 1024, 2048, 4096, 8192];
      let blockFound = false;
      
      for (const blockSize of blockSizes) {
        if (i + blockSize > buf.length) continue;
        
        const slice = buf.slice(i, i + blockSize);
        
        // Try standard inflate first
        const inflated = this.decompressBlock(slice, false);
        if (inflated.success && inflated.result && this.isLikelyCommandStream(inflated.result)) {
          console.log(`[SmartZlibExtractor] Found valid block at ${i}, size ${blockSize}, method: inflate`);
          results.push({
            offset: i,
            raw: slice,
            decompressed: inflated.result,
            method: 'inflate',
            size: blockSize
          });
          i += blockSize - 1; // Skip processed data
          blockFound = true;
          break;
        }
        
        // Try raw inflate if standard failed
        const inflatedRaw = this.decompressBlock(slice, true);
        if (inflatedRaw.success && inflatedRaw.result && this.isLikelyCommandStream(inflatedRaw.result)) {
          console.log(`[SmartZlibExtractor] Found valid block at ${i}, size ${blockSize}, method: inflateRaw`);
          results.push({
            offset: i,
            raw: slice,
            decompressed: inflatedRaw.result,
            method: 'inflateRaw',
            size: blockSize
          });
          i += blockSize - 1; // Skip processed data
          blockFound = true;
          break;
        }
      }
      
      // If no valid block found, continue to next position
      if (!blockFound) {
        // Try smaller increments for dense zlib data
        if (i % 16 === 0) {
          // Only log every 16th failure to avoid spam
          console.log(`[SmartZlibExtractor] No valid block found at ${i}`);
        }
      }
    }
    
    console.log(`[SmartZlibExtractor] Extracted ${results.length} valid zlib blocks`);
    return results;
  }

  /**
   * Extract and assemble complete command stream
   */
  public static extractAndAssembleStream(buf: Uint8Array): ExtractionResult {
    console.log('[SmartZlibExtractor] Starting stream assembly');
    
    const blocks = this.extractZlibBlocks(buf);
    const validBlocks = blocks.filter(b => b.decompressed && b.decompressed.length > 0);
    
    if (validBlocks.length === 0) {
      console.warn('[SmartZlibExtractor] No valid blocks found');
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
    
    console.log(`[SmartZlibExtractor] Assembly complete:`);
    console.log(`  - Blocks assembled: ${validBlocks.length}`);
    console.log(`  - Total stream size: ${combinedStream.length}`);
    console.log(`  - Total commands: ${totalCommands}`);
    console.log(`  - Frame syncs: ${frameSyncs}`);
    console.log(`  - Validation score: ${validationScore}`);
    
    return {
      success: totalCommands > 100, // Require at least 100 commands for success
      combinedStream,
      blocks: validBlocks,
      totalCommands,
      validationScore
    };
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
    else if (commands > 500) score += 30;
    else if (commands > 100) score += 20;
    else if (commands > 50) score += 10;
    
    // Frame sync ratio (should be reasonable)
    if (frameSyncRatio > 0.1 && frameSyncRatio < 0.7) score += 30;
    else if (frameSyncRatio > 0.05 && frameSyncRatio < 0.8) score += 20;
    else if (frameSyncRatio > 0.02) score += 10;
    
    // Stream length (reasonable size)
    if (data.length > 10000) score += 20;
    else if (data.length > 5000) score += 15;
    else if (data.length > 1000) score += 10;
    
    // Diversity check (not all same bytes)
    const uniqueBytes = new Set(data.slice(0, 1000)).size;
    if (uniqueBytes > 50) score += 10;
    else if (uniqueBytes > 20) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Quick extraction for testing
   */
  public static quickExtract(buf: Uint8Array): Uint8Array {
    const result = this.extractAndAssembleStream(buf);
    return result.combinedStream;
  }
}
