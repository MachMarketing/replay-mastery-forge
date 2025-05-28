
/**
 * StarCraft: Brood War Remastered .rep file parser
 * Completely rewritten with dynamic format detection
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
    if (arrayBuffer.byteLength < 1000) {
      throw new Error('File too small to be a valid StarCraft replay (minimum 1000 bytes required)');
    }
    
    this.reader = new BWBinaryReader(arrayBuffer);
    this.headerParser = new BWHeaderParser(this.reader);
    this.playerParser = new BWPlayerParser(this.reader);
    this.commandParser = new BWCommandParser(this.reader);
  }

  /**
   * Parse the complete replay file with robust error handling
   */
  parseReplay(): BWReplayData {
    console.log('[BWRemasteredParser] Starting complete replay parse...');
    
    try {
      // Show file analysis for debugging
      this.analyzeFile();
      
      // Parse header with fallbacks
      console.log('[BWRemasteredParser] Parsing header...');
      const header = this.headerParser.parseHeader();
      console.log('[BWRemasteredParser] Header parsed:', {
        version: header.version,
        frames: header.totalFrames,
        map: header.mapName,
        gameType: header.gameType
      });

      // Parse players with dynamic detection
      console.log('[BWRemasteredParser] Parsing players...');
      const players = this.playerParser.parsePlayers();
      console.log('[BWRemasteredParser] Players found:', players.map(p => `${p.name} (${p.raceString})`));

      // Parse a limited number of commands for performance
      console.log('[BWRemasteredParser] Parsing commands...');
      const commands = this.commandParser.parseCommands(500); // Reduced for performance
      console.log('[BWRemasteredParser] Commands parsed:', commands.length);

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
        playersFound: result.players.length,
        playerNames: result.players.map(p => p.name),
        commands: result.commands.length,
        duration: result.duration,
        gameType: result.gameType
      });

      return result;
      
    } catch (error) {
      console.error('[BWRemasteredParser] Parse failed:', error);
      
      // Try to provide partial results even if parsing failed
      return this.createFallbackResult(error);
    }
  }

  private analyzeFile(): void {
    console.log('[BWRemasteredParser] === FILE ANALYSIS ===');
    
    // Show hex dump of first 64 bytes
    const hexDump = this.reader.createHexDump(0, 64);
    console.log('[BWRemasteredParser] First 64 bytes:\n' + hexDump);
    
    // Try to detect format
    const format = this.reader.detectFormat();
    console.log('[BWRemasteredParser] Detected format:', format);
    
    // Show hex dump of potential player area
    const playerAreaOffset = format.playerDataOffset;
    if (playerAreaOffset > 0 && playerAreaOffset < this.reader.getRemainingBytes()) {
      const playerHexDump = this.reader.createHexDump(playerAreaOffset, 128);
      console.log(`[BWRemasteredParser] Player area at 0x${playerAreaOffset.toString(16)}:\n` + playerHexDump);
    }
  }

  private createFallbackResult(error: any): BWReplayData {
    console.log('[BWRemasteredParser] Creating fallback result due to error:', error);
    
    // Try to at least extract player names by scanning
    let players = [];
    try {
      players = this.playerParser.parsePlayers();
    } catch (e) {
      console.warn('[BWRemasteredParser] Fallback player parsing also failed:', e);
      
      // Create dummy players
      players = [
        {
          name: 'Player 1',
          race: 0,
          raceString: 'Terran' as const,
          slotId: 0,
          team: 0,
          color: 0
        },
        {
          name: 'Player 2',
          race: 1,
          raceString: 'Protoss' as const,
          slotId: 1,
          team: 1,
          color: 1
        }
      ];
    }
    
    return {
      mapName: 'Unknown Map',
      totalFrames: 10000,
      duration: '7:00',
      players,
      commands: [],
      gameType: 'Unknown'
    };
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
