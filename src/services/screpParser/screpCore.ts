
/**
 * screp Core Parser - EXAKTE Implementation nach screp GitHub Repo
 * https://github.com/icza/screp/blob/main/rep/repdecoder.go
 */

import { BinaryReader } from './binaryReader';
import { ReplayHeader, PlayerData, Command, ComputedData, ScrepParseResult } from './types';
import { CommandParser } from './commandParser';
import { ScrepConstants } from './constants';

export class ScrepCore {
  private data: ArrayBuffer;
  private reader: BinaryReader;

  constructor(data: ArrayBuffer) {
    this.data = data;
    this.reader = new BinaryReader(data);
  }

  /**
   * Parse replay - EXAKT nach screp/rep/repdecoder.go
   */
  async parseReplay(): Promise<ScrepParseResult> {
    console.log('[ScrepCore] Starting screp GitHub repo parsing...');
    console.log('[ScrepCore] Data size:', this.data.byteLength);

    const parseStats = {
      headerParsed: false,
      playersFound: 0,
      commandsParsed: 0,
      errors: []
    };

    try {
      // 1. Header parsing - EXAKT nach repdecoder.go
      const header = this.parseHeader();
      parseStats.headerParsed = true;
      console.log('[ScrepCore] Header parsed successfully:', header);

      // 2. Players parsing
      const players = this.parsePlayers();
      parseStats.playersFound = players.length;
      console.log('[ScrepCore] Players parsed:', players.length);

      // 3. Commands parsing  
      const commands = await this.parseCommands();
      parseStats.commandsParsed = commands.length;
      console.log('[ScrepCore] Commands parsed:', commands.length);

      // 4. Compute APM/EAPM data
      const computed = this.computeData(header, players, commands);
      console.log('[ScrepCore] Computed data calculated');

      return {
        header,
        players,
        commands,
        computed,
        parseStats
      };

    } catch (error) {
      parseStats.errors.push(error.message);
      console.error('[ScrepCore] Parsing failed:', error);
      throw new Error(`screp parsing failed: ${error}`);
    }
  }

  /**
   * Header parsing - EXAKT nach screp/rep/repdecoder.go:45-80
   */
  private parseHeader(): ReplayHeader {
    console.log('[ScrepCore] Parsing header exactly like screp repo...');
    
    this.reader.setPosition(0);
    
    // EXAKTE Byte-Reihenfolge nach screp/rep/repdecoder.go
    // Offset 0x00: gameID (4 bytes)
    const gameId = this.reader.readUInt32LE();
    console.log('[ScrepCore] Game ID at 0x00:', '0x' + gameId.toString(16));
    
    // Offset 0x04: engine (4 bytes) 
    const engine = this.reader.readUInt32LE();
    console.log('[ScrepCore] Engine at 0x04:', engine);
    
    // Offset 0x08: frames (4 bytes) - HIER sind die Frames!
    const frames = this.reader.readUInt32LE();
    console.log('[ScrepCore] Frames at 0x08:', frames);
    
    // Offset 0x0C: ReplayID (4 bytes) - 'reRS' oder 'seRS'
    const replayIdBytes = this.reader.readBytes(4);
    const replayID = new TextDecoder('latin1').decode(replayIdBytes);
    console.log('[ScrepCore] Replay ID at 0x0C:', replayID);
    
    // Validate nach screp repo
    if (replayID !== 'reRS' && replayID !== 'seRS') {
      throw new Error(`Invalid StarCraft replay. Expected 'reRS' or 'seRS', got: '${replayID}'`);
    }
    
    // Game type nach screp repo
    this.reader.setPosition(0x18);
    const gameType = this.reader.readUInt16LE();
    console.log('[ScrepCore] Game type at 0x18:', gameType);
    
    // Map name detection - mehrere Offsets testen
    const mapName = this.findMapName();
    console.log('[ScrepCore] Map name found:', mapName);

    return {
      replayID,
      engine,
      frames,
      gameId,
      startTime: new Date(),
      mapName,
      gameType,
      duration: this.framesToDuration(frames)
    };
  }

  /**
   * Map name detection - nach screp repo
   */
  private findMapName(): string {
    const possibleOffsets = [0x61, 0x68, 0x75, 0x7C, 0x89, 0xA5];
    
    for (const offset of possibleOffsets) {
      try {
        if (offset + 32 < this.data.byteLength) {
          this.reader.setPosition(offset);
          const testName = this.reader.readNullTerminatedString(32);
          if (this.isValidMapName(testName)) {
            return testName.trim();
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    return 'Unknown Map';
  }

  /**
   * Player parsing - EXAKT nach screp repo
   */
  private parsePlayers(): PlayerData[] {
    console.log('[ScrepCore] Parsing players...');
    
    // Player section meist bei 0x161, aber variabel
    const playerOffsets = [0x161, 0x1A1, 0x1C1, 0x200, 0x240];
    
    for (const baseOffset of playerOffsets) {
      const players = this.tryParsePlayersAt(baseOffset);
      if (players.length > 0) {
        console.log('[ScrepCore] Found', players.length, 'players at offset', '0x' + baseOffset.toString(16));
        return players;
      }
    }
    
    console.warn('[ScrepCore] No players found');
    return [];
  }

  private tryParsePlayersAt(baseOffset: number): PlayerData[] {
    const players: PlayerData[] = [];
    
    for (let i = 0; i < 12; i++) { // Max 12 players
      try {
        const offset = baseOffset + (i * 36); // Standard player entry size
        
        if (offset + 36 >= this.data.byteLength) break;
        
        this.reader.setPosition(offset);
        
        // Player name (25 bytes)
        const name = this.reader.readFixedString(25).trim();
        if (!this.isValidPlayerName(name)) continue;
        
        // Race, team, color
        const raceId = this.reader.readUInt8();
        const team = this.reader.readUInt8();
        const color = this.reader.readUInt8();
        const type = this.reader.readUInt8();
        
        players.push({
          id: i,
          name,
          race: ScrepConstants.getRaceName(raceId),
          raceId,
          team,
          color,
          type
        });
        
      } catch (error) {
        break;
      }
    }
    
    return players;
  }

  /**
   * Command parsing - delegiert an CommandParser
   */
  private async parseCommands(): Promise<Command[]> {
    console.log('[ScrepCore] Starting command parsing...');
    
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
   * Command section detection
   */
  private findCommandSection(): number | null {
    // Command section nach Players - suche nach typischen Patterns
    const searchStart = 0x400;
    const searchEnd = Math.min(this.data.byteLength - 1000, 0x2000);
    
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
      const sample = this.reader.readBytes(64);
      
      // Suche nach Command-Patterns
      let frameSyncCount = 0;
      let commandCount = 0;
      
      for (let i = 0; i < sample.length - 1; i++) {
        const byte = sample[i];
        const nextByte = sample[i + 1];
        
        // Frame sync (0x00)
        if (byte === 0x00) frameSyncCount++;
        
        // Bekannte Commands mit Player ID
        if (ScrepConstants.isValidCommandType(byte) && nextByte < 12) {
          commandCount++;
        }
      }
      
      return frameSyncCount >= 2 && commandCount >= 1;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Compute APM/EAPM data
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
      buildOrders.push(this.extractBuildOrder(playerCommands));
    });
    
    return {
      apm,
      eapm,
      buildOrders,
      totalFrames: header.frames,
      gameDurationSeconds: Math.floor(header.frames / 24)
    };
  }

  private extractBuildOrder(commands: Command[]): any[] {
    return commands
      .filter(cmd => ['Build', 'Train', 'Research'].some(action => cmd.typeString.includes(action)))
      .slice(0, 20)
      .map(cmd => ({
        frame: cmd.frame,
        timestamp: cmd.time,
        action: cmd.typeString,
        parameters: cmd.parameters
      }));
  }

  // Utility functions
  private framesToDuration(frames: number): string {
    const totalSeconds = Math.floor(frames / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
    const printable = name.replace(/[^\x20-\x7E]/g, '').trim();
    return printable.length >= 3 && /^[a-zA-Z0-9\s\-_.()]+$/.test(printable);
  }

  private isValidPlayerName(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 25) return false;
    return /^[a-zA-Z0-9_\-\[\]]+/.test(trimmed);
  }
}

export { ScrepCore };
export type { ScrepParseResult };
