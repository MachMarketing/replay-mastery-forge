/**
 * Enhanced StarCraft: Brood War Remastered replay parser
 */

import { CompressionDetector } from './compressionDetector';
import { ReplayDecompressor } from './decompressor';
import { EnhancedHeaderParser } from './enhancedHeaderParser';
import { CommandParser } from './commandParser';
import { DataExtractor } from './dataExtractor';
import { NativeReplayData } from './types';
import { ParsedReplayData } from '../replayParser/types';

export class NativeReplayParser {
  /**
   * Parse a StarCraft: Brood War Remastered replay file
   */
  static async parseReplay(file: File): Promise<ParsedReplayData> {
    console.log('[NativeReplayParser] Starting enhanced parse of', file.name);
    
    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      console.log('[NativeReplayParser] File buffer size:', buffer.byteLength);

      // Detect compression and format
      const format = CompressionDetector.detectFormat(buffer);
      console.log('[NativeReplayParser] Detected format:', format);
      
      // Decompress if necessary
      let processedBuffer = buffer;
      if (format.needsDecompression) {
        console.log('[NativeReplayParser] Decompressing file...');
        processedBuffer = await ReplayDecompressor.decompress(buffer, format);
        console.log('[NativeReplayParser] Decompressed size:', processedBuffer.byteLength);
      }
      
      // Apply header offset if needed
      if (format.headerOffset > 0) {
        processedBuffer = ReplayDecompressor.applyHeaderOffset(processedBuffer, format.headerOffset);
      }

      // Parse header with enhanced parser
      const headerParser = new EnhancedHeaderParser(processedBuffer);
      const header = headerParser.parseHeader();
      
      console.log('[NativeReplayParser] Header parsed:', {
        frames: header.frames,
        map: header.mapName,
        players: header.players.length
      });

      // Parse commands
      const commandParser = new CommandParser(processedBuffer, headerParser.getCommandsStartPosition());
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
        gameLength: header.frames / 24,
        gameLengthString: this.formatDuration(header.frames / 24),
        map: header.mapName,
        matchup: players.length >= 2 ? `${players[0].race} vs ${players[1].race}` : 'Unknown',
        date: new Date().toISOString()
      };

      // Convert to existing ParsedReplayData format
      return this.convertToLegacyFormat(nativeData);
      
    } catch (error) {
      console.error('[NativeReplayParser] Enhanced parsing failed:', error);
      
      // If enhanced parsing fails, provide more helpful error message
      const errorMessage = this.getHelpfulErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Generate helpful error messages based on the type of error
   */
  private static getHelpfulErrorMessage(error: unknown): string {
    const baseMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    if (baseMessage.includes('magic')) {
      return 'Die Replay-Datei hat ein unbekanntes Format. Stelle sicher, dass es sich um eine gültige StarCraft: Brood War .rep-Datei handelt.';
    }
    
    if (baseMessage.includes('Decompression')) {
      return 'Die Replay-Datei konnte nicht dekomprimiert werden. Möglicherweise ist die Datei beschädigt oder verwendet ein nicht unterstütztes Komprimierungsformat.';
    }
    
    if (baseMessage.includes('header')) {
      return 'Der Replay-Header konnte nicht gelesen werden. Die Datei könnte beschädigt oder unvollständig sein.';
    }
    
    return `Replay-Parsing fehlgeschlagen: ${baseMessage}. Versuche es mit einer anderen .rep-Datei.`;
  }

  /**
   * Convert native data to legacy ParsedReplayData format
   */
  private static convertToLegacyFormat(nativeData: NativeReplayData): ParsedReplayData {
    const primaryPlayer = nativeData.players[0];
    const secondaryPlayer = nativeData.players[1] || primaryPlayer;

    return {
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
      
      map: nativeData.map,
      matchup: nativeData.matchup,
      duration: nativeData.gameLengthString,
      durationMS: nativeData.gameLength * 1000,
      date: nativeData.date,
      result: 'unknown' as const,
      
      strengths: primaryPlayer.strengths,
      weaknesses: primaryPlayer.weaknesses,
      recommendations: primaryPlayer.recommendations,
      
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
