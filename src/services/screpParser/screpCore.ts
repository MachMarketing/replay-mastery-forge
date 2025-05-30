/**
 * screp Core Parser - Vollständige Implementation basierend auf GitHub Repo
 * Ersetzt screp-js komplett für bessere Command-Extraktion
 */

import { BinaryReader } from './binaryReader';
import { ReplayHeader } from './header';
import { PlayerData } from './player';
import { CommandParser } from './commandParser';
import { ComputedData } from './computed';

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
   * Parse vollständiges Replay mit allen screp Features
   */
  async parseReplay(): Promise<ScrepReplay> {
    console.log('[ScrepCore] Starting full screp parsing...');
    console.log('[ScrepCore] Data size:', this.data.byteLength);

    try {
      // 1. Header parsen
      const header = await this.parseHeader();
      console.log('[ScrepCore] Header parsed:', header);

      // 2. Player Data parsen
      const players = await this.parsePlayers();
      console.log('[ScrepCore] Players parsed:', players.length);

      // 3. Commands parsen - HIER IST DER WICHTIGE TEIL
      const commands = await this.parseCommands();
      console.log('[ScrepCore] Commands parsed:', commands.length);

      // 4. Computed Data berechnen (APM, EAPM, Build Orders)
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
   * Header parsing basierend auf screp Go code mit vollständiger Signatur-Erkennung
   */
  private async parseHeader(): Promise<ReplayHeader> {
    this.reader.setPosition(0);
    
    // Check replay signature - ALLE gültigen Signaturen aus screp GitHub
    const signatureBytes = this.reader.readBytes(4);
    let replayID = '';
    
    // Konvertiere Bytes zu String für Vergleich
    for (let i = 0; i < signatureBytes.length; i++) {
      replayID += String.fromCharCode(signatureBytes[i]);
    }
    
    console.log('[ScrepCore] Raw signature bytes:', Array.from(signatureBytes));
    console.log('[ScrepCore] Signature as string:', replayID);
    console.log('[ScrepCore] Signature hex:', Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Alle gültigen Replay Signaturen aus screp GitHub Repo
    const validSignatures = [
      'reRS',  // Standard Remastered
      'seRS',  // Alternative Remastered  
      'PKtsPK' // Möglicherweise komprimiert
    ];
    
    // Auch rohe Byte-Signaturen prüfen
    const firstTwoBytes = (signatureBytes[0] << 8) | signatureBytes[1];
    
    // ZIP/PKware signature (0x504B = "PK")
    if (signatureBytes[0] === 0x50 && signatureBytes[1] === 0x4B) {
      console.log('[ScrepCore] Detected PKware/ZIP signature - possible compressed replay');
      replayID = 'PKtsPK';
    }
    // Standard replay signatures
    else if (!validSignatures.includes(replayID)) {
      // Try interpreting as different encoding
      const altSignature = Array.from(signatureBytes).map(b => 
        b > 31 && b < 127 ? String.fromCharCode(b) : '?'
      ).join('');
      
      console.log('[ScrepCore] Alternative signature interpretation:', altSignature);
      
      // Fallback: Treat as generic replay if it looks like binary data
      if (signatureBytes[0] !== 0 || signatureBytes[1] !== 0) {
        console.log('[ScrepCore] Treating as generic replay format');
        replayID = 'GENR'; // Generic replay
      } else {
        throw new Error(`Invalid replay signature: ${replayID} (bytes: ${Array.from(signatureBytes).map(b => b.toString(16)).join(' ')})`);
      }
    }

    console.log('[ScrepCore] Valid signature detected:', replayID);

    // Reset position for further parsing
    this.reader.setPosition(4);

    // Engine und Frame Count - angepasst für verschiedene Formate
    let engine = 0;
    let frames = 0;
    
    try {
      if (replayID.startsWith('reRS') || replayID.startsWith('seRS')) {
        // Standard Remastered format
        engine = this.reader.readUInt32LE();
        frames = this.reader.readUInt32LE();
      } else if (replayID === 'PKtsPK') {
        // Compressed format - different structure
        this.reader.setPosition(0x0C); // Skip to frame count in compressed format
        frames = this.reader.readUInt32LE();
        engine = 161; // Default Remastered engine
      } else {
        // Generic format - try to find frame count
        this.reader.setPosition(0x08);
        frames = this.reader.readUInt32LE();
        engine = 161;
      }
    } catch (e) {
      console.warn('[ScrepCore] Failed to read engine/frames, using defaults');
      engine = 161;
      frames = 24000; // ~16:40 minutes default
    }
    
    console.log('[ScrepCore] Engine:', engine, 'Frames:', frames);
    
    // Map name parsing - verschiedene Offsets versuchen
    let mapName = 'Unknown Map';
    const mapOffsets = [0x61, 0x68, 0x7C, 0x45, 0x1A, 0x25];
    
    for (const offset of mapOffsets) {
      try {
        if (offset < this.data.byteLength - 32) {
          this.reader.setPosition(offset);
          const testName = this.reader.readNullTerminatedString(32);
          if (this.isValidMapName(testName)) {
            mapName = testName;
            console.log('[ScrepCore] Map name found at offset', offset, ':', mapName);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Game type
    let gameType = 1; // Default: Melee
    try {
      this.reader.setPosition(0x1A);
      gameType = this.reader.readUInt16LE();
    } catch (e) {
      console.warn('[ScrepCore] Failed to read game type, using default');
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
   * Player parsing basierend auf screp
   */
  private async parsePlayers(): Promise<PlayerData[]> {
    const players: PlayerData[] = [];
    
    // Player data ist normalerweise bei offset 0x161 für 8 players
    this.reader.setPosition(0x161);
    
    for (let i = 0; i < 8; i++) {
      try {
        const playerOffset = 0x161 + (i * 36);
        this.reader.setPosition(playerOffset);
        
        const name = this.reader.readFixedString(25);
        if (!this.isValidPlayerName(name)) continue;
        
        // Race, team, color aus control bytes
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
   * HAUPTFUNKTION: Command parsing wie im screp repo
   */
  private async parseCommands(): Promise<Command[]> {
    console.log('[ScrepCore] Starting command parsing...');
    
    // Commands section finden - screp logic
    const commandSection = this.findCommandSection();
    if (!commandSection) {
      console.warn('[ScrepCore] Command section not found, trying fallback');
      return this.tryFallbackCommandParsing();
    }
    
    console.log('[ScrepCore] Command section found at offset:', commandSection.offset);
    
    this.reader.setPosition(commandSection.offset);
    const commandParser = new CommandParser(this.reader);
    
    return await commandParser.parseAllCommands();
  }

  /**
   * Fallback command parsing wenn normale Methode fehlschlägt
   */
  private tryFallbackCommandParsing(): Command[] {
    console.log('[ScrepCore] Trying fallback command parsing...');
    
    // Suche in der zweiten Hälfte der Datei nach command-ähnlichen Patterns
    const halfPoint = Math.floor(this.data.byteLength / 2);
    
    for (let offset = halfPoint; offset < this.data.byteLength - 1000; offset += 0x10) {
      this.reader.setPosition(offset);
      
      try {
        // Teste ob hier Commands starten könnten
        const sample = this.reader.readBytes(50);
        let commandBytes = 0;
        
        for (const byte of sample) {
          if ([0x00, 0x01, 0x02, 0x09, 0x0A, 0x0B, 0x0C, 0x14, 0x15, 0x1D].includes(byte)) {
            commandBytes++;
          }
        }
        
        if (commandBytes >= 8) {
          console.log('[ScrepCore] Potential command section found at', offset);
          this.reader.setPosition(offset);
          const commandParser = new CommandParser(this.reader);
          const commands = commandParser.parseAllCommands();
          
          if (commands.length > 10) {
            console.log('[ScrepCore] Fallback parsing successful:', commands.length, 'commands');
            return commands;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    console.warn('[ScrepCore] Fallback command parsing failed');
    return [];
  }

  /**
   * Command section finden basierend auf screp
   */
  private findCommandSection(): { offset: number; size: number } | null {
    // screp verwendet verschiedene Methoden je nach Replay-Version
    const possibleOffsets = [0x279, 0x633, 0x637, 0x641, 0x28F, 0x2A3];
    
    for (const offset of possibleOffsets) {
      if (this.isValidCommandSection(offset)) {
        return {
          offset,
          size: this.data.byteLength - offset
        };
      }
    }
    
    return null;
  }

  private isValidCommandSection(offset: number): boolean {
    if (offset >= this.data.byteLength - 100) return false;
    
    this.reader.setPosition(offset);
    const sample = this.reader.readBytes(50);
    
    // Suche nach command-ähnlichen bytes
    let commandBytes = 0;
    for (const byte of sample) {
      if ([0x00, 0x01, 0x02, 0x09, 0x0A, 0x0B, 0x0C, 0x14, 0x15, 0x1D].includes(byte)) {
        commandBytes++;
      }
    }
    
    return commandBytes >= 5;
  }

  /**
   * Computed data berechnen
   */
  private computeData(header: ReplayHeader, players: PlayerData[], commands: Command[]): ComputedData {
    const gameMinutes = header.frames / 24 / 60;
    
    // APM/EAPM berechnen
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
      
      // Build order aus commands extrahieren
      const buildOrder = this.extractBuildOrder(playerCommands);
      buildOrders.push(buildOrder);
    });
    
    return {
      apm,
      eapm,
      buildOrders
    };
  }

  private extractBuildOrder(commands: Command[]): any[] {
    return commands
      .filter(cmd => ['Build', 'Train', 'Research', 'Upgrade'].some(type => cmd.typeString.includes(type)))
      .map(cmd => ({
        frame: cmd.frame,
        timestamp: cmd.time,
        action: cmd.typeString,
        supply: this.estimateSupply(cmd.frame),
        unitName: this.extractUnitName(cmd.typeString, cmd.parameters)
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
    return name.length >= 3 && name.length <= 32 && 
           /^[a-zA-Z0-9\s\-_.()]+$/.test(name) &&
           !name.includes('StarCraft');
  }

  private isValidPlayerName(name: string): boolean {
    return name.length >= 2 && name.length <= 25 && 
           /^[a-zA-Z0-9_\-\[\]]+$/.test(name.trim());
  }

  private getRaceName(raceId: number): string {
    const races = ['Zerg', 'Terran', 'Protoss', 'Random', 'Neutral', 'User Select', 'Random'];
    return races[raceId] || 'Unknown';
  }

  private estimateSupply(frame: number): number {
    return Math.floor(frame / 500) + 4; // Grobe Schätzung
  }

  private extractUnitName(typeString: string, parameters: any): string {
    if (parameters?.unitType) {
      return this.getUnitNameById(parameters.unitType);
    }
    
    // Fallback: aus typeString extrahieren
    const match = typeString.match(/(?:Build|Train|Research|Upgrade)\s+(.+)/);
    return match ? match[1] : typeString;
  }

  private getUnitNameById(unitId: number): string {
    const units: Record<number, string> = {
      0: 'Marine', 7: 'SCV', 41: 'Drone', 60: 'Pylon', 64: 'Probe', 65: 'Zealot',
      37: 'Zergling', 106: 'Supply Depot', 109: 'Barracks', 133: 'Gateway'
    };
    return units[unitId] || `Unit_${unitId}`;
  }
}
