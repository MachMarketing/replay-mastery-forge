
/**
 * StarCraft: Brood War Remastered Header Parser
 * Based on icza/screp and BWAPI specification
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
    
    // Reset to beginning
    this.reader.setPosition(0);
    
    // Validate magic number "Repl" at offset 0x00
    const magic = this.reader.readFixedString(4);
    console.log('[BWHeaderParser] Magic bytes:', magic);
    
    if (magic !== 'Repl') {
      throw new Error(`Invalid replay file - expected "Repl", got "${magic}"`);
    }
    
    // Engine info at 0x04-0x07 (4 bytes)
    const engineVersion = this.reader.readUInt32LE();
    console.log('[BWHeaderParser] Engine version:', engineVersion);
    
    // Skip to frame count at 0x0C (12)
    this.reader.setPosition(0x0C);
    const totalFrames = this.reader.readUInt32LE();
    console.log('[BWHeaderParser] Total frames:', totalFrames);
    
    // Skip to save time at 0x10 (16) - 4 bytes
    const saveTime = this.reader.readUInt32LE();
    console.log('[BWHeaderParser] Save time:', saveTime);
    
    // Skip to map name at 0x68 (104) - 32 bytes
    this.reader.setPosition(0x68);
    console.log('[BWHeaderParser] Map name hex at 0x68:', this.reader.createHexDump(0x68, 32));
    const mapName = this.reader.readFixedString(32);
    console.log('[BWHeaderParser] Map name raw:', mapName);
    
    // Skip to game type at 0x1C0 (448) - 2 bytes
    this.reader.setPosition(0x1C0);
    const gameType = this.reader.readUInt16LE();
    console.log('[BWHeaderParser] Game type:', gameType);
    
    // Game sub type at 0x1C2 (450) - 2 bytes  
    const gameSubType = this.reader.readUInt16LE();
    console.log('[BWHeaderParser] Game sub type:', gameSubType);
    
    // Random seed at 0x1C4 (452) - 4 bytes
    const seed = this.reader.readUInt32LE();
    console.log('[BWHeaderParser] Random seed:', seed);
    
    return {
      version: this.determineVersion(engineVersion),
      seed,
      totalFrames,
      mapName: this.cleanMapName(mapName),
      playerCount: 0, // Will be determined by player parser
      gameType,
      gameSubType,
      saveTime
    };
  }

  private determineVersion(engineVersion: number): string {
    // Based on screp specification
    if (engineVersion >= 74) {
      return '1.18+'; // Remastered
    } else if (engineVersion >= 57) {
      return '1.16.1';
    } else {
      return '1.15.x';
    }
  }

  private cleanMapName(mapName: string): string {
    // Remove null bytes, trim whitespace
    return mapName.replace(/\0/g, '').trim();
  }
}
