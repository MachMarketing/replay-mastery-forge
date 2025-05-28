
/**
 * StarCraft: Brood War Remastered Player Parser
 * Based on real .rep file analysis and dynamic detection
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
    console.log('[BWPlayerParser] Starting dynamic player detection...');
    
    // First detect the format to find the correct player data offset
    const format = this.reader.detectFormat();
    const playerDataOffset = format.playerDataOffset;
    
    console.log(`[BWPlayerParser] Using player data offset: 0x${playerDataOffset.toString(16)}`);
    
    const players: BWPlayer[] = [];
    
    // Try different slot sizes (36 or 37 bytes are common)
    const slotSizes = [36, 37, 32, 40];
    
    for (const slotSize of slotSizes) {
      console.log(`[BWPlayerParser] Trying slot size: ${slotSize} bytes`);
      const foundPlayers = this.tryParseWithSlotSize(playerDataOffset, slotSize);
      
      if (foundPlayers.length > 0) {
        console.log(`[BWPlayerParser] Successfully found ${foundPlayers.length} players with slot size ${slotSize}`);
        return foundPlayers;
      }
    }
    
    // If nothing worked, try scanning for player names
    console.log('[BWPlayerParser] Trying dynamic player name scanning...');
    return this.scanForPlayerNames();
  }

  private tryParseWithSlotSize(baseOffset: number, slotSize: number): BWPlayer[] {
    const players: BWPlayer[] = [];
    const maxSlots = 8;
    
    for (let slotIndex = 0; slotIndex < maxSlots; slotIndex++) {
      const slotOffset = baseOffset + (slotIndex * slotSize);
      
      if (slotOffset + slotSize > this.reader.getRemainingBytes() + this.reader.getPosition()) {
        break;
      }
      
      try {
        this.reader.setPosition(slotOffset);
        
        // Read player name (first 25 bytes typically)
        const nameLength = Math.min(25, slotSize - 10); // Leave room for other data
        const playerName = this.reader.readFixedString(nameLength);
        
        // Skip if no valid name
        if (playerName.length === 0 || playerName.length > 25) {
          continue;
        }
        
        // Check if the name looks reasonable
        if (!this.isValidPlayerName(playerName)) {
          continue;
        }
        
        // Try to read race, team, color from different positions within the slot
        let race = 0;
        let team = 0;
        let color = 0;
        
        // Race is typically near the end of the slot
        const raceOffsets = [32, 30, 28, slotSize - 5, slotSize - 3];
        for (const raceOffset of raceOffsets) {
          if (raceOffset < slotSize) {
            this.reader.setPosition(slotOffset + raceOffset);
            if (this.reader.canRead(1)) {
              const testRace = this.reader.readUInt8();
              if (testRace >= 0 && testRace <= 6) {
                race = testRace;
                break;
              }
            }
          }
        }
        
        // Team and color are usually near race
        try {
          this.reader.setPosition(slotOffset + Math.min(33, slotSize - 2));
          if (this.reader.canRead(2)) {
            team = this.reader.readUInt8();
            color = this.reader.readUInt8();
          }
        } catch (e) {
          // Use defaults
        }
        
        const player: BWPlayer = {
          name: playerName,
          race,
          raceString: this.getRaceString(race),
          slotId: slotIndex,
          team: team % 8,
          color: color % 16
        };
        
        players.push(player);
        console.log(`[BWPlayerParser] Found player in slot ${slotIndex}:`, player);
      } catch (error) {
        // This slot failed, continue with next
        continue;
      }
    }
    
    return players;
  }

  private scanForPlayerNames(): BWPlayer[] {
    console.log('[BWPlayerParser] Scanning entire file for player names...');
    const players: BWPlayer[] = [];
    
    // Search through the file for player name patterns
    const startOffset = 0x100; // Skip header area
    const endOffset = Math.min(startOffset + 2000, this.reader.getRemainingBytes()); // Don't scan too far
    
    for (let offset = startOffset; offset < endOffset; offset += 4) {
      try {
        this.reader.setPosition(offset);
        if (!this.reader.canRead(25)) break;
        
        const testName = this.reader.readFixedString(25);
        
        if (this.isValidPlayerName(testName) && testName.length >= 2) {
          // Found a potential player name
          const player: BWPlayer = {
            name: testName,
            race: 0, // Unknown
            raceString: 'Unknown' as const,
            slotId: players.length,
            team: 0,
            color: players.length % 16
          };
          
          players.push(player);
          console.log(`[BWPlayerParser] Found player name at offset 0x${offset.toString(16)}:`, testName);
          
          // Skip ahead to avoid finding the same name multiple times
          offset += 25;
          
          if (players.length >= 8) break; // Max 8 players
        }
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
    
    // Check for printable characters
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      if (char < 32 || char > 126) {
        return false;
      }
    }
    
    // Check if it's not just repeated characters or obvious garbage
    const uniqueChars = new Set(name.toLowerCase()).size;
    if (uniqueChars < 2 && name.length > 3) {
      return false;
    }
    
    // Check if it contains at least one letter
    const hasLetter = /[a-zA-Z]/.test(name);
    if (!hasLetter) {
      return false;
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
