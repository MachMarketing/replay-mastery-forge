
/**
 * Enhanced Brood War Remastered replay parser
 * Handles the complex decompression and command parsing of Remastered replays
 */

import { BWBinaryReader } from './binaryReader';
import { BWCommandParser } from './commandParser';
import { BWHeaderParser } from './headerParser';
import { BWPlayerParser } from './playerParser';
import { BWReplayData, BWCommand, BWPlayer, BWBuildOrderItem } from './types';

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
        frames: header.totalFrames
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
      const gameLength = this.calculateGameLength(header.totalFrames);
      
      // Calculate APM and EAPM for each player
      const playersWithMetrics = this.calculatePlayerMetrics(commands, players);
      
      // Extract build orders for each player
      const buildOrders = this.extractBuildOrders(commands, playersWithMetrics);

      const result: BWReplayData = {
        mapName: header.mapName,
        totalFrames: header.totalFrames,
        duration: gameLength.string,
        durationSeconds: gameLength.totalSeconds,
        players: playersWithMetrics,
        commands,
        gameType: this.getGameTypeString(header.gameType),
        buildOrders
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
    return playerParser.parsePlayers();
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
  private calculateGameLength(frames: number): { minutes: number; seconds: number; totalSeconds: number; string: string } {
    // Remastered FPS is approximately 23.81
    const totalSeconds = Math.floor(frames / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return {
      minutes,
      seconds,
      totalSeconds,
      string: `${minutes}:${seconds.toString().padStart(2, '0')}`
    };
  }

  /**
   * Calculate APM and EAPM for all players
   */
  private calculatePlayerMetrics(commands: BWCommand[], players: BWPlayer[]): BWPlayer[] {
    const lastFrame = Math.max(...commands.map(c => c.frame), 0);
    const gameLength = this.calculateGameLength(lastFrame);
    const gameMinutes = gameLength.totalSeconds / 60;
    
    return players.map(player => {
      const playerCommands = commands.filter(cmd => cmd.userId === player.id);
      
      // APM: All actionable commands (excluding sync commands)
      const actionCommands = playerCommands.filter(cmd => 
        ![0x00, 0x01, 0x02, 0x36].includes(cmd.type)
      );
      
      // EAPM: Effective actions (build, train, attack, upgrade commands only)
      // Remove duplicates within 250ms window and filter for meaningful actions
      const effectiveCommands = this.filterEffectiveActions(playerCommands);
      
      const apm = gameMinutes > 0 ? Math.round(actionCommands.length / gameMinutes) : 0;
      const eapm = gameMinutes > 0 ? Math.round(effectiveCommands.length / gameMinutes) : 0;
      
      return {
        ...player,
        apm,
        eapm
      };
    });
  }

  /**
   * Filter commands for EAPM calculation
   */
  private filterEffectiveActions(commands: BWCommand[]): BWCommand[] {
    // Sort commands by frame
    const sortedCommands = commands.sort((a, b) => a.frame - b.frame);
    const effectiveCommands: BWCommand[] = [];
    const recentCommands = new Map<number, number>(); // command type -> frame
    
    for (const cmd of sortedCommands) {
      // Only count meaningful actions for EAPM
      const isMeaningfulAction = this.isMeaningfulAction(cmd.type);
      if (!isMeaningfulAction) continue;
      
      // Check for duplicates within 250ms (approximately 6 frames at 23.81 FPS)
      const lastFrame = recentCommands.get(cmd.type) || 0;
      const frameDiff = cmd.frame - lastFrame;
      
      if (frameDiff >= 6 || !recentCommands.has(cmd.type)) {
        effectiveCommands.push(cmd);
        recentCommands.set(cmd.type, cmd.frame);
      }
    }
    
    return effectiveCommands;
  }

  /**
   * Check if a command is meaningful for EAPM calculation
   */
  private isMeaningfulAction(commandType: number): boolean {
    // Build, train, attack, upgrade, research commands
    const meaningfulCommands = [
      0x0C, // Build
      0x14, 0x1D, // Train
      0x11, 0x13, 0x15, // Attack/Move
      0x1E, 0x2F, 0x31, // Research/Upgrade
      0x20, // Advanced build
    ];
    
    return meaningfulCommands.includes(commandType);
  }

  /**
   * Extract build orders for all players
   */
  private extractBuildOrders(commands: BWCommand[], players: BWPlayer[]): Record<number, import('./types').BWBuildOrderItem[]> {
    const buildOrders: Record<number, import('./types').BWBuildOrderItem[]> = {};
    
    for (const player of players) {
      buildOrders[player.id] = this.extractPlayerBuildOrder(commands, player.id);
    }
    
    return buildOrders;
  }

  /**
   * Extract build order for a specific player
   */
  private extractPlayerBuildOrder(commands: BWCommand[], playerId: number): import('./types').BWBuildOrderItem[] {
    const playerCommands = commands
      .filter(cmd => cmd.userId === playerId)
      .filter(cmd => this.isBuildOrderCommand(cmd.type))
      .sort((a, b) => a.frame - b.frame);
    
    const buildOrder: import('./types').BWBuildOrderItem[] = [];
    let currentSupply = 9; // Standard starting supply
    
    for (const cmd of playerCommands) {
      const unitInfo = this.getUnitInfo(cmd.type, cmd.data);
      if (unitInfo) {
        const gameTime = this.calculateGameLength(cmd.frame);
        
        buildOrder.push({
          frame: cmd.frame,
          timestamp: gameTime.string,
          supply: currentSupply,
          action: unitInfo.action,
          unitName: unitInfo.unitName,
          unitId: unitInfo.unitId,
          playerId
        });
        
        // Update supply based on unit type (simplified)
        if (unitInfo.action === 'Train' && unitInfo.supplyCost) {
          currentSupply += unitInfo.supplyCost;
        }
      }
    }
    
    return buildOrder;
  }

  /**
   * Check if command is a build order related command
   */
  private isBuildOrderCommand(commandType: number): boolean {
    const buildCommands = [
      0x0C, // Build
      0x14, 0x1D, // Train
      0x1E, 0x2F, 0x31, // Research/Upgrade
      0x20, // Advanced build
    ];
    
    return buildCommands.includes(commandType);
  }

  /**
   * Get unit information from command
   */
  private getUnitInfo(commandType: number, data: Uint8Array): { 
    action: 'Build' | 'Train' | 'Research' | 'Upgrade';
    unitName: string;
    unitId: number;
    supplyCost?: number;
  } | null {
    // Simple unit mapping - this would be enhanced with a complete unit database
    const unitMappings: Record<number, any> = {
      0x0C: { action: 'Build' as const, unitName: 'Building', unitId: 0x0C },
      0x14: { action: 'Train' as const, unitName: 'Unit', unitId: 0x14, supplyCost: 1 },
      0x1D: { action: 'Train' as const, unitName: 'Advanced Unit', unitId: 0x1D, supplyCost: 2 },
      0x1E: { action: 'Research' as const, unitName: 'Research', unitId: 0x1E },
      0x20: { action: 'Build' as const, unitName: 'Advanced Building', unitId: 0x20 },
      0x2F: { action: 'Upgrade' as const, unitName: 'Upgrade', unitId: 0x2F },
      0x31: { action: 'Upgrade' as const, unitName: 'Advanced Upgrade', unitId: 0x31 },
    };
    
    return unitMappings[commandType] || null;
  }

  /**
   * Get game type string
   */
  private getGameTypeString(gameType: number): string {
    const gameTypes: Record<number, string> = {
      1: 'Melee',
      2: 'Free For All',
      3: 'Top vs Bottom',
      4: 'Team Melee',
      8: 'Use Map Settings'
    };
    
    return gameTypes[gameType] || 'Unknown';
  }
}
