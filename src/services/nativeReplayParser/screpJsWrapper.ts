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
      
      console.log('[ScrepJsWrapper] === ENHANCED COMMAND DEBUGGING ===');
      console.log('[ScrepJsWrapper] Available screp-js methods:', Object.keys(this.screpLib));
      
      // NEW: Test command-focused parsing approaches
      const results = await this.testCommandExtractionMethods(buffer);
      
      // Find the best result with commands
      const bestResult = this.selectBestCommandResult(results);
      
      if (!bestResult) {
        throw new Error('All screp-js command extraction methods failed');
      }
      
      console.log('[ScrepJsWrapper] === SELECTED COMMAND RESULT ===');
      console.log('[ScrepJsWrapper] Method used:', bestResult.method);
      console.log('[ScrepJsWrapper] Commands available:', !!bestResult.result.Commands);
      console.log('[ScrepJsWrapper] Commands count:', Array.isArray(bestResult.result.Commands) ? bestResult.result.Commands.length : 'null/undefined');
      
      return this.normalizeResult(bestResult.result);
      
    } catch (error) {
      console.error('[ScrepJsWrapper] screp-js parsing failed:', error);
      throw error;
    }
  }

  /**
   * NEW: Focused testing on command extraction methods
   */
  private async testCommandExtractionMethods(buffer: Uint8Array): Promise<Array<{method: string, result: any, error?: Error}>> {
    const results: Array<{method: string, result: any, error?: Error}> = [];
    
    // Test different command-focused parsing options
    const commandConfigs = [
      // Try with explicit command flags
      { method: 'parseBuffer', options: { commands: true, includeCommands: true, withCmds: true } },
      { method: 'parseBuffer', options: { commands: true, includeCommands: true } },
      { method: 'parseBuffer', options: { withCmds: true, cmdDetails: true } },
      { method: 'parseBuffer', options: { includeCommands: true, verboseCommands: true } },
      { method: 'parseBuffer', options: { parseCommands: true } },
      { method: 'parseBuffer', options: { extractCommands: true } },
      { method: 'parseBuffer', options: { fullParse: true } },
      { method: 'parseBuffer', options: { complete: true } },
      { method: 'parseBuffer', options: { all: true } },
      
      // Try different parsing modes
      { method: 'parseBuffer', options: { mode: 'full' } },
      { method: 'parseBuffer', options: { mode: 'complete' } },
      { method: 'parseBuffer', options: { mode: 'commands' } },
      { method: 'parseBuffer', options: { detail: 'full' } },
      { method: 'parseBuffer', options: { level: 'full' } },
      
      // Try without options
      { method: 'parseBuffer', options: {} },
      
      // Try alternative method names if they exist
      { method: 'parseReplay', options: { includeCommands: true, withCmds: true } },
      { method: 'parse', options: { includeCommands: true } },
      { method: 'parseWithCommands', options: {} },
      { method: 'parseComplete', options: {} },
      { method: 'parseFull', options: {} }
    ];
    
    for (const config of commandConfigs) {
      try {
        console.log(`[ScrepJsWrapper] === TESTING ${config.method.toUpperCase()} ===`);
        console.log(`[ScrepJsWrapper] Options:`, config.options);
        
        if (typeof this.screpLib[config.method] === 'function') {
          let result;
          
          // Try with options first, then without if that fails
          try {
            if (Object.keys(config.options).length > 0) {
              console.log(`[ScrepJsWrapper] Calling ${config.method} WITH options`);
              result = await this.screpLib[config.method](buffer, config.options);
            } else {
              console.log(`[ScrepJsWrapper] Calling ${config.method} WITHOUT options`);
              result = await this.screpLib[config.method](buffer);
            }
          } catch (optionError) {
            console.log(`[ScrepJsWrapper] ${config.method} with options failed:`, optionError.message);
            try {
              console.log(`[ScrepJsWrapper] Retrying ${config.method} without options`);
              result = await this.screpLib[config.method](buffer);
            } catch (noOptionError) {
              console.log(`[ScrepJsWrapper] ${config.method} without options also failed:`, noOptionError.message);
              throw noOptionError;
            }
          }
          
          // Handle Promise results
          if (result && typeof result.then === 'function') {
            result = await result;
          }
          
          if (result) {
            const hasCommands = !!(result.Commands && Array.isArray(result.Commands));
            const commandsCount = hasCommands ? result.Commands.length : 0;
            
            console.log(`[ScrepJsWrapper] ${config.method} RESULT ANALYSIS:`);
            console.log(`  - Has Commands: ${hasCommands}`);
            console.log(`  - Commands Count: ${commandsCount}`);
            console.log(`  - Result Keys: ${Object.keys(result).join(', ')}`);
            console.log(`  - Commands Type: ${typeof result.Commands}`);
            console.log(`  - Commands isArray: ${Array.isArray(result.Commands)}`);
            
            if (result.Header) {
              console.log(`  - Header Keys: ${Object.keys(result.Header).join(', ')}`);
            }
            if (result.Computed) {
              console.log(`  - Computed Keys: ${Object.keys(result.Computed).join(', ')}`);
            }
            
            // Deep inspect Commands
            if (result.Commands) {
              console.log(`[ScrepJsWrapper] COMMANDS DEEP ANALYSIS:`);
              console.log(`  - Commands length: ${result.Commands.length}`);
              console.log(`  - Commands[0]: ${result.Commands[0] ? JSON.stringify(result.Commands[0]) : 'undefined'}`);
              console.log(`  - Commands[1]: ${result.Commands[1] ? JSON.stringify(result.Commands[1]) : 'undefined'}`);
              console.log(`  - Commands[2]: ${result.Commands[2] ? JSON.stringify(result.Commands[2]) : 'undefined'}`);
              
              if (result.Commands.length > 0) {
                const sampleCommand = result.Commands[0];
                console.log(`  - Sample Command Type: ${typeof sampleCommand}`);
                console.log(`  - Sample Command Keys: ${sampleCommand ? Object.keys(sampleCommand).join(', ') : 'none'}`);
              }
            }
            
            results.push({ 
              method: `${config.method}_${JSON.stringify(config.options)}`, 
              result,
              commandsFound: commandsCount
            } as any);
          } else {
            console.log(`[ScrepJsWrapper] ${config.method} returned null/undefined`);
          }
        } else {
          console.log(`[ScrepJsWrapper] ${config.method} method not available`);
        }
      } catch (error) {
        console.error(`[ScrepJsWrapper] ${config.method} failed:`, error);
        results.push({ 
          method: `${config.method}_${JSON.stringify(config.options)}`, 
          result: null, 
          error: error as Error 
        });
      }
      
      console.log(`[ScrepJsWrapper] ========================`);
    }
    
    // Also try any other methods that might exist for command extraction
    const possibleCommandMethods = Object.keys(this.screpLib).filter(key => 
      typeof this.screpLib[key] === 'function' && 
      (key.toLowerCase().includes('command') || 
       key.toLowerCase().includes('action') ||
       key.toLowerCase().includes('full') ||
       key.toLowerCase().includes('complete'))
    );
    
    for (const methodName of possibleCommandMethods) {
      try {
        console.log(`[ScrepJsWrapper] === TESTING DISCOVERED METHOD: ${methodName} ===`);
        const result = await this.screpLib[methodName](buffer);
        
        if (result) {
          const hasCommands = !!(result.Commands && Array.isArray(result.Commands));
          console.log(`[ScrepJsWrapper] ${methodName} result:`, {
            hasCommands,
            commandsCount: hasCommands ? result.Commands.length : 0,
            keys: Object.keys(result)
          });
          
          results.push({ method: methodName, result });
        }
      } catch (error) {
        console.error(`[ScrepJsWrapper] ${methodName} failed:`, error);
      }
    }
    
    return results;
  }

  /**
   * NEW: Select the best result prioritizing command availability
   */
  private selectBestCommandResult(results: Array<{method: string, result: any, error?: Error}>): {method: string, result: any} | null {
    const validResults = results.filter(r => r.result && !r.error);
    
    if (validResults.length === 0) {
      console.log('[ScrepJsWrapper] No valid results found');
      return null;
    }
    
    console.log('[ScrepJsWrapper] === COMMAND RESULT SELECTION ===');
    
    // First priority: Results with actual commands
    const resultsWithCommands = validResults.filter(r => 
      r.result.Commands && Array.isArray(r.result.Commands) && r.result.Commands.length > 0
    );
    
    if (resultsWithCommands.length > 0) {
      // Sort by command count (more commands = better)
      resultsWithCommands.sort((a, b) => b.result.Commands.length - a.result.Commands.length);
      const best = resultsWithCommands[0];
      console.log(`[ScrepJsWrapper] Selected result WITH COMMANDS: ${best.method} (${best.result.Commands.length} commands)`);
      return best;
    }
    
    console.log('[ScrepJsWrapper] NO RESULTS WITH COMMANDS FOUND!');
    
    // Second priority: Results with header data
    const resultsWithHeader = validResults.filter(r => 
      r.result.Header && r.result.Header.Players
    );
    
    if (resultsWithHeader.length > 0) {
      const best = resultsWithHeader[0];
      console.log(`[ScrepJsWrapper] Selected result with header (no commands): ${best.method}`);
      return best;
    }
    
    // Fallback: Any valid result
    const best = validResults[0];
    console.log(`[ScrepJsWrapper] Selected fallback result (no commands): ${best.method}`);
    return best;
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
    console.log('[ScrepJsWrapper] Commands analysis:', {
      isArray: Array.isArray(commands),
      length: commands?.length || 0,
      firstCommand: commands?.[0],
      commandTypes: commands?.slice(0, 10).map((cmd: any) => cmd.Type?.Name || cmd.Type?.ID || cmd.type)
    });
    
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
    
    // NEW: Enhanced APM calculation with command analysis
    const apmData = this.calculateAPMFromData(computed, commands, frames, players.length);
    console.log('[ScrepJsWrapper] Enhanced APM calculation:', apmData);
    
    // NEW: Enhanced build order extraction from commands
    const buildOrders = this.extractBuildOrdersFromCommands(commands, players.length);
    console.log('[ScrepJsWrapper] Enhanced build orders:', buildOrders.map(bo => bo.length));
    
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
   * NEW: Enhanced APM calculation with command analysis
   */
  private calculateAPMFromData(computed: any, commands: any, totalFrames: number, playerCount: number): { apm: number[], eapm: number[] } {
    const apm: number[] = [];
    const eapm: number[] = [];
    
    // Method 1: Check if screp-js has PlayerDescs with APM data
    if (computed.PlayerDescs && Array.isArray(computed.PlayerDescs)) {
      console.log('[ScrepJsWrapper] Found PlayerDescs with APM data:', computed.PlayerDescs);
      
      computed.PlayerDescs.forEach((playerDesc: any, index: number) => {
        const playerAPM = playerDesc.APM || 0;
        const playerEAPM = playerDesc.EAPM || Math.floor(playerAPM * 0.75);
        
        apm.push(playerAPM);
        eapm.push(playerEAPM);
        
        console.log(`[ScrepJsWrapper] Player ${index} from PlayerDescs - APM: ${playerAPM}, EAPM: ${playerEAPM}`);
      });
    }
    
    // Method 2: Calculate from commands if available and no PlayerDescs
    else if (Array.isArray(commands) && commands.length > 0 && apm.length === 0) {
      console.log('[ScrepJsWrapper] Calculating APM from commands:', commands.length);
      
      // Count actions per player
      const playerActions: number[] = new Array(playerCount).fill(0);
      
      commands.forEach((cmd: any) => {
        const playerId = cmd.PlayerID || cmd.playerId || cmd.Player || 0;
        if (playerId < playerCount && this.isActionCommand(cmd)) {
          playerActions[playerId]++;
        }
      });
      
      // Calculate APM (actions per minute)
      const gameMinutes = totalFrames / (24 * 60); // 24 FPS, 60 seconds per minute
      
      playerActions.forEach((actions, index) => {
        const calculatedAPM = gameMinutes > 0 ? Math.floor(actions / gameMinutes) : 0;
        const calculatedEAPM = Math.floor(calculatedAPM * 0.75); // Rough estimate
        
        apm.push(calculatedAPM);
        eapm.push(calculatedEAPM);
        
        console.log(`[ScrepJsWrapper] Player ${index} from commands - Actions: ${actions}, APM: ${calculatedAPM}, EAPM: ${calculatedEAPM}`);
      });
    }
    
    // Method 3: Fallback - fill with 0s
    else {
      console.log('[ScrepJsWrapper] No APM data source found, using 0s');
      for (let i = 0; i < playerCount; i++) {
        apm.push(0);
        eapm.push(0);
      }
    }
    
    return { apm, eapm };
  }

  /**
   * NEW: Enhanced build order extraction with better command filtering
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
      
      // Sort commands by frame
      const sortedCommands = [...commands].sort((a, b) => {
        const frameA = a.Frame || a.frame || 0;
        const frameB = b.Frame || b.frame || 0;
        return frameA - frameB;
      });
      
      sortedCommands.forEach((cmd: any) => {
        if (this.isBuildCommand(cmd)) {
          const playerId = cmd.PlayerID || cmd.playerId || cmd.Player || 0;
          if (playerId < playerCount) {
            const frame = cmd.Frame || cmd.frame || 0;
            const timestamp = this.frameToTimestamp(frame);
            const action = this.commandToActionString(cmd);
            
            // Skip very early actions (likely not real build orders)
            if (frame > 100) {
              buildOrders[playerId].push({
                frame,
                timestamp,
                action,
                supply: this.estimateSupply(frame, buildOrders[playerId].length)
              });
            }
          }
        }
      });
      
      // Limit to first 20 meaningful actions per player
      buildOrders.forEach((bo, playerIndex) => {
        bo.splice(20);
        console.log(`[ScrepJsWrapper] Player ${playerIndex} build order: ${bo.length} actions`);
        if (bo.length > 0) {
          console.log(`[ScrepJsWrapper] Player ${playerIndex} first actions:`, bo.slice(0, 3));
        }
      });
    } else {
      console.log('[ScrepJsWrapper] No commands available for build order extraction');
    }
    
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

  isAvailable(): boolean {
    return this.screpLib !== null;
  }
}
