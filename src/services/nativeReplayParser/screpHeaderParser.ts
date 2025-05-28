
/**
 * Header parser for decompressed StarCraft replay data
 * Based on screp structure documentation
 */

export interface ScrepHeader {
  engineVersion: number;
  frameCount: number;
  randomSeed: number;
  playerSlots: Array<{
    playerId: number;
    slotId: number;
    name: string;
    race: number;
    raceString: string;
    team: number;
    color: number;
  }>;
  mapName: string;
  gameType: number;
  gameSubType: number;
}

export class ScrepHeaderParser {
  private data: Uint8Array;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  /**
   * Parse header from decompressed replay data
   */
  parseHeader(): ScrepHeader {
    console.log('[ScrepHeaderParser] Parsing decompressed header...');
    console.log('[ScrepHeaderParser] Data size:', this.data.length);

    // Based on screp structure.md, header layout:
    const engineVersion = this.readUint32LE(0x00);
    const frameCount = this.readUint32LE(0x04);
    const randomSeed = this.readUint32LE(0x08);

    console.log('[ScrepHeaderParser] Engine version:', engineVersion);
    console.log('[ScrepHeaderParser] Frame count:', frameCount);
    console.log('[ScrepHeaderParser] Random seed:', randomSeed);

    // Player slots start at offset 0x161 (353) according to screp docs
    const playerSlots = this.parsePlayerSlots();
    
    // Map name at offset 0x1CD (461)
    const mapName = this.parseMapName();

    // Game type information
    const gameType = this.readUint16LE(0x1C0);
    const gameSubType = this.readUint16LE(0x1C2);

    return {
      engineVersion,
      frameCount,
      randomSeed,
      playerSlots,
      mapName,
      gameType,
      gameSubType
    };
  }

  /**
   * Parse player slots according to screp specification
   */
  private parsePlayerSlots(): ScrepHeader['playerSlots'] {
    console.log('[ScrepHeaderParser] Parsing player slots...');
    
    const players: ScrepHeader['playerSlots'] = [];
    const playerSlotsOffset = 0x161; // 353 decimal

    // Parse 12 player slots (each 36 bytes)
    for (let i = 0; i < 12; i++) {
      const slotOffset = playerSlotsOffset + (i * 36);
      
      if (slotOffset + 36 > this.data.length) {
        console.warn('[ScrepHeaderParser] Not enough data for player slot', i);
        break;
      }

      // Player name (25 bytes, null-terminated)
      const nameBytes = this.data.slice(slotOffset, slotOffset + 25);
      const nameEnd = nameBytes.indexOf(0);
      const name = this.decodeString(nameBytes.slice(0, nameEnd > 0 ? nameEnd : 25));

      // Race at offset +32
      const race = this.data[slotOffset + 32];
      
      // Team at offset +33
      const team = this.data[slotOffset + 33];
      
      // Color at offset +34
      const color = this.data[slotOffset + 34];

      console.log(`[ScrepHeaderParser] Player slot ${i}:`, {
        name: name || '(empty)',
        race,
        team,
        color
      });

      // Only add players with actual names
      if (name && name.trim() && name !== 'Computer') {
        const raceStrings = ['Zerg', 'Terran', 'Protoss', 'Invalid', 'Invalid', 'Invalid', 'Random'];
        
        players.push({
          playerId: players.length,
          slotId: i,
          name: name.trim(),
          race,
          raceString: raceStrings[race] || 'Unknown',
          team,
          color
        });
      }
    }

    console.log('[ScrepHeaderParser] Found players:', players.map(p => `${p.name} (${p.raceString})`));
    return players;
  }

  /**
   * Parse map name according to screp specification
   */
  private parseMapName(): string {
    console.log('[ScrepHeaderParser] Parsing map name...');
    
    const mapNameOffset = 0x1CD; // 461 decimal
    const mapNameLength = 25;

    if (mapNameOffset + mapNameLength > this.data.length) {
      console.warn('[ScrepHeaderParser] Not enough data for map name');
      return 'Unknown Map';
    }

    const mapBytes = this.data.slice(mapNameOffset, mapNameOffset + mapNameLength);
    const mapEnd = mapBytes.indexOf(0);
    const mapName = this.decodeString(mapBytes.slice(0, mapEnd > 0 ? mapEnd : mapNameLength));

    console.log('[ScrepHeaderParser] Map name:', mapName || 'Unknown Map');
    return mapName || 'Unknown Map';
  }

  /**
   * Decode string with proper encoding handling
   */
  private decodeString(bytes: Uint8Array): string {
    if (bytes.length === 0) return '';

    try {
      // Try UTF-8 first
      const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return utf8.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
    } catch {
      try {
        // Fallback to Latin-1 for legacy replays
        const latin1 = new TextDecoder('iso-8859-1').decode(bytes);
        return latin1.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
      } catch {
        // Manual ASCII conversion as last resort
        let result = '';
        for (const byte of bytes) {
          if (byte >= 32 && byte <= 126) {
            result += String.fromCharCode(byte);
          }
        }
        return result.trim();
      }
    }
  }

  /**
   * Read 32-bit little-endian integer
   */
  private readUint32LE(offset: number): number {
    if (offset + 4 > this.data.length) return 0;
    return this.data[offset] |
           (this.data[offset + 1] << 8) |
           (this.data[offset + 2] << 16) |
           (this.data[offset + 3] << 24);
  }

  /**
   * Read 16-bit little-endian integer
   */
  private readUint16LE(offset: number): number {
    if (offset + 2 > this.data.length) return 0;
    return this.data[offset] | (this.data[offset + 1] << 8);
  }
}
