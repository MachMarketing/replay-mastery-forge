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
  // NEW: Computed metrics from real data
  computed: {
    playerAPM: number[];
    playerEAPM: number[];
    buildOrders: Array<Array<{
      frame: number;
      timestamp: string;
      action: string;
      supply?: number;
    }>>;
  };
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
    console.log('[ScrepJsWrapper] === DETAILED SCREP-JS RESULT ANALYSIS ===');
    console.log('[ScrepJsWrapper] Top-level keys:', Object.keys(screpResult));
    
    // screp-js returns structure with Header, Commands, MapData, Computed
    const header = screpResult.Header || screpResult.header || {};
    const computed = screpResult.Computed || screpResult.computed || {};
    const commands = screpResult.Commands || screpResult.commands || [];
    
    console.log('[ScrepJsWrapper] Header keys:', Object.keys(header));
    console.log('[ScrepJsWrapper] Computed keys:', Object.keys(computed));
    console.log('[ScrepJsWrapper] Commands available:', Array.isArray(commands), commands?.length || 0);
    
    // Extract frame count from Header
    const frames = header.Frames || header.frames || 10000;
    console.log('[ScrepJsWrapper] Frame count:', frames);
    
    // Calculate duration
    const durationMs = Math.floor(frames * 1000 / 24); // 24 FPS for StarCraft
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    // Extract map name from Header.Map (has color codes)
    let mapName = 'Unknown Map';
    if (header.Map) {
      // Remove StarCraft color codes (e.g., \u0007D\u0006)
      mapName = header.Map.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
      console.log('[ScrepJsWrapper] Cleaned map name:', mapName);
    }
    
    // Extract players from Header.Players array
    const rawPlayers = header.Players || [];
    console.log('[ScrepJsWrapper] Raw players from Header.Players:', rawPlayers.length, rawPlayers);
    
    const players = rawPlayers.map((player: any, index: number) => {
      const playerName = player.Name || `Player ${index + 1}`;
      const playerRace = this.extractRace(player.Race);
      const playerTeam = player.Team || (index % 2);
      const playerColor = this.extractColor(player.Color);
      
      console.log(`[ScrepJsWrapper] Player ${index}:`, {
        name: playerName,
        race: playerRace,
        team: playerTeam,
        color: playerColor
      });
      
      return {
        name: playerName,
        race: playerRace,
        team: playerTeam,
        color: playerColor
      };
    });
    
    // NEW: Calculate APM from real data
    const apmData = this.calculateAPMFromData(computed, frames, players.length);
    console.log('[ScrepJsWrapper] Calculated APM:', apmData);
    
    // NEW: Extract build orders from commands (if available)
    const buildOrders = this.extractBuildOrdersFromCommands(commands, players.length);
    console.log('[ScrepJsWrapper] Extracted build orders:', buildOrders.map(bo => bo.length));
    
    // Extract game type
    const gameType = this.extractGameType(header.Type);
    
    // Extract engine info
    const engine = this.extractEngine(header.Engine);
    
    const normalizedResult = {
      header: {
        engine: engine,
        version: 'Remastered',
        frames: frames,
        startTime: new Date(header.StartTime || Date.now()),
        mapName: mapName,
        gameType: gameType,
        duration: `${minutes}:${seconds.toString().padStart(2, '0')}`
      },
      players,
      commands: [], // Commands sind in screp-js meist null oder sehr groß
      computed: {
        playerAPM: apmData.apm,
        playerEAPM: apmData.eapm,
        buildOrders: buildOrders
      }
    };
    
    console.log('[ScrepJsWrapper] === FINAL NORMALIZED RESULT ===');
    console.log('[ScrepJsWrapper] Map:', normalizedResult.header.mapName);
    console.log('[ScrepJsWrapper] Players:', normalizedResult.players.map(p => `${p.name} (${p.race})`));
    console.log('[ScrepJsWrapper] Duration:', normalizedResult.header.duration);
    console.log('[ScrepJsWrapper] Game Type:', normalizedResult.header.gameType);
    console.log('[ScrepJsWrapper] APM:', normalizedResult.computed.playerAPM);
    console.log('[ScrepJsWrapper] EAPM:', normalizedResult.computed.playerEAPM);
    console.log('[ScrepJsWrapper] Build Orders:', normalizedResult.computed.buildOrders.map(bo => `${bo.length} actions`));
    
    return normalizedResult;
  }

  /**
   * NEW: Calculate APM from screp-js Computed data
   */
  private calculateAPMFromData(computed: any, totalFrames: number, playerCount: number): { apm: number[], eapm: number[] } {
    const apm: number[] = [];
    const eapm: number[] = [];
    
    // Check if screp-js has PlayerDescs with APM data
    if (computed.PlayerDescs && Array.isArray(computed.PlayerDescs)) {
      console.log('[ScrepJsWrapper] Found PlayerDescs with APM data:', computed.PlayerDescs);
      
      computed.PlayerDescs.forEach((playerDesc: any, index: number) => {
        const playerAPM = playerDesc.APM || 0;
        const playerEAPM = playerDesc.EAPM || Math.floor(playerAPM * 0.75);
        
        apm.push(playerAPM);
        eapm.push(playerEAPM);
        
        console.log(`[ScrepJsWrapper] Player ${index} APM: ${playerAPM}, EAPM: ${playerEAPM}`);
      });
    } else {
      // Fallback: Fill with 0s
      console.log('[ScrepJsWrapper] No PlayerDescs found, using 0 APM');
      for (let i = 0; i < playerCount; i++) {
        apm.push(0);
        eapm.push(0);
      }
    }
    
    return { apm, eapm };
  }

  /**
   * NEW: Extract build orders from commands (if available)
   */
  private extractBuildOrdersFromCommands(commands: any, playerCount: number): Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>> {
    const buildOrders: Array<Array<{
      frame: number;
      timestamp: string;
      action: string;
      supply?: number;
    }>> = [];
    
    // Initialize empty build orders for each player
    for (let i = 0; i < playerCount; i++) {
      buildOrders.push([]);
    }
    
    // If commands are available, extract build/train actions
    if (Array.isArray(commands) && commands.length > 0) {
      console.log('[ScrepJsWrapper] Processing', commands.length, 'commands for build orders');
      
      commands.forEach((cmd: any) => {
        if (this.isBuildCommand(cmd)) {
          const playerId = cmd.PlayerID || cmd.playerId || 0;
          if (playerId < playerCount) {
            const frame = cmd.Frame || cmd.frame || 0;
            const timestamp = this.frameToTimestamp(frame);
            const action = this.commandToActionString(cmd);
            
            buildOrders[playerId].push({
              frame,
              timestamp,
              action,
              supply: Math.floor(10 + (frame / 1000)) // Estimate supply
            });
          }
        }
      });
      
      // Limit to first 20 actions per player
      buildOrders.forEach(bo => bo.splice(20));
    } else {
      console.log('[ScrepJsWrapper] No commands available for build order extraction');
    }
    
    return buildOrders;
  }

  /**
   * Check if command is a build/train action
   */
  private isBuildCommand(cmd: any): boolean {
    const cmdType = cmd.Type?.ID || cmd.type || cmd.ID;
    // Common build/train command IDs in StarCraft
    const buildCommands = [12, 29, 47, 48, 49]; // Build, Train, etc.
    return buildCommands.includes(cmdType);
  }

  /**
   * Convert command to human-readable action string
   */
  private commandToActionString(cmd: any): string {
    const cmdType = cmd.Type?.Name || cmd.type || 'Unknown';
    const unitType = cmd.UnitType?.Name || cmd.unitType || '';
    
    if (unitType) {
      return `${cmdType}: ${unitType}`;
    }
    return cmdType;
  }

  /**
   * Convert frame to timestamp string
   */
  private frameToTimestamp(frame: number): string {
    const seconds = Math.floor(frame / 24); // 24 FPS
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // ... keep existing code (extractRace, extractColor, extractGameType, extractEngine methods)
  private extractRace(raceObj: any): string {
    if (!raceObj) return 'Random';
    
    // screp-js race object has Name, ID, ShortName properties
    if (raceObj.Name) return raceObj.Name;
    if (raceObj.ShortName) {
      const shortNameMap: Record<string, string> = {
        'toss': 'Protoss',
        'terr': 'Terran',
        'zerg': 'Zerg'
      };
      return shortNameMap[raceObj.ShortName.toLowerCase()] || raceObj.ShortName;
    }
    
    // Fallback to ID
    const raceMap: Record<number, string> = {
      0: 'Zerg',
      1: 'Terran',
      2: 'Protoss',
      6: 'Random'
    };
    
    return raceMap[raceObj.ID] || 'Random';
  }

  private extractColor(colorObj: any): number {
    if (!colorObj) return 0;
    return colorObj.ID || colorObj.id || 0;
  }

  private extractGameType(typeObj: any): string {
    if (!typeObj) return 'Melee';
    
    if (typeObj.Name) return typeObj.Name;
    if (typeObj.ShortName) return typeObj.ShortName;
    
    // Fallback game type mapping
    const gameTypeMap: Record<number, string> = {
      2: 'Melee',
      3: 'Free For All',
      4: 'One on One',
      15: 'Top vs Bottom',
      16: 'Team Melee'
    };
    
    return gameTypeMap[typeObj.ID] || 'Melee';
  }

  private extractEngine(engineObj: any): string {
    if (!engineObj) return 'StarCraft';
    
    if (engineObj.Name) return engineObj.Name;
    if (engineObj.ShortName) return engineObj.ShortName;
    
    return 'StarCraft';
  }

  isAvailable(): boolean {
    return this.screpLib !== null;
  }
}
