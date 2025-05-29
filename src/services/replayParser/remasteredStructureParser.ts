
/**
 * Dedicated StarCraft: Remastered structure parser
 * Based on reverse-engineered Remastered replay format (2017+)
 */

export interface RemasteredReplayStructure {
  header: {
    signature: string;
    engineVersion: number;
    frameCount: number;
    saveTime: number;
    mapName: string;
    gameCreator: string;
    mapWidth: number;
    mapHeight: number;
  };
  players: {
    id: number;
    name: string;
    race: string;
    slotType: number;
    team: number;
    color: number;
  }[];
  commandSection: {
    offset: number;
    commands: Array<{
      frame: number;
      playerId: number;
      type: number;
      action: string;
      unitName?: string;
    }>;
  };
}

export class RemasteredStructureParser {
  private data: DataView;
  private buffer: Uint8Array;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new DataView(arrayBuffer);
    this.buffer = new Uint8Array(arrayBuffer);
  }

  /**
   * Parse complete Remastered replay structure
   */
  parse(): RemasteredReplayStructure {
    console.log('[RemasteredStructure] Parsing with correct Remastered format');
    
    const header = this.parseRemasteredHeader();
    const players = this.parseRemasteredPlayers();
    const commandSection = this.parseRemasteredCommands();

    return {
      header,
      players,
      commandSection
    };
  }

  /**
   * Parse Remastered header (correct offsets)
   */
  private parseRemasteredHeader() {
    // Signature at 0x00 (should be "Repl" or similar)
    const signatureBytes = new Uint8Array(this.buffer.slice(0, 4));
    const signature = String.fromCharCode(...signatureBytes);

    // Engine version at 0x04 (Remastered = 74+)
    const engineVersion = this.data.getUint32(0x04, true);
    
    // Frame count at 0x0C
    const frameCount = this.data.getUint32(0x0C, true);
    
    // Save time at 0x14
    const saveTime = this.data.getUint32(0x14, true);
    
    // Map name at 0x45 (32 bytes, null-terminated)
    const mapName = this.readNullTerminatedString(0x45, 32);
    
    // Game creator at 0x65 (25 bytes)
    const gameCreator = this.readNullTerminatedString(0x65, 25);
    
    // Map dimensions at 0x7E and 0x80
    const mapWidth = this.data.getUint16(0x7E, true);
    const mapHeight = this.data.getUint16(0x80, true);

    console.log('[RemasteredStructure] Header parsed:', {
      signature,
      engineVersion,
      frameCount,
      mapName,
      gameCreator,
      mapDimensions: `${mapWidth}x${mapHeight}`
    });

    return {
      signature,
      engineVersion,
      frameCount,
      saveTime,
      mapName,
      gameCreator,
      mapWidth,
      mapHeight
    };
  }

  /**
   * Parse Remastered players (starts at 0x161)
   */
  private parseRemasteredPlayers() {
    const players = [];
    const playerSlotsStart = 0x161; // 357 decimal
    
    console.log('[RemasteredStructure] Parsing players from offset', playerSlotsStart);

    // 8 player slots, 36 bytes each
    for (let i = 0; i < 8; i++) {
      const slotOffset = playerSlotsStart + (i * 36);
      
      if (slotOffset + 36 > this.buffer.length) break;

      // Player name: first 25 bytes
      const name = this.readNullTerminatedString(slotOffset, 25);
      
      // Slot control info
      const slotType = this.buffer[slotOffset + 0x1B]; // +27
      const race = this.buffer[slotOffset + 0x1C];     // +28
      const team = this.buffer[slotOffset + 0x1D];     // +29
      const color = this.buffer[slotOffset + 0x1F];    // +31

      console.log(`[RemasteredStructure] Slot ${i}:`, {
        name: name || '(empty)',
        slotType,
        race,
        team,
        color,
        active: slotType === 2 || slotType === 6
      });

      // Only add active players (2=computer, 6=human)
      if ((slotType === 2 || slotType === 6) && name.length > 0) {
        players.push({
          id: i,
          name: this.cleanPlayerName(name),
          race: this.mapRaceId(race),
          slotType,
          team,
          color
        });
      }
    }

    console.log('[RemasteredStructure] Active players found:', players.length);
    return players;
  }

  /**
   * Parse Remastered command section (starts at 0x279)
   */
  private parseRemasteredCommands() {
    const commandOffset = 0x279; // 633 decimal
    let position = commandOffset;
    let currentFrame = 0;
    const commands = [];
    
    console.log('[RemasteredStructure] Parsing commands from offset', commandOffset);

    while (position < this.buffer.length - 1 && commands.length < 5000) {
      const byte = this.buffer[position++];

      // Frame synchronization
      if (byte === 0x00) {
        currentFrame++;
        continue;
      } else if (byte === 0x01) {
        if (position < this.buffer.length) {
          currentFrame += this.buffer[position++];
        }
        continue;
      } else if (byte === 0x02) {
        if (position + 1 < this.buffer.length) {
          currentFrame += this.buffer[position] | (this.buffer[position + 1] << 8);
          position += 2;
        }
        continue;
      }

      // Parse actual commands
      if (byte >= 0x09 && byte <= 0x35) {
        const command = this.parseCommand(byte, position, currentFrame);
        if (command) {
          commands.push(command);
          position += this.getCommandLength(byte);
        }
      } else {
        // Skip unknown bytes
        position++;
      }
    }

    console.log('[RemasteredStructure] Commands parsed:', commands.length);
    return {
      offset: commandOffset,
      commands: commands.slice(0, 1000) // Limit for performance
    };
  }

  /**
   * Parse individual command
   */
  private parseCommand(type: number, position: number, frame: number) {
    if (position >= this.buffer.length) return null;

    const playerId = this.buffer[position] || 0;
    
    // Skip invalid player IDs
    if (playerId > 7) return null;

    let unitName = '';
    let action = this.getCommandName(type);

    // Parse specific command types
    if (type === 0x0C && position + 2 < this.buffer.length) { // BUILD
      const unitType = this.buffer[position + 2];
      unitName = this.getUnitName(unitType);
      action = `Build ${unitName}`;
    } else if (type === 0x1D && position + 1 < this.buffer.length) { // TRAIN
      const unitType = this.buffer[position + 1];
      unitName = this.getUnitName(unitType);
      action = `Train ${unitName}`;
    }

    return {
      frame,
      playerId,
      type,
      action,
      unitName
    };
  }

  /**
   * Utility functions
   */
  private readNullTerminatedString(offset: number, maxLength: number): string {
    const bytes = [];
    
    for (let i = 0; i < maxLength && offset + i < this.buffer.length; i++) {
      const byte = this.buffer[offset + i];
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) { // Printable ASCII
        bytes.push(byte);
      }
    }
    
    return String.fromCharCode(...bytes).trim();
  }

  private cleanPlayerName(name: string): string {
    return name.replace(/[^\w\-\[\]]/g, '').substring(0, 12) || 'Player';
  }

  private mapRaceId(raceId: number): string {
    const races = {
      0: 'Zerg',
      1: 'Terran', 
      2: 'Protoss',
      6: 'Random'
    };
    return races[raceId as keyof typeof races] || 'Unknown';
  }

  private getCommandName(type: number): string {
    const commands: Record<number, string> = {
      0x09: 'Select',
      0x0A: 'Shift Select',
      0x0B: 'Deselect',
      0x0C: 'Build',
      0x14: 'Move',
      0x15: 'Attack',
      0x1D: 'Train',
      0x2F: 'Research',
      0x31: 'Upgrade'
    };
    return commands[type] || `Command_${type.toString(16)}`;
  }

  private getUnitName(unitId: number): string {
    const units: Record<number, string> = {
      // Terran
      0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 5: 'Siege Tank', 7: 'SCV',
      106: 'Command Center', 109: 'Supply Depot', 111: 'Barracks', 113: 'Factory',
      
      // Protoss  
      64: 'Probe', 65: 'Zealot', 66: 'Dragoon', 67: 'High Templar',
      154: 'Nexus', 156: 'Pylon', 159: 'Gateway', 162: 'Cybernetics Core',
      
      // Zerg
      37: 'Larva', 39: 'Zergling', 40: 'Hydralisk', 41: 'Ultralisk', 43: 'Drone',
      131: 'Hatchery', 142: 'Spawning Pool', 135: 'Hydralisk Den'
    };
    return units[unitId] || `Unit_${unitId}`;
  }

  private getCommandLength(type: number): number {
    const lengths: Record<number, number> = {
      0x09: 2, 0x0A: 2, 0x0B: 2, 0x0C: 7, 0x14: 4, 0x15: 6, 0x1D: 2, 0x2F: 2, 0x31: 2
    };
    return lengths[type] || 1;
  }
}
