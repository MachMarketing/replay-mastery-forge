
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
   * Header parsing basierend auf screp Go code
   */
  private async parseHeader(): Promise<ReplayHeader> {
    this.reader.setPosition(0);
    
    // Check replay signature
    const signature = this.reader.readBytes(4);
    const replayID = String.fromCharCode(...signature);
    
    if (!['reRS', 'seRS'].includes(replayID)) {
      throw new Error(`Invalid replay signature: ${replayID}`);
    }

    // Engine und Frame Count
    const engine = this.reader.readUInt32LE();
    const frames = this.reader.readUInt32LE();
    
    // Map name parsing - verschiedene Offsets versuchen
    let mapName = 'Unknown Map';
    const mapOffsets = [0x61, 0x68, 0x7C, 0x45];
    
    for (const offset of mapOffsets) {
      try {
        this.reader.setPosition(offset);
        const testName = this.reader.readNullTerminatedString(32);
        if (this.isValidMapName(testName)) {
          mapName = testName;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Game type
    this.reader.setPosition(0x1A);
    const gameType = this.reader.readUInt16LE();

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
      throw new Error('Command section not found');
    }
    
    console.log('[ScrepCore] Command section found at offset:', commandSection.offset);
    
    this.reader.setPosition(commandSection.offset);
    const commandParser = new CommandParser(this.reader);
    
    return await commandParser.parseAllCommands();
  }

  /**
   * Command section finden basierend auf screp
   */
  private findCommandSection(): { offset: number; size: number } | null {
    // screp verwendet verschiedene Methoden je nach Replay-Version
    const possibleOffsets = [0x279, 0x633, 0x637, 0x641];
    
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
