
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
    const module = await import('screp-js');
    // screp-js might export differently - check for default export or named exports
    screpJs = module.default || module;
    console.log('[ScrepJsWrapper] screp-js loaded:', Object.keys(screpJs));
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
    
    if (this.screpLib) {
      console.log('[ScrepJsWrapper] Available methods:', Object.keys(this.screpLib));
    }
    
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
      console.log('[ScrepJsWrapper] Available screp-js methods:', Object.keys(this.screpLib));
      
      let result;
      
      // Try different possible API methods
      if (typeof this.screpLib.parseReplay === 'function') {
        result = this.screpLib.parseReplay(buffer);
      } else if (typeof this.screpLib.parse === 'function') {
        result = this.screpLib.parse(buffer);
      } else if (typeof this.screpLib.default === 'function') {
        result = this.screpLib.default(buffer);
      } else if (typeof this.screpLib === 'function') {
        result = this.screpLib(buffer);
      } else {
        // Look for any function that might be the parser
        const methods = Object.keys(this.screpLib).filter(key => typeof this.screpLib[key] === 'function');
        console.log('[ScrepJsWrapper] Available function methods:', methods);
        
        if (methods.length > 0) {
          const parseMethod = methods.find(m => m.toLowerCase().includes('parse')) || methods[0];
          console.log('[ScrepJsWrapper] Trying method:', parseMethod);
          result = this.screpLib[parseMethod](buffer);
        } else {
          throw new Error('No suitable parsing method found in screp-js');
        }
      }
      
      if (!result) {
        throw new Error('screp-js returned null result');
      }

      console.log('[ScrepJsWrapper] screp-js parsing successful, result keys:', Object.keys(result));
      return this.normalizeResult(result);
      
    } catch (error) {
      console.error('[ScrepJsWrapper] screp-js parsing failed:', error);
      throw error;
    }
  }

  private normalizeResult(screpResult: any): ReplayParseResult {
    console.log('[ScrepJsWrapper] Normalizing result:', screpResult);
    
    // Handle different possible result structures
    const data = screpResult.data || screpResult.replay || screpResult;
    
    // Extract frames
    const frames = data.frames || data.header?.frames || data.gameLength || 10000;
    const durationMs = Math.floor(frames * 1000 / 24);
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    // Extract players
    const rawPlayers = data.players || data.playerInfo || [];
    const players = rawPlayers.map((player: any, index: number) => ({
      name: player.name || player.playerName || `Player ${index + 1}`,
      race: this.normalizeRace(player.race || player.raceId || player.raceString),
      team: player.team || index % 2,
      color: player.color || index
    }));
    
    // Extract map name
    const mapName = data.mapName || data.map || data.header?.mapName || 'Unknown Map';
    
    // Extract commands
    const commands = (data.commands || data.actions || []).slice(0, 100).map((cmd: any) => ({
      frame: cmd.frame || cmd.gameFrame || 0,
      type: cmd.type || cmd.actionType || 'unknown',
      data: cmd.data || cmd.payload || {}
    }));

    return {
      header: {
        engine: data.engine || 'StarCraft',
        version: data.version || 'Unknown',
        frames: frames,
        startTime: new Date(data.startTime || Date.now()),
        mapName: mapName,
        gameType: data.gameType || 'Melee',
        duration: `${minutes}:${seconds.toString().padStart(2, '0')}`
      },
      players,
      commands
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
