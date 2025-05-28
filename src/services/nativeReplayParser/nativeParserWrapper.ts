
/**
 * Wrapper to integrate the native BW parser with the existing system
 */

import { NativeBWParser, BWReplayParseResult } from './nativeBWParser';
import { ParsedReplayData } from '../replayParser/types';

export class NativeParserWrapper {
  static async parseReplay(file: File): Promise<ParsedReplayData> {
    console.log('[NativeParserWrapper] Starting native parsing for:', file.name);
    
    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Use native parser
      const parser = new NativeBWParser(buffer);
      const result = await parser.parseReplay();
      
      // Convert to our system format
      return this.convertToSystemFormat(result, file.name);
      
    } catch (error) {
      console.error('[NativeParserWrapper] Native parsing failed:', error);
      throw new Error(`Native parsing failed: ${(error as Error).message}`);
    }
  }

  private static convertToSystemFormat(
    result: BWReplayParseResult, 
    fileName: string
  ): ParsedReplayData {
    console.log('[NativeParserWrapper] Converting to system format...');
    
    // Calculate APM and EAPM from actions
    const { apm, eapm } = this.calculateAPM(result);
    
    // Update metadata with calculated values
    result.metadata.apm = apm;
    result.metadata.eapm = eapm;
    
    // Convert build orders format - fix type mismatch
    const buildOrders = result.buildOrders.map(playerActions => 
      playerActions.map(action => ({
        time: this.frameToTimestamp(action.frame),
        supply: action.supply || 0,
        action: action.action || 'Unknown Action'
      }))
    );

    // Flatten build orders for the single array format expected
    const flattenedBuildOrders = buildOrders.length > 0 ? buildOrders[0] : [];

    console.log('[NativeParserWrapper] Calculated APM:', apm);
    console.log('[NativeParserWrapper] Calculated EAPM:', eapm);
    console.log('[NativeParserWrapper] Build orders length:', flattenedBuildOrders.length);

    // Get primary and secondary players
    const primaryPlayerName = result.metadata.players[0] || 'Player 1';
    const secondaryPlayerName = result.metadata.players[1] || 'Player 2';

    return {
      // Primary data structure
      primaryPlayer: {
        name: primaryPlayerName,
        race: 'Unknown',
        apm: apm[0] || 0,
        eapm: eapm[0] || 0,
        buildOrder: flattenedBuildOrders,
        strengths: [],
        weaknesses: [],
        recommendations: []
      },
      secondaryPlayer: {
        name: secondaryPlayerName,
        race: 'Unknown',
        apm: apm[1] || 0,
        eapm: eapm[1] || 0,
        buildOrder: [],
        strengths: [],
        weaknesses: [],
        recommendations: []
      },
      
      // Game info
      map: result.metadata.mapName,
      matchup: 'Unknown vs Unknown',
      duration: result.metadata.duration,
      durationMS: result.metadata.totalFrames * (1000 / 24), // 24 FPS
      date: new Date().toISOString(),
      result: 'unknown' as const,
      
      // Analysis results
      strengths: [],
      weaknesses: [],
      recommendations: [],
      
      // Legacy properties for backward compatibility
      playerName: primaryPlayerName,
      opponentName: secondaryPlayerName,
      playerRace: 'Unknown',
      opponentRace: 'Unknown',
      apm: apm[0] || 0,
      eapm: eapm[0] || 0,
      opponentApm: apm[1] || 0,
      opponentEapm: eapm[1] || 0,
      buildOrder: flattenedBuildOrders,
      
      // Training plan is required
      trainingPlan: [
        { day: 1, focus: 'Macro Fundamentals', drill: 'Practice worker production and supply management' },
        { day: 2, focus: 'Build Order Execution', drill: 'Perfect your opening build order timing' },
        { day: 3, focus: 'APM Improvement', drill: 'Focus on meaningful actions and hotkey usage' }
      ]
    };
  }

  private static calculateAPM(result: BWReplayParseResult): { apm: number[]; eapm: number[] } {
    const playerActionCounts: Record<number, number> = {};
    const playerGameActionCounts: Record<number, number> = {};
    
    // Count actions per player
    result.actions.forEach(action => {
      playerActionCounts[action.playerId] = (playerActionCounts[action.playerId] || 0) + 1;
      
      // Count only game-affecting actions for EAPM
      if (this.isGameAction(action.opcode)) {
        playerGameActionCounts[action.playerId] = (playerGameActionCounts[action.playerId] || 0) + 1;
      }
    });
    
    // Calculate APM (Actions Per Minute)
    const gameMinutes = result.metadata.totalFrames / (24 * 60); // 24 FPS
    const apm: number[] = [];
    const eapm: number[] = [];
    
    for (let i = 0; i < result.metadata.players.length; i++) {
      const totalActions = playerActionCounts[i] || 0;
      const gameActions = playerGameActionCounts[i] || 0;
      
      apm[i] = gameMinutes > 0 ? Math.round(totalActions / gameMinutes) : 0;
      eapm[i] = gameMinutes > 0 ? Math.round(gameActions / gameMinutes) : 0;
    }
    
    return { apm, eapm };
  }

  private static isGameAction(opcode: number): boolean {
    // Game-affecting actions (not UI/selection actions)
    const gameActionOpcodes = [0x0C, 0x0E, 0x14, 0x15, 0x18, 0x1A, 0x1D, 0x1E, 0x2F, 0x30, 0x31, 0x32];
    return gameActionOpcodes.includes(opcode);
  }

  private static frameToTimestamp(frame: number): string {
    const seconds = frame / 24; // 24 FPS
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
