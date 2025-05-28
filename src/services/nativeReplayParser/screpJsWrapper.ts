import * as Screp from 'screp-js';

export interface ScrepJsResult {
  header: {
    engine: string;
    version: string;
    frames: number;
    startTime: Date;
    title: string;
    mapName: string;
    mapWidth: number;
    mapHeight: number;
    gameType: string;
    gameSubType: number;
    host: string;
    duration: string;
    durationMs: number;
  };
  players: Array<{
    name: string;
    race: string;
    raceId: number;
    team: number;
    color: number;
    slotId: number;
  }>;
  computed: {
    playerDescs: string[];
    matchup: string;
    league: string;
    winnerTeam: number;
    apm: number[];
    eapm: number[];
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
  private screpModule: any = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): ScrepJsWrapper {
    if (!ScrepJsWrapper.instance) {
      ScrepJsWrapper.instance = new ScrepJsWrapper();
    }
    return ScrepJsWrapper.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.initialized && this.screpModule) {
      return true;
    }

    try {
      console.log('[ScrepJsWrapper] Initializing screp-js...');
      
      // Import screp-js with enhanced options for command extraction
      this.screpModule = Screp;
      
      if (!this.screpModule) {
        console.error('[ScrepJsWrapper] screp-js module not available');
        return false;
      }

      this.initialized = true;
      console.log('[ScrepJsWrapper] screp-js initialized successfully');
      return true;
    } catch (error) {
      console.error('[ScrepJsWrapper] Failed to initialize screp-js:', error);
      return false;
    }
  }

  async parseReplay(file: File): Promise<ScrepJsResult> {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        throw new Error('Failed to initialize screp-js');
      }
    }

    try {
      console.log('[ScrepJsWrapper] Converting file to buffer...');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      console.log('[ScrepJsWrapper] Parsing with screp-js...');
      console.log('[ScrepJsWrapper] Available screp-js methods:', Object.keys(this.screpModule));

      // Enhanced options to ensure commands are included
      const parseOptions = {
        includeCommands: true,
        withCmds: true,
        verboseCommands: true,
        calculateAPM: true,
        parseActions: true,
        parseChat: true,
        extractMapData: true,
        cmdDetails: true,
        fullParse: true
      };

      let result;
      
      if (typeof this.screpModule.parseBuffer === 'function') {
        console.log('[ScrepJsWrapper] Using parseBuffer method');
        result = this.screpModule.parseBuffer(buffer, parseOptions);
        
        if (result && typeof result.then === 'function') {
          console.log('[ScrepJsWrapper] Result is a Promise, awaiting...');
          result = await result;
        }
      } else {
        throw new Error('parseBuffer method not available in screp-js');
      }

      if (!result) {
        throw new Error('screp-js returned null result');
      }

      console.log('[ScrepJsWrapper] screp-js parsing successful, result keys:', Object.keys(result));
      console.log('[ScrepJsWrapper] Full result for debugging:', result);

      // Enhanced logging for commands
      console.log('[ScrepJsWrapper] === COMMAND ANALYSIS ===');
      console.log('[ScrepJsWrapper] Commands available:', !!result.Commands, result.Commands ? result.Commands.length : 0);
      
      if (result.Commands && Array.isArray(result.Commands) && result.Commands.length > 0) {
        console.log('[ScrepJsWrapper] First 5 commands:', result.Commands.slice(0, 5).map((cmd: any) => ({
          frame: cmd.Frame,
          type: cmd.Type,
          player: cmd.PlayerID || cmd.Player
        })));
      } else {
        console.warn('[ScrepJsWrapper] No commands found - trying alternative extraction');
        
        // Try to access commands through different paths
        if (result.Cmds) {
          console.log('[ScrepJsWrapper] Found commands in result.Cmds:', result.Cmds.length);
          result.Commands = result.Cmds;
        } else if (result.commands) {
          console.log('[ScrepJsWrapper] Found commands in result.commands:', result.commands.length);
          result.Commands = result.commands;
        }
      }

      return this.normalizeScrepResult(result);
    } catch (error) {
      console.error('[ScrepJsWrapper] Error parsing replay:', error);
      throw error;
    }
  }

  private normalizeScrepResult(result: any): ScrepJsResult {
    console.log('[ScrepJsWrapper] === DETAILED SCREP-JS RESULT ANALYSIS ===');
    console.log('[ScrepJsWrapper] Top-level keys:', Object.keys(result));
    console.log('[ScrepJsWrapper] Header keys:', Object.keys(result.Header || {}));
    console.log('[ScrepJsWrapper] Computed keys:', Object.keys(result.Computed || {}));
    console.log('[ScrepJsWrapper] Commands available:', !!result.Commands, result.Commands ? result.Commands.length : 0);

    const header = result.Header || {};
    const computed = result.Computed || {};
    const commands = result.Commands || [];

    // Enhanced frame count detection
    const frameCount = header.Frames || computed.LastFrame || 0;
    console.log('[ScrepJsWrapper] Frame count:', frameCount);

    // Enhanced map name cleaning
    const rawMapName = header.Map || header.MapName || 'Unknown Map';
    const cleanMapName = this.cleanMapName(rawMapName);
    console.log('[ScrepJsWrapper] Cleaned map name:', cleanMapName);

    // Enhanced player extraction
    const rawPlayers = header.Players || [];
    console.log('[ScrepJsWrapper] Raw players from Header.Players:', rawPlayers.length, rawPlayers);

    const players = rawPlayers.filter((p: any) => !p.Observer).map((player: any, index: number) => {
      const normalizedPlayer = {
        name: player.Name || `Player ${index + 1}`,
        race: player.Race?.Name || 'Unknown',
        raceId: this.mapRaceToId(player.Race?.Name),
        team: player.Team || (index + 1),
        color: player.Color?.ID || index,
        slotId: index
      };
      console.log(`[ScrepJsWrapper] Player ${index}:`, normalizedPlayer);
      return normalizedPlayer;
    });

    // Enhanced APM calculation with PlayerDescs
    const playerDescs = computed.PlayerDescs || [];
    console.log('[ScrepJsWrapper] Found PlayerDescs with APM data:', playerDescs);

    const apmData = this.calculateAPMFromPlayerDescs(playerDescs, players.length);
    console.log('[ScrepJsWrapper] Calculated APM:', apmData);

    // Enhanced build order extraction from commands
    const buildOrders = this.extractBuildOrdersFromCommands(commands, players.length);
    console.log('[ScrepJsWrapper] Extracted build orders:', buildOrders.map(bo => `${bo.length} actions`));

    // Calculate duration
    const durationMs = Math.floor((frameCount / 24) * 1000); // 24 FPS for StarCraft
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const normalizedResult: ScrepJsResult = {
      header: {
        engine: header.Engine?.Name || 'Brood War',
        version: 'Remastered',
        frames: frameCount,
        startTime: header.StartTime?.value ? new Date(header.StartTime.value.iso) : new Date(),
        title: header.Title || '',
        mapName: cleanMapName,
        mapWidth: header.MapWidth || 0,
        mapHeight: header.MapHeight || 0,
        gameType: header.Type?.Name || 'Unknown',
        gameSubType: header.SubType || 0,
        host: header.Host || '',
        duration,
        durationMs
      },
      players,
      computed: {
        playerDescs: players.map(p => `${p.name} (${p.race})`),
        matchup: this.calculateMatchup(players),
        league: '',
        winnerTeam: computed.WinnerTeam || -1,
        apm: apmData.apm,
        eapm: apmData.eapm,
        buildOrders
      }
    };

    console.log('[ScrepJsWrapper] === FINAL NORMALIZED RESULT ===');
    console.log('[ScrepJsWrapper] Map:', normalizedResult.header.mapName);
    console.log('[ScrepJsWrapper] Players:', normalizedResult.computed.playerDescs);
    console.log('[ScrepJsWrapper] Duration:', normalizedResult.header.duration);
    console.log('[ScrepJsWrapper] Game Type:', normalizedResult.header.gameType);
    console.log('[ScrepJsWrapper] APM:', normalizedResult.computed.apm);
    console.log('[ScrepJsWrapper] EAPM:', normalizedResult.computed.eapm);
    console.log('[ScrepJsWrapper] Build Orders:', normalizedResult.computed.buildOrders.map(bo => `${bo.length} actions`));

    return normalizedResult;
  }

  private extractBuildOrdersFromCommands(commands: any[], playerCount: number): Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>> {
    console.log('[ScrepJsWrapper] Extracting build orders from commands...');
    console.log('[ScrepJsWrapper] Commands available:', commands ? commands.length : 0);

    if (!commands || !Array.isArray(commands) || commands.length === 0) {
      console.log('[ScrepJsWrapper] No commands available for build order extraction');
      return Array(playerCount).fill(0).map(() => []);
    }

    const buildOrders = Array(playerCount).fill(0).map(() => [] as any[]);

    // Filter commands for build-related actions
    const buildCommands = commands.filter((cmd: any) => {
      const cmdType = cmd.Type?.Name || cmd.Type || '';
      const cmdTypeStr = cmdType.toString().toLowerCase();
      
      // Look for build, train, or construction related commands
      return cmdTypeStr.includes('build') || 
             cmdTypeStr.includes('train') || 
             cmdTypeStr.includes('make') ||
             cmdTypeStr.includes('construct') ||
             cmdType === 'Build' ||
             cmdType === 'Train' ||
             cmd.Type === 12 || // BUILD command ID
             cmd.Type === 29;   // TRAIN command ID
    });

    console.log('[ScrepJsWrapper] Build-related commands found:', buildCommands.length);

    buildCommands.forEach((cmd: any) => {
      const playerId = cmd.PlayerID ?? cmd.Player ?? 0;
      if (playerId >= 0 && playerId < playerCount) {
        const frame = cmd.Frame || 0;
        const seconds = Math.floor(frame / 24);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timestamp = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;

        const action = this.getActionDescription(cmd);
        
        buildOrders[playerId].push({
          frame,
          timestamp,
          action,
          supply: this.estimateSupply(frame, buildOrders[playerId].length)
        });
      }
    });

    console.log('[ScrepJsWrapper] Build orders per player:', buildOrders.map((bo, i) => `Player ${i}: ${bo.length} actions`));

    return buildOrders;
  }

  private getActionDescription(cmd: any): string {
    const cmdType = cmd.Type?.Name || cmd.Type || 'Unknown';
    const unitType = cmd.UnitType || cmd.Unit || '';
    
    if (unitType) {
      return `${cmdType} ${unitType}`;
    }
    
    return cmdType.toString();
  }

  private estimateSupply(frame: number, buildIndex: number): number {
    // Very basic supply estimation based on time and build order position
    const timeMinutes = frame / (24 * 60);
    return Math.min(9 + buildIndex * 2 + Math.floor(timeMinutes * 10), 200);
  }

  private cleanMapName(mapName: string): string {
    if (!mapName) return 'Unknown Map';
    
    // Remove control characters and clean up
    return mapName
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Unknown Map';
  }

  private mapRaceToId(raceName: string): number {
    switch (raceName?.toLowerCase()) {
      case 'zerg': return 0;
      case 'terran': return 1;
      case 'protoss': return 2;
      default: return 6; // Random/Unknown
    }
  }

  private calculateAPMFromPlayerDescs(playerDescs: any[], playerCount: number): { apm: number[]; eapm: number[] } {
    const apm = new Array(playerCount).fill(0);
    const eapm = new Array(playerCount).fill(0);

    playerDescs.forEach((desc: any) => {
      const playerId = desc.PlayerID;
      if (playerId >= 0 && playerId < playerCount) {
        apm[playerId] = desc.APM || 0;
        eapm[playerId] = desc.EAPM || 0;
        console.log(`[ScrepJsWrapper] Player ${playerId} APM: ${apm[playerId]}, EAPM: ${eapm[playerId]}`);
      }
    });

    return { apm, eapm };
  }

  private calculateMatchup(players: any[]): string {
    if (players.length < 2) return 'Unknown';
    
    const races = players.map(p => p.race.charAt(0).toUpperCase());
    return `${races[0]}v${races[1]}`;
  }
}
