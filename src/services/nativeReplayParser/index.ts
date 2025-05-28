
/**
 * Main entry point for the native StarCraft replay parser
 */

import { HeaderParser } from './headerParser';
import { CommandParser } from './commandParser';
import { DataExtractor } from './dataExtractor';
import { NativeReplayData } from './types';
import { ParsedReplayData } from '../replayParser/types';

export class NativeReplayParser {
  /**
   * Parse a StarCraft replay file
   */
  static async parseReplay(file: File): Promise<ParsedReplayData> {
    console.log('[NativeReplayParser] Starting native parse of', file.name);
    
    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      console.log('[NativeReplayParser] File buffer size:', buffer.byteLength);

      // Parse header
      const headerParser = new HeaderParser(buffer);
      const header = headerParser.parseHeader();
      
      console.log('[NativeReplayParser] Header parsed:', {
        frames: header.frames,
        map: header.mapName,
        players: header.players.length
      });

      // Parse commands
      const commandParser = new CommandParser(buffer, headerParser.getCommandsStartPosition());
      const commands = commandParser.parseCommands();
      
      console.log('[NativeReplayParser] Commands parsed:', commands.length);

      // Extract advanced data
      const dataExtractor = new DataExtractor(commands, header);
      
      // Analyze players
      const players = header.players.map(playerInfo => 
        dataExtractor.extractPlayerAnalysis(playerInfo.id)
      );

      console.log('[NativeReplayParser] Player analysis complete');

      // Build native data structure
      const nativeData: NativeReplayData = {
        header,
        commands,
        players,
        gameLength: header.frames / 24, // Convert frames to seconds
        gameLengthString: this.formatDuration(header.frames / 24),
        map: header.mapName,
        matchup: players.length >= 2 ? `${players[0].race} vs ${players[1].race}` : 'Unknown',
        date: new Date().toISOString()
      };

      // Convert to existing ParsedReplayData format
      return this.convertToLegacyFormat(nativeData);
      
    } catch (error) {
      console.error('[NativeReplayParser] Parsing failed:', error);
      throw new Error(`Native parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert native data to legacy ParsedReplayData format
   */
  private static convertToLegacyFormat(nativeData: NativeReplayData): ParsedReplayData {
    const primaryPlayer = nativeData.players[0];
    const secondaryPlayer = nativeData.players[1] || primaryPlayer;

    return {
      // New structure
      primaryPlayer: {
        name: primaryPlayer.name,
        race: primaryPlayer.race,
        apm: primaryPlayer.apm.total,
        eapm: primaryPlayer.apm.effective,
        buildOrder: primaryPlayer.buildOrder.map(bo => ({
          time: bo.timestampString,
          supply: bo.supply,
          action: bo.unitName
        })),
        strengths: primaryPlayer.strengths,
        weaknesses: primaryPlayer.weaknesses,
        recommendations: primaryPlayer.recommendations
      },
      secondaryPlayer: {
        name: secondaryPlayer.name,
        race: secondaryPlayer.race,
        apm: secondaryPlayer.apm.total,
        eapm: secondaryPlayer.apm.effective,
        buildOrder: secondaryPlayer.buildOrder.map(bo => ({
          time: bo.timestampString,
          supply: bo.supply,
          action: bo.unitName
        })),
        strengths: secondaryPlayer.strengths,
        weaknesses: secondaryPlayer.weaknesses,
        recommendations: secondaryPlayer.recommendations
      },
      
      // Game info
      map: nativeData.map,
      matchup: nativeData.matchup,
      duration: nativeData.gameLengthString,
      durationMS: nativeData.gameLength * 1000,
      date: nativeData.date,
      result: 'unknown' as const,
      
      // Analysis
      strengths: primaryPlayer.strengths,
      weaknesses: primaryPlayer.weaknesses,
      recommendations: primaryPlayer.recommendations,
      
      // Legacy properties
      playerName: primaryPlayer.name,
      opponentName: secondaryPlayer.name,
      playerRace: primaryPlayer.race,
      opponentRace: secondaryPlayer.race,
      apm: primaryPlayer.apm.total,
      eapm: primaryPlayer.apm.effective,
      opponentApm: secondaryPlayer.apm.total,
      opponentEapm: secondaryPlayer.apm.effective,
      buildOrder: primaryPlayer.buildOrder.map(bo => ({
        time: bo.timestampString,
        supply: bo.supply,
        action: bo.unitName
      })),
      
      // Training plan
      trainingPlan: [
        { day: 1, focus: "Macro Management", drill: "Konstante Worker-Produktion üben" },
        { day: 2, focus: "Micro Control", drill: "Einheitenpositionierung verbessern" },
        { day: 3, focus: "Build Order", drill: "Timing-Attacken perfektionieren" },
        { day: 4, focus: "Resource Management", drill: "Effiziente Ressourcennutzung" },
        { day: 5, focus: "Hotkey Usage", drill: "Hotkey-Kombinationen trainieren" }
      ]
    };
  }

  /**
   * Format duration in seconds to MM:SS
   */
  private static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Export the main parsing function
export async function parseReplayNative(file: File): Promise<ParsedReplayData> {
  return NativeReplayParser.parseReplay(file);
}

// Re-export types
export * from './types';
