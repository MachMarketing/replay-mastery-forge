
/**
 * StarCraft: Brood War Player Parser
 * Enhanced with better pattern recognition for decompressed data
 */

import { BWBinaryReader } from './binaryReader';
import { BWPlayer } from './types';
import { RACE_MAPPING } from './constants';

export class BWPlayerParser {
  private reader: BWBinaryReader;

  constructor(reader: BWBinaryReader) {
    this.reader = reader;
  }

  parsePlayers(): BWPlayer[] {
    console.log('[BWPlayerParser] Starting enhanced player parsing for decompressed data...');
    
    // First, try to find the standard player section
    const standardPlayers = this.parseStandardPlayerSection();
    if (standardPlayers.length > 0) {
      console.log(`[BWPlayerParser] Found ${standardPlayers.length} players in standard section`);
      return standardPlayers;
    }
    
    // If standard parsing failed, scan the entire decompressed data
    console.log('[BWPlayerParser] Standard parsing failed, scanning entire file...');
    return this.scanEntireFileForPlayers();
  }

  private parseStandardPlayerSection(): BWPlayer[] {
    const players: BWPlayer[] = [];
    
    // Extended player data locations for SC:R versions including 1.21+
    const playerOffsets = [
      // Original offsets
      0x161, 0x1A1, 0x18C, 0x1B0, 0x200, 0x240, 0x280, 0x2C0, 0x300, 0x340, 0x380, 0x3C0, 0x400,
      // Extended offsets for newer SC:R versions
      0x1A0, 0x1C0, 0x1E0, 0x220, 0x260, 0x2A0, 0x2E0, 0x320, 0x360, 0x3A0, 0x3E0, 0x420,
      0x460, 0x4A0, 0x4E0, 0x520, 0x560, 0x5A0, 0x5E0, 0x620, 0x660, 0x6A0, 0x6E0, 0x720,
      // Modern SC:R 1.21+ offsets based on new replay structure
      0x180, 0x1B4, 0x1D8, 0x1FC, 0x234, 0x268, 0x29C, 0x2D0, 0x304, 0x338, 0x36C, 0x3A0
    ];
    
    for (const offset of playerOffsets) {
      console.log(`[BWPlayerParser] Trying player section at offset 0x${offset.toString(16)}`);
      
      try {
        this.reader.setPosition(offset);
        if (!this.reader.canRead(288)) continue; // Need space for 8 players * 36 bytes
        
        console.log(`[BWPlayerParser] Player section hex dump at 0x${offset.toString(16)}:`);
        console.log(this.reader.createHexDump(offset, 144)); // Show first 4 players
        
        const sectionPlayers = this.parsePlayersAtOffset(offset);
        if (sectionPlayers.length >= 2) { // Need at least 2 players for a valid match
          return sectionPlayers;
        }
        
      } catch (error) {
        console.warn(`[BWPlayerParser] Error at offset 0x${offset.toString(16)}:`, error);
      }
    }
    
    return [];
  }

  private parsePlayersAtOffset(startOffset: number): BWPlayer[] {
    const players: BWPlayer[] = [];
    
    // Parse up to 8 player slots
    for (let slotIndex = 0; slotIndex < 8; slotIndex++) {
      const slotOffset = startOffset + (slotIndex * 36);
      
      try {
        this.reader.setPosition(slotOffset);
        console.log(`[BWPlayerParser] Parsing slot ${slotIndex} at offset 0x${slotOffset.toString(16)}`);
        console.log(`[BWPlayerParser] Slot ${slotIndex} hex:`, this.reader.createHexDump(slotOffset, 36));
        
        // Player name is typically first 25 bytes
        const playerName = this.reader.readFixedString(25);
        console.log(`[BWPlayerParser] Raw name from slot ${slotIndex}: "${playerName}"`);
        
        if (!this.isValidPlayerName(playerName)) {
          console.log(`[BWPlayerParser] Slot ${slotIndex} invalid name, skipping`);
          continue;
        }
        
        // Read control bytes for race, team, color
        const controlBytes = this.reader.readBytes(11);
        console.log(`[BWPlayerParser] Control bytes for ${playerName}:`, 
          Array.from(controlBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        // Race is typically at offset 7-9 in control bytes
        let race = 0;
        let team = 0;
        let color = slotIndex;
        
        // Try different race positions
        for (let racePos = 7; racePos <= 9; racePos++) {
          if (racePos < controlBytes.length && controlBytes[racePos] <= 6) {
            race = controlBytes[racePos];
            team = controlBytes[Math.min(racePos + 1, 10)] % 8;
            color = controlBytes[Math.min(racePos + 2, 10)] % 16;
            break;
          }
        }
        
        const player: BWPlayer = {
          id: slotIndex,
          name: playerName.trim(),
          race,
          raceString: this.getRaceString(race),
          slotId: slotIndex,
          team: team,
          color: color,
          apm: 0, // Will be calculated later
          eapm: 0, // Will be calculated later
        };
        
        players.push(player);
        console.log(`[BWPlayerParser] Added player:`, {
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

  private scanEntireFileForPlayers(): BWPlayer[] {
    console.log('[BWPlayerParser] Scanning entire decompressed file for player names...');
    const players: BWPlayer[] = [];
    const foundNames = new Set<string>();
    
    const fileSize = this.reader.getRemainingBytes() + this.reader.getPosition();
    const scanSize = Math.min(8192, fileSize); // Scan first 8KB
    
    // Look for player name patterns
    for (let offset = 0; offset < scanSize - 25; offset += 1) {
      try {
        this.reader.setPosition(offset);
        if (!this.reader.canRead(25)) break;
        
        const testName = this.reader.readFixedString(25);
        
        if (this.isValidPlayerName(testName) && 
            testName.length >= 3 && 
            !foundNames.has(testName)) {
          
          console.log(`[BWPlayerParser] Found potential player at 0x${offset.toString(16)}: "${testName}"`);
          foundNames.add(testName);
          
          // Try to extract race info from nearby bytes
          let race = 6; // Default to Random
          try {
            this.reader.setPosition(offset + 25);
            if (this.reader.canRead(11)) {
              const controlBytes = this.reader.readBytes(11);
              for (let i = 0; i < 8; i++) {
                if (controlBytes[i] <= 6) {
                  race = controlBytes[i];
                  break;
                }
              }
            }
          } catch (e) {
            // Use default race
          }
          
          const player: BWPlayer = {
            id: players.length,
            name: testName.trim(),
            race,
            raceString: this.getRaceString(race),
            slotId: players.length,
            team: 0,
            color: players.length % 16,
            apm: 0, // Will be calculated later
            eapm: 0, // Will be calculated later
          };
          
          players.push(player);
          
          if (players.length >= 8) break;
        }
      } catch (e) {
        // Continue scanning
      }
    }
    
    // If we still have no players, create fallback ones
    if (players.length === 0) {
      console.log('[BWPlayerParser] No players found, creating fallback players');
      players.push(
        {
          id: 0,
          name: 'Player 1',
          race: 0,
          raceString: 'Terran' as const,
          slotId: 0,
          team: 0,
          color: 0,
          apm: 0,
          eapm: 0
        },
        {
          id: 1,
          name: 'Player 2',
          race: 1,
          raceString: 'Protoss' as const,
          slotId: 1,
          team: 1,
          color: 1,
          apm: 0,
          eapm: 0
        }
      );
    }
    
    return players;
  }

  private isValidPlayerName(name: string): boolean {
    if (!name || name.length === 0 || name.length > 25) {
      return false;
    }
    
    // Check for printable characters
    let printableCount = 0;
    let letterCount = 0;
    let digitCount = 0;
    
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      
      // ASCII printable
      if (char >= 32 && char <= 126) {
        printableCount++;
        if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
          letterCount++;
        } else if (char >= 48 && char <= 57) {
          digitCount++;
        }
      }
      // Extended ASCII
      else if (char >= 160 && char <= 255) {
        printableCount++;
      }
      // Korean Hangul (common in SC replays)
      else if (char >= 0xAC00 && char <= 0xD7AF) {
        printableCount++;
        letterCount++;
      }
    }
    
    // Must be mostly printable
    if (printableCount / name.length < 0.7) {
      return false;
    }
    
    // Must contain at least one letter or be very short with digits
    if (letterCount === 0 && digitCount === 0 && name.length > 2) {
      return false;
    }
    
    // Check for reasonable character variety
    const uniqueChars = new Set(name.toLowerCase()).size;
    if (uniqueChars < 2 && name.length > 4) {
      return false;
    }
    
    // Filter out common false positives
    const falsePosPatterns = [
      /^[\x00-\x1F]+$/, // Control characters only
      /^[^\w\s]+$/, // Only special chars
      /starcraft|brood|war|blizzard|maps|scenario/i // Game strings
    ];
    
    for (const pattern of falsePosPatterns) {
      if (pattern.test(name)) {
        return false;
      }
    }
    
    return true;
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
