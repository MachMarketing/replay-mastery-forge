
/**
 * Header parser for StarCraft replay files
 */

import { BinaryReader } from './binaryReader';
import { ReplayHeader, PlayerInfo } from './types';
import { RACES, REPLAY_HEADER_SIZE, REPLAY_MAGIC } from './constants';

export class HeaderParser {
  private reader: BinaryReader;

  constructor(buffer: ArrayBuffer) {
    this.reader = new BinaryReader(buffer);
  }

  /**
   * Parse the replay header
   */
  parseHeader(): ReplayHeader {
    console.log('[HeaderParser] Starting header parse');
    
    // Check magic bytes
    const magic = this.reader.readFixedString(4);
    if (magic !== REPLAY_MAGIC) {
      throw new Error(`Invalid replay file: expected magic "${REPLAY_MAGIC}", got "${magic}"`);
    }

    console.log('[HeaderParser] Magic bytes verified');

    // Skip to version info
    this.reader.skip(4); // Skip some bytes
    const version = this.reader.readUInt32();
    
    console.log('[HeaderParser] Version:', version);

    // Skip to frame count (around offset 0x0C)
    this.reader.setPosition(0x0C);
    const frames = this.reader.readUInt32();
    
    console.log('[HeaderParser] Frames:', frames);

    // Skip to map name (around offset 0x61)
    this.reader.setPosition(0x61);
    const mapName = this.reader.readFixedString(32);
    
    console.log('[HeaderParser] Map name:', mapName);

    // Parse players (starts around offset 0x161)
    this.reader.setPosition(0x161);
    const players = this.parsePlayers();
    
    console.log('[HeaderParser] Found players:', players.length);

    // Game type info
    this.reader.setPosition(0x1A1);
    const gameType = this.reader.readByte();
    const gameSubType = this.reader.readByte();

    return {
      magic,
      version,
      frames,
      mapName: mapName.trim(),
      playerCount: players.length,
      players,
      gameType,
      gameSubType
    };
  }

  /**
   * Parse player information from header
   */
  private parsePlayers(): PlayerInfo[] {
    const players: PlayerInfo[] = [];
    
    // Parse up to 8 possible players
    for (let i = 0; i < 8; i++) {
      const startPos = this.reader.getPosition();
      
      // Player name (24 bytes)
      const name = this.reader.readFixedString(24);
      
      // Skip some bytes to get to race
      this.reader.skip(8);
      const race = this.reader.readByte();
      
      // Skip to team and color info
      this.reader.skip(3);
      const team = this.reader.readByte();
      const color = this.reader.readByte();
      
      // Only add active players (those with names)
      if (name.trim().length > 0 && race < 7) {
        players.push({
          id: i,
          name: name.trim(),
          race,
          raceString: RACES[race as keyof typeof RACES] || 'Unknown',
          team,
          color
        });
        
        console.log(`[HeaderParser] Player ${i}: ${name.trim()} (${RACES[race as keyof typeof RACES]})`);
      }
      
      // Move to next player slot (36 bytes per player)
      this.reader.setPosition(startPos + 36);
    }

    return players;
  }

  /**
   * Get the position where commands start
   */
  getCommandsStartPosition(): number {
    return REPLAY_HEADER_SIZE;
  }
}
