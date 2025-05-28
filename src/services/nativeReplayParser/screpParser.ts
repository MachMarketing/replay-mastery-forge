
/**
 * Native screp-js integration for StarCraft: Brood War Remastered replays
 * Using the official screp library for accurate parsing
 */

export interface ScrepPlayer {
  name: string;
  race: string;
  raceId: number;
  team: number;
  color: number;
  slotId: number;
}

export interface ScrepReplayData {
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
  players: ScrepPlayer[];
  computed: {
    playerDescs: string[];
    matchup: string;
    league: string;
    winnerTeam: number;
    apm: number[];
  };
}

export class ScrepParser {
  /**
   * Parse replay using the official screp library
   */
  static async parseReplay(file: File): Promise<ScrepReplayData> {
    console.log('[ScrepParser] Starting screp-js parsing for:', file.name);
    
    try {
      // Import screp dynamically to handle potential loading issues
      const screp = await import('screp');
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('[ScrepParser] File size:', uint8Array.length, 'bytes');
      console.log('[ScrepParser] First 16 bytes:', Array.from(uint8Array.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      // Parse with screp
      const result = screp.parseReplay(uint8Array);
      
      if (!result) {
        throw new Error('screp returned null - invalid replay format');
      }
      
      console.log('[ScrepParser] Raw screp result:', result);
      
      // Transform screp result to our format
      const transformedData = this.transformScrepResult(result);
      
      console.log('[ScrepParser] Transformed data:', transformedData);
      
      return transformedData;
      
    } catch (error) {
      console.error('[ScrepParser] screp parsing failed:', error);
      throw new Error(`screp parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Transform screp result to our expected format
   */
  private static transformScrepResult(screpResult: any): ScrepReplayData {
    console.log('[ScrepParser] Transforming screp result...');
    
    // Extract header information
    const header = {
      engine: screpResult.header?.engine || 'Unknown',
      version: screpResult.header?.version || '1.16.1',
      frames: screpResult.header?.frames || 0,
      startTime: screpResult.header?.startTime ? new Date(screpResult.header.startTime) : new Date(),
      title: screpResult.header?.title || '',
      mapName: screpResult.header?.mapName || 'Unknown Map',
      mapWidth: screpResult.header?.mapWidth || 0,
      mapHeight: screpResult.header?.mapHeight || 0,
      gameType: screpResult.header?.gameType || 'Unknown',
      gameSubType: screpResult.header?.gameSubType || 0,
      host: screpResult.header?.host || '',
      duration: this.formatDuration(screpResult.header?.frames || 0),
      durationMs: Math.floor((screpResult.header?.frames || 0) * 1000 / 24) // 24 fps
    };
    
    // Extract players
    const players: ScrepPlayer[] = [];
    if (screpResult.header?.players) {
      for (let i = 0; i < screpResult.header.players.length; i++) {
        const player = screpResult.header.players[i];
        if (player && player.name && player.name.trim()) {
          players.push({
            name: player.name.trim(),
            race: this.getRaceString(player.race),
            raceId: player.race || 6,
            team: player.team || 0,
            color: player.color || i,
            slotId: i
          });
        }
      }
    }
    
    // Extract computed data
    const computed = {
      playerDescs: screpResult.computed?.playerDescs || [],
      matchup: screpResult.computed?.matchup || '',
      league: screpResult.computed?.league || '',
      winnerTeam: screpResult.computed?.winnerTeam || -1,
      apm: screpResult.computed?.apm || []
    };
    
    return {
      header,
      players,
      computed
    };
  }
  
  /**
   * Convert race ID to race string
   */
  private static getRaceString(raceId: number): string {
    const races: Record<number, string> = {
      0: 'Zerg',
      1: 'Terran', 
      2: 'Protoss',
      3: 'Invalid',
      4: 'Invalid',
      5: 'Invalid',
      6: 'Random',
      7: 'Invalid'
    };
    
    return races[raceId] || 'Unknown';
  }
  
  /**
   * Format frame count to MM:SS duration
   */
  private static formatDuration(frames: number): string {
    const seconds = Math.floor(frames / 24); // 24 fps
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
