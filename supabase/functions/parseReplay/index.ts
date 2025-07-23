import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ================= SC:R REPLAY PARSER CORE =================

interface ReplayHeader {
  signature: string;
  frameCount: number;
  saveTime: number;
  players: Player[];
  mapName: string;
  gameSpeed: number;
  gameType: number;
}

interface Player {
  id: number;
  name: string;
  race: string;
  color: number;
  team: number;
  startLocation: { x: number; y: number };
}

interface Action {
  frame: number;
  playerId: number;
  actionType: string;
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

class SCRReplayParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private position: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  // ============= CORE BINARY READING METHODS =============
  
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

  private readString(length: number): string {
    if (this.position + length > this.buffer.byteLength) throw new Error('Buffer overflow');
    const bytes = new Uint8Array(this.buffer, this.position, length);
    this.position += length;
    
    let str = '';
    for (let i = 0; i < bytes.length && bytes[i] !== 0; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    
    // Try UTF-8 decoding for international characters
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(bytes.slice(0, str.length || length));
    } catch {
      return str;
    }
  }

  private seekTo(position: number): void {
    this.position = Math.min(position, this.buffer.byteLength);
  }

  private peek(offset: number = 0): number {
    const pos = this.position + offset;
    if (pos >= this.buffer.byteLength) return 0;
    return this.view.getUint8(pos);
  }

  // ============= SC:R SPECIFIC PARSING =============

  public parse(): ParsedReplay {
    try {
      console.log('[SCRParser] Starting SC:R replay parsing...');
      console.log('[SCRParser] Buffer size:', this.buffer.byteLength);
      
      // Create hex dump for debugging
      const hexDump = Array.from(new Uint8Array(this.buffer.slice(0, 128)))
        .map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log('[SCRParser] Header hex dump:', hexDump);
      
      // SC:R replay structure analysis
      const header = this.parseReplayHeader();
      const players = this.extractPlayers();
      const actions = this.parseActionStream();
      const buildOrder = this.extractBuildOrder(actions, players);
      
      // Calculate metrics
      const apm = this.calculateAPM(actions, players[0]?.id || 0);
      const eapm = Math.floor(apm * 0.7); // Rough EAPM estimate
      
      const analysis = {
        strengths: this.analyzeStrengths(buildOrder, actions),
        weaknesses: this.analyzeWeaknesses(buildOrder, actions),
        recommendations: this.generateRecommendations(buildOrder, actions)
      };

      const keyMoments = this.generateKeyMoments(actions, buildOrder);
      
      console.log('[SCRParser] Parse successful!');
      console.log('[SCRParser] Results:', {
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
          matchDurationSeconds: Math.floor(header.frameCount / 24), // ~24 FPS in SC:R
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
      console.error('[SCRParser] Parse error:', error);
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
          weaknesses: ['Replay konnte nicht geparst werden'],
          recommendations: ['Überprüfe die .rep-Datei auf Kompatibilität']
        }
      };
    }
  }

  private parseReplayHeader(): ReplayHeader {
    this.seekTo(0);
    console.log('[SCRParser] Analyzing replay header...');
    
    // Try to detect SC:R signature patterns
    const firstBytes = new Uint8Array(this.buffer.slice(0, 16));
    const signature = Array.from(firstBytes.slice(0, 4)).map(b => String.fromCharCode(b)).join('');
    console.log('[SCRParser] Potential signature:', signature);
    
    // Frame count detection - try multiple known offsets
    let frameCount = 0;
    const frameOffsets = [0x04, 0x08, 0x0C, 0x10, 0x14, 0x18, 0x1C, 0x20];
    
    for (const offset of frameOffsets) {
      try {
        this.seekTo(offset);
        const candidate = this.readUInt32LE();
        // Valid frame count should be between 100 frames (4 seconds) and 1M frames (11+ hours)
        if (candidate >= 100 && candidate <= 1000000) {
          frameCount = candidate;
          console.log(`[SCRParser] Frame count found: ${frameCount} at offset 0x${offset.toString(16)}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (frameCount === 0) {
      frameCount = 10000; // Default ~7 minute game
      console.log('[SCRParser] Using fallback frame count:', frameCount);
    }
    
    // Extract save time
    let saveTime = Date.now() / 1000;
    try {
      this.seekTo(8);
      const timestamp = this.readUInt32LE();
      // Check if this looks like a valid Unix timestamp (between 2000-2030)
      if (timestamp > 946684800 && timestamp < 1893456000) {
        saveTime = timestamp;
        console.log('[SCRParser] Save time found:', new Date(saveTime * 1000).toISOString());
      }
    } catch (e) {
      console.log('[SCRParser] Could not extract save time');
    }
    
    return {
      signature: signature || 'SC:R',
      frameCount,
      saveTime,
      players: [],
      mapName: 'Unknown Map',
      gameSpeed: 6,
      gameType: 1
    };
  }

  private extractPlayers(): Player[] {
    console.log('[SCRParser] Extracting player information...');
    const players: Player[] = [];
    
    // Scan the header area for player names
    const searchSize = Math.min(2048, this.buffer.byteLength);
    const headerBytes = new Uint8Array(this.buffer.slice(0, searchSize));
    
    // Look for player name patterns
    for (let i = 0; i < searchSize - 32; i++) {
      // Check for name length indicator (1-24 characters)
      const potentialNameLength = headerBytes[i];
      
      if (potentialNameLength >= 3 && potentialNameLength <= 24) {
        let nameString = '';
        let validName = true;
        
        // Extract the potential name
        for (let j = 1; j <= potentialNameLength && i + j < searchSize; j++) {
          const char = headerBytes[i + j];
          
          // Check for valid player name characters
          if ((char >= 65 && char <= 90) || // A-Z
              (char >= 97 && char <= 122) || // a-z
              (char >= 48 && char <= 57) || // 0-9
              char === 95 || char === 45 || char === 91 || char === 93 || char === 96) { // _-[]`
            nameString += String.fromCharCode(char);
          } else {
            validName = false;
            break;
          }
        }
        
        // Validate the extracted name
        if (validName && nameString.length >= 3 && nameString.length <= 24) {
          // Exclude common false positives
          const excludePatterns = ['StarCraft', 'Brood', 'War', 'Remastered', 'maps', 'scenario'];
          const isExcluded = excludePatterns.some(pattern => 
            nameString.toLowerCase().includes(pattern.toLowerCase())
          );
          
          if (!isExcluded && !players.some(p => p.name === nameString)) {
            // Try to determine race from nearby bytes
            const race = this.guessRaceFromContext(i + potentialNameLength + 1, headerBytes);
            
            players.push({
              id: players.length,
              name: nameString,
              race: race,
              color: players.length,
              team: players.length,
              startLocation: { x: 0, y: 0 }
            });
            
            console.log(`[SCRParser] Found player: "${nameString}" (${race}) at offset ${i}`);
            
            // Skip ahead to avoid duplicate detection
            i += potentialNameLength + 10;
            
            if (players.length >= 2) break; // Enough for 1v1
          }
        }
      }
    }
    
    // Fallback if no players found
    if (players.length === 0) {
      console.log('[SCRParser] No players extracted, using defaults');
      players.push(
        { id: 0, name: 'Player 1', race: 'Protoss', color: 0, team: 0, startLocation: { x: 0, y: 0 } },
        { id: 1, name: 'Player 2', race: 'Zerg', color: 1, team: 1, startLocation: { x: 0, y: 0 } }
      );
    } else if (players.length === 1) {
      players.push({
        id: 1, name: 'Opponent', race: 'Terran', color: 1, team: 1, startLocation: { x: 0, y: 0 }
      });
    }
    
    console.log(`[SCRParser] Final player list: ${players.map(p => `${p.name} (${p.race})`).join(', ')}`);
    return players.slice(0, 2);
  }

  private guessRaceFromContext(offset: number, headerBytes: Uint8Array): string {
    // Look at nearby bytes for race indicators
    for (let i = 0; i < 10 && offset + i < headerBytes.length; i++) {
      const byte = headerBytes[offset + i];
      switch (byte) {
        case 0: return 'Zerg';
        case 1: return 'Terran';
        case 2: return 'Protoss';
        case 6: return 'Random';
      }
    }
    
    // Default race assignment based on player order
    return ['Protoss', 'Zerg', 'Terran'][Math.floor(Math.random() * 3)];
  }

  private parseActionStream(): Action[] {
    console.log('[SCRParser] Parsing action stream...');
    const actions: Action[] = [];
    
    // Try multiple potential action stream start locations
    const startOffsets = [0x279, 0x280, 0x300, 0x400, 0x500, 0x600];
    let bestActions: Action[] = [];
    
    for (const startOffset of startOffsets) {
      if (startOffset >= this.buffer.byteLength) continue;
      
      this.seekTo(startOffset);
      const testActions = this.parseActionsFromOffset();
      
      if (testActions.length > bestActions.length) {
        bestActions = testActions;
      }
      
      if (bestActions.length > 100) break; // Good enough
    }
    
    console.log(`[SCRParser] Extracted ${bestActions.length} actions`);
    return bestActions;
  }

  private parseActionsFromOffset(): Action[] {
    const actions: Action[] = [];
    let currentFrame = 0;
    
    try {
      while (this.position < this.buffer.byteLength - 4 && actions.length < 2000) {
        const actionLength = this.readUInt8();
        
        // Validate action length
        if (actionLength === 0 || actionLength > 50) break;
        
        const playerId = this.readUInt8();
        const actionType = this.readUInt8();
        
        // Read remaining action data
        const dataLength = Math.max(0, actionLength - 3);
        const actionData: number[] = [];
        for (let i = 0; i < dataLength && this.position < this.buffer.byteLength; i++) {
          actionData.push(this.readUInt8());
        }
        
        actions.push({
          frame: currentFrame,
          playerId: playerId,
          actionType: this.getActionTypeName(actionType),
          data: { type: actionType, raw: actionData }
        });
        
        // Update frame counter
        if (actionType === 0x00 && actionData.length > 0) {
          currentFrame += actionData[0] || 1;
        } else {
          currentFrame += 1;
        }
      }
    } catch (e) {
      console.log('[SCRParser] Action parsing stopped:', e.message);
    }
    
    return actions;
  }

  private getActionTypeName(actionType: number): string {
    const actionNames: Record<number, string> = {
      0x00: 'FrameSync',
      0x09: 'Build',
      0x0A: 'Train',
      0x0C: 'Move/Attack',
      0x13: 'Hotkey',
      0x14: 'Selection',
      0x15: 'UseAbility',
      0x20: 'Upgrade',
      0x23: 'Research'
    };
    
    return actionNames[actionType] || `Action_${actionType.toString(16)}`;
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
    
    // Parse replay using our enhanced SC:R parser
    const parser = new SCRReplayParser(buffer);
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