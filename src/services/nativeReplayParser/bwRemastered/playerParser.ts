
/**
 * StarCraft: Brood War Player Parser
 * Based on correct screp specification for .rep files
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
    console.log('[BWPlayerParser] Starting player parsing with correct .rep offsets...');
    
    // According to screp specification, player data starts at 0x1A1 (417 decimal)
    const playerDataOffset = 0x1A1;
    console.log(`[BWPlayerParser] Using correct player offset: 0x${playerDataOffset.toString(16)}`);
    
    this.reader.setPosition(playerDataOffset);
    
    // Show hex dump of player area for debugging
    console.log('[BWPlayerParser] Player area hex dump:');
    console.log(this.reader.createHexDump(playerDataOffset, 256));
    
    const players: BWPlayer[] = [];
    
    // Parse 8 possible player slots (36 bytes each according to screp)
    for (let slotIndex = 0; slotIndex < 8; slotIndex++) {
      const slotOffset = playerDataOffset + (slotIndex * 36);
      
      if (slotOffset + 36 > this.reader.getRemainingBytes() + this.reader.getPosition()) {
        break;
      }
      
      try {
        this.reader.setPosition(slotOffset);
        
        console.log(`[BWPlayerParser] Parsing slot ${slotIndex} at offset 0x${slotOffset.toString(16)}`);
        console.log(`[BWPlayerParser] Slot ${slotIndex} hex:`, this.reader.createHexDump(slotOffset, 36));
        
        // Read player name (first 25 bytes)
        const playerName = this.reader.readFixedString(25);
        console.log(`[BWPlayerParser] Slot ${slotIndex} raw name: "${playerName}"`);
        
        if (playerName.length === 0 || !this.isValidPlayerName(playerName)) {
          console.log(`[BWPlayerParser] Slot ${slotIndex} invalid name, skipping`);
          continue;
        }
        
        // Read race (byte 32 according to screp)
        this.reader.setPosition(slotOffset + 32);
        const race = this.reader.canRead(1) ? this.reader.readUInt8() : 0;
        
        // Read team and color
        const team = this.reader.canRead(1) ? this.reader.readUInt8() : 0;
        const color = this.reader.canRead(1) ? this.reader.readUInt8() : 0;
        
        const player: BWPlayer = {
          name: playerName,
          race,
          raceString: this.getRaceString(race),
          slotId: slotIndex,
          team: team % 8,
          color: color % 16
        };
        
        players.push(player);
        console.log(`[BWPlayerParser] Found player:`, {
          name: player.name,
          race: player.raceString,
          slot: slotIndex,
          team: player.team
        });
        
      } catch (error) {
        console.warn(`[BWPlayerParser] Error parsing slot ${slotIndex}:`, error);
        continue;
      }
    }
    
    // If no players found with standard method, try alternative scanning
    if (players.length === 0) {
      console.log('[BWPlayerParser] No players found with standard method, trying scan...');
      return this.scanForPlayerNames();
    }
    
    console.log(`[BWPlayerParser] Successfully found ${players.length} players`);
    return players;
  }

  private scanForPlayerNames(): BWPlayer[] {
    console.log('[BWPlayerParser] Scanning file for player names...');
    const players: BWPlayer[] = [];
    
    // Scan a reasonable area around the expected player data
    const startOffset = 0x100;
    const endOffset = Math.min(startOffset + 1000, this.reader.getRemainingBytes());
    
    for (let offset = startOffset; offset < endOffset; offset += 1) {
      try {
        this.reader.setPosition(offset);
        if (!this.reader.canRead(25)) break;
        
        const testName = this.reader.readFixedString(25);
        
        if (this.isValidPlayerName(testName) && testName.length >= 2) {
          console.log(`[BWPlayerParser] Found potential player at 0x${offset.toString(16)}: "${testName}"`);
          
          // Check if we already found this name
          if (players.some(p => p.name === testName)) {
            continue;
          }
          
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
    let printableCount = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      if ((char >= 32 && char <= 126) || (char >= 128 && char <= 255)) {
        printableCount++;
      }
    }
    
    // Must be mostly printable
    if (printableCount / name.length < 0.8) {
      return false;
    }
    
    // Check if it contains at least one letter
    const hasLetter = /[a-zA-Z]/.test(name);
    if (!hasLetter) {
      return false;
    }
    
    // Check for obvious garbage patterns
    const uniqueChars = new Set(name.toLowerCase()).size;
    if (uniqueChars < 2 && name.length > 3) {
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
