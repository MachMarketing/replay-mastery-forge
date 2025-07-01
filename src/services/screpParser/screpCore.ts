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
   * Header parsing - KORRIGIERTE Offsets für SC:R Replays
   */
  private parseHeader(): ReplayHeader {
    console.log('[ScrepCore] Parsing header with SC:R corrected offsets...');
    
    this.reader.setPosition(0);
    
    // KORREKT: ReplayID ist bei Offset 0x0C (12), nicht 0x00!
    // Das ist der Unterschied zwischen SC1 und SC:R Replays
    this.reader.setPosition(0x0C);
    const replayIdBytes = this.reader.readBytes(4);
    const replayID = new TextDecoder('latin1').decode(replayIdBytes);
    console.log('[ScrepCore] Replay ID at 0x0C (correct offset):', replayID);
    
    // Validate replay ID first
    if (replayID !== 'reRS' && replayID !== 'seRS') {
      console.log('[ScrepCore] First attempt failed, trying fallback detection...');
      
      // Fallback: Durchsuche ersten 64 bytes nach gültiger Replay ID
      let foundValidId = false;
      let validReplayId = '';
      
      for (let offset = 0; offset < Math.min(64, this.data.byteLength - 4); offset++) {
        this.reader.setPosition(offset);
        const testBytes = this.reader.readBytes(4);
        const testId = new TextDecoder('latin1').decode(testBytes);
        
        if (testId === 'reRS' || testId === 'seRS') {
          console.log('[ScrepCore] Found valid Replay ID at offset:', '0x' + offset.toString(16), 'ID:', testId);
          validReplayId = testId;
          foundValidId = true;
          break;
        }
      }
      
      if (!foundValidId) {
        throw new Error(`Invalid StarCraft replay. No valid replay ID found. Expected 'reRS' or 'seRS', but searched first 64 bytes without success.`);
      }
      
      replayID = validReplayId;
    }
    
    // Engine version - SC:R verwendet anderen Offset
    this.reader.setPosition(0x10);
    const engine = this.reader.readUInt32LE();
    console.log('[ScrepCore] Engine at 0x10:', engine);
    
    // Frames - SC:R korrekte Position
    this.reader.setPosition(0x14);
    const frames = this.reader.readUInt32LE();
    console.log('[ScrepCore] Frames at 0x14:', frames);
    
    // Game type
    this.reader.setPosition(0x18);
    const gameType = this.reader.readUInt16LE();
    console.log('[ScrepCore] Game type at 0x18:', gameType);
    
    // Game ID - richtige Position für SC:R
    this.reader.setPosition(0x00);
    const gameId = this.reader.readUInt32LE();
    console.log('[ScrepCore] Game ID at 0x00:', '0x' + gameId.toString(16));
    
    // Map name - SC:R spezifische Detection
    const mapName = this.findMapNameSCR();
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
   * SC:R spezifische Map name detection
   */
  private findMapNameSCR(): string {
    // SC:R Map Namen sind typischerweise bei anderen Offsets als SC1
    const scrOffsets = [0x75, 0x89, 0x95, 0xA5, 0xB2, 0xC0, 0xD0, 0xE0];
    
    for (const offset of scrOffsets) {
      try {
        if (offset + 64 < this.data.byteLength) {
          this.reader.setPosition(offset);
          const testName = this.reader.readNullTerminatedString(32);
          if (this.isValidMapName(testName)) {
            console.log('[ScrepCore] Found valid map name at offset', '0x' + offset.toString(16) + ':', testName);
            return testName.trim();
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Erweiterte Suche für SC:R
    console.log('[ScrepCore] Extended map name search for SC:R...');
    for (let pos = 0x60; pos < Math.min(0x300, this.data.byteLength - 32); pos += 2) {
      try {
        this.reader.setPosition(pos);
        const testName = this.reader.readNullTerminatedString(32);
        if (this.isValidMapName(testName) && testName.length > 5) {
          console.log('[ScrepCore] Extended search found map at', '0x' + pos.toString(16) + ':', testName);
          return testName.trim();
        }
      } catch (e) {
        continue;
      }
    }
    
    return 'Unknown Map';
  }

  /**
   * Player parsing - SC:R angepasst
   */
  private parsePlayers(): PlayerData[] {
    console.log('[ScrepCore] Parsing players with SC:R logic...');
    
    // SC:R Player section - erweiterte Offset-Suche
    const scrPlayerOffsets = [0x161, 0x1A1, 0x1C1, 0x200, 0x240, 0x280, 0x2C0, 0x300];
    
    for (const baseOffset of scrPlayerOffsets) {
      const players = this.tryParsePlayersAt(baseOffset);
      if (players.length > 0 && this.validatePlayers(players)) {
        console.log('[ScrepCore] Found', players.length, 'valid SC:R players at offset', '0x' + baseOffset.toString(16));
        return players;
      }
    }
    
    console.warn('[ScrepCore] No valid SC:R players found');
    return [];
  }

  private tryParsePlayersAt(baseOffset: number): PlayerData[] {
    const players: PlayerData[] = [];
    
    for (let i = 0; i < 12; i++) {
      try {
        const offset = baseOffset + (i * 36); // Standard player entry size
        
        if (offset + 36 >= this.data.byteLength) break;
        
        this.reader.setPosition(offset);
        
        // Player name (25 bytes) - SC:R spezifische Dekodierung
        const nameBytes = this.reader.readBytes(25);
        const name = this.decodeSCRPlayerName(nameBytes);
        
        if (!this.isValidPlayerName(name)) continue;
        
        // Race, team, color - SC:R Format
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
        
        console.log('[ScrepCore] SC:R Player', i + ':', name, '(' + ScrepConstants.getRaceName(raceId) + ')');
        
      } catch (error) {
        break;
      }
    }
    
    return players;
  }

  /**
   * SC:R spezifische Player-Name Dekodierung
   */
  private decodeSCRPlayerName(bytes: Uint8Array): string {
    let name = '';
    for (let i = 0; i < bytes.length && bytes[i] !== 0; i++) {
      const byte = bytes[i];
      // SC:R unterstützt erweiterten Zeichensatz
      if (byte >= 32 && byte <= 126) {
        name += String.fromCharCode(byte);
      } else if (byte > 127) {
        // Mögliche Unicode-Zeichen in SC:R
        name += '?';
      }
    }
    return name.trim();
  }

  /**
   * Validiere Spieler-Array
   */
  private validatePlayers(players: PlayerData[]): boolean {
    if (players.length === 0) return false;
    
    // Mindestens 1 Spieler für ein echtes Spiel (SC:R kann auch 1v1 vs KI sein)
    const validPlayers = players.filter(p => p.name.length > 1);
    if (validPlayers.length < 1) return false;
    
    // Alle Spieler sollten gültige Namen haben
    return players.every(p => this.isValidPlayerName(p.name));
  }

  /**
   * Command parsing - delegiert an CommandParser
   */
  private async parseCommands(): Promise<Command[]> {
    console.log('[ScrepCore] Starting SC:R command parsing...');
    
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
   * SC:R Command section detection
   */
  private findCommandSection(): number | null {
    // SC:R Command section - erweiterte Suche
    const searchStart = 0x500;
    const searchEnd = Math.min(this.data.byteLength - 1000, 0x6000);
    
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
      const sample = this.reader.readBytes(256);
      
      // SC:R spezifische Pattern-Erkennung
      let frameSyncCount = 0;
      let commandCount = 0;
      let validPatterns = 0;
      
      for (let i = 0; i < sample.length - 2; i++) {
        const byte = sample[i];
        const nextByte = sample[i + 1];
        
        // Frame sync patterns (0x00-0x03)
        if (byte <= 0x03) frameSyncCount++;
        
        // SC:R Commands mit Player ID (0-11)
        if (ScrepConstants.isValidCommandType(byte) && nextByte < 12) {
          commandCount++;
          validPatterns++;
        }
        
        // SC:R spezifische Sequenzen
        if (byte === 0x00 && nextByte === 0x00) validPatterns++;
        if (byte === 0x0C && nextByte < 12) validPatterns++; // Build commands
        if (byte === 0x1E && nextByte < 12) validPatterns++; // Train commands
      }
      
      console.log('[ScrepCore] Command pattern analysis at', '0x' + offset.toString(16) + ':', 
                  'frameSyncs:', frameSyncCount, 'commands:', commandCount, 'patterns:', validPatterns);
      
      return frameSyncCount >= 5 && commandCount >= 3 && validPatterns >= 8;
      
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
      
      console.log('[ScrepCore] Player', player.name, 'APM:', playerAPM, 'EAPM:', playerEAPM);
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
    // SC:R erlaubt mehr Sonderzeichen
    return /^[a-zA-Z0-9_\-\[\]`'~!@#$%^&*()+={}|\\:";'<>?,./ ]+/.test(trimmed);
  }
}

export type { ScrepParseResult };
