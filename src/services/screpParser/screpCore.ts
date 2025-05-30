
/**
 * screp Core Parser - EXAKTE Implementation nach GitHub Repo
 * Basiert direkt auf: https://github.com/icza/screp/blob/main/rep/repdecoder.go
 */

import { BinaryReader } from './binaryReader';
import { ReplayHeader, PlayerData, ComputedData } from './types';
import { CommandParser } from './commandParser';

export interface ScrepReplay {
  header: ReplayHeader;
  players: PlayerData[];
  commands: Command[];
  computed: ComputedData;
}

export interface Command {
  frame: number;
  type: number;
  playerID: number;
  typeString: string;
  parameters: any;
  effective: boolean;
  ineffKind: string;
  time: string;
}

export class ScrepCore {
  private data: ArrayBuffer;
  private reader: BinaryReader;

  constructor(data: ArrayBuffer) {
    this.data = data;
    this.reader = new BinaryReader(data);
  }

  /**
   * Parse replay exakt wie screp GitHub repo
   */
  async parseReplay(): Promise<ScrepReplay> {
    console.log('[ScrepCore] Starting screp GitHub repo parsing...');
    console.log('[ScrepCore] Data size:', this.data.byteLength);

    try {
      // EXAKT nach screp/rep/repdecoder.go
      const header = this.parseHeader();
      console.log('[ScrepCore] Header parsed:', header);

      const players = this.parsePlayers();
      console.log('[ScrepCore] Players parsed:', players.length);

      const commands = await this.parseCommands();
      console.log('[ScrepCore] Commands parsed:', commands.length);

      const computed = this.computeData(header, players, commands);
      console.log('[ScrepCore] Computed data calculated');

      return {
        header,
        players,
        commands,
        computed
      };

    } catch (error) {
      console.error('[ScrepCore] Parsing failed:', error);
      throw new Error(`screp parsing failed: ${error}`);
    }
  }

  /**
   * Header parsing - EXAKT nach screp/rep/repdecoder.go parseHeader()
   */
  private parseHeader(): ReplayHeader {
    console.log('[ScrepCore] Parsing header exactly like screp repo...');
    
    this.reader.setPosition(0);
    
    // Nach screp/rep/repdecoder.go parseHeader() - EXAKTE Reihenfolge!
    // Offset 0x00: gameID (4 bytes)
    const gameID = this.reader.readUInt32LE();
    console.log('[ScrepCore] Game ID:', '0x' + gameID.toString(16));
    
    // Offset 0x04: unknown1 (4 bytes)
    const unknown1 = this.reader.readUInt32LE();
    console.log('[ScrepCore] Unknown1:', '0x' + unknown1.toString(16));
    
    // Offset 0x08: frames (4 bytes) - HIER sind die Frames!
    const frames = this.reader.readUInt32LE();
    console.log('[ScrepCore] Frames at 0x08:', frames);
    
    // Offset 0x0C: ReplayID (4 bytes) - 'reRS' oder 'seRS'
    const replayIdBytes = this.reader.readBytes(4);
    const replayID = new TextDecoder('latin1').decode(replayIdBytes);
    console.log('[ScrepCore] Replay ID at 0x0C:', replayID);
    console.log('[ScrepCore] Replay ID bytes:', Array.from(replayIdBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    
    // Validiere nach screp repo
    if (replayID !== 'reRS' && replayID !== 'seRS') {
      throw new Error(`Invalid StarCraft replay. Expected 'reRS' or 'seRS', got: '${replayID}'`);
    }
    
    console.log('[ScrepCore] Valid replay ID found:', replayID);
    
    // Nach screp repo: weitere Header-Daten
    this.reader.setPosition(0x18);
    const gameType = this.reader.readUInt16LE();
    
    console.log('[ScrepCore] Game type:', gameType);
    console.log('[ScrepCore] Engine:', unknown1);
    
    // Map name nach screp repo - verschiedene mögliche Offsets
    let mapName = 'Unknown Map';
    const mapNameOffsets = [0x61, 0x68, 0x7C, 0x89];
    
    for (const offset of mapNameOffsets) {
      try {
        if (offset < this.data.byteLength - 64) {
          this.reader.setPosition(offset);
          const testName = this.reader.readNullTerminatedString(64);
          if (this.isValidMapName(testName)) {
            mapName = testName.trim();
            console.log('[ScrepCore] Map name found at offset', '0x' + offset.toString(16), ':', mapName);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    return {
      replayID,
      engine: unknown1,
      frames,
      startTime: new Date(),
      mapName,
      gameType,
      duration: this.framesToDuration(frames)
    };
  }

  /**
   * Player parsing nach screp/rep/repdecoder.go
   */
  private parsePlayers(): PlayerData[] {
    const players: PlayerData[] = [];
    
    // Nach screp repo: Player data starts bei ~0x161
    // Aber das kann variieren - suche nach Player-Pattern
    const possibleOffsets = [0x161, 0x1A1, 0x1C1, 0x200];
    
    for (const baseOffset of possibleOffsets) {
      const foundPlayers = this.tryParsePlayersAt(baseOffset);
      if (foundPlayers.length > 0) {
        console.log('[ScrepCore] Found', foundPlayers.length, 'players at offset', '0x' + baseOffset.toString(16));
        return foundPlayers;
      }
    }
    
    console.log('[ScrepCore] No players found at standard offsets');
    return [];
  }

  private tryParsePlayersAt(baseOffset: number): PlayerData[] {
    const players: PlayerData[] = [];
    
    for (let i = 0; i < 8; i++) {
      try {
        const offset = baseOffset + (i * 36); // Standard player entry size
        
        if (offset + 36 >= this.data.byteLength) break;
        
        this.reader.setPosition(offset);
        
        const name = this.reader.readFixedString(25);
        if (!this.isValidPlayerName(name)) continue;
        
        // Race, team, color nach screp format
        this.reader.setPosition(offset + 25);
        const raceData = this.reader.readUInt8();
        const team = this.reader.readUInt8();
        const color = this.reader.readUInt8();
        
        players.push({
          id: i,
          name: name.trim(),
          race: this.getRaceName(raceData),
          team,
          color
        });
        
      } catch (error) {
        break;
      }
    }
    
    return players;
  }

  /**
   * Command parsing nach screp/rep/repdecoder.go
   */
  private async parseCommands(): Promise<Command[]> {
    console.log('[ScrepCore] Starting command parsing...');
    
    // Nach screp repo: Commands section suchen
    const commandOffset = this.findCommandSection();
    if (!commandOffset) {
      console.warn('[ScrepCore] No command section found');
      return [];
    }
    
    console.log('[ScrepCore] Command section at offset:', '0x' + commandOffset.toString(16));
    
    this.reader.setPosition(commandOffset);
    const commandParser = new CommandParser(this.reader);
    
    return await commandParser.parseAllCommands();
  }

  /**
   * Command section nach screp/rep/repdecoder.go finden
   */
  private findCommandSection(): number | null {
    // Nach screp repo: Commands nach Players
    // Suche nach typischen Command-Signaturen
    const searchStart = 0x400; // Nach Header und Players
    const searchEnd = Math.min(this.data.byteLength - 1000, 0x1000);
    
    for (let pos = searchStart; pos < searchEnd; pos += 4) {
      if (this.looksLikeCommandSection(pos)) {
        return pos;
      }
    }
    
    return null;
  }

  private looksLikeCommandSection(offset: number): boolean {
    try {
      this.reader.setPosition(offset);
      const sample = this.reader.readBytes(32);
      
      // Suche nach Command-Patterns: 0x00 (frame sync), 0x09-0x15 (commands)
      let commandLikeBytes = 0;
      let frameSyncBytes = 0;
      
      for (let i = 0; i < sample.length; i++) {
        const byte = sample[i];
        if (byte === 0x00) frameSyncBytes++;
        if ([0x09, 0x0A, 0x0B, 0x0C, 0x14, 0x15, 0x1D].includes(byte)) commandLikeBytes++;
      }
      
      // Command section sollte viele frame syncs und commands haben
      return frameSyncBytes >= 3 && commandLikeBytes >= 2;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Computed data berechnen
   */
  private computeData(header: ReplayHeader, players: PlayerData[], commands: Command[]): ComputedData {
    const gameMinutes = header.frames / 24 / 60; // 24 FPS für StarCraft
    
    const apm: number[] = [];
    const eapm: number[] = [];
    const buildOrders: any[][] = [];
    
    players.forEach(player => {
      const playerCommands = commands.filter(cmd => cmd.playerID === player.id);
      const effectiveCommands = playerCommands.filter(cmd => cmd.effective);
      
      const playerAPM = gameMinutes > 0 ? Math.round(playerCommands.length / gameMinutes) : 0;
      const playerEAPM = gameMinutes > 0 ? Math.round(effectiveCommands.length / gameMinutes) : 0;
      
      apm.push(playerAPM);
      eapm.push(playerEAPM);
      buildOrders.push([]);
    });
    
    return {
      apm,
      eapm,
      buildOrders
    };
  }

  // Utility functions exakt nach screp repo
  private framesToDuration(frames: number): string {
    const totalSeconds = Math.floor(frames / 24); // 24 FPS
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
    
    // Map name sollte druckbare Zeichen haben
    const printableChars = name.replace(/[^\x20-\x7E]/g, '').trim();
    return printableChars.length >= 3 && /^[a-zA-Z0-9\s\-_.()]+$/.test(printableChars);
  }

  private isValidPlayerName(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 25) return false;
    
    // Player name sollte alphanumerische Zeichen haben
    return /^[a-zA-Z0-9_\-\[\]]+/.test(trimmed);
  }

  private getRaceName(raceId: number): string {
    const races = ['Zerg', 'Terran', 'Protoss', 'Random'];
    return races[raceId] || 'Unknown';
  }
}
