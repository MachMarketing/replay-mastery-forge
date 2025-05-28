
/**
 * StarCraft: Brood War Player Parser
 * Enhanced with dynamic player data detection
 */

import { BWBinaryReader } from './binaryReader';
import { BWPlayer } from './types';
import { RACE_MAPPING } from './constants';
import { BWHexAnalyzer } from './hexAnalyzer';

export class BWPlayerParser {
  private reader: BWBinaryReader;
  private analyzer: BWHexAnalyzer;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
    this.analyzer = new BWHexAnalyzer(reader);
  }

  parsePlayers(): BWPlayer[] {
    console.log('[BWPlayerParser] Starting enhanced player parsing...');
    
    // First try to discover the actual player data offset
    const discoveredOffset = this.analyzer.discoverPlayerDataOffset();
    
    if (discoveredOffset) {
      console.log(`[BWPlayerParser] Using discovered offset: 0x${discoveredOffset.toString(16)}`);
      return this.parsePlayersAtOffset(discoveredOffset);
    }
    
    // Fallback to trying multiple known offsets
    const knownOffsets = [0x1A1, 0x161, 0x18C, 0x1B0, 0x200, 0x240];
    
    for (const offset of knownOffsets) {
      console.log(`[BWPlayerParser] Trying offset: 0x${offset.toString(16)}`);
      const players = this.parsePlayersAtOffset(offset);
      
      if (players.length > 0) {
        console.log(`[BWPlayerParser] Found ${players.length} players at offset 0x${offset.toString(16)}`);
        return players;
      }
    }
    
    // Last resort: scan the entire file
    console.log('[BWPlayerParser] No players found, scanning entire file...');
    return this.scanForPlayerNames();
  }

  private parsePlayersAtOffset(startOffset: number): BWPlayer[] {
    const players: BWPlayer[] = [];
    
    console.log(`[BWPlayerParser] Parsing players at offset 0x${startOffset.toString(16)}`);
    console.log('[BWPlayerParser] Player area hex dump:');
    console.log(this.reader.createHexDump(startOffset, 288)); // 8 players * 36 bytes
    
    // Parse up to 8 player slots
    for (let slotIndex = 0; slotIndex < 8; slotIndex++) {
      const slotOffset = startOffset + (slotIndex * 36);
      
      if (slotOffset + 36 > this.reader.getRemainingBytes() + this.reader.getPosition()) {
        break;
      }
      
      try {
        this.reader.setPosition(slotOffset);
        
        console.log(`[BWPlayerParser] Parsing slot ${slotIndex} at offset 0x${slotOffset.toString(16)}`);
        console.log(`[BWPlayerParser] Slot ${slotIndex} hex:`, this.reader.createHexDump(slotOffset, 36));
        
        // Try different name field sizes
        const nameFieldSizes = [25, 24, 32];
        let playerName = '';
        let bestNameSize = 25;
        
        for (const nameSize of nameFieldSizes) {
          this.reader.setPosition(slotOffset);
          const testName = this.reader.readFixedString(nameSize);
          
          if (this.isValidPlayerName(testName) && testName.length > playerName.length) {
            playerName = testName;
            bestNameSize = nameSize;
          }
        }
        
        console.log(`[BWPlayerParser] Slot ${slotIndex} best name (size ${bestNameSize}): "${playerName}"`);
        
        if (!this.isValidPlayerName(playerName)) {
          console.log(`[BWPlayerParser] Slot ${slotIndex} invalid name, skipping`);
          continue;
        }
        
        // Read race, team, color at different possible offsets
        let race = 0;
        let team = 0;
        let color = 0;
        
        // Try different control byte layouts
        const controlOffsets = [25, 24, 32];
        for (const ctrlOffset of controlOffsets) {
          this.reader.setPosition(slotOffset + ctrlOffset);
          if (this.reader.canRead(11)) {
            const controlBytes = this.reader.readBytes(11);
            
            // Test different race positions within control bytes
            for (let racePos = 0; racePos < 8; racePos++) {
              const testRace = controlBytes[racePos];
              if (testRace <= 6) { // Valid race range
                race = testRace;
                team = controlBytes[Math.min(racePos + 1, 10)] % 8;
                color = controlBytes[Math.min(racePos + 2, 10)] % 16;
                break;
              }
            }
            
            if (race <= 6) break; // Found valid race
          }
        }
        
        const player: BWPlayer = {
          name: playerName,
          race,
          raceString: this.getRaceString(race),
          slotId: slotIndex,
          team: team,
          color: color
        };
        
        players.push(player);
        console.log(`[BWPlayerParser] Found player:`, {
          name: player.name,
          race: player.raceString,
          slot: slotIndex,
          team: player.team,
          color: player.color
        });
        
      } catch (error) {
        console.warn(`[BWPlayerParser] Error parsing slot ${slotIndex}:`, error);
        continue;
      }
    }
    
    return players;
  }

  private scanForPlayerNames(): BWPlayer[] {
    console.log('[BWPlayerParser] Scanning entire file for player names...');
    const players: BWPlayer[] = [];
    const foundNames = new Set<string>();
    
    const fileSize = this.reader.getRemainingBytes() + this.reader.getPosition();
    const scanSize = Math.min(4096, fileSize);
    
    for (let offset = 0x100; offset < scanSize; offset += 1) {
      try {
        this.reader.setPosition(offset);
        if (!this.reader.canRead(32)) break;
        
        // Try different name lengths
        for (const nameLength of [25, 24, 32, 16]) {
          this.reader.setPosition(offset);
          const testName = this.reader.readFixedString(nameLength);
          
          if (this.isValidPlayerName(testName) && 
              testName.length >= 2 && 
              !foundNames.has(testName)) {
            
            console.log(`[BWPlayerParser] Found potential player at 0x${offset.toString(16)}: "${testName}"`);
            foundNames.add(testName);
            
            const player: BWPlayer = {
              name: testName,
              race: 0,
              raceString: 'Unknown' as const,
              slotId: players.length,
              team: 0,
              color: players.length % 16
            };
            
            players.push(player);
            
            if (players.length >= 8) break;
          }
        }
        
        if (players.length >= 8) break;
      } catch (e) {
        // Continue scanning
      }
    }
    
    return players;
  }

  private isValidPlayerName(name: string): boolean {
    if (!name || name.length === 0 || name.length > 25) {
      return false;
    }
    
    // Check for printable characters with better encoding support
    let printableCount = 0;
    let letterCount = 0;
    
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      
      // ASCII printable
      if (char >= 32 && char <= 126) {
        printableCount++;
        if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
          letterCount++;
        }
      }
      // Extended ASCII (Windows-1252, Korean, etc.)
      else if (char >= 160 && char <= 255) {
        printableCount++;
      }
      // Korean Hangul range (very common in SC replays)
      else if (char >= 0xAC00 && char <= 0xD7AF) {
        printableCount++;
        letterCount++;
      }
    }
    
    // Must be mostly printable
    if (printableCount / name.length < 0.6) {
      return false;
    }
    
    // Must contain at least one letter or be very short
    if (letterCount === 0 && name.length > 4) {
      return false;
    }
    
    // Check for obvious garbage patterns
    const uniqueChars = new Set(name.toLowerCase()).size;
    if (uniqueChars < 2 && name.length > 3) {
      return false;
    }
    
    // Check for common player name patterns
    const namePatterns = [
      /^[a-zA-Z0-9_\-\[\]{}()]+$/,  // Basic alphanumeric + symbols
      /^[a-zA-Z]/,  // Starts with letter
      /\d+$/,  // Ends with numbers (common pattern)
    ];
    
    return namePatterns.some(pattern => pattern.test(name.trim()));
  }

  private getRaceString(raceId: number): 'Zerg' | 'Terran' | 'Protoss' | 'Random' | 'Unknown' {
    const raceMap = RACE_MAPPING[raceId as keyof typeof RACE_MAPPING];
    if (raceMap) {
      return raceMap;
    }
    
    console.warn(`[BWPlayerParser] Unknown race ID: ${raceId}`);
    return 'Unknown';
  }
}
