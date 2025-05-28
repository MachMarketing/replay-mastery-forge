
/**
 * Enhanced Brood War Remastered replay parser
 * Handles the complex decompression and command parsing of Remastered replays
 */

import { BWBinaryReader } from './binaryReader';
import { BWCommandParser } from './commandParser';
import { BWHeaderParser } from './headerParser';
import { BWPlayerParser } from './playerParser';
import { BWReplayData, BWCommand } from './types';

export class BWRemasteredParser {
  private data: ArrayBuffer;
  private reader: BWBinaryReader;

  constructor(buffer: ArrayBuffer) {
    this.data = buffer;
    this.reader = new BWBinaryReader(buffer);
  }

  /**
   * Parse the complete replay
   */
  async parseReplay(): Promise<BWReplayData> {
    console.log('[BWRemasteredParser] Starting Remastered replay parsing');
    console.log('[BWRemasteredParser] Buffer size:', this.data.byteLength);

    try {
      // Parse header first
      const header = this.parseHeader();
      console.log('[BWRemasteredParser] Header parsed:', {
        mapName: header.mapName,
        playerCount: header.playerCount,
        frames: header.frames
      });

      // Parse players
      const players = this.parsePlayers(header);
      console.log('[BWRemasteredParser] Players parsed:', players.length);

      // Find command section and parse commands
      const commandSection = this.findCommandSection();
      this.reader.setPosition(commandSection.offset);
      
      const commandParser = new BWCommandParser(this.reader);
      
      // Parse commands with async support
      const commands = await commandParser.parseCommands(10000);
      console.log('[BWRemasteredParser] Commands parsed:', commands.length);

      // Calculate game metrics
      const gameLength = this.calculateGameLength(header.frames);
      const apmData = this.calculateAPM(commands, players);

      const result: BWReplayData = {
        header,
        players,
        commands,
        gameLength,
        apm: apmData,
        map: header.mapName,
        totalFrames: header.frames
      };

      console.log('[BWRemasteredParser] Parsing completed successfully');
      return result;

    } catch (error) {
      console.error('[BWRemasteredParser] Parsing failed:', error);
      throw new Error(`Remastered parsing failed: ${error}`);
    }
  }

  /**
   * Parse replay header
   */
  private parseHeader() {
    this.reader.setPosition(0);
    const headerParser = new BWHeaderParser(this.reader);
    return headerParser.parseHeader();
  }

  /**
   * Parse players
   */
  private parsePlayers(header: any) {
    const playerParser = new BWPlayerParser(this.reader);
    return playerParser.parsePlayers(header);
  }

  /**
   * Find the command section in the replay
   */
  private findCommandSection(): { offset: number; size: number } {
    // Standard Remastered command section usually starts around offset 633
    // But we need to be more flexible for different replay versions
    
    const possibleOffsets = [633, 637, 641, 645, 649, 653];
    
    for (const offset of possibleOffsets) {
      if (offset < this.data.byteLength - 100) {
        this.reader.setPosition(offset);
        
        // Check if this looks like a command section
        if (this.looksLikeCommandSection(offset)) {
          console.log(`[BWRemasteredParser] Found command section at offset ${offset}`);
          return {
            offset,
            size: this.data.byteLength - offset
          };
        }
      }
    }
    
    // Fallback to standard offset
    console.log('[BWRemasteredParser] Using fallback command section offset 633');
    return {
      offset: 633,
      size: this.data.byteLength - 633
    };
  }

  /**
   * Check if the given offset looks like a command section
   */
  private looksLikeCommandSection(offset: number): boolean {
    this.reader.setPosition(offset);
    
    if (!this.reader.canRead(50)) {
      return false;
    }
    
    const sample = this.reader.readBytes(50);
    let commandLikeBytes = 0;
    
    // Look for frame sync bytes and known command IDs
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      
      // Frame sync or known commands
      if ([0x00, 0x01, 0x02, 0x0C, 0x14, 0x1D, 0x20, 0x11, 0x13].includes(byte)) {
        commandLikeBytes++;
      }
    }
    
    // If we find several command-like bytes, this is probably the right section
    return commandLikeBytes >= 5;
  }

  /**
   * Calculate game length from frames
   */
  private calculateGameLength(frames: number): { minutes: number; seconds: number; string: string } {
    // Remastered FPS is approximately 23.81
    const totalSeconds = Math.floor(frames / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return {
      minutes,
      seconds,
      string: `${minutes}:${seconds.toString().padStart(2, '0')}`
    };
  }

  /**
   * Calculate APM for all players
   */
  private calculateAPM(commands: BWCommand[], players: any[]): number[] {
    const apmData: number[] = [];
    
    for (const player of players) {
      const playerCommands = commands.filter(cmd => cmd.userId === player.id);
      
      // Filter out sync commands for APM calculation
      const actionCommands = playerCommands.filter(cmd => 
        ![0x00, 0x01, 0x02, 0x36].includes(cmd.type)
      );
      
      // Calculate APM based on game length
      const gameMinutes = this.calculateGameLength(Math.max(...commands.map(c => c.frame))).minutes + 
                         this.calculateGameLength(Math.max(...commands.map(c => c.frame))).seconds / 60;
      
      const apm = gameMinutes > 0 ? Math.round(actionCommands.length / gameMinutes) : 0;
      apmData.push(apm);
    }
    
    return apmData;
  }
}
