import * as jssuh from 'jssuh';
import { Readable } from 'stream';

export interface JssuhAction {
  player: number;
  frame: number;
  id: number;
  data: Buffer;
}

export interface JssuhPlayer {
  id: number;
  name: string;
  isComputer: boolean;
  race: 'zerg' | 'terran' | 'protoss' | 'unknown';
  team: number;
}

export interface JssuhHeader {
  gameName: string;
  mapName: string;
  gameType: number;
  gameSubtype: number;
  players: JssuhPlayer[];
  durationFrames: number;
  seed: number;
  remastered: boolean;
}

export interface JssuhReplayResult {
  header: JssuhHeader;
  actions: JssuhAction[];
  buildOrder: BuildOrderAction[];
  analysis: {
    apm: number;
    eapm: number;
    gameLength: string;
    winner: string;
  };
}

export interface BuildOrderAction {
  frame: number;
  gameTime: string;
  action: string;
  unit: string;
  player: number;
  actionType: 'Build' | 'Train' | 'Research' | 'Upgrade';
}

/**
 * JSSUH Parser - Better for Build Order Extraction
 * Uses the proven jssuh library for reliable action parsing
 */
export class JssuhParser {
  
  async parseReplay(file: File): Promise<JssuhReplayResult> {
    console.log('[JssuhParser] Starting jssuh-based replay parsing');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      return new Promise((resolve, reject) => {
        const parser = new jssuh.ReplayParser();
        const actions: JssuhAction[] = [];
        let header: JssuhHeader | null = null;
        
        // Listen for header
        parser.on('replayHeader', (headerData: any) => {
          console.log('[JssuhParser] Received header:', headerData);
          header = headerData;
        });
        
        // Listen for actions
        parser.on('data', (action: JssuhAction) => {
          actions.push(action);
        });
        
        // Handle completion
        parser.on('end', () => {
          console.log(`[JssuhParser] Parsing complete. ${actions.length} actions found`);
          
          if (!header) {
            reject(new Error('No header data received'));
            return;
          }
          
          // Extract build order from actions
          const buildOrder = this.extractBuildOrderFromActions(actions, header);
          
          // Generate analysis
          const analysis = this.generateAnalysis(actions, header);
          
          const result: JssuhReplayResult = {
            header,
            actions,
            buildOrder,
            analysis
          };
          
          resolve(result);
        });
        
        // Handle errors
        parser.on('error', (error: Error) => {
          console.error('[JssuhParser] Parse error:', error);
          reject(error);
        });
        
        // Create readable stream from buffer
        const readable = new Readable({
          read() {
            this.push(buffer);
            this.push(null);
          }
        });
        
        // Start parsing
        readable.pipe(parser);
      });
      
    } catch (error) {
      console.error('[JssuhParser] Error parsing replay:', error);
      throw error;
    }
  }
  
  /**
   * Extract build order from raw jssuh actions
   * This is where the magic happens - parsing action IDs and data
   */
  private extractBuildOrderFromActions(actions: JssuhAction[], header: JssuhHeader): BuildOrderAction[] {
    console.log('[JssuhParser] Extracting build order from actions');
    
    const buildOrderActions: BuildOrderAction[] = [];
    
    // Common StarCraft action IDs for building/training
    const BUILD_ACTION_IDS = {
      // Building construction
      BUILD_BASIC: 0x0C,          // Build basic building
      BUILD_ADDON: 0x0D,          // Build addon
      
      // Unit training
      TRAIN_UNIT: 0x1F,           // Train unit
      TRAIN_UNIT_ALT: 0x23,       // Alternative train unit
      
      // Research and upgrades
      RESEARCH: 0x30,             // Research technology
      UPGRADE: 0x32,              // Upgrade
      
      // Protoss specific
      PROTOSS_BUILD: 0x0E,        // Protoss building (warp-in)
      
      // Other build-related commands
      MORPH_UNIT: 0x35,           // Morph unit (Zerg)
      CANCEL_CONSTRUCTION: 0x34   // Cancel construction
    };
    
    for (const action of actions) {
      const actionType = this.getActionType(action.id);
      if (!actionType) continue;
      
      const unitName = this.parseUnitFromActionData(action, header.players[action.player]?.race || 'unknown');
      if (!unitName) continue;
      
      const buildOrderAction: BuildOrderAction = {
        frame: action.frame,
        gameTime: this.frameToGameTime(action.frame),
        action: `${actionType} ${unitName}`,
        unit: unitName,
        player: action.player,
        actionType: actionType
      };
      
      buildOrderActions.push(buildOrderAction);
      
      console.log(`[JssuhParser] Found build action: ${buildOrderAction.gameTime} - ${buildOrderAction.action}`);
    }
    
    // Sort by frame
    buildOrderActions.sort((a, b) => a.frame - b.frame);
    
    console.log(`[JssuhParser] Extracted ${buildOrderActions.length} build order actions`);
    return buildOrderActions;
  }
  
  /**
   * Determine action type from action ID
   */
  private getActionType(actionId: number): 'Build' | 'Train' | 'Research' | 'Upgrade' | null {
    switch (actionId) {
      case 0x0C: // BUILD_BASIC
      case 0x0D: // BUILD_ADDON  
      case 0x0E: // PROTOSS_BUILD
        return 'Build';
      
      case 0x1F: // TRAIN_UNIT
      case 0x23: // TRAIN_UNIT_ALT
      case 0x35: // MORPH_UNIT
        return 'Train';
      
      case 0x30: // RESEARCH
        return 'Research';
      
      case 0x32: // UPGRADE
        return 'Upgrade';
      
      default:
        return null;
    }
  }
  
  /**
   * Parse unit name from action data buffer
   * This requires understanding the StarCraft action data format
   */
  private parseUnitFromActionData(action: JssuhAction, race: string): string | null {
    try {
      const data = action.data;
      
      // Most build commands have unit ID in the first 2 bytes
      if (data.length >= 2) {
        const unitId = data.readUInt16LE(0);
        return this.getUnitNameFromId(unitId, race);
      }
      
      return null;
    } catch (error) {
      console.warn('[JssuhParser] Error parsing unit from action data:', error);
      return null;
    }
  }
  
  /**
   * Convert unit ID to unit name based on race
   */
  private getUnitNameFromId(unitId: number, race: string): string | null {
    // StarCraft unit IDs - this is a simplified mapping
    const UNIT_NAMES: { [key: number]: { [race: string]: string } } = {
      // Buildings
      106: { terran: 'Command Center', protoss: 'Nexus', zerg: 'Hatchery' },
      107: { terran: 'Supply Depot', protoss: 'Pylon', zerg: 'Overlord' },
      109: { terran: 'Barracks', protoss: 'Gateway', zerg: 'Spawning Pool' },
      110: { terran: 'Academy', protoss: 'Forge', zerg: 'Evolution Chamber' },
      111: { terran: 'Factory', protoss: 'Photon Cannon', zerg: 'Hydralisk Den' },
      112: { terran: 'Starport', protoss: 'Cybernetics Core', zerg: 'Spire' },
      
      // Units  
      0: { terran: 'Marine', protoss: 'Zealot', zerg: 'Zergling' },
      1: { terran: 'Firebat', protoss: 'Dragoon', zerg: 'Hydralisk' },
      2: { terran: 'Medic', protoss: 'High Templar', zerg: 'Ultralisk' },
      3: { terran: 'Vulture', protoss: 'Dark Templar', zerg: 'Mutalisk' },
      4: { terran: 'Goliath', protoss: 'Archon', zerg: 'Guardian' },
      5: { terran: 'Tank', protoss: 'Shuttle', zerg: 'Queen' },
      
      // More comprehensive mapping would go here...
    };
    
    const unitData = UNIT_NAMES[unitId];
    if (unitData && unitData[race]) {
      return unitData[race];
    }
    
    // Fallback to generic naming
    return `Unit_${unitId}`;
  }
  
  /**
   * Convert frame to game time string
   */
  private frameToGameTime(frame: number): string {
    // StarCraft runs at 24 frames per second on fastest speed
    const seconds = Math.floor(frame / 24);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Generate basic analysis from actions
   */
  private generateAnalysis(actions: JssuhAction[], header: JssuhHeader): any {
    const totalFrames = header.durationFrames;
    const totalMinutes = totalFrames / (24 * 60); // 24 FPS
    
    // Calculate APM for each player
    const playerActions = actions.reduce((acc, action) => {
      acc[action.player] = (acc[action.player] || 0) + 1;
      return acc;
    }, {} as { [playerId: number]: number });
    
    const playerAPMs = Object.entries(playerActions).map(([playerId, actionCount]) => ({
      playerId: parseInt(playerId),
      apm: Math.round(actionCount / totalMinutes)
    }));
    
    return {
      apm: playerAPMs[0]?.apm || 0,
      eapm: Math.round((playerAPMs[0]?.apm || 0) * 0.7), // Rough estimate
      gameLength: this.frameToGameTime(totalFrames),
      winner: 'Unknown' // Would need more analysis
    };
  }
}
