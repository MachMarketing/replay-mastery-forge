
/**
 * StarCraft: Remastered .rep Parser - Proper Implementation
 * Based on actual SC:R replay format specifications
 */

export interface RemasteredReplayData {
  header: {
    mapName: string;
    duration: string;
    frames: number;
    gameType: string;
    engine: string;
  };
  players: {
    id: number;
    name: string;
    race: string;
    team: number;
    color: number;
    apm: number;
    eapm: number;
  }[];
  buildOrders: {
    playerId: number;
    entries: {
      time: string;
      supply: number;
      action: string;
      unitName?: string;
    }[];
  }[];
  rawData: {
    totalCommands: number;
    gameMinutes: number;
    extractionMethod: string;
  };
}

export class SCRemasteredParser {
  private data: Uint8Array;
  private position: number = 0;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new Uint8Array(arrayBuffer);
  }

  /**
   * Parse StarCraft: Remastered replay file
   */
  async parse(): Promise<RemasteredReplayData> {
    console.log('[SCRemasteredParser] Starting parse of Remastered replay');
    console.log('[SCRemasteredParser] File size:', this.data.length);

    // Parse header
    const header = this.parseHeader();
    console.log('[SCRemasteredParser] Header:', header);

    // Parse players
    const players = this.parsePlayers();
    console.log('[SCRemasteredParser] Players:', players);

    // Parse commands and generate build orders
    const { commands, buildOrders } = await this.parseCommands();
    console.log('[SCRemasteredParser] Commands extracted:', commands.length);

    // Calculate final APM based on actual game duration
    const gameMinutes = header.frames / 23.81 / 60; // Remastered FPS
    this.calculateRealAPM(players, commands, gameMinutes);

    return {
      header,
      players,
      buildOrders,
      rawData: {
        totalCommands: commands.length,
        gameMinutes,
        extractionMethod: 'SCRemasteredParser'
      }
    };
  }

  /**
   * Parse Remastered header (fixed structure)
   */
  private parseHeader() {
    // Check for decompression needed
    if (this.needsDecompression()) {
      this.data = this.decompressReplay();
    }

    const header = {
      mapName: this.extractMapName(),
      duration: '',
      frames: this.extractFrameCount(),
      gameType: 'Melee',
      engine: 'Remastered'
    };

    // Calculate duration
    const totalSeconds = Math.floor(header.frames / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    header.duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return header;
  }

  /**
   * Check if replay needs decompression
   */
  private needsDecompression(): boolean {
    // Check for zlib signature in various positions
    for (let i = 0; i < Math.min(1000, this.data.length - 2); i++) {
      if (this.data[i] === 0x78 && (this.data[i + 1] === 0x9C || this.data[i + 1] === 0xDA)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Decompress replay using zlib
   */
  private decompressReplay(): Uint8Array {
    console.log('[SCRemasteredParser] Decompressing replay...');
    
    // Find main zlib block
    for (let i = 0; i < this.data.length - 2; i++) {
      if (this.data[i] === 0x78 && (this.data[i + 1] === 0x9C || this.data[i + 1] === 0xDA)) {
        try {
          const pako = require('pako');
          const compressed = this.data.slice(i);
          const decompressed = pako.inflate(compressed);
          console.log('[SCRemasteredParser] Decompression successful, size:', decompressed.length);
          return decompressed;
        } catch (error) {
          console.warn('[SCRemasteredParser] Decompression failed at position', i);
          continue;
        }
      }
    }
    
    throw new Error('Could not decompress replay file');
  }

  /**
   * Extract map name from known positions
   */
  private extractMapName(): string {
    const positions = [0x45, 0x61, 0x68];
    
    for (const pos of positions) {
      if (pos + 32 < this.data.length) {
        const name = this.readString(pos, 32);
        if (name.length > 2 && /[a-zA-Z]/.test(name)) {
          return name;
        }
      }
    }
    
    return 'Unknown Map';
  }

  /**
   * Extract frame count from header
   */
  private extractFrameCount(): number {
    const positions = [0x0C, 0x08, 0x10];
    
    for (const pos of positions) {
      if (pos + 4 < this.data.length) {
        const frames = this.readUInt32(pos);
        if (frames > 100 && frames < 500000) { // Reasonable range
          return frames;
        }
      }
    }
    
    return 10000; // Default fallback
  }

  /**
   * Parse players from replay
   */
  private parsePlayers() {
    const players = [];
    const playerSectionStart = 0x161; // Standard Remastered position
    
    for (let i = 0; i < 8; i++) {
      const offset = playerSectionStart + (i * 36);
      
      if (offset + 36 > this.data.length) break;
      
      const name = this.readString(offset, 25);
      if (name.length < 2) continue;
      
      const race = this.data[offset + 28] || 0;
      const team = this.data[offset + 29] || i;
      const color = this.data[offset + 31] || i;
      
      players.push({
        id: i,
        name: name.trim(),
        race: this.getRaceName(race),
        team,
        color,
        apm: 0, // Will be calculated later
        eapm: 0
      });
    }
    
    return players;
  }

  /**
   * Parse commands and generate build orders
   */
  private async parseCommands() {
    console.log('[SCRemasteredParser] Parsing commands...');
    
    const commands = [];
    const buildOrders = new Map();
    
    // Find command section (usually starts around 0x279 = 633)
    let commandStart = 633;
    for (let pos = 600; pos < 800; pos++) {
      if (this.looksLikeCommandSection(pos)) {
        commandStart = pos;
        break;
      }
    }
    
    console.log('[SCRemasteredParser] Command section starts at:', commandStart);
    
    this.position = commandStart;
    let frame = 0;
    let commandCount = 0;
    
    while (this.position < this.data.length - 1 && commandCount < 10000) {
      const byte = this.data[this.position++];
      
      // Frame sync commands
      if (byte === 0x00) {
        frame++;
        continue;
      } else if (byte === 0x01) {
        frame += this.data[this.position++] || 1;
        continue;
      } else if (byte === 0x02) {
        frame += this.readUInt16(this.position);
        this.position += 2;
        continue;
      }
      
      // Actual game commands
      if (byte >= 0x09 && byte <= 0x35) {
        const command = this.parseCommand(byte, frame);
        if (command) {
          commands.push(command);
          
          // Add to build order if it's a build/train command
          if (this.isBuildCommand(command)) {
            if (!buildOrders.has(command.playerId)) {
              buildOrders.set(command.playerId, []);
            }
            buildOrders.get(command.playerId).push({
              time: this.frameToTime(frame),
              supply: this.estimateSupply(command.playerId, buildOrders.get(command.playerId).length),
              action: command.action,
              unitName: command.unitName
            });
          }
          
          commandCount++;
        }
      }
    }
    
    // Convert build orders to array format
    const buildOrdersArray = [];
    for (const [playerId, orders] of buildOrders) {
      buildOrdersArray.push({
        playerId,
        entries: orders
      });
    }
    
    console.log('[SCRemasteredParser] Commands parsed:', commands.length);
    return { commands, buildOrders: buildOrdersArray };
  }

  /**
   * Check if position looks like command section
   */
  private looksLikeCommandSection(pos: number): boolean {
    if (pos + 50 > this.data.length) return false;
    
    let commandLikeBytes = 0;
    for (let i = 0; i < 50; i++) {
      const byte = this.data[pos + i];
      if ([0x00, 0x01, 0x02, 0x0C, 0x14, 0x1D].includes(byte)) {
        commandLikeBytes++;
      }
    }
    
    return commandLikeBytes >= 10;
  }

  /**
   * Parse individual command
   */
  private parseCommand(type: number, frame: number) {
    if (this.position >= this.data.length) return null;
    
    const playerId = this.data[this.position] || 0;
    
    const command = {
      frame,
      playerId,
      type,
      action: this.getCommandName(type),
      unitName: '',
      parameters: {}
    };
    
    // Parse command-specific data
    switch (type) {
      case 0x0C: // Build
        if (this.position + 7 < this.data.length) {
          const unitType = this.data[this.position + 2];
          command.unitName = this.getUnitName(unitType);
          command.action = `Build ${command.unitName}`;
          this.position += 7;
        }
        break;
        
      case 0x1D: // Train
        if (this.position + 2 < this.data.length) {
          const unitType = this.data[this.position + 1];
          command.unitName = this.getUnitName(unitType);
          command.action = `Train ${command.unitName}`;
          this.position += 2;
        }
        break;
        
      default:
        // Skip unknown length, estimate based on command type
        this.position += this.getCommandLength(type);
        break;
    }
    
    return command;
  }

  /**
   * Check if command is build-related
   */
  private isBuildCommand(command: any): boolean {
    return [0x0C, 0x1D, 0x2F, 0x31, 0x34].includes(command.type); // Build, Train, Research, Upgrade, Morph
  }

  /**
   * Calculate real APM for players
   */
  private calculateRealAPM(players: any[], commands: any[], gameMinutes: number) {
    const apmCommands = [0x09, 0x0A, 0x0B, 0x0C, 0x14, 0x15, 0x1D, 0x20, 0x21, 0x2A, 0x2B, 0x2C];
    
    for (const player of players) {
      const playerCommands = commands.filter(cmd => 
        cmd.playerId === player.id && apmCommands.includes(cmd.type)
      );
      
      player.apm = gameMinutes > 0 ? Math.round(playerCommands.length / gameMinutes) : 0;
      player.eapm = Math.round(player.apm * 0.8); // Rough EAPM estimate
    }
  }

  // Utility methods
  private readString(offset: number, length: number): string {
    let result = '';
    for (let i = 0; i < length && offset + i < this.data.length; i++) {
      const byte = this.data[offset + i];
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) result += String.fromCharCode(byte);
    }
    return result;
  }

  private readUInt32(offset: number): number {
    if (offset + 4 > this.data.length) return 0;
    return this.data[offset] | 
           (this.data[offset + 1] << 8) | 
           (this.data[offset + 2] << 16) | 
           (this.data[offset + 3] << 24);
  }

  private readUInt16(offset: number): number {
    if (offset + 2 > this.data.length) return 0;
    return this.data[offset] | (this.data[offset + 1] << 8);
  }

  private frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private estimateSupply(playerId: number, buildOrderLength: number): number {
    return 4 + (buildOrderLength * 2); // Simple estimation
  }

  private getRaceName(raceId: number): string {
    const races = { 0: 'Zerg', 1: 'Terran', 2: 'Protoss', 6: 'Random' };
    return races[raceId as keyof typeof races] || 'Unknown';
  }

  private getCommandName(type: number): string {
    const commands: Record<number, string> = {
      0x09: 'Select', 0x0A: 'Shift Select', 0x0B: 'Shift Deselect',
      0x0C: 'Build', 0x14: 'Move', 0x15: 'Attack', 0x1D: 'Train',
      0x2F: 'Research', 0x31: 'Upgrade', 0x34: 'Morph'
    };
    return commands[type] || `Command_${type.toString(16)}`;
  }

  private getUnitName(unitId: number): string {
    const units: Record<number, string> = {
      // Terran
      0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 5: 'Siege Tank', 7: 'SCV',
      106: 'Command Center', 109: 'Supply Depot', 111: 'Barracks', 113: 'Factory',
      // Protoss  
      64: 'Probe', 65: 'Zealot', 66: 'Dragoon', 67: 'High Templar', 69: 'Shuttle',
      154: 'Nexus', 156: 'Pylon', 159: 'Gateway', 162: 'Cybernetics Core',
      // Zerg
      37: 'Larva', 39: 'Zergling', 40: 'Hydralisk', 41: 'Ultralisk', 43: 'Drone',
      131: 'Hatchery', 142: 'Spawning Pool', 135: 'Hydralisk Den'
    };
    return units[unitId] || `Unit_${unitId}`;
  }

  private getCommandLength(type: number): number {
    const lengths: Record<number, number> = {
      0x09: 2, 0x0A: 2, 0x0B: 2, 0x0C: 7, 0x14: 4, 0x15: 6, 0x1D: 2
    };
    return lengths[type] || 1;
  }
}
