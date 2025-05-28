
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
      if (typeof this.screpLib.parseBuffer === 'function') {
        console.log('[ScrepJsWrapper] Using parseBuffer method');
        result = this.screpLib.parseBuffer(buffer);
      } else if (typeof this.screpLib.parseReplay === 'function') {
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
      
      // CRITICAL FIX: Handle Promise results properly
      if (result && typeof result.then === 'function') {
        console.log('[ScrepJsWrapper] Result is a Promise, awaiting...');
        result = await result;
      }
      
      if (!result) {
        throw new Error('screp-js returned null result');
      }

      console.log('[ScrepJsWrapper] screp-js parsing successful, result keys:', Object.keys(result));
      console.log('[ScrepJsWrapper] Full result for debugging:', result);
      
      return this.normalizeResult(result);
      
    } catch (error) {
      console.error('[ScrepJsWrapper] screp-js parsing failed:', error);
      throw error;
    }
  }

  private normalizeResult(screpResult: any): ReplayParseResult {
    console.log('[ScrepJsWrapper] Normalizing result with keys:', Object.keys(screpResult));
    
    // Handle different possible result structures
    const data = screpResult.replay || screpResult.data || screpResult;
    
    // Extract header information
    const header = data.header || data;
    
    // Extract frames
    const frames = header.frames || header.gameLength || data.frames || 10000;
    const durationMs = Math.floor(frames * 1000 / 24);
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    // Extract players - more robust extraction
    let rawPlayers = [];
    if (data.players && Array.isArray(data.players)) {
      rawPlayers = data.players;
    } else if (data.playerInfo && Array.isArray(data.playerInfo)) {
      rawPlayers = data.playerInfo;
    } else if (header.players && Array.isArray(header.players)) {
      rawPlayers = header.players;
    }
    
    console.log('[ScrepJsWrapper] Found raw players:', rawPlayers.length, rawPlayers);
    
    const players = rawPlayers.map((player: any, index: number) => ({
      name: player.name || player.playerName || `Player ${index + 1}`,
      race: this.normalizeRace(player.race || player.raceId || player.raceString),
      team: player.team !== undefined ? player.team : index % 2,
      color: player.color !== undefined ? player.color : index
    }));
    
    // Extract map name - more robust extraction
    const mapName = data.mapName || header.mapName || data.map || header.map || 'Unknown Map';
    
    // Extract commands
    const commands = (data.commands || data.actions || []).slice(0, 100).map((cmd: any) => ({
      frame: cmd.frame || cmd.gameFrame || 0,
      type: cmd.type || cmd.actionType || 'unknown',
      data: cmd.data || cmd.payload || {}
    }));

    const normalizedResult = {
      header: {
        engine: data.engine || header.engine || 'StarCraft',
        version: data.version || header.version || 'Unknown',
        frames: frames,
        startTime: new Date(data.startTime || header.startTime || Date.now()),
        mapName: mapName,
        gameType: data.gameType || header.gameType || 'Melee',
        duration: `${minutes}:${seconds.toString().padStart(2, '0')}`
      },
      players,
      commands
    };
    
    console.log('[ScrepJsWrapper] Normalized result:', normalizedResult);
    return normalizedResult;
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
