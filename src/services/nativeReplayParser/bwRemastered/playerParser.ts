
/**
 * StarCraft: Brood War Remastered Player Parser
 * Based on icza/screp specification
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
    console.log('[BWPlayerParser] Starting player parse...');
    const players: BWPlayer[] = [];
    
    // Player data starts at offset 0x1A1 (417)
    // Each player slot is 37 bytes according to screp
    const playerDataOffset = 0x1A1;
    const playerSlotSize = 37;
    const maxPlayerSlots = 8;
    
    console.log('[BWPlayerParser] Player data starts at offset:', `0x${playerDataOffset.toString(16)}`);
    console.log('[BWPlayerParser] Player slot size:', playerSlotSize, 'bytes');
    
    for (let slotIndex = 0; slotIndex < maxPlayerSlots; slotIndex++) {
      const slotOffset = playerDataOffset + (slotIndex * playerSlotSize);
      console.log(`[BWPlayerParser] Parsing slot ${slotIndex} at offset 0x${slotOffset.toString(16)}`);
      
      // Show hex dump of this slot for debugging
      console.log(`[BWPlayerParser] Slot ${slotIndex} hex dump:`, this.reader.createHexDump(slotOffset, playerSlotSize));
      
      this.reader.setPosition(slotOffset);
      
      // Player name is first 25 bytes (0x00-0x18)
      const playerName = this.reader.readFixedString(25);
      console.log(`[BWPlayerParser] Slot ${slotIndex} name: "${playerName}"`);
      
      // Skip if no name (empty slot)
      if (playerName.length === 0) {
        console.log(`[BWPlayerParser] Slot ${slotIndex} is empty, skipping`);
        continue;
      }
      
      // Skip padding bytes to get to race info
      // Race is at offset +32 from slot start (0x20)
      this.reader.setPosition(slotOffset + 32);
      const race = this.reader.readUInt8();
      console.log(`[BWPlayerParser] Slot ${slotIndex} race byte: ${race} (0x${race.toString(16)})`);
      
      // Team at offset +33 (0x21)
      const team = this.reader.readUInt8();
      console.log(`[BWPlayerParser] Slot ${slotIndex} team: ${team}`);
      
      // Color at offset +34 (0x22)
      const color = this.reader.readUInt8();
      console.log(`[BWPlayerParser] Slot ${slotIndex} color: ${color}`);
      
      // Determine race string
      const raceString = this.getRaceString(race);
      console.log(`[BWPlayerParser] Slot ${slotIndex} race string: ${raceString}`);
      
      // Create player object
      const player: BWPlayer = {
        name: playerName,
        race,
        raceString,
        slotId: slotIndex,
        team,
        color
      };
      
      players.push(player);
      console.log(`[BWPlayerParser] Added player:`, player);
    }
    
    console.log('[BWPlayerParser] Found players:', players.map(p => `${p.name} (${p.raceString})`));
    return players;
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
