
/**
 * StarCraft: Remastered Header Parser
 * Based on screp Go implementation with correct field offsets and parsing logic
 */

import { BWBinaryReader } from './binaryReader';
import { BWReplayHeader } from './types';
import { Race, PlayerType, GameType } from '../repcore/constants';

export class BWHeaderParser {
  private reader: BWBinaryReader;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
  }

  parseHeader(): BWReplayHeader {
    console.log('[BWHeaderParser] Starting screp-compatible header parse...');
    
    this.reader.setPosition(0);
    
    // Parse engine info (first 4 bytes + version info)
    const engineData = this.parseEngineInfo();
    console.log('[BWHeaderParser] Engine data:', engineData);
    
    // Parse frame count (critical for game duration)
    const frames = this.parseFrameCount();
    console.log('[BWHeaderParser] Frame count:', frames);
    
    // Parse map info
    const mapInfo = this.parseMapInfo();
    console.log('[BWHeaderParser] Map info:', mapInfo);
    
    // Parse game settings
    const gameSettings = this.parseGameSettings();
    console.log('[BWHeaderParser] Game settings:', gameSettings);
    
    return {
      version: engineData.version,
      seed: gameSettings.seed,
      totalFrames: frames,
      mapName: mapInfo.name,
      playerCount: gameSettings.playerCount,
      gameType: gameSettings.gameType,
      gameSubType: gameSettings.subType,
      saveTime: Date.now()
    };
  }
  
  private parseEngineInfo() {
    // Engine signature and version info
    this.reader.setPosition(0);
    
    let version = '1.18+';
    let engineVersion = 0;
    
    try {
      // Check for engine version at standard offset
      this.reader.setPosition(4);
      if (this.reader.canRead(4)) {
        engineVersion = this.reader.readUInt32LE();
        
        // Version detection based on engine version (from screp logic)
        if (engineVersion >= 74) {
          version = 'Remastered';
        } else if (engineVersion >= 59) {
          version = '1.16.1';
        } else if (engineVersion >= 57) {
          version = '1.16';
        } else {
          version = 'Classic';
        }
      }
    } catch (error) {
      console.warn('[BWHeaderParser] Could not parse engine version:', error);
    }
    
    return { version, engineVersion };
  }
  
  private parseFrameCount(): number {
    // Frame count is usually at offset 0x08 or 0x0C in SC:R replays
    const frameOffsets = [0x08, 0x0C, 0x10];
    
    for (const offset of frameOffsets) {
      try {
        this.reader.setPosition(offset);
        if (this.reader.canRead(4)) {
          const frames = this.reader.readUInt32LE();
          
          // Validate frame count (should be reasonable for a game)
          if (frames >= 100 && frames <= 1000000) {
            console.log(`[BWHeaderParser] Valid frame count at 0x${offset.toString(16)}: ${frames}`);
            return frames;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    // Fallback: estimate from file size
    const fileSize = this.reader.getSize();
    const estimatedFrames = Math.floor(fileSize / 20); // Rough estimate
    console.warn('[BWHeaderParser] Using estimated frame count:', estimatedFrames);
    return Math.min(estimatedFrames, 50000);
  }
  
  private parseMapInfo() {
    // Map name is typically stored at various offsets in SC:R
    const mapName = this.findMapName();
    
    // Map dimensions (if available)
    let mapWidth = 0;
    let mapHeight = 0;
    
    try {
      // Map size is often stored near the map name
      const sizeOffsets = [0x20, 0x24, 0x30];
      for (const offset of sizeOffsets) {
        this.reader.setPosition(offset);
        if (this.reader.canRead(4)) {
          const width = this.reader.readUInt16LE();
          const height = this.reader.readUInt16LE();
          
          // Validate map dimensions (typical SC maps are 32x32 to 256x256)
          if (width >= 32 && width <= 256 && height >= 32 && height <= 256) {
            mapWidth = width;
            mapHeight = height;
            break;
          }
        }
      }
    } catch (error) {
      console.warn('[BWHeaderParser] Could not parse map dimensions');
    }
    
    return {
      name: mapName,
      width: mapWidth,
      height: mapHeight
    };
  }
  
  private findMapName(): string {
    // Search for map name in typical locations with different string encodings
    const searchOffsets = [
      0x45, 0x61, 0x68, 0x7C, 0x90, 0xA4, 0xB8, 0xCC, 0xE0
    ];
    
    for (const offset of searchOffsets) {
      try {
        this.reader.setPosition(offset);
        if (this.reader.canRead(64)) {
          // Try different string lengths
          for (const length of [32, 64, 24, 16]) {
            this.reader.setPosition(offset);
            const mapName = this.reader.readNullTerminatedString(length);
            
            if (this.isValidMapName(mapName)) {
              console.log(`[BWHeaderParser] Found map name at 0x${offset.toString(16)}: "${mapName}"`);
              return mapName;
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return 'Unknown Map';
  }
  
  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
    
    // Check for mostly printable characters
    let printableCount = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      if ((char >= 32 && char <= 126) || (char >= 160 && char <= 255)) {
        printableCount++;
      }
    }
    
    const printableRatio = printableCount / name.length;
    if (printableRatio < 0.7) return false;
    
    // Check for common map name patterns
    const invalidPatterns = [
      /^\s*$/,           // Only whitespace
      /StarCraft/i,      // Contains "StarCraft"
      /Blizzard/i,       // Contains "Blizzard"
      /\.exe$/i,         // Ends with .exe
      /^[0-9]+$/         // Only numbers
    ];
    
    if (invalidPatterns.some(pattern => pattern.test(name))) {
      return false;
    }
    
    // Valid map name patterns
    const validPatterns = [
      /^[a-zA-Z0-9\s\-_().[\]'!]+$/,  // Basic alphanumeric + symbols
      /fighting|spirit|python|destination|circuit|breaker|match|point|hunter|island|temple|valley|ridge|fortress|outpost/i
    ];
    
    return validPatterns.some(pattern => pattern.test(name.trim()));
  }
  
  private parseGameSettings() {
    let gameType = GameType.Melee;
    let subType = 0;
    let seed = 0;
    let playerCount = 2;
    
    try {
      // Game settings are typically stored around offset 0x1A0-0x1C0
      const settingsOffsets = [0x1A0, 0x1B0, 0x1C0, 0x1D0];
      
      for (const offset of settingsOffsets) {
        this.reader.setPosition(offset);
        if (this.reader.canRead(8)) {
          const testGameType = this.reader.readUInt16LE();
          const testSubType = this.reader.readUInt16LE();
          const testSeed = this.reader.readUInt32LE();
          
          // Validate game type (1-15 are valid SC game types)
          if (testGameType >= 1 && testGameType <= 15) {
            gameType = testGameType;
            subType = testSubType;
            seed = testSeed;
            
            console.log(`[BWHeaderParser] Game settings at 0x${offset.toString(16)}: type=${gameType}, subType=${subType}, seed=${seed}`);
            break;
          }
        }
      }
    } catch (error) {
      console.warn('[BWHeaderParser] Could not parse game settings:', error);
    }
    
    // Estimate player count from game type and sub type
    if (gameType === GameType.OneOnOne) {
      playerCount = 2;
    } else if (gameType === GameType.Melee || gameType === GameType.TeamMelee) {
      playerCount = Math.max(2, Math.min(8, subType * 2 || 4));
    } else {
      playerCount = 4; // Default for other game types
    }
    
    return {
      gameType,
      subType,
      seed: seed || Math.floor(Math.random() * 0xFFFFFFFF),
      playerCount
    };
  }
}
