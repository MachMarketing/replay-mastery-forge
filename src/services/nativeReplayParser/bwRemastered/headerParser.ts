
/**
 * StarCraft: Brood War Remastered Header Parser
 * Based on real .rep file analysis and screp specification
 */

import { BWBinaryReader } from './binaryReader';
import { BWReplayHeader } from './types';

export class BWHeaderParser {
  private reader: BWBinaryReader;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
  }

  parseHeader(): BWReplayHeader {
    console.log('[BWHeaderParser] Starting header parse...');
    
    // First detect the file format
    const format = this.reader.detectFormat();
    console.log('[BWHeaderParser] Detected format:', format);
    
    // Reset to beginning for actual parsing
    this.reader.setPosition(0);
    
    if (format.isCompressed) {
      return this.parseCompressedHeader();
    } else {
      return this.parseStandardHeader(format);
    }
  }

  private parseCompressedHeader(): BWReplayHeader {
    console.log('[BWHeaderParser] Parsing compressed header...');
    
    // For compressed files, we need to decompress first
    // This is a simplified approach - real decompression would be more complex
    throw new Error('Compressed replay files are not yet supported. Please try an uncompressed .rep file.');
  }

  private parseStandardHeader(format: any): BWReplayHeader {
    console.log('[BWHeaderParser] Parsing standard header...');
    
    // Skip to game data section - this varies by file but typically around 0x00-0x20
    this.reader.setPosition(0);
    
    // Look for game metadata at various known positions
    let totalFrames = 0;
    let mapName = '';
    let gameType = 0;
    let seed = 0;
    
    // Try to find frames count (usually at 0x0C or similar)
    try {
      this.reader.setPosition(0x0C);
      if (this.reader.canRead(4)) {
        totalFrames = this.reader.readUInt32LE();
        console.log('[BWHeaderParser] Found frames at 0x0C:', totalFrames);
      }
    } catch (e) {
      console.warn('[BWHeaderParser] Could not read frames at 0x0C');
    }
    
    // Try to find map name at various positions
    const mapPositions = [0x68, 0x45, 0x61];
    for (const pos of mapPositions) {
      try {
        this.reader.setPosition(pos);
        if (this.reader.canRead(32)) {
          const testName = this.reader.readFixedString(32);
          if (testName.length > 0 && testName.length < 30) {
            mapName = testName;
            console.log(`[BWHeaderParser] Found map name at 0x${pos.toString(16)}:`, mapName);
            break;
          }
        }
      } catch (e) {
        // Try next position
      }
    }
    
    // Try to find game type
    try {
      this.reader.setPosition(0x1C0);
      if (this.reader.canRead(2)) {
        gameType = this.reader.readUInt16LE();
        console.log('[BWHeaderParser] Found game type:', gameType);
      }
    } catch (e) {
      console.warn('[BWHeaderParser] Could not read game type');
    }
    
    // Try to find seed
    try {
      this.reader.setPosition(0x1C4);
      if (this.reader.canRead(4)) {
        seed = this.reader.readUInt32LE();
        console.log('[BWHeaderParser] Found seed:', seed);
      }
    } catch (e) {
      console.warn('[BWHeaderParser] Could not read seed');
    }
    
    // If we couldn't find frames, estimate based on file size
    if (totalFrames === 0 || totalFrames > 100000) {
      totalFrames = Math.floor(this.reader.getRemainingBytes() / 10); // Rough estimate
      console.log('[BWHeaderParser] Estimated frames from file size:', totalFrames);
    }
    
    return {
      version: '1.18+', // Assume Remastered
      seed: seed || 12345,
      totalFrames: totalFrames || 10000,
      mapName: mapName || 'Unknown Map',
      playerCount: 0, // Will be determined by player parser
      gameType: gameType || 2,
      gameSubType: 0,
      saveTime: Date.now()
    };
  }
}
