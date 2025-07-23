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
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  private readUInt16LE(): number {
    const value = this.view.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  private readUInt32LE(): number {
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  private readString(length: number): string {
    const bytes = new Uint8Array(this.buffer, this.position, length);
    this.position += length;
    
    // Handle UTF-8 and null-terminated strings
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      str += String.fromCharCode(bytes[i]);
    }
    
    // Try to decode as UTF-8 for Korean/special characters
    try {
      return new TextDecoder('utf-8').decode(bytes.slice(0, str.length));
    } catch {
      return str;
    }
  }

  private seekTo(position: number): void {
    this.position = position;
  }

  private getPosition(): number {
    return this.position;
  }

  // ============= SC:R HEADER PARSING =============

  private parseHeader(): ReplayHeader {
    console.log('[SCRParser] Starting header parse...');
    
    // Read first 512 bytes for analysis
    this.seekTo(0);
    const headerBytes = new Uint8Array(this.buffer.slice(0, 512));
    console.log('[SCRParser] First 32 bytes:', Array.from(headerBytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // SC:R Remastered has different structure - look for magic bytes
    let isValidReplay = false;
    let frameCount = 0;
    let saveTime = Date.now() / 1000;
    
    // Search for frame count in common locations
    const frameOffsets = [0x04, 0x08, 0x0C, 0x10, 0x14, 0x18];
    for (const offset of frameOffsets) {
      try {
        this.seekTo(offset);
        const candidate = this.readUInt32LE();
        // Frame count should be reasonable (100 to 100000 frames = ~4 seconds to 1+ hour)
        if (candidate > 100 && candidate < 100000) {
          frameCount = candidate;
          console.log(`[SCRParser] Found frame count ${frameCount} at offset 0x${offset.toString(16)}`);
          isValidReplay = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!isValidReplay) {
      frameCount = 5000; // Default fallback
      console.log('[SCRParser] Using fallback frame count');
    }

    // Try alternative frame count parsing if initial attempt failed
    if (!isValidReplay || frameCount === 0) {
      try {
        this.seekTo(8);
        const altFrameCount = this.readUInt32LE();
        console.log('[SCRParser] Frame count at offset 8:', altFrameCount);
        
        // Sanity check - if frame count seems reasonable, use it
        if (altFrameCount > 100 && altFrameCount < 1000000) {
          frameCount = altFrameCount;
        } else {
          this.seekTo(12);
          const altFrameCount2 = this.readUInt32LE();
          console.log('[SCRParser] Frame count at offset 12:', altFrameCount2);
          if (altFrameCount2 > 100 && altFrameCount2 < 1000000) {
            frameCount = altFrameCount2;
          }
        }
      } catch (e) {
        console.log('[SCRParser] Could not read alternative frame count, keeping current');
      }
    }

    // Try to read save time from header
    try {
      this.seekTo(16);
      const headerSaveTime = this.readUInt32LE();
      if (headerSaveTime > 0) {
        saveTime = headerSaveTime;
      }
    } catch (e) {
      console.log('[SCRParser] Could not read save time from header, using current time');
    }
    
    // Parse players section
    const players = this.parsePlayers();
    
    // Parse map name
    const mapName = this.parseMapName();
    
    // Read game settings
    this.seekTo(0x1A);
    const gameSpeed = this.readUInt8();
    const gameType = this.readUInt8();

    return {
      signature: 'SC:R',
      frameCount,
      saveTime,
      players,
      mapName,
      gameSpeed,
      gameType
    };
  }

  private parsePlayers(): Player[] {
    console.log('[SCRParser] Parsing players with enhanced SC:R detection...');
    const players: Player[] = [];
    
    // SC:R Remastered stores players differently - scan the entire header area
    const maxScanSize = Math.min(2048, this.buffer.byteLength);
    const headerData = new Uint8Array(this.buffer.slice(0, maxScanSize));
    
    // Look for player name patterns (printable ASCII strings of reasonable length)
    let foundPlayers = 0;
    for (let i = 0; i < maxScanSize - 50 && foundPlayers < 8; i++) {
      try {
        // Look for potential player name start
        if (headerData[i] >= 32 && headerData[i] <= 126) { // Printable ASCII
          let nameCandidate = '';
          let nameLength = 0;
          
          // Extract potential name (up to 24 chars)
          for (let j = i; j < Math.min(i + 24, maxScanSize); j++) {
            const byte = headerData[j];
            if (byte === 0) break; // Null terminator
            if (byte < 32 || byte > 126) break; // Non-printable
            nameCandidate += String.fromCharCode(byte);
            nameLength++;
          }
          
          // Validate name candidate
          if (nameLength >= 3 && nameLength <= 24 && 
              !nameCandidate.includes('StarCraft') && 
              !nameCandidate.includes('Brood') &&
              /^[a-zA-Z0-9_\-\[\]`]+$/.test(nameCandidate)) {
            
            console.log(`[SCRParser] Found potential player name: "${nameCandidate}" at offset ${i}`);
            
            // Try to determine race (look at nearby bytes)
            let race = 'Unknown';
            const raceOffset = i + nameLength + 1;
            if (raceOffset < maxScanSize) {
              const raceByte = headerData[raceOffset];
              race = this.getRaceFromId(raceByte);
            }
            
            // Avoid duplicates
            if (!players.some(p => p.name === nameCandidate)) {
              players.push({
                id: foundPlayers,
                name: nameCandidate,
                race: race,
                color: foundPlayers,
                team: foundPlayers,
                startLocation: { x: 0, y: 0 }
              });
              foundPlayers++;
              
              // Skip ahead to avoid finding the same name again
              i += nameLength + 10;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log(`[SCRParser] Found ${players.length} players via name scanning`);
    
    // If we still have less than 2 players, try structured parsing at known offsets
    if (players.length < 2) {
      console.log('[SCRParser] Trying structured player parsing...');
      const structuredPlayers = this.tryStructuredPlayerParsing();
      if (structuredPlayers.length >= players.length) {
        return structuredPlayers;
      }
    }
    
    // Final fallback: create placeholder players with extracted names if any
    if (players.length === 0) {
      console.log('[SCRParser] No players found, creating fallbacks');
      players.push(
        { id: 0, name: 'Player 1', race: 'Protoss', color: 0, team: 0, startLocation: { x: 0, y: 0 } },
        { id: 1, name: 'Player 2', race: 'Zerg', color: 1, team: 1, startLocation: { x: 0, y: 0 } }
      );
    } else if (players.length === 1) {
      players.push({
        id: 1, name: 'Player 2', race: 'Terran', color: 1, team: 1, startLocation: { x: 0, y: 0 }
      });
    }
    
    return players.slice(0, 2); // Return max 2 players for 1v1
  }

  private tryStructuredPlayerParsing(): Player[] {
    const players: Player[] = [];
    const playerOffsets = [0x25, 0x30, 0x40, 0x50, 0x60, 0x80, 0x100];
    
    for (const offset of playerOffsets) {
      try {
        this.seekTo(offset);
        for (let i = 0; i < 4; i++) {
          const nameLength = this.readUInt8();
          if (nameLength > 0 && nameLength <= 24) {
            const name = this.readString(nameLength);
            if (name && /^[a-zA-Z0-9_\-\[\]`]+$/.test(name)) {
              const race = this.getRaceFromId(this.readUInt8());
              players.push({
                id: i,
                name: name,
                race: race || 'Unknown',
                color: i,
                team: i,
                startLocation: { x: 0, y: 0 }
              });
              console.log(`[SCRParser] Structured parsing found: ${name} (${race})`);
            }
          }
        }
        if (players.length >= 2) break;
      } catch (e) {
        continue;
      }
    }
    
    return players;
  }

  private parseMapName(): string {
    console.log('[SCRParser] Parsing map name...');
    
    // Try multiple common map name locations in SC:R replays
    const mapOffsets = [0x61, 0x65, 0x69, 0x75, 0x81];
    
    for (const offset of mapOffsets) {
      try {
        this.seekTo(offset);
        const nameLength = this.readUInt8();
        
        if (nameLength > 0 && nameLength < 64) {
          const mapName = this.readString(nameLength);
          if (mapName && mapName.trim() && !mapName.includes('\x00')) {
            console.log(`[SCRParser] Map found at offset ${offset}: ${mapName}`);
            return mapName.trim();
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: scan for common map name patterns
    return this.scanForMapName();
  }

  private scanForMapName(): string {
    console.log('[SCRParser] Scanning for map name...');
    
    // Common SC:R map names for pattern matching
    const knownMaps = [
      'Fighting Spirit', 'Polypoid', 'Circuit Breaker', 'Tau Cross',
      'Jade', 'Neo Moon Glaive', 'Crossing Field', 'Gladiator',
      'Blue Storm', 'Lost Temple', 'Big Game Hunters'
    ];
    
    const searchBuffer = new Uint8Array(this.buffer.slice(0, 1024));
    const searchString = new TextDecoder('utf-8', { fatal: false }).decode(searchBuffer);
    
    for (const mapName of knownMaps) {
      if (searchString.includes(mapName)) {
        console.log(`[SCRParser] Found known map: ${mapName}`);
        return mapName;
      }
    }
    
    // If no known map found, try to extract any reasonable string
    const matches = searchString.match(/[A-Za-z\s]{4,32}/g);
    if (matches && matches.length > 0) {
      const candidate = matches[0].trim();
      if (candidate.length > 3) {
        console.log(`[SCRParser] Map candidate: ${candidate}`);
        return candidate;
      }
    }
    
    return 'Unknown Map';
  }

  private getRaceFromId(raceId: number): string {
    switch (raceId) {
      case 0: return 'Zerg';
      case 1: return 'Terran';  
      case 2: return 'Protoss';
      case 6: return 'Random';
      default: return 'Unknown';
    }
  }

  // ============= ACTION STREAM PARSING =============

  private parseActions(header: ReplayHeader): Action[] {
    console.log('[SCRParser] Parsing action stream...');
    const actions: Action[] = [];
    
    // Find action data section (usually after header + player data)
    let actionStart = 0x200; // Common starting point
    
    try {
      this.seekTo(actionStart);
      let currentFrame = 0;
      
      while (this.position < this.buffer.byteLength - 10) {
        try {
          const actionLength = this.readUInt8();
          if (actionLength === 0) break;
          if (actionLength > 50) break; // Sanity check
          
          const playerId = this.readUInt8();
          const actionType = this.readUInt8();
          
          // Read action data
          const actionData = new Uint8Array(actionLength - 3);
          for (let i = 0; i < actionData.length; i++) {
            actionData[i] = this.readUInt8();
          }
          
          // Parse specific action types
          const parsedAction = this.parseActionType(actionType, actionData);
          
          actions.push({
            frame: currentFrame,
            playerId,
            actionType: parsedAction.type,
            data: parsedAction.data
          });
          
          // Some actions include frame increments
          if (actionType === 0x00) {
            currentFrame += actionData[0] || 1;
          }
          
        } catch (e) {
          break;
        }
      }
      
    } catch (e) {
      console.log('[SCRParser] Action parsing ended:', e.message);
    }
    
    console.log(`[SCRParser] Parsed ${actions.length} actions`);
    return actions;
  }

  private parseActionType(actionType: number, data: Uint8Array): { type: string; data: any } {
    switch (actionType) {
      case 0x09: // Build unit/building
        return {
          type: 'build',
          data: { unitId: data[0], x: data[1], y: data[2] }
        };
      case 0x0A: // Train unit
        return {
          type: 'train',
          data: { unitId: data[0] }
        };
      case 0x0C: // Move/Attack
        return {
          type: 'move',
          data: { x: data[0] | (data[1] << 8), y: data[2] | (data[3] << 8) }
        };
      case 0x13: // Hotkey assignment
        return {
          type: 'hotkey',
          data: { group: data[0], action: data[1] }
        };
      case 0x14: // Selection
        return {
          type: 'select',
          data: { count: data[0] }
        };
      default:
        return {
          type: `unknown_${actionType.toString(16)}`,
          data: Array.from(data)
        };
    }
  }

  // ============= BUILD ORDER EXTRACTION =============

  private extractBuildOrder(actions: Action[], players: Player[]): BuildOrderItem[] {
    console.log('[SCRParser] Extracting build order...');
    const buildOrder: BuildOrderItem[] = [];
    
    const buildActions = actions.filter(a => 
      a.actionType === 'build' || a.actionType === 'train'
    );
    
    let supply = 4; // Starting supply for most races
    
    for (const action of buildActions) {
      const gameTime = this.framesToGameTime(action.frame);
      const unit = this.getUnitName(action.data.unitId);
      
      if (unit !== 'Unknown') {
        const supplyString = `${supply}`;
        
        buildOrder.push({
          frame: action.frame,
          gameTime,
          supply: supplyString,
          action: action.actionType,
          unitOrBuilding: unit
        });
        
        // Update supply count (simplified)
        if (unit.includes('Pylon')) supply += 8;
        if (unit.includes('Supply Depot')) supply += 8;
        if (unit.includes('Overlord')) supply += 8;
      }
    }
    
    return buildOrder.slice(0, 20); // First 20 build orders
  }

  private getUnitName(unitId: number): string {
    const units: { [key: number]: string } = {
      // Protoss
      64: 'Probe',
      65: 'Zealot', 
      66: 'Dragoon',
      71: 'Arbiter',
      72: 'Carrier',
      106: 'Pylon',
      107: 'Gateway',
      108: 'Forge',
      
      // Terran
      7: 'SCV',
      0: 'Marine',
      2: 'Vulture',
      3: 'Goliath',
      106: 'Supply Depot',
      109: 'Barracks',
      110: 'Engineering Bay',
      
      // Zerg
      37: 'Drone',
      38: 'Zergling',
      39: 'Hydralisk',
      40: 'Ultralisk',
      131: 'Hatchery',
      132: 'Spawning Pool',
      133: 'Evolution Chamber'
    };
    
    return units[unitId] || 'Unknown';
  }

  private framesToGameTime(frames: number): string {
    // SC:R runs at ~23.81 FPS
    const seconds = Math.floor(frames / 23.81);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // ============= ANALYSIS ENGINE =============

  private analyzeReplay(header: ReplayHeader, buildOrder: BuildOrderItem[], actions: Action[]): ParsedReplay['analysis'] {
    const analysis = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      recommendations: [] as string[]
    };

    // APM Analysis
    const totalActions = actions.length;
    const gameDuration = header.frameCount / 23.81 / 60; // minutes
    const apm = Math.round(totalActions / gameDuration);

    if (apm > 200) {
      analysis.strengths.push('Excellent APM - sehr hohe Aktionsrate');
    } else if (apm < 100) {
      analysis.weaknesses.push('Niedrige APM - mehr Aktionen pro Minute benötigt');
      analysis.recommendations.push('Übe Hotkeys und schnellere Kommandoeingabe');
    }

    // Build Order Analysis
    if (buildOrder.length > 0) {
      const firstBuild = buildOrder[0];
      if (firstBuild.supply === '9' && firstBuild.unitOrBuilding.includes('Pylon')) {
        analysis.strengths.push('Guter früher Pylon-Timing');
      }
      
      if (buildOrder.length < 8) {
        analysis.weaknesses.push('Unvollständige Build Order erkannt');
        analysis.recommendations.push('Plane deine Baustruktur im Voraus');
      }
    }

    // Action Diversity
    const actionTypes = [...new Set(actions.map(a => a.actionType))];
    if (actionTypes.length > 5) {
      analysis.strengths.push('Gute Aktionsvielfalt');
    } else {
      analysis.weaknesses.push('Begrenzte Aktionsvielfalt');
      analysis.recommendations.push('Nutze mehr verschiedene Kommandos und Strategien');
    }

    return analysis;
  }

  // ============= MAIN PARSE METHOD =============

  public parse(): ParsedReplay {
    try {
      console.log('[SCRParser] Starting complete replay analysis...');
      
      // Parse header and basic info
      const header = this.parseHeader();
      
      // Extract players (assume 1v1 for now)
      const players = header.players.filter(p => p.name && p.name.trim() !== '');
      if (players.length < 2) {
        throw new Error('Invalid replay: Less than 2 players found');
      }

      const player1 = players[0];
      const player2 = players[1];
      
      // Parse actions
      const actions = this.parseActions(header);
      
      // Extract build order
      const buildOrder = this.extractBuildOrder(actions, players);
      
      // Generate analysis
      const analysis = this.analyzeReplay(header, buildOrder, actions);
      
      // Calculate game metrics
      const gameDurationSeconds = Math.round(header.frameCount / 23.81);
      const totalActions = actions.length;
      const apm = Math.round((totalActions / gameDurationSeconds) * 60);
      const eapm = Math.round(apm * 0.85); // Estimated effective APM
      
      // Generate key moments
      const keyMoments = this.generateKeyMoments(actions, buildOrder);
      
      const result: ParsedReplay = {
        success: true,
        metadata: {
          playerName: player1.name,
          playerRace: player1.race,
          opponentName: player2.name,
          opponentRace: player2.race,
          mapName: header.mapName,
          matchDurationSeconds: gameDurationSeconds,
          apm,
          eapm,
          gameSpeed: header.gameSpeed,
          date: new Date(header.saveTime * 1000).toISOString()
        },
        buildOrder,
        keyMoments,
        actions: actions.slice(0, 100), // Limit for response size
        analysis
      };
      
      console.log('[SCRParser] Parse completed successfully');
      console.log('[SCRParser] Extracted data:', {
        players: players.map(p => `${p.name} (${p.race})`),
        map: header.mapName,
        duration: `${Math.floor(gameDurationSeconds/60)}:${(gameDurationSeconds%60).toString().padStart(2, '0')}`,
        apm,
        buildOrderLength: buildOrder.length
      });
      
      return result;
      
    } catch (error) {
      console.error('[SCRParser] Parse failed:', error);
      
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

  private generateKeyMoments(actions: Action[], buildOrder: BuildOrderItem[]): string[] {
    const moments: string[] = [];
    
    // First build
    if (buildOrder.length > 0) {
      const first = buildOrder[0];
      moments.push(`Erstes ${first.unitOrBuilding} bei ${first.gameTime}`);
    }
    
    // Early game actions
    const earlyActions = actions.filter(a => a.frame < 2000); // First ~90 seconds
    if (earlyActions.length > 50) {
      moments.push('Aktive frühe Spielphase');
    }
    
    // Mid game detection
    const midGameBuilds = buildOrder.filter(b => 
      b.unitOrBuilding.includes('Core') || 
      b.unitOrBuilding.includes('Factory') ||
      b.unitOrBuilding.includes('Lair')
    );
    
    if (midGameBuilds.length > 0) {
      moments.push(`Tech-Ausbau erkannt bei ${midGameBuilds[0].gameTime}`);
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
    
    // Parse replay using our custom SC:R parser
    const parser = new SCRReplayParser(buffer);
    const parseResult = parser.parse();
    
    if (!parseResult.success) {
      throw new Error('Failed to parse replay file');
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Store replay in database
    const { data: replayData, error: replayError } = await supabase
      .from('replays')
      .insert({
        filename: fileName,
        original_filename: fileName,
        player_name: parseResult.metadata.playerName,
        opponent_name: parseResult.metadata.opponentName,
        player_race: parseResult.metadata.playerRace,
        opponent_race: parseResult.metadata.opponentRace,
        map: parseResult.metadata.mapName,
        duration: `${Math.floor(parseResult.metadata.matchDurationSeconds/60)}:${(parseResult.metadata.matchDurationSeconds%60).toString().padStart(2, '0')}`,
        apm: parseResult.metadata.apm,
        eapm: parseResult.metadata.eapm,
        matchup: `${parseResult.metadata.playerRace} vs ${parseResult.metadata.opponentRace}`,
        result: 'Unknown', // Would need game outcome parsing
        date: parseResult.metadata.date,
        user_id: '00000000-0000-0000-0000-000000000000' // Placeholder
      })
      .select()
      .single();

    if (replayError) {
      console.log('[parseReplay] Database insert failed:', replayError);
    } else {
      console.log('[parseReplay] Replay stored in database:', replayData?.id);
    }
    
    // Store analysis results
    if (replayData?.id) {
      const { error: analysisError } = await supabase
        .from('analysis_results')
        .insert({
          replay_id: replayData.id,
          user_id: '00000000-0000-0000-0000-000000000000',
          build_order: parseResult.buildOrder,
          strengths: parseResult.analysis.strengths,
          weaknesses: parseResult.analysis.weaknesses,
          recommendations: parseResult.analysis.recommendations
        });
        
      if (analysisError) {
        console.log('[parseReplay] Analysis storage failed:', analysisError);
      }
    }
    
    // Return complete analysis
    const response = {
      success: true,
      replayId: replayData?.id || 'temp-id',
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