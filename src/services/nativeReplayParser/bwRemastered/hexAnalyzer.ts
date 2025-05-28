
/**
 * Hex Analyzer for StarCraft: Brood War Remastered replay files
 * Helps identify actual data structures and offsets
 */

import { BWBinaryReader } from './binaryReader';

export class BWHexAnalyzer {
  private reader: BWBinaryReader;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
  }

  /**
   * Comprehensive analysis of the replay file structure
   */
  analyzeReplayStructure(): void {
    console.log('[BWHexAnalyzer] === COMPREHENSIVE REPLAY ANALYSIS ===');
    
    // Show file header
    console.log('[BWHexAnalyzer] === FILE HEADER (0x00-0xFF) ===');
    console.log(this.reader.createHexDump(0x00, 256));
    
    // Look for potential string patterns
    this.searchForStringPatterns();
    
    // Look for player name patterns
    this.searchForPlayerNames();
    
    // Look for map name patterns
    this.searchForMapNames();
    
    // Analyze potential header fields
    this.analyzeHeaderFields();
  }

  /**
   * Search for readable string patterns in the file
   */
  private searchForStringPatterns(): void {
    console.log('[BWHexAnalyzer] === SEARCHING FOR STRING PATTERNS ===');
    
    const fileSize = this.reader.getRemainingBytes() + this.reader.getPosition();
    const scanSize = Math.min(2048, fileSize);
    
    for (let offset = 0; offset < scanSize; offset += 4) {
      try {
        this.reader.setPosition(offset);
        if (this.reader.canRead(32)) {
          const testString = this.reader.readFixedString(32);
          
          if (this.isLikelyPlayerName(testString)) {
            console.log(`[BWHexAnalyzer] Potential player name at 0x${offset.toString(16)}: "${testString}"`);
            console.log(`[BWHexAnalyzer] Context:`, this.reader.createHexDump(offset, 64));
          }
          
          if (this.isLikelyMapName(testString)) {
            console.log(`[BWHexAnalyzer] Potential map name at 0x${offset.toString(16)}: "${testString}"`);
            console.log(`[BWHexAnalyzer] Context:`, this.reader.createHexDump(offset, 64));
          }
        }
      } catch (e) {
        // Continue scanning
      }
    }
  }

  /**
   * Search specifically for player names using pattern recognition
   */
  private searchForPlayerNames(): void {
    console.log('[BWHexAnalyzer] === PLAYER NAME ANALYSIS ===');
    
    // Common player name locations in different replay versions
    const playerOffsets = [
      0x161, 0x1A1, 0x1C1, 0x200, 0x240, 0x280,
      0x18C, 0x1B0, 0x1D4, 0x1F8, 0x21C, 0x240, 0x264, 0x288
    ];
    
    playerOffsets.forEach(offset => {
      try {
        this.reader.setPosition(offset);
        if (this.reader.canRead(36)) {
          console.log(`[BWHexAnalyzer] Player slot analysis at 0x${offset.toString(16)}:`);
          console.log(this.reader.createHexDump(offset, 36));
          
          const name = this.reader.readFixedString(25);
          if (name.length > 0) {
            console.log(`[BWHexAnalyzer] Raw name: "${name}"`);
            console.log(`[BWHexAnalyzer] Is valid: ${this.isLikelyPlayerName(name)}`);
          }
        }
      } catch (e) {
        // Continue
      }
    });
  }

  /**
   * Search for map names in various locations
   */
  private searchForMapNames(): void {
    console.log('[BWHexAnalyzer] === MAP NAME ANALYSIS ===');
    
    const mapOffsets = [0x45, 0x61, 0x68, 0x7C, 0x90, 0xA4];
    
    mapOffsets.forEach(offset => {
      try {
        this.reader.setPosition(offset);
        if (this.reader.canRead(64)) {
          console.log(`[BWHexAnalyzer] Map name analysis at 0x${offset.toString(16)}:`);
          console.log(this.reader.createHexDump(offset, 64));
          
          const name = this.reader.readFixedString(32);
          if (name.length > 0) {
            console.log(`[BWHexAnalyzer] Raw map name: "${name}"`);
            console.log(`[BWHexAnalyzer] Is valid: ${this.isLikelyMapName(name)}`);
          }
        }
      } catch (e) {
        // Continue
      }
    });
  }

  /**
   * Analyze header fields at various offsets
   */
  private analyzeHeaderFields(): void {
    console.log('[BWHexAnalyzer] === HEADER FIELD ANALYSIS ===');
    
    // Check engine version, frame count, etc.
    const headerOffsets = [
      { offset: 0x00, name: 'Magic/Signature', size: 4 },
      { offset: 0x04, name: 'Engine Version', size: 4 },
      { offset: 0x08, name: 'Potential Frames 1', size: 4 },
      { offset: 0x0C, name: 'Potential Frames 2', size: 4 },
      { offset: 0x10, name: 'Potential Frames 3', size: 4 },
      { offset: 0x14, name: 'Unknown Field 1', size: 4 },
      { offset: 0x18, name: 'Unknown Field 2', size: 4 },
      { offset: 0x1C, name: 'Unknown Field 3', size: 4 }
    ];
    
    headerOffsets.forEach(({ offset, name, size }) => {
      try {
        this.reader.setPosition(offset);
        if (this.reader.canRead(size)) {
          const value = size === 4 ? this.reader.readUInt32LE() : this.reader.readUInt16LE();
          console.log(`[BWHexAnalyzer] ${name} at 0x${offset.toString(16)}: ${value} (0x${value.toString(16)})`);
          
          // Show hex context
          this.reader.setPosition(offset);
          console.log(`[BWHexAnalyzer] Context:`, this.reader.createHexDump(offset, 16));
        }
      } catch (e) {
        console.log(`[BWHexAnalyzer] Error reading ${name}:`, e);
      }
    });
  }

  /**
   * Check if string looks like a player name
   */
  private isLikelyPlayerName(str: string): boolean {
    if (!str || str.length < 2 || str.length > 25) return false;
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(str)) return false;
    
    // Check for reasonable character distribution
    let printableCount = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      if ((char >= 32 && char <= 126) || (char >= 160 && char <= 255)) {
        printableCount++;
      }
    }
    
    return (printableCount / str.length) >= 0.7;
  }

  /**
   * Check if string looks like a map name
   */
  private isLikelyMapName(str: string): boolean {
    if (!str || str.length < 3 || str.length > 32) return false;
    
    // Map names often have specific patterns
    const mapPatterns = [
      /\.(scm|scx)$/i,  // File extensions
      /^[a-zA-Z0-9\s\-_()[\]]{3,}$/,  // Alphanumeric with common symbols
      /fighting|spirit|python|destination|circuit|breaker|match|point/i  // Common map words
    ];
    
    return mapPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Dynamic offset discovery for player data
   */
  discoverPlayerDataOffset(): number | null {
    console.log('[BWHexAnalyzer] === DYNAMIC PLAYER OFFSET DISCOVERY ===');
    
    // Look for patterns that indicate player data structure
    for (let offset = 0x100; offset < Math.min(0x400, this.reader.getRemainingBytes()); offset += 4) {
      try {
        this.reader.setPosition(offset);
        
        // Player data typically has 25 bytes name + some control bytes
        if (this.reader.canRead(36)) {
          const testName = this.reader.readFixedString(25);
          
          if (this.isLikelyPlayerName(testName)) {
            // Check if this could be the start of player data structure
            this.reader.setPosition(offset + 25);
            if (this.reader.canRead(11)) {
              const controlBytes = this.reader.readBytes(11);
              
              // Look for reasonable race/team/color values
              const race = controlBytes[7]; // Typical race offset
              const team = controlBytes[8];
              const color = controlBytes[9];
              
              if (race <= 6 && team <= 7 && color <= 15) {
                console.log(`[BWHexAnalyzer] Found potential player data at 0x${offset.toString(16)}`);
                console.log(`[BWHexAnalyzer] Player: "${testName}", Race: ${race}, Team: ${team}, Color: ${color}`);
                return offset;
              }
            }
          }
        }
      } catch (e) {
        // Continue searching
      }
    }
    
    return null;
  }
}
