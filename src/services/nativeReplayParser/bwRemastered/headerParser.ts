
/**
 * StarCraft: Brood War Header Parser
 * Enhanced with dynamic structure detection
 */

import { BWBinaryReader } from './binaryReader';
import { BWReplayHeader } from './types';
import { BWHexAnalyzer } from './hexAnalyzer';

export class BWHeaderParser {
  private reader: BWBinaryReader;
  private analyzer: BWHexAnalyzer;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
    this.analyzer = new BWHexAnalyzer(reader);
  }

  parseHeader(): BWReplayHeader {
    console.log('[BWHeaderParser] Starting enhanced header parse...');
    
    // First, analyze the file structure
    this.analyzer.analyzeReplayStructure();
    
    const format = this.reader.detectFormat();
    console.log('[BWHeaderParser] Detected format:', format);
    
    this.reader.setPosition(0);
    
    if (format.isCompressed) {
      throw new Error('Compressed replays not yet supported');
    }
    
    return this.parseStandardHeaderDynamic();
  }

  private parseStandardHeaderDynamic(): BWReplayHeader {
    console.log('[BWHeaderParser] Parsing header with dynamic detection...');
    
    let totalFrames = 0;
    let mapName = '';
    let gameType = 2;
    let seed = 0;
    let engineVersion = 0;
    
    // Read engine version first (usually at 0x04)
    try {
      this.reader.setPosition(0x04);
      if (this.reader.canRead(4)) {
        engineVersion = this.reader.readUInt32LE();
        console.log('[BWHeaderParser] Engine version:', engineVersion);
      }
    } catch (e) {
      console.warn('[BWHeaderParser] Could not read engine version');
    }
    
    // Try multiple frame count locations
    const frameOffsets = [0x08, 0x0C, 0x10];
    for (const offset of frameOffsets) {
      try {
        this.reader.setPosition(offset);
        if (this.reader.canRead(4)) {
          const testFrames = this.reader.readUInt32LE();
          console.log(`[BWHeaderParser] Frame count test at 0x${offset.toString(16)}: ${testFrames}`);
          
          // Reasonable frame count for a game (100 frames = ~4 seconds minimum, 500k frames = ~5.7 hours maximum)
          if (testFrames >= 100 && testFrames <= 500000) {
            totalFrames = testFrames;
            console.log(`[BWHeaderParser] Valid frame count found: ${totalFrames}`);
            break;
          }
        }
      } catch (e) {
        console.warn(`[BWHeaderParser] Error reading frames at 0x${offset.toString(16)}`);
      }
    }
    
    // Dynamic map name search
    mapName = this.findMapName();
    
    // Try to read game type and seed
    try {
      // Different versions may have different offsets for game type
      const gameTypeOffsets = [0x1C0, 0x1A0, 0x180];
      for (const offset of gameTypeOffsets) {
        this.reader.setPosition(offset);
        if (this.reader.canRead(6)) {
          const testGameType = this.reader.readUInt16LE();
          const testSeed = this.reader.readUInt32LE();
          
          // Reasonable game type values
          if (testGameType >= 1 && testGameType <= 32) {
            gameType = testGameType;
            seed = testSeed;
            console.log(`[BWHeaderParser] Game type: ${gameType}, Seed: ${seed}`);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[BWHeaderParser] Could not read game type/seed');
    }
    
    // If frame count is still invalid, estimate from file size
    if (totalFrames === 0 || totalFrames > 500000) {
      const fileSize = this.reader.getRemainingBytes() + this.reader.getPosition();
      totalFrames = Math.floor(fileSize / 12); // Rough estimate
      console.log('[BWHeaderParser] Estimated frame count from file size:', totalFrames);
    }
    
    // Determine version string based on engine version
    let versionString = '1.18+';
    if (engineVersion > 0) {
      if (engineVersion >= 74) {
        versionString = 'Remastered';
      } else if (engineVersion >= 59) {
        versionString = '1.16.1';
      } else {
        versionString = 'Classic';
      }
    }
    
    return {
      version: versionString,
      seed: seed || 12345,
      totalFrames: totalFrames || 10000,
      mapName: mapName || 'Unknown Map',
      playerCount: 0,
      gameType: gameType,
      gameSubType: 0,
      saveTime: Date.now()
    };
  }
  
  private findMapName(): string {
    console.log('[BWHeaderParser] Dynamic map name search...');
    
    // Extended map name search with multiple encodings
    const mapNameOffsets = [0x45, 0x61, 0x68, 0x7C, 0x90, 0xA4];
    
    for (const offset of mapNameOffsets) {
      try {
        this.reader.setPosition(offset);
        if (this.reader.canRead(64)) {
          // Try different string lengths
          for (const length of [32, 64, 24, 16]) {
            this.reader.setPosition(offset);
            const testName = this.reader.readFixedString(length);
            console.log(`[BWHeaderParser] Testing map name at 0x${offset.toString(16)} (length ${length}): "${testName}"`);
            
            if (this.isValidMapName(testName)) {
              console.log(`[BWHeaderParser] Found valid map name: "${testName}"`);
              return testName;
            }
          }
        }
      } catch (e) {
        console.warn(`[BWHeaderParser] Error reading map name at 0x${offset.toString(16)}:`, e);
      }
    }
    
    return '';
  }
  
  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
    
    // Check for mostly printable ASCII characters
    let printableCount = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      if ((char >= 32 && char <= 126) || (char >= 160 && char <= 255)) {
        printableCount++;
      }
    }
    
    const printableRatio = printableCount / name.length;
    if (printableRatio < 0.6) return false;
    
    // Check for common map patterns
    const mapPatterns = [
      /^[a-zA-Z0-9\s\-_()[\]'.!]{3,}$/,  // Basic alphanumeric + symbols
      /fighting|spirit|python|destination|circuit|breaker|match|point|hunter|island|temple|valley|ridge/i
    ];
    
    return mapPatterns.some(pattern => pattern.test(name.trim()));
  }
}
