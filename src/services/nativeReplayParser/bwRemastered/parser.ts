
/**
 * StarCraft: Brood War Remastered .rep file parser
 * Completely rewritten based on icza/screp and BWAPI specification
 */

import { BWReplayData } from './types';
import { BWBinaryReader } from './binaryReader';
import { BWHeaderParser } from './headerParser';
import { BWPlayerParser } from './playerParser';
import { BWCommandParser } from './commandParser';
import { FRAMES_PER_SECOND } from './constants';

export class BWRemasteredParser {
  private reader: BWBinaryReader;
  private headerParser: BWHeaderParser;
  private playerParser: BWPlayerParser;
  private commandParser: BWCommandParser;

  constructor(arrayBuffer: ArrayBuffer) {
    console.log('[BWRemasteredParser] Initializing with buffer size:', arrayBuffer.byteLength);
    
    // Validate minimum file size
    if (arrayBuffer.byteLength < 633) {
      throw new Error('File too small to be a valid StarCraft replay (minimum 633 bytes required)');
    }
    
    this.reader = new BWBinaryReader(arrayBuffer);
    this.headerParser = new BWHeaderParser(this.reader);
    this.playerParser = new BWPlayerParser(this.reader);
    this.commandParser = new BWCommandParser(this.reader);
  }

  /**
   * Parse the complete replay file
   */
  parseReplay(): BWReplayData {
    console.log('[BWRemasteredParser] Starting complete replay parse...');
    
    try {
      // Parse header
      console.log('[BWRemasteredParser] Parsing header...');
      const header = this.headerParser.parseHeader();
      console.log('[BWRemasteredParser] Header parsed successfully:', {
        version: header.version,
        frames: header.totalFrames,
        map: header.mapName,
        gameType: header.gameType
      });

      // Parse players
      console.log('[BWRemasteredParser] Parsing players...');
      const players = this.playerParser.parsePlayers();
      console.log('[BWRemasteredParser] Players parsed successfully:', players.length);

      // Parse commands (limit to reasonable amount for initial load)
      console.log('[BWRemasteredParser] Parsing commands...');
      const commands = this.commandParser.parseCommands(1000);
      console.log('[BWRemasteredParser] Commands parsed successfully:', commands.length);

      // Calculate game duration
      const durationSeconds = header.totalFrames / FRAMES_PER_SECOND;
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = Math.floor(durationSeconds % 60);
      const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Determine game type string
      const gameTypeString = this.getGameTypeString(header.gameType);

      const result: BWReplayData = {
        mapName: header.mapName,
        totalFrames: header.totalFrames,
        duration,
        players,
        commands,
        gameType: gameTypeString
      };

      console.log('[BWRemasteredParser] Parse completed successfully:', {
        map: result.mapName,
        players: result.players.length,
        commands: result.commands.length,
        duration: result.duration,
        gameType: result.gameType
      });

      return result;
      
    } catch (error) {
      console.error('[BWRemasteredParser] Parse failed:', error);
      throw new Error(`Replay parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getGameTypeString(gameType: number): string {
    const gameTypes: Record<number, string> = {
      0x02: 'Melee',
      0x03: 'Free For All',
      0x04: 'One on One',
      0x0F: 'Use Map Settings',
      0x10: 'Team Melee',
      0x20: 'Team Free For All'
    };
    
    return gameTypes[gameType] || `Unknown (0x${gameType.toString(16)})`;
  }
}
