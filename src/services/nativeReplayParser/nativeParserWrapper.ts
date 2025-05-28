
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
    
    // Convert build orders format
    const buildOrders = result.buildOrders.map(playerActions => 
      playerActions.map(action => ({
        frame: action.frame,
        timestamp: this.frameToTimestamp(action.frame),
        action: action.action || 'Unknown Action',
        supply: undefined
      }))
    );

    console.log('[NativeParserWrapper] Calculated APM:', apm);
    console.log('[NativeParserWrapper] Calculated EAPM:', eapm);
    console.log('[NativeParserWrapper] Build orders lengths:', buildOrders.map(bo => bo.length));

    return {
      fileName,
      fileSize: 0,
      isValid: true,
      header: {
        gameVersion: result.metadata.version,
        mapName: result.metadata.mapName,
        gameLength: result.metadata.gameLength,
        playerCount: result.metadata.players.length
      },
      players: result.metadata.players.map((name, index) => ({
        id: index,
        name,
        race: 'Unknown',
        team: index % 2,
        color: index,
        isWinner: false,
        apm: apm[index] || 0,
        eapm: eapm[index] || 0
      })),
      gameEvents: result.actions.map(action => ({
        timestamp: this.frameToTimestamp(action.frame),
        type: action.actionName,
        playerId: action.playerId,
        description: `${action.actionName} by player ${action.playerId}`
      })),
      buildOrder: buildOrders,
      metadata: {
        duration: result.metadata.duration,
        totalFrames: result.metadata.totalFrames,
        averageAPM: apm.length > 0 ? Math.round(apm.reduce((a, b) => a + b, 0) / apm.length) : 0,
        totalActions: result.actions.length,
        mapHash: '',
        replayHash: ''
      }
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
