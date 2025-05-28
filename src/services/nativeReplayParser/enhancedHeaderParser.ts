
/**
 * Enhanced header parser for various StarCraft replay formats
 */

import { BinaryReader } from './binaryReader';
import { ReplayHeader, PlayerInfo } from './types';
import { RACES, REPLAY_MAGIC } from './constants';

export class EnhancedHeaderParser {
  private reader: BinaryReader;

  constructor(buffer: ArrayBuffer) {
    this.reader = new BinaryReader(buffer);
  }

  /**
   * Parse replay header with enhanced format detection
   */
  parseHeader(): ReplayHeader {
    console.log('[EnhancedHeaderParser] Starting enhanced header parse');
    
    // Try different parsing strategies
    const strategies = [
      () => this.parseStandardHeader(),
      () => this.parseAlternativeHeader(),
      () => this.parseFlexibleHeader()
    ];
    
    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result && result.players.length > 0) {
          console.log('[EnhancedHeaderParser] Successfully parsed with strategy');
          return result;
        }
      } catch (error) {
        console.log('[EnhancedHeaderParser] Strategy failed:', error);
        continue;
      }
    }
    
    throw new Error('Could not parse replay header with any strategy');
  }

  /**
   * Standard header parsing (original method)
   */
  private parseStandardHeader(): ReplayHeader {
    this.reader.setPosition(0);
    
    const magic = this.reader.readFixedString(4);
    if (magic !== REPLAY_MAGIC) {
      throw new Error(`Expected magic "${REPLAY_MAGIC}", got "${magic}"`);
    }

    this.reader.skip(4);
    const version = this.reader.readUInt32();
    
    this.reader.setPosition(0x0C);
    const frames = this.reader.readUInt32();
    
    this.reader.setPosition(0x61);
    const mapName = this.reader.readFixedString(32);
    
    this.reader.setPosition(0x161);
    const players = this.parsePlayersStandard();
    
    this.reader.setPosition(0x1A1);
    const gameType = this.reader.readByte();
    const gameSubType = this.reader.readByte();

    return {
      magic,
      version,
      frames,
      mapName: mapName.trim(),
      playerCount: players.length,
      players,
      gameType,
      gameSubType
    };
  }

  /**
   * Alternative header parsing for different formats
   */
  private parseAlternativeHeader(): ReplayHeader {
    console.log('[EnhancedHeaderParser] Trying alternative header parsing');
    
    // Search for key patterns in the file
    const mapName = this.findMapName();
    const players = this.findPlayers();
    const frames = this.estimateFrames();
    
    return {
      magic: 'Repl',
      version: 1,
      frames,
      mapName: mapName || 'Unknown Map',
      playerCount: players.length,
      players,
      gameType: 0,
      gameSubType: 0
    };
  }

  /**
   * Flexible header parsing that adapts to file structure
   */
  private parseFlexibleHeader(): ReplayHeader {
    console.log('[EnhancedHeaderParser] Trying flexible header parsing');
    
    // Scan the file for recognizable patterns
    const fileSize = this.reader.getRemainingBytes();
    console.log('[EnhancedHeaderParser] File size:', fileSize);
    
    // Look for player names (typically ASCII strings)
    const players = this.scanForPlayerNames();
    
    // Estimate other values
    const frames = Math.max(1000, fileSize / 10); // Rough estimate
    
    return {
      magic: 'Repl',
      version: 1,
      frames,
      mapName: 'Unknown Map',
      playerCount: players.length,
      players,
      gameType: 0,
      gameSubType: 0
    };
  }

  /**
   * Parse players using standard method
   */
  private parsePlayersStandard(): PlayerInfo[] {
    const players: PlayerInfo[] = [];
    
    for (let i = 0; i < 8; i++) {
      const startPos = this.reader.getPosition();
      
      const name = this.reader.readFixedString(24);
      this.reader.skip(8);
      const race = this.reader.readByte();
      this.reader.skip(3);
      const team = this.reader.readByte();
      const color = this.reader.readByte();
      
      if (name.trim().length > 0 && race < 7) {
        players.push({
          id: i,
          name: name.trim(),
          race,
          raceString: RACES[race as keyof typeof RACES] || 'Unknown',
          team,
          color
        });
      }
      
      this.reader.setPosition(startPos + 36);
    }

    return players;
  }

  /**
   * Find map name by scanning file
   */
  private findMapName(): string | null {
    const buffer = this.reader.getRemainingBytes();
    const view = new Uint8Array(this.reader.buffer as ArrayBuffer);
    
    // Look for common map file extensions or patterns
    const patterns = ['.scm', '.scx', 'Maps\\', 'maps\\'];
    
    for (const pattern of patterns) {
      const patternBytes = new TextEncoder().encode(pattern);
      for (let i = 0; i < view.length - patternBytes.length; i++) {
        let match = true;
        for (let j = 0; j < patternBytes.length; j++) {
          if (view[i + j] !== patternBytes[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          // Extract potential map name around this position
          const start = Math.max(0, i - 50);
          const end = Math.min(view.length, i + 100);
          const mapSection = new TextDecoder('utf-8', { fatal: false })
            .decode(view.slice(start, end));
          
          // Extract readable map name
          const mapMatch = mapSection.match(/([A-Za-z0-9\s\-_\.]{3,30})\.(scm|scx)/i);
          if (mapMatch) {
            return mapMatch[1].trim();
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Find players by scanning for player name patterns
   */
  private findPlayers(): PlayerInfo[] {
    return this.scanForPlayerNames();
  }

  /**
   * Scan file for potential player names
   */
  private scanForPlayerNames(): PlayerInfo[] {
    const players: PlayerInfo[] = [];
    const view = new Uint8Array(this.reader.buffer as ArrayBuffer);
    
    // Look for sequences that could be player names
    // Player names are typically 3-24 characters, printable ASCII
    for (let i = 0; i < view.length - 3; i++) {
      if (this.isValidPlayerNameStart(view, i)) {
        const name = this.extractPlayerName(view, i);
        if (name && name.length >= 3 && name.length <= 24) {
          // Check if this looks like a real player name
          if (this.isLikelyPlayerName(name)) {
            players.push({
              id: players.length,
              name: name.trim(),
              race: 6, // Random as default
              raceString: 'Random',
              team: 0,
              color: players.length
            });
            
            // Don't add too many players
            if (players.length >= 8) break;
          }
        }
      }
    }
    
    // If we found no players, create default ones
    if (players.length === 0) {
      players.push({
        id: 0,
        name: 'Player 1',
        race: 6,
        raceString: 'Random',
        team: 0,
        color: 0
      });
    }
    
    return players;
  }

  /**
   * Check if a position could be the start of a player name
   */
  private isValidPlayerNameStart(view: Uint8Array, pos: number): boolean {
    const byte = view[pos];
    // Should be printable ASCII character
    return byte >= 32 && byte <= 126 && byte !== 0;
  }

  /**
   * Extract a potential player name from position
   */
  private extractPlayerName(view: Uint8Array, start: number): string | null {
    let end = start;
    
    // Find end of string (null terminator or non-printable)
    while (end < view.length && end < start + 24) {
      const byte = view[end];
      if (byte === 0 || byte < 32 || byte > 126) {
        break;
      }
      end++;
    }
    
    if (end - start < 3) return null;
    
    try {
      return new TextDecoder('utf-8').decode(view.slice(start, end));
    } catch {
      return null;
    }
  }

  /**
   * Check if a string looks like a real player name
   */
  private isLikelyPlayerName(name: string): boolean {
    // Filter out common false positives
    const commonFalsePositives = [
      'StarCraft', 'Brood War', 'Blizzard', 'Entertainment',
      'Maps', 'Scenario', 'Campaign', 'Battle.net'
    ];
    
    const upperName = name.toUpperCase();
    for (const fp of commonFalsePositives) {
      if (upperName.includes(fp.toUpperCase())) {
        return false;
      }
    }
    
    // Should contain mostly letters and numbers
    const alphanumeric = name.replace(/[^a-zA-Z0-9]/g, '').length;
    return alphanumeric >= name.length * 0.7;
  }

  /**
   * Estimate frame count from file size
   */
  private estimateFrames(): number {
    const fileSize = this.reader.getRemainingBytes();
    // Rough estimation: larger files = longer games
    return Math.max(1000, Math.min(50000, fileSize / 20));
  }

  /**
   * Get commands start position
   */
  getCommandsStartPosition(): number {
    // Try to find a reasonable position to start parsing commands
    // This is an estimate based on typical replay structure
    return Math.min(633, this.reader.getRemainingBytes() / 10);
  }
}
