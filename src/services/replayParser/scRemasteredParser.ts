
/**
 * StarCraft: Remastered .rep Parser - Robuste Implementation
 * Unterstützt sowohl komprimierte als auch unkomprimierte Replays
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
    console.log('[SCRemasteredParser] Starting parse of SC:R replay');
    console.log('[SCRemasteredParser] File size:', this.data.length);

    // Versuche erst direkt zu parsen, dann bei Bedarf dekomprimieren
    let workingData = this.data;
    let wasDecompressed = false;

    try {
      // Teste ob Datei direkt lesbar ist
      const testHeader = this.tryParseHeader(workingData);
      if (!testHeader.isValid) {
        console.log('[SCRemasteredParser] Direct parse failed, trying decompression...');
        workingData = this.tryDecompression();
        wasDecompressed = true;
      }
    } catch (error) {
      console.log('[SCRemasteredParser] Attempting decompression due to parse error...');
      workingData = this.tryDecompression();
      wasDecompressed = true;
    }

    // Setze working data
    this.data = workingData;
    this.position = 0;

    console.log('[SCRemasteredParser] Using', wasDecompressed ? 'decompressed' : 'original', 'data, size:', this.data.length);

    // Parse components
    const header = this.parseHeader();
    const players = this.parsePlayers();
    const { commands, buildOrders } = await this.parseCommands();

    // Calculate APM
    const gameMinutes = header.frames / 23.81 / 60;
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
   * Teste ob Header direkt parsbar ist
   */
  private tryParseHeader(data: Uint8Array): { isValid: boolean } {
    // Prüfe auf SC:R Header-Signatur
    if (data.length < 100) return { isValid: false };
    
    // Suche nach typischen SC:R Markern
    const headerChecks = [
      // Map name an bekannten Positionen
      this.hasValidMapNameAt(data, 0x45),
      this.hasValidMapNameAt(data, 0x61),
      this.hasValidMapNameAt(data, 0x68),
      // Frame count check
      this.hasValidFrameCountAt(data, 0x0C),
      this.hasValidFrameCountAt(data, 0x08)
    ];

    return { isValid: headerChecks.some(check => check) };
  }

  /**
   * Versuche Decompression nur wenn nötig
   */
  private tryDecompression(): Uint8Array {
    console.log('[SCRemasteredParser] Attempting decompression...');
    
    const zlibPositions = [];
    
    // Finde alle möglichen zlib-Startpunkte
    for (let i = 0; i < Math.min(5000, this.data.length - 2); i++) {
      if (this.data[i] === 0x78 && (this.data[i + 1] === 0x9C || this.data[i + 1] === 0xDA)) {
        zlibPositions.push(i);
      }
    }

    console.log('[SCRemasteredParser] Found zlib signatures at positions:', zlibPositions);

    // Versuche Decompression an verschiedenen Positionen
    for (const pos of zlibPositions) {
      try {
        const pako = require('pako');
        const compressed = this.data.slice(pos);
        const decompressed = pako.inflate(compressed);
        
        // Validiere decompressed data
        if (decompressed.length > 1000) {
          console.log('[SCRemasteredParser] Successful decompression at position', pos, 'size:', decompressed.length);
          return decompressed;
        }
      } catch (error) {
        console.log('[SCRemasteredParser] Decompression failed at position', pos);
        continue;
      }
    }
    
    // Fallback: verwende original data
    console.log('[SCRemasteredParser] No successful decompression, using original data');
    return this.data;
  }

  /**
   * Parse SC:R Header
   */
  private parseHeader() {
    const header = {
      mapName: this.extractMapName(),
      duration: '',
      frames: this.extractFrameCount(),
      gameType: 'Melee',
      engine: 'Remastered'
    };

    // Calculate duration from frames
    const totalSeconds = Math.floor(header.frames / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    header.duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    console.log('[SCRemasteredParser] Header parsed:', header);
    return header;
  }

  /**
   * Extract map name from multiple possible positions
   */
  private extractMapName(): string {
    const positions = [0x45, 0x61, 0x68, 0x29, 0x35];
    
    for (const pos of positions) {
      if (pos + 64 < this.data.length) {
        const name = this.readString(pos, 64);
        if (name.length > 2 && /[a-zA-Z]/.test(name) && !name.includes('\\x')) {
          console.log('[SCRemasteredParser] Found map name at position', pos, ':', name);
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
    const positions = [0x0C, 0x08, 0x10, 0x04];
    
    for (const pos of positions) {
      if (pos + 4 < this.data.length) {
        const frames = this.readUInt32(pos);
        if (frames > 100 && frames < 500000) {
          console.log('[SCRemasteredParser] Found frame count at position', pos, ':', frames);
          return frames;
        }
      }
    }
    
    return 10000;
  }

  /**
   * Parse players section
   */
  private parsePlayers() {
    const players = [];
    const startPositions = [0x161, 0x141, 0x181]; // Multiple possible starts
    
    for (const startPos of startPositions) {
      const testPlayers = this.tryParsePlayersAt(startPos);
      if (testPlayers.length >= 2) {
        console.log('[SCRemasteredParser] Found', testPlayers.length, 'players at position', startPos);
        return testPlayers;
      }
    }
    
    return this.createDefaultPlayers();
  }

  private tryParsePlayersAt(startPos: number): any[] {
    const players = [];
    
    for (let i = 0; i < 8; i++) {
      const offset = startPos + (i * 36);
      
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
        apm: 0,
        eapm: 0
      });
    }
    
    return players;
  }

  private createDefaultPlayers(): any[] {
    return [
      { id: 0, name: 'Player 1', race: 'Unknown', team: 0, color: 0, apm: 0, eapm: 0 },
      { id: 1, name: 'Player 2', race: 'Unknown', team: 1, color: 1, apm: 0, eapm: 0 }
    ];
  }

  /**
   * Parse commands and build orders
   */
  private async parseCommands() {
    console.log('[SCRemasteredParser] Parsing commands...');
    
    const commands = [];
    const buildOrders = new Map();
    
    // Find command section
    let commandStart = this.findCommandSection();
    console.log('[SCRemasteredParser] Command section starts at:', commandStart);
    
    this.position = commandStart;
    let frame = 0;
    let commandCount = 0;
    
    while (this.position < this.data.length - 1 && commandCount < 5000) {
      const byte = this.data[this.position++];
      
      // Frame control
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
      
      // Parse commands
      if (byte >= 0x09 && byte <= 0x35) {
        const command = this.parseCommand(byte, frame);
        if (command) {
          commands.push(command);
          
          if (this.isBuildCommand(command)) {
            if (!buildOrders.has(command.playerId)) {
              buildOrders.set(command.playerId, []);
            }
            buildOrders.get(command.playerId).push({
              time: this.frameToTime(frame),
              supply: this.estimateSupply(buildOrders.get(command.playerId).length),
              action: command.action,
              unitName: command.unitName
            });
          }
          
          commandCount++;
        }
      }
    }
    
    // Convert to array
    const buildOrdersArray = [];
    for (const [playerId, orders] of buildOrders) {
      buildOrdersArray.push({ playerId, entries: orders });
    }
    
    console.log('[SCRemasteredParser] Commands parsed:', commands.length);
    return { commands, buildOrders: buildOrdersArray };
  }

  private findCommandSection(): number {
    const possibleStarts = [633, 600, 700, 800];
    
    for (const start of possibleStarts) {
      if (this.looksLikeCommandSection(start)) {
        return start;
      }
    }
    
    return 633; // Default fallback
  }

  private looksLikeCommandSection(pos: number): boolean {
    if (pos + 50 > this.data.length) return false;
    
    let commandBytes = 0;
    for (let i = 0; i < 50; i++) {
      const byte = this.data[pos + i];
      if ([0x00, 0x01, 0x02, 0x0C, 0x14, 0x1D].includes(byte)) {
        commandBytes++;
      }
    }
    
    return commandBytes >= 5;
  }

  // Utility methods
  private hasValidMapNameAt(data: Uint8Array, pos: number): boolean {
    if (pos + 32 > data.length) return false;
    const name = this.readStringFrom(data, pos, 32);
    return name.length > 2 && /[a-zA-Z]/.test(name);
  }

  private hasValidFrameCountAt(data: Uint8Array, pos: number): boolean {
    if (pos + 4 > data.length) return false;
    const frames = this.readUInt32From(data, pos);
    return frames > 100 && frames < 500000;
  }

  private readStringFrom(data: Uint8Array, offset: number, length: number): string {
    let result = '';
    for (let i = 0; i < length && offset + i < data.length; i++) {
      const byte = data[offset + i];
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) result += String.fromCharCode(byte);
    }
    return result;
  }

  private readUInt32From(data: Uint8Array, offset: number): number {
    if (offset + 4 > data.length) return 0;
    return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
  }

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
    
    // Parse specific commands
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
        this.position += this.getCommandLength(type);
        break;
    }
    
    return command;
  }

  private isBuildCommand(command: any): boolean {
    return [0x0C, 0x1D, 0x2F, 0x31, 0x34].includes(command.type);
  }

  private calculateRealAPM(players: any[], commands: any[], gameMinutes: number) {
    const apmCommands = [0x09, 0x0A, 0x0B, 0x0C, 0x14, 0x15, 0x1D, 0x20, 0x21, 0x2A, 0x2B, 0x2C];
    
    for (const player of players) {
      const playerCommands = commands.filter(cmd => 
        cmd.playerId === player.id && apmCommands.includes(cmd.type)
      );
      
      player.apm = gameMinutes > 0 ? Math.round(playerCommands.length / gameMinutes) : 0;
      player.eapm = Math.round(player.apm * 0.85);
    }
  }

  // Helper methods
  private readString(offset: number, length: number): string {
    return this.readStringFrom(this.data, offset, length);
  }

  private readUInt32(offset: number): number {
    return this.readUInt32From(this.data, offset);
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

  private estimateSupply(buildIndex: number): number {
    return 4 + (buildIndex * 2);
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
      0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 5: 'Siege Tank', 7: 'SCV',
      106: 'Command Center', 109: 'Supply Depot', 111: 'Barracks', 113: 'Factory',
      64: 'Probe', 65: 'Zealot', 66: 'Dragoon', 67: 'High Templar', 69: 'Shuttle',
      154: 'Nexus', 156: 'Pylon', 159: 'Gateway', 162: 'Cybernetics Core',
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
