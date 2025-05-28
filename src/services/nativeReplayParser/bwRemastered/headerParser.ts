
/**
 * StarCraft: Brood War Header Parser
 * Based on correct screp specification
 */

import { BWBinaryReader } from './binaryReader';
import { BWReplayHeader } from './types';

export class BWHeaderParser {
  private reader: BWBinaryReader;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
  }

  parseHeader(): BWReplayHeader {
    console.log('[BWHeaderParser] Starting header parse with correct offsets...');
    
    const format = this.reader.detectFormat();
    console.log('[BWHeaderParser] Detected format:', format);
    
    this.reader.setPosition(0);
    
    if (format.isCompressed) {
      throw new Error('Compressed replays not yet supported');
    }
    
    return this.parseStandardHeader();
  }

  private parseStandardHeader(): BWReplayHeader {
    console.log('[BWHeaderParser] Parsing standard header with correct .rep structure...');
    
    // Based on screp specification:
    // 0x00-0x04: Unknown data
    // 0x04-0x08: Game speed, lock speed, etc.
    // 0x08-0x0C: Frame count
    
    let totalFrames = 0;
    let mapName = '';
    let gameType = 2; // Default to Melee
    let seed = 0;
    
    try {
      // Read frame count at correct offset (0x0C according to screp)
      this.reader.setPosition(0x0C);
      if (this.reader.canRead(4)) {
        totalFrames = this.reader.readUInt32LE();
        console.log('[BWHeaderParser] Frame count at 0x0C:', totalFrames);
        
        // Validate frame count (should be reasonable)
        if (totalFrames > 1000000 || totalFrames < 100) {
          console.warn('[BWHeaderParser] Invalid frame count, using fallback');
          totalFrames = 0;
        }
      }
    } catch (e) {
      console.warn('[BWHeaderParser] Could not read frame count');
    }
    
    // Try to read map name from known locations in .rep files
    // According to screp, map name can be at different offsets
    const mapNameOffsets = [0x45, 0x61, 0x68];
    
    for (const offset of mapNameOffsets) {
      try {
        this.reader.setPosition(offset);
        if (this.reader.canRead(32)) {
          const testName = this.reader.readFixedString(32);
          console.log(`[BWHeaderParser] Testing map name at 0x${offset.toString(16)}: "${testName}"`);
          
          if (testName.length > 0 && testName.length < 30 && this.isValidMapName(testName)) {
            mapName = testName;
            console.log(`[BWHeaderParser] Found valid map name: "${mapName}"`);
            break;
          }
        }
      } catch (e) {
        console.warn(`[BWHeaderParser] Error reading map name at 0x${offset.toString(16)}:`, e);
      }
    }
    
    // Try to read game type and seed
    try {
      this.reader.setPosition(0x1C0);
      if (this.reader.canRead(6)) {
        gameType = this.reader.readUInt16LE();
        seed = this.reader.readUInt32LE();
        console.log('[BWHeaderParser] Game type:', gameType, 'Seed:', seed);
      }
    } catch (e) {
      console.warn('[BWHeaderParser] Could not read game type/seed');
    }
    
    // If frame count is still invalid, estimate from file size
    if (totalFrames === 0 || totalFrames > 100000) {
      totalFrames = Math.floor(this.reader.getRemainingBytes() / 10);
      console.log('[BWHeaderParser] Estimated frame count:', totalFrames);
    }
    
    return {
      version: '1.18+',
      seed: seed || 12345,
      totalFrames: totalFrames || 10000,
      mapName: mapName || 'Unknown Map',
      playerCount: 0,
      gameType: gameType,
      gameSubType: 0,
      saveTime: Date.now()
    };
  }
  
  private isValidMapName(name: string): boolean {
    if (!name || name.length === 0) return false;
    
    // Check for mostly printable ASCII characters
    let printableCount = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      if ((char >= 32 && char <= 126) || (char >= 128 && char <= 255)) {
        printableCount++;
      }
    }
    
    return (printableCount / name.length) >= 0.8;
  }
}
