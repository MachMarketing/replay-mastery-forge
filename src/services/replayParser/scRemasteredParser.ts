
/**
 * StarCraft: Remastered .rep Parser - Using correct Remastered structure
 */

import { RemasteredStructureParser } from './remasteredStructureParser';

export interface RemasteredReplayData {
  header: {
    mapName: string;
    duration: string;
    frames: number;
    gameType: string;
    engine: string;
  };
  players: {
    id: number;
    name: string;
    race: string;
    team: number;
    color: number;
    apm: number;
    eapm: number;
  }[];
  buildOrders: {
    playerId: number;
    entries: {
      time: string;
      supply: number;
      action: string;
      unitName?: string;
    }[];
  }[];
  rawData: {
    totalCommands: number;
    gameMinutes: number;
    extractionMethod: string;
  };
}

export class SCRemasteredParser {
  private data: Uint8Array;
  private structureParser: RemasteredStructureParser;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new Uint8Array(arrayBuffer);
    this.structureParser = new RemasteredStructureParser(arrayBuffer);
  }

  async parse(): Promise<RemasteredReplayData> {
    console.log('[SCRemasteredParser] Starting parse with correct Remastered structure');
    console.log('[SCRemasteredParser] File size:', this.data.length);

    try {
      // Parse using correct Remastered structure
      const structure = this.structureParser.parse();
      
      console.log('[SCRemasteredParser] Structure parsed:', {
        mapName: structure.header.mapName,
        engineVersion: structure.header.engineVersion,
        players: structure.players.length,
        commands: structure.commandSection.commands.length
      });

      // Convert to UI format
      const gameMinutes = structure.header.frameCount / 23.81 / 60;
      const duration = this.formatDuration(structure.header.frameCount);

      // Process players with realistic APM
      const players = structure.players.map(player => {
        const playerCommands = structure.commandSection.commands.filter(
          cmd => cmd.playerId === player.id
        );
        
        // Calculate realistic APM
        const apm = gameMinutes > 0 ? Math.round(playerCommands.length / gameMinutes) : 0;
        const eapm = Math.round(apm * 0.85); // Effective APM

        return {
          id: player.id,
          name: player.name,
          race: player.race,
          team: player.team,
          color: player.color,
          apm,
          eapm
        };
      });

      // Generate build orders from build/train commands
      const buildOrders = this.generateBuildOrders(structure);

      return {
        header: {
          mapName: structure.header.mapName || 'Unknown Map',
          duration,
          frames: structure.header.frameCount,
          gameType: 'Melee',
          engine: `Remastered v${structure.header.engineVersion}`
        },
        players,
        buildOrders,
        rawData: {
          totalCommands: structure.commandSection.commands.length,
          gameMinutes,
          extractionMethod: 'RemasteredStructureParser'
        }
      };

    } catch (error) {
      console.error('[SCRemasteredParser] Parse failed:', error);
      throw new Error(`Remastered parsing failed: ${error}`);
    }
  }

  private generateBuildOrders(structure: any) {
    const buildOrders = [];
    
    // Group build commands by player
    for (const player of structure.players) {
      const playerCommands = structure.commandSection.commands.filter(
        cmd => cmd.playerId === player.id && 
               (cmd.type === 0x0C || cmd.type === 0x1D) && // BUILD or TRAIN
               cmd.unitName
      );

      if (playerCommands.length > 0) {
        const entries = playerCommands.slice(0, 15).map((cmd, index) => ({
          time: this.frameToTime(cmd.frame),
          supply: 4 + (index * 2), // Simple supply estimation
          action: cmd.action,
          unitName: cmd.unitName
        }));

        buildOrders.push({
          playerId: player.id,
          entries
        });
      }
    }

    return buildOrders;
  }

  private frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private formatDuration(frames: number): string {
    const totalSeconds = Math.floor(frames / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
