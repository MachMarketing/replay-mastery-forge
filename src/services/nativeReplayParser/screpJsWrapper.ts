
/**
 * Robust screp-js wrapper with browser compatibility
 */

import { ensureBufferPolyfills, fileToBuffer } from './bufferUtils';

// Dynamic import for screp-js with fallback
let screpJs: any = null;

async function loadScrepJs() {
  if (screpJs) return screpJs;
  
  try {
    // Try to load screp-js
    screpJs = await import('screp-js');
    console.log('[ScrepJsWrapper] screp-js loaded successfully');
    return screpJs;
  } catch (error) {
    console.warn('[ScrepJsWrapper] Could not load screp-js:', error);
    return null;
  }
}

export interface ReplayParseResult {
  header: {
    engine: string;
    version: string;
    frames: number;
    startTime: Date;
    mapName: string;
    gameType: string;
    duration: string;
  };
  players: Array<{
    name: string;
    race: string;
    team: number;
    color: number;
  }>;
  commands: Array<{
    frame: number;
    type: string;
    data: any;
  }>;
}

export class ScrepJsWrapper {
  private static instance: ScrepJsWrapper;
  private screpLib: any = null;
  private isInitialized = false;

  static getInstance(): ScrepJsWrapper {
    if (!ScrepJsWrapper.instance) {
      ScrepJsWrapper.instance = new ScrepJsWrapper();
    }
    return ScrepJsWrapper.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    console.log('[ScrepJsWrapper] Initializing...');
    
    // Ensure browser polyfills
    ensureBufferPolyfills();
    
    // Try to load screp-js
    this.screpLib = await loadScrepJs();
    this.isInitialized = true;
    
    return this.screpLib !== null;
  }

  async parseReplay(file: File): Promise<ReplayParseResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.screpLib) {
      throw new Error('screp-js not available, falling back to custom parser');
    }

    try {
      console.log('[ScrepJsWrapper] Converting file to buffer...');
      const buffer = await fileToBuffer(file);
      
      console.log('[ScrepJsWrapper] Parsing with screp-js...');
      const result = this.screpLib.parseReplay(buffer);
      
      if (!result) {
        throw new Error('screp-js returned null result');
      }

      console.log('[ScrepJsWrapper] screp-js parsing successful');
      return this.normalizeResult(result);
      
    } catch (error) {
      console.error('[ScrepJsWrapper] screp-js parsing failed:', error);
      throw error;
    }
  }

  private normalizeResult(screpResult: any): ReplayParseResult {
    // Normalize screp-js output to our standard format
    const frames = screpResult.frames || screpResult.header?.frames || 10000;
    const durationMs = Math.floor(frames * 1000 / 24);
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    return {
      header: {
        engine: screpResult.engine || 'StarCraft',
        version: screpResult.version || 'Unknown',
        frames: frames,
        startTime: new Date(screpResult.startTime || Date.now()),
        mapName: screpResult.mapName || screpResult.header?.mapName || 'Unknown Map',
        gameType: screpResult.gameType || 'Melee',
        duration: `${minutes}:${seconds.toString().padStart(2, '0')}`
      },
      players: (screpResult.players || []).map((player: any, index: number) => ({
        name: player.name || `Player ${index + 1}`,
        race: this.normalizeRace(player.race || player.raceId),
        team: player.team || index % 2,
        color: player.color || index
      })),
      commands: (screpResult.commands || []).slice(0, 100).map((cmd: any) => ({
        frame: cmd.frame || 0,
        type: cmd.type || 'unknown',
        data: cmd.data || {}
      }))
    };
  }

  private normalizeRace(raceId: number | string): string {
    if (typeof raceId === 'string') return raceId;
    
    const races: Record<number, string> = {
      0: 'Zerg',
      1: 'Terran',
      2: 'Protoss',
      6: 'Random'
    };
    
    return races[raceId] || 'Random';
  }

  isAvailable(): boolean {
    return this.screpLib !== null;
  }
}
