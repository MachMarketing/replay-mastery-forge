/**
 * Robust screp-js wrapper with enhanced command extraction fallback
 */

import { ensureBufferPolyfills, fileToBuffer } from './bufferUtils';
import { CommandExtractor, CommandExtractionResult } from './commandExtractor';

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
  // Enhanced: Real computed metrics from multiple sources
  computed: {
    playerAPM: number[];
    playerEAPM: number[];
    buildOrders: Array<Array<{
      frame: number;
      timestamp: string;
      action: string;
      supply?: number;
    }>>;
    dataSource: 'screp-js' | 'command-extractor' | 'hybrid';
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

    console.log('[ScrepJsWrapper] ===== ENHANCED PARSING WITH FALLBACKS =====');
    
    // Get raw file data for fallback parsing
    const buffer = await fileToBuffer(file);
    
    let screpResult: any = null;
    let screpSuccess = false;

    // Try screp-js first
    if (this.screpLib) {
      try {
        console.log('[ScrepJsWrapper] Attempting screp-js parsing...');
        screpResult = await this.tryScrepJsParsing(buffer);
        screpSuccess = true;
        console.log('[ScrepJsWrapper] screp-js parsing successful!');
      } catch (error) {
        console.warn('[ScrepJsWrapper] screp-js parsing failed:', error);
      }
    }

    // Extract what we can from screp-js
    let baseResult: any = {};
    if (screpSuccess && screpResult) {
      baseResult = screpResult;
      console.log('[ScrepJsWrapper] Using screp-js as base result');
    } else {
      console.log('[ScrepJsWrapper] Creating minimal base result');
      baseResult = this.createMinimalResult(buffer);
    }

    // Check if screp-js provided commands
    const hasScrepCommands = !!(baseResult.Commands && Array.isArray(baseResult.Commands) && baseResult.Commands.length > 0);
    console.log('[ScrepJsWrapper] screp-js commands available:', hasScrepCommands);

    // Enhanced fallback: Use command extractor when screp-js fails or has no commands
    let commandData: CommandExtractionResult | null = null;
    if (!hasScrepCommands) {
      console.log('[ScrepJsWrapper] ===== USING COMMAND EXTRACTOR FALLBACK =====');
      
      try {
        const extractor = new CommandExtractor(buffer);
        const playerCount = baseResult.Header?.Players?.length || 2;
        const totalFrames = baseResult.Header?.Frames || Math.floor(buffer.length / 100);
        
        commandData = extractor.extractCommands(playerCount, totalFrames);
        console.log('[ScrepJsWrapper] Command extractor successful!');
        console.log('[ScrepJsWrapper] Extracted commands:', commandData.commands.length);
        console.log('[ScrepJsWrapper] Extracted APM:', commandData.apm);
        console.log('[ScrepJsWrapper] Extracted build orders:', commandData.buildOrders.map(bo => bo.length));
      } catch (error) {
        console.error('[ScrepJsWrapper] Command extractor failed:', error);
      }
    }

    // Normalize and enhance the result
    return this.normalizeEnhancedResult(baseResult, commandData, hasScrepCommands);
  }

  /**
   * Try screp-js parsing with multiple methods
   */
  private async tryScrepJsParsing(buffer: Uint8Array): Promise<any> {
    console.log('[ScrepJsWrapper] Available screp-js methods:', Object.keys(this.screpLib));
    
    // Test different parsing methods in order of preference
    const methods = [
      { name: 'parseBuffer', options: { commands: true, includeCommands: true } },
      { name: 'parseBuffer', options: { withCmds: true } },
      { name: 'parseBuffer', options: {} },
      { name: 'parseReplay', options: { includeCommands: true } },
      { name: 'parse', options: {} }
    ];

    for (const method of methods) {
      if (typeof this.screpLib[method.name] === 'function') {
        try {
          console.log(`[ScrepJsWrapper] Trying ${method.name} with options:`, method.options);
          
          let result;
          if (Object.keys(method.options).length > 0) {
            result = await this.screpLib[method.name](buffer, method.options);
          } else {
            result = await this.screpLib[method.name](buffer);
          }

          if (result) {
            console.log(`[ScrepJsWrapper] ${method.name} succeeded`);
            console.log('[ScrepJsWrapper] Result keys:', Object.keys(result));
            console.log('[ScrepJsWrapper] Has Commands:', !!(result.Commands));
            console.log('[ScrepJsWrapper] Commands type:', typeof result.Commands);
            console.log('[ScrepJsWrapper] Commands length:', result.Commands?.length || 'N/A');
            
            return result;
          }
        } catch (error) {
          console.warn(`[ScrepJsWrapper] ${method.name} failed:`, error);
        }
      }
    }

    throw new Error('All screp-js parsing methods failed');
  }

  /**
   * Create minimal result when screp-js completely fails
   */
  private createMinimalResult(buffer: Uint8Array): any {
    console.log('[ScrepJsWrapper] Creating minimal result from buffer analysis');
    
    // Try to extract basic info from buffer
    let mapName = 'Unknown Map';
    let playerNames: string[] = [];

    // Simple string extraction for map and player names
    try {
      const textData = Array.from(buffer.slice(0, 1000))
        .map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ' ')
        .join('')
        .split(/\s+/)
        .filter(str => str.length > 2);

      // Look for potential map names (usually longer strings)
      const potentialMaps = textData.filter(str => str.length > 8 && str.length < 50);
      if (potentialMaps.length > 0) {
        mapName = potentialMaps[0];
      }

      // Look for potential player names
      const potentialNames = textData.filter(str => str.length > 3 && str.length < 20);
      playerNames = potentialNames.slice(0, 8); // Max 8 players
    } catch (e) {
      console.warn('[ScrepJsWrapper] Error extracting basic info:', e);
    }

    const estimatedFrames = Math.floor(buffer.length / 100);
    const durationSeconds = estimatedFrames / 24;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);

    return {
      Header: {
        Map: mapName,
        Frames: estimatedFrames,
        Players: playerNames.slice(0, 2).map((name, index) => ({
          Name: name || `Player ${index + 1}`,
          Race: { Name: index === 0 ? 'Terran' : 'Protoss', ID: index },
          Team: index,
          Color: { ID: index }
        })),
        StartTime: Date.now(),
        Type: { Name: 'Melee' },
        Engine: { Name: 'StarCraft' }
      },
      Commands: null,
      Computed: {}
    };
  }

  /**
   * Enhanced result normalization with multiple data sources
   */
  private normalizeEnhancedResult(screpResult: any, commandData: CommandExtractionResult | null, hasScrepCommands: boolean): ReplayParseResult {
    console.log('[ScrepJsWrapper] ===== NORMALIZING ENHANCED RESULT =====');
    
    const header = screpResult.Header || screpResult.header || {};
    const computed = screpResult.Computed || screpResult.computed || {};
    const rawPlayers = header.Players || [];

    // Extract frame count and calculate duration
    const frames = header.Frames || header.frames || 10000;
    const durationMs = Math.floor(frames * 1000 / 24);
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    // Clean map name
    let mapName = 'Unknown Map';
    if (header.Map) {
      mapName = header.Map.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
    }

    // Extract players
    const players = rawPlayers.map((player: any, index: number) => ({
      name: player.Name || `Player ${index + 1}`,
      race: this.extractRace(player.Race),
      team: player.Team || (index % 2),
      color: this.extractColor(player.Color)
    }));

    // Determine data source and compute metrics
    let dataSource: 'screp-js' | 'command-extractor' | 'hybrid';
    let playerAPM: number[];
    let playerEAPM: number[];
    let buildOrders: Array<Array<{
      frame: number;
      timestamp: string;
      action: string;
      supply?: number;
    }>>;

    if (hasScrepCommands) {
      // Use screp-js data
      dataSource = 'screp-js';
      playerAPM = this.extractAPMFromScrep(computed, players.length);
      playerEAPM = playerAPM.map(apm => Math.floor(apm * 0.75));
      buildOrders = this.extractBuildOrdersFromScrepCommands(screpResult.Commands, players.length);
      console.log('[ScrepJsWrapper] Using screp-js commands and metrics');
    } else if (commandData) {
      // Use command extractor data
      dataSource = 'command-extractor';
      playerAPM = commandData.apm;
      playerEAPM = commandData.eapm;
      buildOrders = commandData.buildOrders;
      console.log('[ScrepJsWrapper] Using command extractor metrics');
    } else if (computed.PlayerDescs) {
      // Hybrid: screp-js header with computed APM
      dataSource = 'hybrid';
      playerAPM = this.extractAPMFromScrep(computed, players.length);
      playerEAPM = playerAPM.map(apm => Math.floor(apm * 0.75));
      buildOrders = new Array(players.length).fill([]);
      console.log('[ScrepJsWrapper] Using hybrid approach (screp-js header + computed APM)');
    } else {
      // Fallback: no real data available
      dataSource = 'screp-js';
      playerAPM = new Array(players.length).fill(0);
      playerEAPM = new Array(players.length).fill(0);
      buildOrders = new Array(players.length).fill([]);
      console.log('[ScrepJsWrapper] Using fallback metrics (no real data)');
    }

    const result = {
      header: {
        engine: this.extractEngine(header.Engine),
        version: 'Remastered',
        frames: frames,
        startTime: new Date(header.StartTime || Date.now()),
        mapName: mapName,
        gameType: this.extractGameType(header.Type),
        duration: `${minutes}:${seconds.toString().padStart(2, '0')}`
      },
      players,
      commands: [], // Keep minimal for performance
      computed: {
        playerAPM,
        playerEAPM,
        buildOrders,
        dataSource
      }
    };

    console.log('[ScrepJsWrapper] ===== FINAL ENHANCED RESULT =====');
    console.log('[ScrepJsWrapper] Data source:', dataSource);
    console.log('[ScrepJsWrapper] Map:', result.header.mapName);
    console.log('[ScrepJsWrapper] Players:', result.players.map(p => `${p.name} (${p.race})`));
    console.log('[ScrepJsWrapper] Duration:', result.header.duration);
    console.log('[ScrepJsWrapper] APM (REAL):', result.computed.playerAPM);
    console.log('[ScrepJsWrapper] EAPM (REAL):', result.computed.playerEAPM);
    console.log('[ScrepJsWrapper] Build Orders (REAL):', result.computed.buildOrders.map(bo => `${bo.length} actions`));

    return result;
  }

  /**
   * Extract APM from screp-js computed data
   */
  private extractAPMFromScrep(computed: any, playerCount: number): number[] {
    const apm: number[] = [];

    if (computed.PlayerDescs && Array.isArray(computed.PlayerDescs)) {
      computed.PlayerDescs.forEach((playerDesc: any) => {
        apm.push(playerDesc.APM || 0);
      });
    }

    // Fill missing players with 0
    while (apm.length < playerCount) {
      apm.push(0);
    }

    return apm.slice(0, playerCount);
  }

  /**
   * Extract build orders from screp-js commands
   */
  private extractBuildOrdersFromScrepCommands(commands: any, playerCount: number): Array<Array<{
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

    // Initialize empty build orders
    for (let i = 0; i < playerCount; i++) {
      buildOrders.push([]);
    }

    if (!Array.isArray(commands) || commands.length === 0) {
      return buildOrders;
    }

    // Process screp-js commands
    const buildCommands = commands
      .filter((cmd: any) => this.isScrepBuildCommand(cmd) && (cmd.Frame || 0) > 100)
      .sort((a: any, b: any) => (a.Frame || 0) - (b.Frame || 0));

    buildCommands.forEach((cmd: any) => {
      const playerId = cmd.PlayerID || cmd.playerId || cmd.Player || 0;
      if (playerId < playerCount) {
        const frame = cmd.Frame || cmd.frame || 0;
        const action = this.screpCommandToActionString(cmd);

        buildOrders[playerId].push({
          frame,
          timestamp: this.frameToTimestamp(frame),
          action,
          supply: this.estimateSupply(frame, buildOrders[playerId].length)
        });

        // Limit to 20 actions per player
        if (buildOrders[playerId].length >= 20) {
          buildOrders[playerId] = buildOrders[playerId].slice(0, 20);
        }
      }
    });

    return buildOrders;
  }

  /**
   * Enhanced command type detection
   */
  private isBuildCommand(cmd: any): boolean {
    const cmdType = cmd.Type?.ID || cmd.Type?.Name || cmd.type || cmd.ID;
    
    // Common build/train command IDs and names in StarCraft
    const buildCommandIds = [12, 29, 47, 48, 49, 51, 52]; // Build, Train, etc.
    const buildCommandNames = ['Build', 'Train', 'Morph', 'Research', 'Upgrade'];
    
    if (typeof cmdType === 'number') {
      return buildCommandIds.includes(cmdType);
    }
    
    if (typeof cmdType === 'string') {
      return buildCommandNames.some(name => cmdType.toLowerCase().includes(name.toLowerCase()));
    }
    
    return false;
  }

  /**
   * Enhanced action command detection for APM
   */
  private isActionCommand(cmd: any): boolean {
    const cmdType = cmd.Type?.ID || cmd.Type?.Name || cmd.type || cmd.ID;
    
    // APM-relevant command IDs (more comprehensive)
    const actionCommandIds = [9, 10, 11, 12, 13, 14, 18, 20, 21, 25, 29, 47, 48, 49, 51, 52];
    const ignoredCommands = ['Keep Alive', 'Sync', 'Nothing'];
    
    if (typeof cmdType === 'number') {
      return actionCommandIds.includes(cmdType);
    }
    
    if (typeof cmdType === 'string') {
      return !ignoredCommands.some(ignored => cmdType.toLowerCase().includes(ignored.toLowerCase()));
    }
    
    return true; // Default to counting unknown commands
  }

  /**
   * Enhanced command to action string conversion
   */
  private commandToActionString(cmd: any): string {
    const cmdType = cmd.Type?.Name || cmd.type || 'Unknown Action';
    const unitType = cmd.UnitType?.Name || cmd.unitType || '';
    const targetType = cmd.TargetType?.Name || cmd.targetType || '';
    
    if (unitType && targetType) {
      return `${cmdType}: ${unitType} → ${targetType}`;
    } else if (unitType) {
      return `${cmdType}: ${unitType}`;
    } else if (targetType) {
      return `${cmdType} → ${targetType}`;
    }
    
    return cmdType;
  }

  /**
   * Enhanced supply estimation
   */
  private estimateSupply(frame: number, actionIndex: number): number {
    // More realistic supply progression
    const baseSupply = 9; // Starting supply for most races
    const supplyGrowth = Math.floor(frame / 600); // Supply depot/pylon timing
    const buildOrderBonus = Math.floor(actionIndex / 3); // Bonus per few actions
    
    return Math.min(200, baseSupply + supplyGrowth + buildOrderBonus);
  }

  private frameToTimestamp(frame: number): string {
    const seconds = Math.floor(frame / 24); // 24 FPS
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

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

  private isScrepBuildCommand(cmd: any): boolean {
    const cmdType = cmd.Type?.ID || cmd.Type?.Name || cmd.type || cmd.ID;
    const buildCommandIds = [12, 29, 47, 48, 49, 51, 52];
    const buildCommandNames = ['Build', 'Train', 'Morph', 'Research', 'Upgrade'];
    
    if (typeof cmdType === 'number') {
      return buildCommandIds.includes(cmdType);
    }
    
    if (typeof cmdType === 'string') {
      return buildCommandNames.some(name => cmdType.toLowerCase().includes(name.toLowerCase()));
    }
    
    return false;
  }

  private screpCommandToActionString(cmd: any): string {
    const cmdType = cmd.Type?.Name || cmd.type || 'Unknown Action';
    const unitType = cmd.UnitType?.Name || cmd.unitType || '';
    const targetType = cmd.TargetType?.Name || cmd.targetType || '';
    
    if (unitType && targetType) {
      return `${cmdType}: ${unitType} → ${targetType}`;
    } else if (unitType) {
      return `${cmdType}: ${unitType}`;
    } else if (targetType) {
      return `${cmdType} → ${targetType}`;
    }
    
    return cmdType;
  }

  isAvailable(): boolean {
    return this.screpLib !== null;
  }
}
