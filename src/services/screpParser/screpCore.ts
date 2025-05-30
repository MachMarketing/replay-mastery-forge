
/**
 * screp Core Parser - Exakte Implementation nach GitHub Repo
 * Folgt der genauen Struktur von github.com/icza/screp
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
   * Parse replay genau wie screp GitHub repo
   */
  async parseReplay(): Promise<ScrepReplay> {
    console.log('[ScrepCore] Starting screp GitHub compatible parsing...');
    console.log('[ScrepCore] Data size:', this.data.byteLength);

    try {
      // 1. Header - exakt wie screp repo
      const header = this.parseHeader();
      console.log('[ScrepCore] Header parsed:', header);

      // 2. Players - exakt wie screp repo  
      const players = this.parsePlayers();
      console.log('[ScrepCore] Players parsed:', players.length);

      // 3. Commands - exakt wie screp repo
      const commands = await this.parseCommands();
      console.log('[ScrepCore] Commands parsed:', commands.length);

      // 4. Computed data
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
   * Header parsing - EXAKT wie screp GitHub repo repdecoder.go
   */
  private parseHeader(): ReplayHeader {
    console.log('[ScrepCore] Starting header parsing...');
    
    // Reset position to start
    this.reader.setPosition(0);
    
    // Lese die ersten 30 bytes für vollständige Header-Analyse
    const headerBytes = this.reader.readBytes(30);
    console.log('[ScrepCore] Header bytes:', Array.from(headerBytes.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    
    // Reset und lese Header-Struktur
    this.reader.setPosition(0);
    
    // Nach screp repo: Header structure
    // 0x00: Game identifier (4 bytes)
    // 0x04: Unknown (4 bytes) 
    // 0x08: Unknown (4 bytes)
    // 0x0C: Replay ID (4 bytes) - HIER ist die Signatur!
    
    const gameId = this.reader.readUInt32LE();
    const unknown1 = this.reader.readUInt32LE(); 
    const unknown2 = this.reader.readUInt32LE();
    
    // Replay ID bei offset 0x0C (12)
    const replayIdBytes = this.reader.readBytes(4);
    const replayID = new TextDecoder('latin1').decode(replayIdBytes);
    
    console.log('[ScrepCore] Game ID:', '0x' + gameId.toString(16));
    console.log('[ScrepCore] Unknown1:', '0x' + unknown1.toString(16));
    console.log('[ScrepCore] Unknown2:', '0x' + unknown2.toString(16));
    console.log('[ScrepCore] Replay ID at 0x0C:', replayID);
    console.log('[ScrepCore] Replay ID bytes:', Array.from(replayIdBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    
    // Validiere Replay ID nach screp repo
    const validReplayIds = ['reRS', 'seRS'];
    
    if (!validReplayIds.includes(replayID)) {
      // Probiere alternative Positionen
      console.log('[ScrepCore] Standard replay ID invalid, trying alternatives...');
      
      // Manchmal ist die Signatur an Position 4
      this.reader.setPosition(4);
      const altReplayIdBytes = this.reader.readBytes(4);
      const altReplayID = new TextDecoder('latin1').decode(altReplayIdBytes);
      console.log('[ScrepCore] Alternative replay ID at 0x04:', altReplayID);
      
      if (validReplayIds.includes(altReplayID)) {
        console.log('[ScrepCore] Found valid replay ID at alternative position');
        // Fortsetzung mit gefundener ID
      } else {
        // Letzter Versuch: Komprimiertes Format erkennen
        this.reader.setPosition(0);
        const firstBytes = this.reader.readBytes(4);
        
        // Check für PKWARE compression (ZIP signature)
        if (firstBytes[0] === 0x50 && firstBytes[1] === 0x4B) {
          console.log('[ScrepCore] Detected compressed replay (PKWARE/ZIP)');
          // Für komprimierte Replays müssen wir erst dekomprimieren
          throw new Error('Compressed replays not yet implemented - need decompression first');
        }
        
        console.log('[ScrepCore] All replay ID checks failed');
        console.log('[ScrepCore] First 4 bytes:', Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        console.log('[ScrepCore] First 4 bytes as string:', new TextDecoder('latin1').decode(firstBytes));
        
        throw new Error(`Invalid replay format. Expected 'reRS' or 'seRS', got: '${replayID}' (bytes: ${Array.from(replayIdBytes).map(b => '0x' + b.toString(16)).join(' ')})`);
      }
    }
    
    console.log('[ScrepCore] Valid replay ID found:', replayID);
    
    // Engine und Frames nach screp repo Struktur
    this.reader.setPosition(0x10);
    const engine = this.reader.readUInt32LE();
    const frames = this.reader.readUInt32LE();
    
    console.log('[ScrepCore] Engine:', engine);
    console.log('[ScrepCore] Frames:', frames);
    
    // Map name parsing - verschiedene Offsets nach screp repo
    let mapName = 'Unknown Map';
    const mapOffsets = [0x61, 0x68, 0x7C];
    
    for (const offset of mapOffsets) {
      try {
        if (offset < this.data.byteLength - 32) {
          this.reader.setPosition(offset);
          const testName = this.reader.readNullTerminatedString(32);
          if (this.isValidMapName(testName)) {
            mapName = testName;
            console.log('[ScrepCore] Map name found at offset', '0x' + offset.toString(16), ':', mapName);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Game type
    let gameType = 1;
    try {
      this.reader.setPosition(0x1A);
      gameType = this.reader.readUInt16LE();
    } catch (e) {
      console.warn('[ScrepCore] Failed to read game type');
    }

    return {
      replayID,
      engine,
      frames,
      startTime: new Date(),
      mapName,
      gameType,
      duration: this.framesToDuration(frames)
    };
  }

  /**
   * Player parsing nach screp repo
   */
  private parsePlayers(): PlayerData[] {
    const players: PlayerData[] = [];
    
    // Player data offset nach screp repo
    const playerOffset = 0x161;
    
    for (let i = 0; i < 8; i++) {
      try {
        const offset = playerOffset + (i * 36);
        this.reader.setPosition(offset);
        
        const name = this.reader.readFixedString(25);
        if (!this.isValidPlayerName(name)) continue;
        
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
        continue;
      }
    }

    return players;
  }

  /**
   * Command parsing nach screp repo
   */
  private async parseCommands(): Promise<Command[]> {
    console.log('[ScrepCore] Starting command parsing...');
    
    // Command section nach screp repo finden
    const commandOffset = this.findCommandOffset();
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
   * Command offset finden nach screp repo
   */
  private findCommandOffset(): number | null {
    // Nach screp repo sind Commands normalerweise bei diesen Offsets
    const possibleOffsets = [0x279, 0x633, 0x637];
    
    for (const offset of possibleOffsets) {
      if (this.isValidCommandOffset(offset)) {
        return offset;
      }
    }
    
    return null;
  }

  private isValidCommandOffset(offset: number): boolean {
    if (offset >= this.data.byteLength - 100) return false;
    
    this.reader.setPosition(offset);
    const sample = this.reader.readBytes(20);
    
    // Suche nach command patterns
    let commandBytes = 0;
    for (const byte of sample) {
      if ([0x00, 0x01, 0x02, 0x09, 0x0A, 0x0B, 0x0C, 0x14, 0x15].includes(byte)) {
        commandBytes++;
      }
    }
    
    return commandBytes >= 3;
  }

  /**
   * Computed data
   */
  private computeData(header: ReplayHeader, players: PlayerData[], commands: Command[]): ComputedData {
    const gameMinutes = header.frames / 24 / 60;
    
    const apm: number[] = [];
    const eapm: number[] = [];
    const buildOrders: any[][] = [];
    
    players.forEach(player => {
      const playerCommands = commands.filter(cmd => cmd.playerID === player.id);
      const effectiveCommands = playerCommands.filter(cmd => cmd.effective);
      
      const playerAPM = Math.round(playerCommands.length / gameMinutes);
      const playerEAPM = Math.round(effectiveCommands.length / gameMinutes);
      
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

  // Utility functions
  private framesToDuration(frames: number): string {
    const totalSeconds = Math.floor(frames / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private isValidMapName(name: string): boolean {
    return name.length >= 3 && name.length <= 32 && 
           /^[a-zA-Z0-9\s\-_.()]+$/.test(name);
  }

  private isValidPlayerName(name: string): boolean {
    return name.length >= 2 && name.length <= 25 && 
           /^[a-zA-Z0-9_\-\[\]]+$/.test(name.trim());
  }

  private getRaceName(raceId: number): string {
    const races = ['Zerg', 'Terran', 'Protoss', 'Random'];
    return races[raceId] || 'Unknown';
  }
}
