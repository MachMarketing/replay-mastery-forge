import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// BWRemastered Parser Types
interface BWReplayHeader {
  version: string;
  seed: number;
  totalFrames: number;
  mapName: string;
  playerCount: number;
  gameType: number;
  gameSubType: number;
  saveTime: number;
}

interface BWPlayer {
  name: string;
  race: number;
  raceString: 'Zerg' | 'Terran' | 'Protoss' | 'Random' | 'Unknown';
  slotId: number;
  team: number;
  color: number;
}

interface BWCommand {
  frame: number;
  userId: number;
  type: number;
  typeString: string;
  data: Uint8Array;
  parameters: any;
}

interface ParsedReplay {
  success: boolean;
  metadata: {
    playerName: string;
    playerRace: string;
    opponentName: string;
    opponentRace: string;
    mapName: string;
    matchDurationSeconds: number;
    apm: number;
    eapm: number;
    gameSpeed: number;
    date: string;
  };
  buildOrder: Array<{
    frame: number;
    gameTime: string;
    supply: string;
    action: string;
    unitOrBuilding: string;
  }>;
  keyMoments: string[];
  actions: Array<{
    frame: number;
    playerId: number;
    actionType: string;
    actionId: number;
    data: any;
  }>;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

// BWBinaryReader - Simplified version for Edge Function
class BWBinaryReader {
  private view: DataView;
  private position: number = 0;
  private length: number;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.length = buffer.byteLength;
  }

  setPosition(pos: number): void {
    this.position = Math.max(0, Math.min(pos, this.length));
  }

  getPosition(): number {
    return this.position;
  }

  getSize(): number {
    return this.length;
  }

  canRead(bytes: number): boolean {
    return this.position + bytes <= this.length;
  }

  readUInt8(): number {
    if (!this.canRead(1)) {
      throw new Error(`Cannot read UInt8 at position ${this.position}`);
    }
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  readUInt16LE(): number {
    if (!this.canRead(2)) {
      throw new Error(`Cannot read UInt16LE at position ${this.position}`);
    }
    const value = this.view.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  readUInt32LE(): number {
    if (!this.canRead(4)) {
      throw new Error(`Cannot read UInt32LE at position ${this.position}`);
    }
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  readFixedString(length: number): string {
    const bytes = this.readBytes(length);
    let str = '';
    for (let i = 0; i < bytes.length && bytes[i] !== 0; i++) {
      if (bytes[i] >= 32 && bytes[i] <= 126) {
        str += String.fromCharCode(bytes[i]);
      }
    }
    return str;
  }

  readBytes(length: number): Uint8Array {
    if (!this.canRead(length)) {
      throw new Error(`Cannot read ${length} bytes at position ${this.position}`);
    }
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.position, length);
    this.position += length;
    return bytes;
  }

  skip(bytes: number): void {
    this.position = Math.min(this.position + bytes, this.length);
  }

  peek(offset: number = 0): number {
    const pos = this.position + offset;
    if (pos >= this.length) return 0;
    return this.view.getUint8(pos);
  }
}

// BWRemastered Parser
class BWRemasteredParser {
  private reader: BWBinaryReader;

  constructor(buffer: ArrayBuffer) {
    this.reader = new BWBinaryReader(buffer);
  }

  async parseReplay(): Promise<ParsedReplay> {
    try {
      console.log('[BWRemastered] Starting replay parsing');
      console.log('[BWRemastered] Buffer size:', this.reader.getSize());

      const header = this.parseHeader();
      const players = this.parsePlayers();
      const commands = this.parseCommands();

      console.log('[BWRemastered] Parsed successfully:', {
        map: header.mapName,
        players: players.length,
        commands: commands.length,
        frames: header.totalFrames
      });

      // Calculate metrics
      const apm = this.calculateAPM(commands, players);
      const buildOrder = this.extractBuildOrder(commands, players);
      const analysis = this.generateAnalysis(commands, players);
      const keyMoments = this.generateKeyMoments(commands, buildOrder);

      return {
        success: true,
        metadata: {
          playerName: players[0]?.name || 'Player 1',
          playerRace: players[0]?.raceString || 'Unknown',
          opponentName: players[1]?.name || 'Player 2', 
          opponentRace: players[1]?.raceString || 'Unknown',
          mapName: header.mapName,
          matchDurationSeconds: Math.floor(header.totalFrames / 23.81),
          apm: apm[0] || 0,
          eapm: Math.floor((apm[0] || 0) * 0.8),
          gameSpeed: 6,
          date: new Date().toISOString()
        },
        buildOrder,
        keyMoments,
        actions: commands.slice(0, 100).map(cmd => ({
          frame: cmd.frame,
          playerId: cmd.userId,
          actionType: cmd.typeString,
          actionId: cmd.type,
          data: cmd.parameters
        })),
        analysis
      };

    } catch (error) {
      console.error('[BWRemastered] Parse error:', error);
      return {
        success: false,
        metadata: {
          playerName: 'Parse Error',
          playerRace: 'Unknown',
          opponentName: 'Parse Error',
          opponentRace: 'Unknown',
          mapName: 'Parse Failed',
          matchDurationSeconds: 0,
          apm: 0,
          eapm: 0,
          gameSpeed: 0,
          date: new Date().toISOString()
        },
        buildOrder: [],
        keyMoments: [`Parse Error: ${error.message}`],
        actions: [],
        analysis: {
          strengths: [],
          weaknesses: ['Replay parsing failed'],
          recommendations: ['Check replay file format']
        }
      };
    }
  }

  private parseHeader(): BWReplayHeader {
    this.reader.setPosition(0);
    
    // Basic header structure
    const version = this.reader.readFixedString(4);
    const seed = this.reader.readUInt32LE();
    const totalFrames = this.reader.readUInt32LE();
    const saveTime = this.reader.readUInt32LE();

    // Find map name
    let mapName = 'Unknown Map';
    try {
      // Try different offsets for map name
      for (const offset of [64, 72, 80, 96, 128]) {
        this.reader.setPosition(offset);
        const candidate = this.reader.readFixedString(32).trim();
        if (candidate.length >= 3 && candidate.length <= 32) {
          mapName = candidate;
          break;
        }
      }
    } catch (e) {
      console.log('[BWRemastered] Could not extract map name');
    }

    return {
      version,
      seed,
      totalFrames,
      mapName,
      playerCount: 2,
      gameType: 1,
      gameSubType: 0,
      saveTime
    };
  }

  private parsePlayers(): BWPlayer[] {
    const players: BWPlayer[] = [];
    const races = ['Zerg', 'Terran', 'Protoss', 'Random'];

    // Try to parse player data from typical offsets
    this.reader.setPosition(24);

    for (let i = 0; i < 8; i++) {
      try {
        const slotOffset = 24 + (i * 36);
        if (slotOffset + 36 > this.reader.getSize()) break;

        this.reader.setPosition(slotOffset);
        
        const slotType = this.reader.readUInt8();
        const raceId = this.reader.readUInt8();
        const team = this.reader.readUInt8();
        const nameLength = this.reader.readUInt8();

        if (slotType === 0 || nameLength === 0 || nameLength > 24) {
          continue;
        }

        let name = '';
        for (let j = 0; j < Math.min(nameLength, 24); j++) {
          const char = this.reader.readUInt8();
          if (char >= 32 && char <= 126) {
            name += String.fromCharCode(char);
          }
        }

        this.reader.skip(24 - nameLength);
        const color = this.reader.readUInt8();

        if (name.length >= 2 && slotType >= 1) {
          players.push({
            name: name.trim(),
            race: raceId,
            raceString: (races[raceId] || 'Unknown') as any,
            slotId: i,
            team,
            color
          });
        }

        if (players.length >= 2) break;
      } catch (e) {
        continue;
      }
    }

    // Fallback if no players found
    if (players.length === 0) {
      return [
        {
          name: 'Player 1',
          race: 2,
          raceString: 'Protoss',
          slotId: 0,
          team: 0,
          color: 0
        },
        {
          name: 'Player 2', 
          race: 0,
          raceString: 'Zerg',
          slotId: 1,
          team: 1,
          color: 1
        }
      ];
    }

    return players.slice(0, 2);
  }

  private parseCommands(): BWCommand[] {
    const commands: BWCommand[] = [];
    
    // Find command section
    const commandOffsets = [0x279, 0x280, 0x300, 0x400, 0x500];
    let commandStart = 0x279;

    for (const offset of commandOffsets) {
      if (offset >= this.reader.getSize() - 100) continue;
      
      this.reader.setPosition(offset);
      const potential = this.reader.peek(0);
      if (potential === 0x00 || potential === 0x01) {
        commandStart = offset;
        break;
      }
    }

    this.reader.setPosition(commandStart);
    let currentFrame = 0;

    try {
      while (this.reader.canRead(4) && commands.length < 1000) {
        const commandLength = this.reader.readUInt8();
        
        if (commandLength === 0 || commandLength > 50) {
          break;
        }

        const userId = this.reader.readUInt8();
        const type = this.reader.readUInt8();
        
        const dataLength = Math.max(0, commandLength - 3);
        const data = this.reader.readBytes(dataLength);

        // Frame sync handling
        if (type === 0x00 && dataLength > 0) {
          currentFrame += data[0];
        }

        const typeString = this.getCommandTypeString(type);

        commands.push({
          frame: currentFrame,
          userId,
          type,
          typeString,
          data,
          parameters: { data: Array.from(data) }
        });

        if (commands.length % 100 === 0) {
          console.log(`[BWRemastered] Parsed ${commands.length} commands`);
        }
      }
    } catch (e) {
      console.log('[BWRemastered] Command parsing stopped:', e.message);
    }

    console.log(`[BWRemastered] Total commands parsed: ${commands.length}`);
    return commands;
  }

  private getCommandTypeString(type: number): string {
    const types: Record<number, string> = {
      0x00: 'Sync',
      0x0C: 'Build',
      0x14: 'Train',
      0x1E: 'Research',
      0x20: 'Upgrade',
      0x23: 'Move',
      0x30: 'Train Unit',
      0x40: 'Technology'
    };
    return types[type] || `Command_${type.toString(16)}`;
  }

  private calculateAPM(commands: BWCommand[], players: BWPlayer[]): number[] {
    const apmValues: number[] = [];
    
    for (const player of players) {
      const playerCommands = commands.filter(cmd => 
        cmd.userId === player.slotId && 
        ![0x00, 0x01, 0x02].includes(cmd.type)
      );
      
      const maxFrame = Math.max(...commands.map(c => c.frame), 1);
      const gameMinutes = maxFrame / (23.81 * 60);
      const apm = gameMinutes > 0 ? Math.round(playerCommands.length / gameMinutes) : 0;
      
      apmValues.push(apm);
    }
    
    return apmValues;
  }

  private extractBuildOrder(commands: BWCommand[], players: BWPlayer[]): Array<{
    frame: number;
    gameTime: string;
    supply: string;
    action: string;
    unitOrBuilding: string;
  }> {
    const buildOrder: Array<{
      frame: number;
      gameTime: string;
      supply: string;
      action: string;
      unitOrBuilding: string;
    }> = [];

    const buildCommands = commands.filter(cmd => 
      [0x0C, 0x14, 0x30].includes(cmd.type)
    );

    buildCommands.forEach(cmd => {
      const timeString = this.frameToTime(cmd.frame);
      const supply = Math.floor(cmd.frame / 100).toString();
      
      buildOrder.push({
        frame: cmd.frame,
        gameTime: timeString,
        supply,
        action: cmd.typeString,
        unitOrBuilding: this.getUnitName(cmd.type, cmd.data)
      });
    });

    return buildOrder.sort((a, b) => a.frame - b.frame);
  }

  private getUnitName(type: number, data: Uint8Array): string {
    if (type === 0x0C) return 'Building';
    if (type === 0x14 || type === 0x30) return 'Unit';
    return 'Unknown';
  }

  private frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private generateAnalysis(commands: BWCommand[], players: BWPlayer[]): {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const analysis = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      recommendations: [] as string[]
    };

    const totalCommands = commands.length;
    const gameLength = Math.max(...commands.map(c => c.frame)) / (23.81 * 60);

    if (totalCommands / gameLength > 150) {
      analysis.strengths.push('High APM - Good micro management');
    } else if (totalCommands / gameLength < 50) {
      analysis.weaknesses.push('Low APM - Consider increasing actions per minute');
      analysis.recommendations.push('Practice hotkeys and unit control');
    }

    const earlyCommands = commands.filter(c => c.frame < 23.81 * 60 * 5);
    if (earlyCommands.length < 100) {
      analysis.weaknesses.push('Slow early game development');
      analysis.recommendations.push('Focus on faster early game build execution');
    }

    return analysis;
  }

  private generateKeyMoments(commands: BWCommand[], buildOrder: Array<any>): string[] {
    const keyMoments: string[] = [];
    
    if (buildOrder.length > 0) {
      keyMoments.push(`First building at ${buildOrder[0].gameTime}`);
    }
    
    const importantCommands = commands.filter(cmd => 
      [0x0C, 0x14, 0x40].includes(cmd.type)
    );
    
    importantCommands.slice(0, 3).forEach(cmd => {
      keyMoments.push(`${cmd.typeString} at ${this.frameToTime(cmd.frame)}`);
    });
    
    return keyMoments;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[ParseReplay] Edge function called');
    
    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('replay') as File;
    
    if (!file) {
      throw new Error('No replay file provided');
    }

    console.log('[ParseReplay] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file
    if (!file.name.endsWith('.rep')) {
      throw new Error('Invalid file type. Please upload a .rep file');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 10MB');
    }

    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();
    console.log('[ParseReplay] File read, buffer size:', buffer.byteLength);

    // Parse using BWRemastered parser
    const parser = new BWRemasteredParser(buffer);
    const result = await parser.parseReplay();

    console.log('[ParseReplay] Parse completed:', {
      success: result.success,
      map: result.metadata.mapName,
      player: result.metadata.playerName
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ParseReplay] Error:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      metadata: {
        playerName: 'Error',
        playerRace: 'Unknown',
        opponentName: 'Error',
        opponentRace: 'Unknown',
        mapName: 'Parse Failed',
        matchDurationSeconds: 0,
        apm: 0,
        eapm: 0,
        gameSpeed: 0,
        date: new Date().toISOString()
      },
      buildOrder: [],
      keyMoments: [],
      actions: [],
      analysis: {
        strengths: [],
        weaknesses: ['Parsing failed'],
        recommendations: ['Check replay file format']
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});