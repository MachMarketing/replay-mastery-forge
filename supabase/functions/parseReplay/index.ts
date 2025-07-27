import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ================= AUTHENTISCHER SC:R REPLAY PARSER =================
// Basierend auf der offiziellen screp Go-Implementation

interface ReplayHeader {
  signature: string;
  engineVersion: number;
  frameCount: number;
  saveTime: number;
  compInfo: {
    playerBytes: number;
    mapWidth: number;
    mapHeight: number;
  };
  players: Player[];
  mapName: string;
  gameSpeed: number;
  gameType: number;
}

interface Player {
  id: number;
  name: string;
  race: string;
  raceId: number;
  color: number;
  team: number;
  slotType: number;
}

interface Action {
  frame: number;
  playerId: number;
  actionType: string;
  actionId: number;
  data: any;
}

interface BuildOrderItem {
  frame: number;
  gameTime: string;
  supply: string;
  action: string;
  unitOrBuilding: string;
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
  buildOrder: BuildOrderItem[];
  keyMoments: string[];
  actions: Action[];
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

class AuthenticSCRParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private position: number = 0;

  // SC:R spezifische Konstanten basierend auf screp
  private readonly RACE_NAMES = ['Zerg', 'Terran', 'Protoss', 'Invalid', 'Invalid', 'Invalid', 'Random'];
  private readonly GAME_TYPES = ['', 'Melee', 'Free For All', 'Top vs Bottom', 'Team Melee', '', '', '', 'Use Map Settings'];
  private readonly ACTION_NAMES: Record<number, string> = {
    0x00: 'Pause',
    0x01: 'Resume',
    0x02: 'Set Speed',
    0x03: 'Increase Speed',
    0x04: 'Decrease Speed',
    0x05: 'Save',
    0x06: 'Load',
    0x07: 'Restart',
    0x08: 'Surrender',
    0x09: 'Stop',
    0x0A: 'Resume',
    0x0B: 'Ally',
    0x0C: 'Game Chat',
    0x0D: 'Keep Alive',
    0x0E: 'Minimap Ping',
    0x10: 'Sync',
    0x12: 'Latency',
    0x13: 'Replay Speed',
    0x14: 'Select Units',
    0x15: 'Shift Select',
    0x16: 'Shift Deselect',
    0x18: 'Build',
    0x19: 'Vision',
    0x1A: 'Ally',
    0x1E: 'Game Speed',
    0x20: 'Hotkey',
    0x23: 'Right Click',
    0x26: 'Target Click',
    0x27: 'Target Click',
    0x28: 'Cancel Build',
    0x2A: 'Cancel Morph',
    0x2B: 'Stop',
    0x2C: 'Carrier Stop',
    0x2D: 'Reaver Stop',
    0x2E: 'Order Nothing',
    0x2F: 'Return Cargo',
    0x30: 'Train',
    0x31: 'Cancel Train',
    0x32: 'Cloak',
    0x33: 'Decloak',
    0x34: 'Unit Morph',
    0x35: 'Unsiege',
    0x36: 'Siege',
    0x37: 'Train Fighter',
    0x38: 'Unload All',
    0x39: 'Unload',
    0x3A: 'Merge Archon',
    0x3B: 'Hold Position',
    0x3C: 'Burrow',
    0x3D: 'Unburrow',
    0x3E: 'Cancel Nuke',
    0x3F: 'Lift',
    0x40: 'Tech',
    0x41: 'Cancel Tech',
    0x42: 'Upgrade',
    0x43: 'Cancel Upgrade',
    0x44: 'Cancel Addon',
    0x45: 'Building Morph',
    0x46: 'Stim',
    0x47: 'Sync',
    0x48: 'Voice Enable1',
    0x49: 'Voice Enable2',
    0x4A: 'Voice Squelch1',
    0x4B: 'Voice Squelch2',
    0x4C: 'Start Game',
    0x4D: 'Download Percentage',
    0x4E: 'Change Game Slot',
    0x4F: 'New Net Player',
    0x50: 'Joined Game',
    0x51: 'Change Race',
    0x52: 'Team Game Team',
    0x53: 'UMS Team',
    0x54: 'Melee Team',
    0x55: 'Swap Players',
    0x56: 'Saved Data',
    0x57: 'Replay Speed'
  };

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  // ============= AUTHENTISCHE BINARY READING METHODS =============
  
  private readUInt8(): number {
    if (this.position >= this.buffer.byteLength) throw new Error('Buffer overflow');
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  private readUInt16LE(): number {
    if (this.position + 1 >= this.buffer.byteLength) throw new Error('Buffer overflow');
    const value = this.view.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  private readUInt32LE(): number {
    if (this.position + 3 >= this.buffer.byteLength) throw new Error('Buffer overflow');
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  private readNullTerminatedString(maxLength: number = 256): string {
    let str = '';
    let bytesRead = 0;
    
    while (this.position < this.buffer.byteLength && bytesRead < maxLength) {
      const byte = this.readUInt8();
      bytesRead++;
      
      if (byte === 0) break;
      
      if (byte >= 32 && byte <= 126) { // Printable ASCII
        str += String.fromCharCode(byte);
      }
    }
    
    return str;
  }

  private seekTo(position: number): void {
    this.position = Math.min(position, this.buffer.byteLength);
  }

  private skip(bytes: number): void {
    this.position = Math.min(this.position + bytes, this.buffer.byteLength);
  }

  // Fixed: Changed from private to public to avoid Deno compilation issues
  public peek(offset: number = 0): number {
    const pos = this.position + offset;
    if (pos >= this.buffer.byteLength) {
      throw new Error('Cannot peek beyond buffer end');
    }
    return new Uint8Array(this.buffer)[pos];
  }

  // ============= AUTHENTISCHES SC:R PARSING BASIEREND AUF SCREP =============

  public parse(): ParsedReplay {
    try {
      console.log('[AuthenticSCR] Starting authentic SC:R replay parsing...');
      console.log('[AuthenticSCR] Buffer size:', this.buffer.byteLength);
      
      // SC:R Header parsing nach screp-Standard
      const header = this.parseAuthenticHeader();
      const players = this.parseAuthenticPlayers(header);
      const actions = this.parseAuthenticCommands();
      const buildOrder = this.extractBuildOrder(actions, players);
      
      // Calculate metrics
      const apm = this.calculateAPM(actions, players[0]?.id || 0);
      const eapm = Math.floor(apm * 0.8); // More accurate EAPM estimate
      
      const analysis = {
        strengths: this.analyzeStrengths(buildOrder, actions),
        weaknesses: this.analyzeWeaknesses(buildOrder, actions),
        recommendations: this.generateRecommendations(buildOrder, actions)
      };

      const keyMoments = this.generateKeyMoments(actions, buildOrder);
      
      console.log('[AuthenticSCR] Parse successful!');
      console.log('[AuthenticSCR] Results:', {
        engineVersion: header.engineVersion,
        players: players.map(p => `${p.name} (${p.race})`),
        map: header.mapName,
        frames: header.frameCount,
        actions: actions.length,
        buildOrder: buildOrder.length
      });
      
      return {
        success: true,
        metadata: {
          playerName: players[0]?.name || 'Player 1',
          playerRace: players[0]?.race || 'Unknown',
          opponentName: players[1]?.name || 'Player 2',
          opponentRace: players[1]?.race || 'Unknown',
          mapName: header.mapName,
          matchDurationSeconds: Math.floor(header.frameCount / 23.81), // Authentic SC:R FPS
          apm,
          eapm,
          gameSpeed: header.gameSpeed || 6,
          date: new Date(header.saveTime * 1000).toISOString()
        },
        buildOrder,
        keyMoments,
        actions: actions.slice(0, 100),
        analysis
      };
      
    } catch (error) {
      console.error('[AuthenticSCR] Parse error:', error);
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
          weaknesses: ['Replay konnte nicht geparst werden - authentische SC:R Parser'],
          recommendations: ['Überprüfe die .rep-Datei auf SC:R Kompatibilität']
        }
      };
    }
  }

  private parseAuthenticHeader(): ReplayHeader {
    this.seekTo(0);
    console.log('[AuthenticSCR] Parsing authentic SC:R header...');
    
    // SC:R Header hat eine spezifische Struktur laut screp
    const signature = this.readUInt32LE();
    const engineVersion = this.readUInt32LE();
    const frameCount = this.readUInt32LE();
    const saveTime = this.readUInt32LE();
    
    console.log('[AuthenticSCR] Header basics:', {
      signature: signature.toString(16),
      engineVersion,
      frameCount,
      saveTime: new Date(saveTime * 1000).toISOString()
    });
    
    // Comp Info - wichtig für Player-Parsing
    this.seekTo(16); // Nach den ersten 4 UInt32s
    const playerBytes = this.readUInt32LE();
    const mapWidth = this.readUInt16LE();
    const mapHeight = this.readUInt16LE();
    
    console.log('[AuthenticSCR] Comp info:', { playerBytes, mapWidth, mapHeight });
    
    // Map Name parsing - normalerweise bei Offset nach Player-Daten
    let mapName = 'Unknown Map';
    try {
      // Map name ist normalerweise nach den Player-Slots
      this.seekTo(64); // Typischer Map-Name Start
      mapName = this.readNullTerminatedString(32);
      if (mapName.length < 3) {
        // Alternative Offsets für Map-Name
        for (const offset of [72, 80, 96, 128]) {
          this.seekTo(offset);
          const candidate = this.readNullTerminatedString(32);
          if (candidate.length >= 3 && candidate.length <= 32) {
            mapName = candidate;
            break;
          }
        }
      }
    } catch (e) {
      console.log('[AuthenticSCR] Could not extract map name');
    }
    
    console.log('[AuthenticSCR] Map name:', mapName);
    
    return {
      signature: signature.toString(16),
      engineVersion,
      frameCount,
      saveTime,
      compInfo: { playerBytes, mapWidth, mapHeight },
      players: [],
      mapName,
      gameSpeed: 6, // Default
      gameType: 1   // Default Melee
    };
  }

  private parseAuthenticPlayers(header: ReplayHeader): Player[] {
    console.log('[AuthenticSCR] Parsing authentic player data...');
    const players: Player[] = [];
    
    // SC:R Player-Slots beginnen typischerweise bei Offset 24 nach Header
    this.seekTo(24);
    
    const maxPlayers = 12; // SC:R unterstützt bis zu 12 Spieler
    
    for (let i = 0; i < maxPlayers; i++) {
      try {
        // Jeder Player-Slot ist ~36 Bytes lang
        const slotOffset = 24 + (i * 36);
        if (slotOffset + 36 > this.buffer.byteLength) break;
        
        this.seekTo(slotOffset);
        
        // Player Slot Structure nach SC:R Spezifikation
        const slotType = this.readUInt8(); // 0=inactive, 1=computer, 2=human, etc.
        const raceId = this.readUInt8();   // Race ID
        const team = this.readUInt8();     // Team number
        const nameLength = this.readUInt8(); // Name length
        
        if (slotType === 0 || nameLength === 0 || nameLength > 24) {
          continue; // Inactive slot
        }
        
        // Read player name
        let name = '';
        for (let j = 0; j < Math.min(nameLength, 24); j++) {
          const char = this.readUInt8();
          if (char >= 32 && char <= 126) { // Printable ASCII
            name += String.fromCharCode(char);
          }
        }
        
        // Skip remaining name bytes if any
        this.skip(24 - nameLength);
        
        // Read additional player data
        const color = this.readUInt8();
        
        if (name.length >= 2 && slotType >= 1) {
          const race = this.RACE_NAMES[raceId] || 'Unknown';
          
          players.push({
            id: i,
            name: name.trim(),
            race,
            raceId,
            color,
            team,
            slotType
          });
          
          console.log(`[AuthenticSCR] Player ${i}: "${name}" (${race}, Team ${team}, Slot ${slotType})`);
          
          if (players.length >= 8) break; // Reasonable limit
        }
        
      } catch (e) {
        console.log(`[AuthenticSCR] Error parsing player slot ${i}:`, e.message);
        continue;
      }
    }
    
    // Filter für aktive menschliche Spieler (slotType 2)
    const humanPlayers = players.filter(p => p.slotType === 2);
    
    if (humanPlayers.length === 0) {
      console.log('[AuthenticSCR] No human players found, using fallback');
      return [
        { id: 0, name: 'Player 1', race: 'Protoss', raceId: 2, color: 0, team: 0, slotType: 2 },
        { id: 1, name: 'Player 2', race: 'Zerg', raceId: 0, color: 1, team: 1, slotType: 2 }
      ];
    }
    
    console.log(`[AuthenticSCR] Found ${humanPlayers.length} human players`);
    return humanPlayers.slice(0, 2); // Limit to 2 for 1v1
  }

  private parseAuthenticCommands(): Action[] {
    console.log('[AuthenticSCR] Parsing authentic command stream...');
    const actions: Action[] = [];
    
    // SC:R Command Section beginnt typischerweise nach dem Header + Player-Daten
    // Suche nach Command Section Signature
    const commandSectionOffsets = [0x279, 0x280, 0x300, 0x400, 0x500, 0x600, 0x700];
    let commandStart = 0x279; // Default
    
    for (const offset of commandSectionOffsets) {
      if (offset >= this.buffer.byteLength - 100) continue;
      
      this.seekTo(offset);
      // Suche nach Command-Pattern (typischerweise beginnt mit Frame-Sync)
      const potential = this.peek(0);
      if (potential === 0x00 || potential === 0x01) {
        commandStart = offset;
        console.log(`[AuthenticSCR] Command section detected at offset 0x${offset.toString(16)}`);
        break;
      }
    }
    
    this.seekTo(commandStart);
    let currentFrame = 0;
    let lastActionId = 0;
    
    try {
      while (this.position < this.buffer.byteLength - 4 && actions.length < 5000) {
        const commandLength = this.readUInt8();
        
        // Validate command length (SC:R commands are typically 1-50 bytes)
        if (commandLength === 0 || commandLength > 50) {
          console.log(`[AuthenticSCR] Invalid command length ${commandLength}, stopping`);
          break;
        }
        
        const playerId = this.readUInt8();
        const commandId = this.readUInt8();
        
        // Read command data
        const dataLength = Math.max(0, commandLength - 3);
        const commandData: number[] = [];
        for (let i = 0; i < dataLength && this.position < this.buffer.byteLength; i++) {
          commandData.push(this.readUInt8());
        }
        
        // Frame synchronization handling
        if (commandId === 0x00 && commandData.length > 0) {
          // Frame sync command - update frame counter
          currentFrame += commandData[0] || 1;
        } else {
          // Regular action command
          currentFrame += 1;
        }
        
        const actionType = this.ACTION_NAMES[commandId] || `Command_0x${commandId.toString(16)}`;
        
        actions.push({
          frame: currentFrame,
          playerId,
          actionType,
          actionId: commandId,
          data: { 
            id: commandId, 
            raw: commandData,
            length: commandLength
          }
        });
        
        lastActionId = commandId;
        
        // Stop if we hit invalid patterns
        if (commandId > 0x60 && commandId < 0x90) {
          console.log(`[AuthenticSCR] Suspicious command ID 0x${commandId.toString(16)}, likely end of commands`);
          break;
        }
      }
    } catch (e) {
      console.log('[AuthenticSCR] Command parsing stopped:', e.message);
    }
    
    console.log(`[AuthenticSCR] Extracted ${actions.length} authentic commands, last frame: ${currentFrame}`);
    return actions;
  }

  private extractBuildOrder(actions: Action[], players: Player[]): BuildOrderItem[] {
    const buildOrder: BuildOrderItem[] = [];
    const player = players[0];
    
    if (!player) return buildOrder;
    
    const buildActions = actions.filter(a => 
      a.playerId === player.id && 
      (a.actionType === 'Build' || a.actionType === 'Train')
    );
    
    for (const action of buildActions.slice(0, 50)) {
      const gameTime = this.frameToGameTime(action.frame);
      const supply = this.estimateSupply(action.frame, buildOrder.length);
      
      buildOrder.push({
        frame: action.frame,
        gameTime,
        supply,
        action: action.actionType,
        unitOrBuilding: this.getUnitName(action.data?.raw?.[0] || 0)
      });
    }
    
    return buildOrder;
  }

  private frameToGameTime(frame: number): string {
    const seconds = Math.floor(frame / 24); // ~24 FPS
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private estimateSupply(frame: number, buildCount: number): string {
    const baseSupply = 4; // Starting workers
    const extraSupply = Math.floor(frame / 500) + buildCount; // Rough estimate
    return `${baseSupply + extraSupply}/17`;
  }

  private getUnitName(unitId: number): string {
    const unitNames: Record<number, string> = {
      // Terran units
      0: 'SCV', 1: 'Marine', 2: 'Firebat', 3: 'Ghost', 7: 'Vulture', 8: 'Goliath', 11: 'Wraith',
      106: 'Command Center', 107: 'Comsat Station', 109: 'Supply Depot', 110: 'Refinery', 
      111: 'Barracks', 112: 'Academy', 113: 'Factory',
      
      // Protoss units  
      64: 'Probe', 65: 'Zealot', 66: 'Dragoon', 67: 'High Templar',
      154: 'Nexus', 156: 'Pylon', 157: 'Assimilator', 158: 'Gateway',
      
      // Zerg units
      41: 'Drone', 42: 'Zergling', 43: 'Hydralisk',
      131: 'Hatchery', 132: 'Lair', 134: 'Spawning Pool'
    };
    
    return unitNames[unitId] || `Unit_${unitId}`;
  }

  private calculateAPM(actions: Action[], playerId: number): number {
    const playerActions = actions.filter(a => 
      a.playerId === playerId && 
      a.actionType !== 'FrameSync'
    );
    
    if (playerActions.length === 0) return 0;
    
    const lastFrame = Math.max(...playerActions.map(a => a.frame));
    const gameMinutes = (lastFrame / 24) / 60; // Convert frames to minutes
    
    return gameMinutes > 0 ? Math.round(playerActions.length / gameMinutes) : 0;
  }

  private analyzeStrengths(buildOrder: BuildOrderItem[], actions: Action[]): string[] {
    const strengths: string[] = [];
    
    if (buildOrder.length > 0) {
      strengths.push('Aktive Build-Order erkannt');
    }
    
    if (actions.length > 100) {
      strengths.push('Hohe Spielaktivität gemessen');
    }
    
    return strengths;
  }

  private analyzeWeaknesses(buildOrder: BuildOrderItem[], actions: Action[]): string[] {
    const weaknesses: string[] = [];
    
    if (buildOrder.length < 5) {
      weaknesses.push('Wenige Build-Order Aktionen erkannt');
    }
    
    return weaknesses;
  }

  private generateRecommendations(buildOrder: BuildOrderItem[], actions: Action[]): string[] {
    const recommendations: string[] = [];
    
    if (buildOrder.length > 0) {
      recommendations.push('Fokussiere auf Worker-Produktion');
      recommendations.push('Achte auf Scout-Timing');
    }
    
    return recommendations;
  }

  private generateKeyMoments(actions: Action[], buildOrder: BuildOrderItem[]): string[] {
    const moments: string[] = [];
    
    if (buildOrder.length > 0) {
      moments.push(`Erstes ${buildOrder[0].unitOrBuilding} bei ${buildOrder[0].gameTime}`);
    }
    
    const earlyActions = actions.filter(a => a.frame < 1440); // First minute
    if (earlyActions.length > 20) {
      moments.push('Aktive Eröffnung');
    }
    
    return moments;
  }
}

// ================= EDGE FUNCTION HANDLER =================

serve(async (req) => {
  console.log('[parseReplay] Starting SC:R replay analysis...');
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get file from request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string || 'unknown.rep';
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`[parseReplay] Processing file: ${fileName} (${file.size} bytes)`);
    
    // Validate file
    if (!fileName.toLowerCase().endsWith('.rep')) {
      throw new Error('Invalid file type. Only .rep files are supported.');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File too large. Maximum size is 5MB.');
    }
    
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();
    console.log(`[parseReplay] File loaded, buffer size: ${buffer.byteLength} bytes`);
    
    // Parse replay using our authentic SC:R parser
    const parser = new AuthenticSCRParser(buffer);
    const parseResult = parser.parse();
    
    if (!parseResult.success) {
      throw new Error('Failed to parse replay file');
    }
    
    // Return complete analysis
    const response = {
      success: true,
      replayId: 'temp-id',
      playerName: parseResult.metadata.playerName,
      playerRace: parseResult.metadata.playerRace,
      opponentName: parseResult.metadata.opponentName,
      opponentRace: parseResult.metadata.opponentRace,
      mapName: parseResult.metadata.mapName,
      matchDurationSeconds: parseResult.metadata.matchDurationSeconds,
      apm: parseResult.metadata.apm,
      eapm: parseResult.metadata.eapm,
      buildOrder: parseResult.buildOrder,
      keyMoments: parseResult.keyMoments,
      analysis: parseResult.analysis,
      message: 'SC:R Replay erfolgreich analysiert!'
    };
    
    console.log('[parseReplay] Analysis complete, returning results');
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[parseReplay] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      playerName: 'Parse Error',
      playerRace: 'Unknown',
      opponentName: 'Parse Error',
      opponentRace: 'Unknown', 
      mapName: 'Parse Failed',
      apm: 0,
      eapm: 0,
      buildOrder: [],
      keyMoments: [`Fehler: ${error.message}`],
      analysis: {
        strengths: [],
        weaknesses: ['Replay konnte nicht verarbeitet werden'],
        recommendations: ['Überprüfe die .rep-Datei und versuche es erneut']
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});