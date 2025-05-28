
/**
 * StarCraft: Remastered replay structure definitions (2017+)
 * Based on reverse engineering of current .rep format
 */

export interface RemasteredReplayHeader {
  // Core header (first 0x279 bytes)
  signature: number;           // 0x00: Usually 0x5265706C ("Repl")
  engineVersion: number;       // 0x04: Engine version (74+ for Remastered)
  unknown1: number;           // 0x08: Unknown field
  frameCount: number;         // 0x0C: Total frame count
  unknown2: number;           // 0x10: Unknown field
  saveTime: number;           // 0x14: Save timestamp
  unknown3: number[];         // 0x18-0x44: Various unknown fields
  mapName: string;           // 0x45: Map name (32 bytes, null-terminated)
  gameCreator: string;       // 0x65: Game creator (25 bytes)
  mapWidth: number;          // 0x7E: Map width
  mapHeight: number;         // 0x80: Map height
  unknown4: number[];        // 0x82-0x160: More unknown fields
}

export interface RemasteredPlayerSlot {
  // Player slot structure (36 bytes each, starting at 0x161)
  name: string;              // +0x00: Player name (25 bytes, null-terminated)
  unknown1: number;          // +0x19: Unknown byte
  unknown2: number;          // +0x1A: Unknown byte  
  slotType: number;          // +0x1B: Slot type (0=inactive, 2=computer, 6=human)
  race: number;              // +0x1C: Race (0=zerg, 1=terran, 2=protoss, 6=random)
  team: number;              // +0x1D: Team number
  unknown3: number;          // +0x1E: Unknown byte
  color: number;             // +0x1F: Player color
  unknown4: number[];        // +0x20-0x23: More unknown bytes
}

export interface RemasteredCommandStructure {
  // Commands start at 0x279 (633 decimal)
  frameSync: number;         // Frame synchronization commands
  commandType: number;       // Command type byte
  playerId: number;          // Player who issued command
  commandData: Uint8Array;   // Variable length command data
}

export class RemasteredStructureParser {
  private data: DataView;
  private buffer: Uint8Array;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new DataView(arrayBuffer);
    this.buffer = new Uint8Array(arrayBuffer);
  }

  /**
   * Parse Remastered replay header with correct 2017+ structure
   */
  parseHeader(): RemasteredReplayHeader {
    console.log('[RemasteredStructure] Parsing Remastered header...');
    
    // Read signature
    const signature = this.data.getUint32(0x00, true);
    console.log('[RemasteredStructure] Signature:', `0x${signature.toString(16)}`);
    
    // Read engine version (critical for Remastered detection)
    const engineVersion = this.data.getUint32(0x04, true);
    console.log('[RemasteredStructure] Engine version:', engineVersion);
    
    // Frame count is at 0x0C in Remastered format
    const frameCount = this.data.getUint32(0x0C, true);
    console.log('[RemasteredStructure] Frame count:', frameCount);
    
    // Save time
    const saveTime = this.data.getUint32(0x14, true);
    
    // Map name at 0x45 (32 bytes)
    const mapName = this.readString(0x45, 32);
    console.log('[RemasteredStructure] Map name:', mapName);
    
    // Game creator at 0x65 (25 bytes)
    const gameCreator = this.readString(0x65, 25);
    console.log('[RemasteredStructure] Game creator:', gameCreator);
    
    // Map dimensions
    const mapWidth = this.data.getUint16(0x7E, true);
    const mapHeight = this.data.getUint16(0x80, true);
    console.log('[RemasteredStructure] Map size:', `${mapWidth}x${mapHeight}`);
    
    return {
      signature,
      engineVersion,
      unknown1: this.data.getUint32(0x08, true),
      frameCount,
      unknown2: this.data.getUint32(0x10, true),
      saveTime,
      unknown3: [], // Placeholder for unknown fields
      mapName,
      gameCreator,
      mapWidth,
      mapHeight,
      unknown4: [] // Placeholder for unknown fields
    };
  }

  /**
   * Parse player slots with Remastered structure (starts at 0x161)
   */
  parsePlayerSlots(): RemasteredPlayerSlot[] {
    console.log('[RemasteredStructure] Parsing Remastered player slots...');
    
    const players: RemasteredPlayerSlot[] = [];
    const playerSlotsStart = 0x161; // Correct offset for Remastered
    
    // Parse up to 8 player slots (36 bytes each)
    for (let i = 0; i < 8; i++) {
      const slotOffset = playerSlotsStart + (i * 36);
      
      if (slotOffset + 36 > this.buffer.length) break;
      
      // Read player name (25 bytes)
      const name = this.readString(slotOffset, 25);
      
      // Read control bytes
      const slotType = this.buffer[slotOffset + 0x1B];
      const race = this.buffer[slotOffset + 0x1C];
      const team = this.buffer[slotOffset + 0x1D];
      const color = this.buffer[slotOffset + 0x1F];
      
      console.log(`[RemasteredStructure] Slot ${i}:`, {
        name: name || '(empty)',
        slotType,
        race,
        team,
        color,
        offset: `0x${slotOffset.toString(16)}`
      });
      
      // Only add if slot is active (slotType 2=computer, 6=human)
      if ((slotType === 2 || slotType === 6) && name.length > 0) {
        players.push({
          name,
          unknown1: this.buffer[slotOffset + 0x19],
          unknown2: this.buffer[slotOffset + 0x1A],
          slotType,
          race,
          team,
          unknown3: this.buffer[slotOffset + 0x1E],
          color,
          unknown4: []
        });
      }
    }
    
    console.log('[RemasteredStructure] Found active players:', players.length);
    return players;
  }

  /**
   * Read null-terminated string from buffer
   */
  private readString(offset: number, maxLength: number): string {
    const bytes: number[] = [];
    
    for (let i = 0; i < maxLength && offset + i < this.buffer.length; i++) {
      const byte = this.buffer[offset + i];
      if (byte === 0) break; // Null terminator
      if (byte >= 32 && byte <= 126) { // Printable ASCII
        bytes.push(byte);
      }
    }
    
    return String.fromCharCode(...bytes).trim();
  }

  /**
   * Convert race ID to string
   */
  static getRaceString(raceId: number): string {
    const races: Record<number, string> = {
      0: 'Zerg',
      1: 'Terran',
      2: 'Protoss',
      6: 'Random'
    };
    return races[raceId] || 'Unknown';
  }

  /**
   * Check if this looks like a Remastered replay
   */
  isRemasteredFormat(): boolean {
    // Check engine version
    const engineVersion = this.data.getUint32(0x04, true);
    console.log('[RemasteredStructure] Checking engine version:', engineVersion);
    
    // Remastered replays have engine version 74+
    if (engineVersion >= 74) return true;
    
    // Additional checks for frame count reasonableness
    const frameCount = this.data.getUint32(0x0C, true);
    if (frameCount > 0 && frameCount < 1000000) { // Reasonable frame count
      return true;
    }
    
    return false;
  }
}
