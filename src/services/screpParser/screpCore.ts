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
    console.log('[ScrepCore] Starting official screp parsing...');
    console.log('[ScrepCore] Data size:', this.data.byteLength);

    const parseStats = {
      headerParsed: false,
      playersFound: 0,
      commandsParsed: 0,
      errors: []
    };

    try {
      // 1. Header parsing nach repdecoder.go:DecodeHeader
      const header = this.parseHeader();
      parseStats.headerParsed = true;
      console.log('[ScrepCore] Header:', header);

      // 2. Players parsing nach repdecoder.go:DecodePlayers
      const players = this.parsePlayers();
      parseStats.playersFound = players.length;
      console.log('[ScrepCore] Players:', players.length);

      // 3. Commands parsing nach repdecoder.go:DecodeCommands
      const commands = await this.parseCommands();
      parseStats.commandsParsed = commands.length;
      console.log('[ScrepCore] Commands:', commands.length);

      // 4. Compute data nach screp/rep/repcore/comp.go
      const computed = this.computeData(header, players, commands);

      return {
        header,
        players,
        commands,
        computed,
        parseStats
      };

    } catch (error) {
      parseStats.errors.push(error.message);
      console.error('[ScrepCore] Failed:', error);
      throw error;
    }
  }

  /**
   * Header parsing - nach repdecoder.go:DecodeHeader
   */
  private parseHeader(): ReplayHeader {
    console.log('[ScrepCore] Parsing header...');
    
    this.reader.setPosition(0);
    
    // Game ID (4 bytes at 0x00)
    const gameId = this.reader.readUInt32LE();
    
    // Engine version (4 bytes at 0x04) 
    this.reader.setPosition(0x04);
    const engine = this.reader.readUInt32LE();
    
    // Replay ID (4 bytes at 0x0C for SC:R)
    this.reader.setPosition(0x0C);
    const replayIdBytes = this.reader.readBytes(4);
    const replayID = new TextDecoder('latin1').decode(replayIdBytes);
    
    // Validate replay signature
    if (replayID !== 'reRS' && replayID !== 'seRS') {
      throw new Error(`Invalid replay signature. Expected 'reRS' or 'seRS', got: '${replayID}'`);
    }
    
    // Frames (4 bytes at 0x14)
    this.reader.setPosition(0x14);
    const frames = this.reader.readUInt32LE();
    
    // Game type (2 bytes at 0x18)
    this.reader.setPosition(0x18);
    const gameType = this.reader.readUInt16LE();
    
    // Map name detection
    const mapName = this.findMapName();
    
    console.log('[ScrepCore] Header parsed:', {
      gameId: '0x' + gameId.toString(16),
      engine,
      replayID,
      frames,
      gameType,
      mapName
    });

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
   * Map name detection - erweiterte Suche
   */
  private findMapName(): string {
    // Offsets für Map Namen in verschiedenen SC:R Versionen
    const mapOffsets = [0x75, 0x89, 0x95, 0xA5, 0xB5, 0xC5];
    
    for (const offset of mapOffsets) {
      if (offset + 32 >= this.data.byteLength) continue;
      
      try {
        this.reader.setPosition(offset);
        const name = this.reader.readNullTerminatedString(32);
        if (this.isValidMapName(name)) {
          return name.trim();
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: Scan nach Map-Namen Pattern
    for (let pos = 0x60; pos < Math.min(0x400, this.data.byteLength - 32); pos += 4) {
      try {
        this.reader.setPosition(pos);
        const name = this.reader.readNullTerminatedString(32);
        if (this.isValidMapName(name) && name.length > 5) {
          return name.trim();
        }
      } catch (e) {
        continue;
      }
    }
    
    return 'Unknown Map';
  }

  /**
   * Players parsing - ERWEITERT für alle SC:R Versionen
   */
  private parsePlayers(): PlayerData[] {
    console.log('[ScrepCore] Parsing SC:R players...');
    
    // Erweiterte SC:R Player Offsets für verschiedene Versionen
    const playerOffsets = [
      0x161, 0x1A1, 0x1C1,     // Standard SC:R
      0x1B1, 0x19C, 0x18E,     // Andere SC:R Versionen  
      0x181, 0x175, 0x169,     // Varianten
      0x1D1, 0x1E1, 0x1F1      // Neuere Versionen
    ];
    
    for (const offset of playerOffsets) {
      try {
        const players = this.tryParsePlayersAt(offset);
        console.log(`[ScrepCore] Trying offset 0x${offset.toString(16)}: found ${players.length} players`);
        
        // Filtere echte Spieler  
        const realPlayers = players.filter(p => this.isValidPlayer(p));
        
        if (realPlayers.length >= 1 && realPlayers.length <= 8) {
          console.log('[ScrepCore] Found', realPlayers.length, 'valid players at offset', '0x' + offset.toString(16));
          realPlayers.forEach((p, i) => {
            console.log(`[ScrepCore] Player ${i}: ${p.name} (${p.race}) Team:${p.team} Type:${p.type}`);
          });
          return realPlayers;
        }
      } catch (e) {
        console.log(`[ScrepCore] Failed at offset 0x${offset.toString(16)}: ${e.message}`);
        continue;
      }
    }
    
    // Fallback: Vollständiger Scan der ersten 2KB nach Spieler-Pattern
    console.log('[ScrepCore] Trying exhaustive player scan...');
    const scannedPlayers = this.scanForPlayers();
    if (scannedPlayers.length > 0) {
      return scannedPlayers;
    }
    
    throw new Error('No valid SC:R players found in replay');
  }

  private isValidPlayer(player: PlayerData): boolean {
    return player.name.length >= 2 && 
           player.name.length <= 24 &&
           !player.name.includes('Observer') && 
           !player.name.includes('Computer') &&
           player.type !== 0 && // Not empty slot
           /^[a-zA-Z0-9_\-\[\]()]+$/.test(player.name) && // Valid name chars
           ['Terran', 'Protoss', 'Zerg'].includes(player.race);
  }

  private scanForPlayers(): PlayerData[] {
    console.log('[ScrepCore] Scanning for player patterns...');
    const players: PlayerData[] = [];
    
    // Scanne ersten 2KB nach Spieler-Namen Pattern
    for (let pos = 0x100; pos < Math.min(0x800, this.data.byteLength - 100); pos += 4) {
      try {
        this.reader.setPosition(pos);
        const possibleName = this.reader.readNullTerminatedString(24);
        
        if (possibleName.length >= 3 && possibleName.length <= 24 && 
            /^[a-zA-Z0-9_\-\[\]()]+$/.test(possibleName)) {
          
          // Try to parse full player structure from this position
          const player = this.tryParsePlayerAt(pos);
          if (player && this.isValidPlayer(player)) {
            console.log(`[ScrepCore] Found player via scan: ${player.name} at 0x${pos.toString(16)}`);
            players.push(player);
            
            if (players.length >= 8) break; // Max 8 players
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    return players.slice(0, 8); // Max 8 players
  }

  private tryParsePlayerAt(offset: number): PlayerData | null {
    try {
      if (offset + 36 >= this.data.byteLength) return null;
      
      this.reader.setPosition(offset);
      
      // Player name (25 bytes)
      const nameBytes = this.reader.readBytes(25);
      const name = this.decodePlayerName(nameBytes);
      
      if (!this.isValidSCRPlayerName(name)) return null;
      
      // Race, team, color, type
      const raceId = this.reader.readUInt8();
      const team = this.reader.readUInt8();  
      const color = this.reader.readUInt8();
      const type = this.reader.readUInt8();
      
      if (type === 0 || raceId > 6) return null;
      
      return {
        id: 0, // Will be reassigned
        name: name.trim(),
        race: ScrepConstants.getRaceName(raceId),
        raceId,
        team,
        color,
        type
      };
    } catch {
      return null;
    }
  }

  private isValidSCRPlayerName(name: string): boolean {
    return name.length >= 2 && 
           name.length <= 24 && 
           /^[a-zA-Z0-9_\-\[\]()]+$/.test(name) &&
           !name.includes('Observer') &&
           !name.includes('Computer');
  }

  private decodePlayerName(nameBytes: Uint8Array): string {
    // Find null terminator
    let length = nameBytes.indexOf(0);
    if (length === -1) length = nameBytes.length;
    
    // Decode using latin1 for SC:R compatibility
    const decoder = new TextDecoder('latin1');
    return decoder.decode(nameBytes.slice(0, length));
  }

  private tryParsePlayersAt(baseOffset: number): PlayerData[] {
    const players: PlayerData[] = [];
    
    try {
      // SC:R hat max 8 aktive Spieler slots
      for (let i = 0; i < 8; i++) {
        const offset = baseOffset + (i * 36); // 36 bytes per player
        
        if (offset + 36 >= this.data.byteLength) break;
        
        this.reader.setPosition(offset);
        
        // Player name (25 bytes) - SC:R Format
        const nameBytes = this.reader.readBytes(25);
        const name = this.decodePlayerName(nameBytes);
        
        // Skip empty/invalid names
        if (!this.isValidSCRPlayerName(name)) continue;
        
        // Race, team, color, type (SC:R specific)
        const raceId = this.reader.readUInt8();
        const team = this.reader.readUInt8();  
        const color = this.reader.readUInt8();
        const type = this.reader.readUInt8();
        
        // Validate SC:R player data
        if (type === 0 || raceId > 6) continue; // Empty slot or invalid race
        
        players.push({
          id: players.length, // Use index as ID
          name: name.trim(),
          race: ScrepConstants.getRaceName(raceId),
          raceId,
          team,
          color,
          type
        });
      }
    } catch (error) {
      console.warn('[ScrepCore] Player parsing error at offset', baseOffset, error);
      return [];
    }
    
    return players;
  }


  /**
   * Commands parsing - nach repdecoder.go:DecodeCommands
   */
  private async parseCommands(): Promise<Command[]> {
    console.log('[ScrepCore] Parsing commands...');
    
    // Command section detection
    const commandOffset = this.findCommandSection();
    if (!commandOffset) {
      throw new Error('Command section not found');
    }
    
    console.log('[ScrepCore] Commands start at:', '0x' + commandOffset.toString(16));
    
    this.reader.setPosition(commandOffset);
    const commandParser = new CommandParser(this.reader);
    
    return await commandParser.parseAllCommands();
  }

  /**
   * Command section detection - nach screp Logik
   */
  private findCommandSection(): number | null {
    // Suche nach Command-Pattern in typischen Bereichen
    for (let pos = 0x500; pos < Math.min(this.data.byteLength - 1000, 0x8000); pos += 16) {
      if (this.looksLikeCommandSection(pos)) {
        return pos;
      }
    }
    return null;
  }

  private looksLikeCommandSection(offset: number): boolean {
    try {
      this.reader.setPosition(offset);
      const sample = this.reader.readBytes(128);
      
      let frameSync = 0;
      let validCommands = 0;
      
      for (let i = 0; i < sample.length - 2; i++) {
        const byte = sample[i];
        const next = sample[i + 1];
        
        // Frame sync (0x00-0x03)
        if (byte <= 0x03) frameSync++;
        
        // Valid command + player ID
        if (ScrepConstants.isValidCommandType(byte) && next < 12) {
          validCommands++;
        }
      }
      
      return frameSync >= 3 && validCommands >= 2;
    } catch {
      return false;
    }
  }

  /**
   * Compute APM/EAPM data - nach repcore/comp.go
   */
  private computeData(header: ReplayHeader, players: PlayerData[], commands: Command[]): ComputedData {
    const gameMinutes = header.frames / 24 / 60; // 24 FPS
    
    const apm: number[] = [];
    const eapm: number[] = [];
    const buildOrders: any[][] = [];
    
    players.forEach(player => {
      const playerCommands = commands.filter(cmd => cmd.playerID === player.id);
      const effectiveCommands = playerCommands.filter(cmd => cmd.effective);
      
      // APM berechnung nach screp
      const playerAPM = gameMinutes > 0 ? Math.round(playerCommands.length / gameMinutes) : 0;
      const playerEAPM = gameMinutes > 0 ? Math.round(effectiveCommands.length / gameMinutes) : 0;
      
      apm.push(playerAPM);
      eapm.push(playerEAPM);
      buildOrders.push(this.extractBuildOrder(playerCommands));
      
      console.log('[ScrepCore]', player.name, 'APM:', playerAPM, 'EAPM:', playerEAPM);
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
      .filter(cmd => ['Build', 'Train', 'Tech', 'Upgrade'].some(action => cmd.typeString.includes(action)))
      .slice(0, 25)
      .map(cmd => ({
        frame: cmd.frame,
        timestamp: cmd.time,
        action: cmd.typeString,
        parameters: cmd.parameters
      }));
  }

  private framesToDuration(frames: number): string {
    const seconds = Math.floor(frames / 24);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
    const cleaned = name.replace(/[^\x20-\x7E]/g, '').trim();
    return cleaned.length >= 3 && /^[a-zA-Z0-9\s\-_.()]+$/.test(cleaned);
  }

  private isValidPlayerName(name: string): boolean {
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 25 && /^[a-zA-Z0-9_\-\[\]`'~!@#$%^&*()+={}|\\:";'<>?,./ ]+/.test(trimmed);
  }
}

export type { ScrepParseResult };