import * as Screp from 'screp-js';
import { ScUnitDatabase } from './scUnitDatabase';

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

      // screp-js korrekte API-Nutzung - Commands MÜSSEN explizit aktiviert werden
      const parseOptions = {
        Commands: true, // CRITICAL: Commands explizit aktivieren
        Computed: true,
        MapData: false, // Nicht benötigt für unsere Analyse
        Header: true
      };

      let result;
      
      // screp-js hat verschiedene Parse-Modi - versuche alle
      if (typeof this.screpModule.parseBuffer === 'function') {
        console.log('[ScrepJsWrapper] Using parseBuffer with Commands=true');
        result = this.screpModule.parseBuffer(buffer, parseOptions);
      } else if (typeof this.screpModule.default?.parseBuffer === 'function') {
        console.log('[ScrepJsWrapper] Using default.parseBuffer');
        result = this.screpModule.default.parseBuffer(buffer, parseOptions);
      } else if (typeof this.screpModule === 'function') {
        console.log('[ScrepJsWrapper] Using screp-js as function');
        result = this.screpModule(buffer, parseOptions);
      } else {
        throw new Error('No valid parseBuffer method found in screp-js');
      }
      
      // Handle Promise if needed
      if (result && typeof result.then === 'function') {
        console.log('[ScrepJsWrapper] Result is a Promise, awaiting...');
        result = await result;
      }

      if (!result) {
        throw new Error('screp-js returned null result');
      }

      console.log('[ScrepJsWrapper] screp-js parsing successful, result keys:', Object.keys(result));
      console.log('[ScrepJsWrapper] Full result structure:', result);

      // CRITICAL: Deep command extraction with multiple strategies
      console.log('[ScrepJsWrapper] === DEEP COMMAND EXTRACTION ===');
      console.log('[ScrepJsWrapper] Direct Commands:', !!result.Commands, result.Commands ? result.Commands.length : 0);
      console.log('[ScrepJsWrapper] Result.commands:', !!result.commands, result.commands ? result.commands.length : 0);
      console.log('[ScrepJsWrapper] Computed.Commands:', !!result.Computed?.Commands, result.Computed?.Commands ? result.Computed.Commands.length : 0);
      console.log('[ScrepJsWrapper] All available keys in result:', Object.keys(result));
      
      // Try multiple command extraction paths
      let extractedCommands = null;
      
      // Path 1: Direct Commands array
      if (result.Commands && Array.isArray(result.Commands) && result.Commands.length > 0) {
        extractedCommands = result.Commands;
        console.log('[ScrepJsWrapper] ✅ Using direct Commands array:', extractedCommands.length);
      }
      // Path 2: Lowercase commands
      else if (result.commands && Array.isArray(result.commands) && result.commands.length > 0) {
        extractedCommands = result.commands;
        console.log('[ScrepJsWrapper] ✅ Using lowercase commands array:', extractedCommands.length);
      }
      // Path 3: Computed.Commands
      else if (result.Computed?.Commands && Array.isArray(result.Computed.Commands) && result.Computed.Commands.length > 0) {
        extractedCommands = result.Computed.Commands;
        console.log('[ScrepJsWrapper] ✅ Using Computed.Commands:', extractedCommands.length);
      }
      // Path 4: Search for commands in all top-level properties
      else {
        console.log('[ScrepJsWrapper] 🔍 Searching for commands in all properties...');
        for (const [key, value] of Object.entries(result)) {
          if (Array.isArray(value) && value.length > 0) {
            // Check if this looks like a commands array
            const firstItem = value[0];
            if (firstItem && (firstItem.Type !== undefined || firstItem.Frame !== undefined || firstItem.PlayerID !== undefined)) {
              extractedCommands = value;
              console.log('[ScrepJsWrapper] ✅ Found commands in key:', key, 'Length:', extractedCommands.length);
              break;
            }
          }
        }
      }
      
      if (extractedCommands) {
        result.Commands = extractedCommands;
        console.log('[ScrepJsWrapper] ✅ COMMANDS SUCCESSFULLY EXTRACTED:', result.Commands.length);
        console.log('[ScrepJsWrapper] First 3 commands:', result.Commands.slice(0, 3).map((cmd: any) => ({
          frame: cmd.Frame || cmd.frame,
          type: cmd.Type?.Name || cmd.Type || cmd.type,
          player: cmd.PlayerID || cmd.Player || cmd.playerId,
          raw: cmd
        })));
      } else {
        console.error('[ScrepJsWrapper] ❌ NO COMMANDS FOUND IN ANY LOCATION');
        console.log('[ScrepJsWrapper] Available data structure:', JSON.stringify(result, null, 2).substring(0, 1000));
      }
      
      // Wenn Commands null/leer sind, versuche Re-Parse mit anderen Optionen
      if (!result.Commands || !Array.isArray(result.Commands) || result.Commands.length === 0) {
        console.warn('[ScrepJsWrapper] No commands in primary result - trying aggressive re-parse...');
        
        // Versuche verschiedene screp-js Optionen
        const aggressiveOptions = [
          { Commands: true, Computed: true, Header: true },
          { includeCommands: true, withCmds: true },
          { parseCommands: true, fullParse: true },
          { } // Default ohne Optionen
        ];
        
        for (const option of aggressiveOptions) {
          try {
            console.log('[ScrepJsWrapper] Trying parse option:', option);
            let retryResult;
            
            if (typeof this.screpModule.parseBuffer === 'function') {
              retryResult = this.screpModule.parseBuffer(buffer, option);
            } else if (typeof this.screpModule.default?.parseBuffer === 'function') {
              retryResult = this.screpModule.default.parseBuffer(buffer, option);
            }
            
            if (retryResult && typeof retryResult.then === 'function') {
              retryResult = await retryResult;
            }
            
            if (retryResult?.Commands && Array.isArray(retryResult.Commands) && retryResult.Commands.length > 0) {
              console.log('[ScrepJsWrapper] SUCCESS! Found commands with option:', option, 'Commands:', retryResult.Commands.length);
              result.Commands = retryResult.Commands;
              break;
            }
          } catch (retryError) {
            console.log('[ScrepJsWrapper] Retry option failed:', option, retryError.message);
          }
        }
      }
      
      if (result.Commands && Array.isArray(result.Commands) && result.Commands.length > 0) {
        console.log('[ScrepJsWrapper] ✅ COMMANDS SUCCESSFULLY EXTRACTED:', result.Commands.length);
        console.log('[ScrepJsWrapper] First 5 commands:', result.Commands.slice(0, 5).map((cmd: any) => ({
          frame: cmd.Frame,
          type: cmd.Type,
          player: cmd.PlayerID || cmd.Player,
          typeName: cmd.Type?.Name || cmd.Type || 'Unknown'
        })));
      } else {
        console.error('[ScrepJsWrapper] ❌ FAILED TO EXTRACT COMMANDS - screp-js may not support this replay format');
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

    // IMPROVED map name cleaning - less aggressive for SC:R compatibility
    const rawMapName = header.Map || header.MapName || header.Title || 'Unknown Map';
    const cleanMapName = this.improvedCleanMapName(rawMapName);
    console.log('[ScrepJsWrapper] Raw map name:', rawMapName, '-> Cleaned:', cleanMapName);

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

    // Enhanced build order extraction from commands with DETAILED logging
    const buildOrders = this.extractBuildOrdersFromCommands(commands, players.length);
    console.log('[ScrepJsWrapper] === BUILD ORDER ANALYSIS COMPLETE ===');
    buildOrders.forEach((bo, playerIndex) => {
      console.log(`[ScrepJsWrapper] Player ${playerIndex} Build Order (${bo.length} actions):`, 
        bo.slice(0, 10).map(action => `${action.timestamp}: ${action.action}`));
    });

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
    console.log('[ScrepJsWrapper] Build Orders Summary:', normalizedResult.computed.buildOrders.map(bo => `${bo.length} actions`));

    return normalizedResult;
  }

  private extractBuildOrdersFromCommands(commands: any[], playerCount: number): Array<Array<{
    frame: number;
    timestamp: string;
    action: string;
    supply?: number;
  }>> {
    console.log('[ScrepJsWrapper] === ENHANCED BUILD ORDER EXTRACTION ===');
    console.log('[ScrepJsWrapper] Total commands available:', commands ? commands.length : 0);

    if (!commands || !Array.isArray(commands) || commands.length === 0) {
      console.log('[ScrepJsWrapper] No commands available for build order extraction');
      return Array(playerCount).fill(0).map(() => []);
    }

    // Enhanced command analysis with StarCraft database
    const commandAnalysis = this.analyzeCommandStructure(commands);
    console.log('[ScrepJsWrapper] Command analysis:', commandAnalysis);

    const buildOrders = Array(playerCount).fill(0).map(() => [] as any[]);

    // VIEL aggressivere Filterung für Build Commands
    const potentialBuildCommands = commands.filter((cmd: any) => {
      const cmdType = cmd.Type?.Name || cmd.Type || '';
      const cmdTypeStr = cmdType.toString().toLowerCase();
      
      // Schaue nach ALLEN möglichen Build/Train/Construction Befehlen
      const isBuildRelated = cmdTypeStr.includes('build') || 
                            cmdTypeStr.includes('train') || 
                            cmdTypeStr.includes('make') ||
                            cmdTypeStr.includes('construct') ||
                            cmdTypeStr.includes('morph') ||
                            cmdTypeStr.includes('research') ||
                            cmdTypeStr.includes('upgrade') ||
                            cmdType === 'Build' ||
                            cmdType === 'Train' ||
                            cmd.Type === 12 || // BUILD command ID
                            cmd.Type === 29 ||  // TRAIN command ID
                            cmd.Type === 31 ||  // BUILD command ID alternative
                            cmd.Type === 35;    // RESEARCH/UPGRADE
      
      if (isBuildRelated) {
        console.log('[ScrepJsWrapper] Found potential build command:', {
          type: cmdType,
          typeId: cmd.Type,
          player: cmd.PlayerID || cmd.Player,
          frame: cmd.Frame,
          unitType: cmd.UnitType,
          params: cmd.Parameters
        });
      }
      
      return isBuildRelated;
    });

    console.log('[ScrepJsWrapper] Potential build commands found:', potentialBuildCommands.length);

    // Wenn wir keine spezifischen Build Commands finden, nehmen wir ALLE Commands und kategorisieren sie
    if (potentialBuildCommands.length === 0) {
      console.log('[ScrepJsWrapper] No specific build commands found, analyzing all commands...');
      
      commands.forEach((cmd: any, index: number) => {
        if (index < 20) { // Log first 20 commands for analysis
          console.log(`[ScrepJsWrapper] Command ${index}:`, {
            type: cmd.Type?.Name || cmd.Type,
            typeId: cmd.Type,
            player: cmd.PlayerID || cmd.Player,
            frame: cmd.Frame,
            unitType: cmd.UnitType,
            parameters: cmd.Parameters
          });
        }
      });
      
      // Fallback: nehme alle Commands die nicht offensichtlich Spam sind
      potentialBuildCommands.push(...commands.filter((cmd: any) => {
        const frame = cmd.Frame || 0;
        return frame > 100; // Ignore very early game spam
      }).slice(0, 100)); // Limit to first 100 commands
    }

    potentialBuildCommands.forEach((cmd: any) => {
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

    console.log('[ScrepJsWrapper] Final build orders per player:', buildOrders.map((bo, i) => `Player ${i}: ${bo.length} actions`));

    return buildOrders;
  }

  private getActionDescription(cmd: any): string {
    // Enhanced action description using StarCraft database
    const cmdType = ScUnitDatabase.getCommandType(cmd.Type) || 
                   { name: cmd.Type?.Name || cmd.Type || 'Unknown', category: 'other' };
    
    // Try to get unit information from database
    const unitId = cmd.UnitType?.ID || cmd.UnitType || cmd.Parameters?.unitTypeId;
    const unit = unitId ? ScUnitDatabase.getUnit(unitId) : null;
    
    if (unit) {
      return `${cmdType.name} ${unit.name}`;
    }
    
    // Fallback to original logic with enhanced detection
    const unitType = cmd.UnitType?.Name || cmd.UnitType || '';
    const techType = cmd.TechType?.Name || cmd.TechType || '';
    const upgradeType = cmd.UpgradeType?.Name || cmd.UpgradeType || '';
    
    if (unitType) return `${cmdType.name} ${unitType}`;
    if (techType) return `Research ${techType}`;
    if (upgradeType) return `Upgrade ${upgradeType}`;
    
    return cmdType.name;
  }

  private estimateSupply(frame: number, buildIndex: number): number {
    // Intelligente Supply-Schätzung basierend auf Zeit und Build Order Position
    const timeMinutes = frame / (24 * 60);
    const baseSupply = 9; // Starting supply
    const supplyFromTime = Math.floor(timeMinutes * 15); // ~15 supply per minute growth
    const supplyFromBuildings = buildIndex * 3; // Rough estimate based on build order
    
    return Math.min(baseSupply + supplyFromTime + supplyFromBuildings, 200);
  }

  private improvedCleanMapName(mapName: string): string {
    if (!mapName) return 'Unknown Map';
    
    // Less aggressive cleaning for SC:R compatibility
    let cleaned = mapName;
    
    // Remove only null bytes and extreme control characters
    cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    // Preserve Korean/Chinese characters and special map characters
    // Only clean up excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // If still empty or too short, try alternative sources
    if (!cleaned || cleaned.length < 2) {
      cleaned = 'Unknown Map';
    }
    
    return cleaned;
  }

  private analyzeCommandStructure(commands: any[]): { 
    totalCommands: number;
    buildCommands: number;
    commandTypeBreakdown: Record<string, number>;
    sampleCommands: any[];
  } {
    const analysis = {
      totalCommands: commands.length,
      buildCommands: 0,
      commandTypeBreakdown: {} as Record<string, number>,
      sampleCommands: commands.slice(0, 10) // First 10 for debugging
    };

    commands.forEach(cmd => {
      // Analyze command structure
      const cmdType = this.getCommandTypeDescription(cmd);
      analysis.commandTypeBreakdown[cmdType] = (analysis.commandTypeBreakdown[cmdType] || 0) + 1;
      
      // Count build-related commands
      if (this.isCommandBuildRelated(cmd)) {
        analysis.buildCommands++;
      }
    });

    return analysis;
  }

  private getCommandTypeDescription(cmd: any): string {
    // Try various ways to get command type from screp-js
    if (cmd.Type?.Name) return cmd.Type.Name;
    if (cmd.TypeString) return cmd.TypeString;
    if (typeof cmd.Type === 'number') return `Type${cmd.Type}`;
    if (cmd.type) return String(cmd.type);
    return 'Unknown';
  }

  private isCommandBuildRelated(cmd: any): boolean {
    const cmdType = this.getCommandTypeDescription(cmd).toLowerCase();
    
    // Enhanced build command detection
    const buildKeywords = [
      'build', 'train', 'construct', 'morph', 'make',
      'research', 'upgrade', 'evolve', 'mutate'
    ];
    
    // Check command type ID (from StarCraft documentation)
    const typeId = cmd.Type?.ID || cmd.Type || cmd.typeId;
    if (typeof typeId === 'number') {
      // Key build command IDs from StarCraft
      const buildCommandIds = [0x0C, 0x1E, 0x2F, 0x31]; // Build, Train, Research, Upgrade
      if (buildCommandIds.includes(typeId)) {
        return true;
      }
    }
    
    // Check command name
    return buildKeywords.some(keyword => cmdType.includes(keyword));
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
