
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced Binary Reader for StarCraft Replay parsing
class ReplayBinaryReader {
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

  canRead(bytes: number): boolean {
    return this.position + bytes <= this.length;
  }

  readUInt8(): number {
    if (!this.canRead(1)) throw new Error(`Cannot read UInt8 at position ${this.position}`);
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  readUInt16LE(): number {
    if (!this.canRead(2)) throw new Error(`Cannot read UInt16LE at position ${this.position}`);
    const value = this.view.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  readUInt32LE(): number {
    if (!this.canRead(4)) throw new Error(`Cannot read UInt32LE at position ${this.position}`);
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  readBytes(length: number): Uint8Array {
    if (!this.canRead(length)) throw new Error(`Cannot read ${length} bytes at position ${this.position}`);
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.position, length);
    this.position += length;
    return bytes;
  }

  readNullTerminatedString(maxLength: number): string {
    const bytes: number[] = [];
    for (let i = 0; i < maxLength && this.canRead(1); i++) {
      const byte = this.readUInt8();
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) {
        bytes.push(byte);
      }
    }
    return String.fromCharCode(...bytes);
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

// Command definitions for StarCraft
const COMMAND_TYPES = {
  0x09: 'Select',
  0x0A: 'Shift Select', 
  0x0B: 'Shift Deselect',
  0x0C: 'Build',
  0x0D: 'Vision',
  0x0E: 'Ally',
  0x13: 'Hotkey',
  0x14: 'Move',
  0x15: 'Attack',
  0x16: 'Cancel',
  0x17: 'Right Click',
  0x18: 'Stop',
  0x19: 'Return Cargo',
  0x1A: 'Train',
  0x1B: 'Cancel Train',
  0x1E: 'Unit Morph',
  0x22: 'Unsiege',
  0x23: 'Siege',
  0x2F: 'Tech',
  0x30: 'Cancel Tech',
  0x31: 'Upgrade',
  0x32: 'Cancel Upgrade',
  0x34: 'Building Morph',
  0x35: 'Stim',
  0x4B: 'Chat'
};

const UNIT_NAMES = {
  0: 'Marine', 1: 'Ghost', 2: 'Vulture', 3: 'Goliath', 4: 'Siege Tank',
  5: 'SCV', 6: 'Wraith', 7: 'Science Vessel', 8: 'Dropship', 9: 'Battlecruiser',
  10: 'Vulture Spider Mine', 11: 'Nuclear Missile', 12: 'Civilian', 13: 'Sarah Kerrigan',
  14: 'Alan Schezar', 15: 'Alan Schezar (Turret)', 16: 'Jim Raynor (Vulture)',
  17: 'Jim Raynor (Marine)', 18: 'Tom Kazansky', 19: 'Magellan', 20: 'Edmund Duke (Tank)',
  21: 'Edmund Duke (Siege Mode)', 22: 'Arcturus Mengsk', 23: 'Hyperion', 24: 'Norad II',
  25: 'Terran Siege Tank (Tank Mode)', 26: 'Firebat', 27: 'Scanner Sweep', 28: 'Medic',
  29: 'Larva', 30: 'Egg', 31: 'Zergling', 32: 'Hydralisk', 33: 'Ultralisk',
  34: 'Broodling', 35: 'Drone', 36: 'Overlord', 37: 'Mutalisk', 38: 'Guardian',
  39: 'Queen', 40: 'Defiler', 41: 'Scourge', 42: 'Torrasque', 43: 'Matriarch',
  44: 'Infested Terran', 45: 'Infested Kerrigan', 46: 'Unclean One', 47: 'Hunter Killer',
  48: 'Devouring One', 49: 'Kukulza (Mutalisk)', 50: 'Kukulza (Guardian)', 51: 'Yggdrasill',
  52: 'Valkyrie', 53: 'Cocoon', 54: 'Protoss Corsair', 55: 'Protoss Dark Templar',
  56: 'Devourer', 57: 'Protoss Dark Archon', 58: 'Protoss Probe', 59: 'Protoss Zealot',
  60: 'Protoss Dragoon', 61: 'Protoss High Templar', 62: 'Protoss Archon', 63: 'Protoss Shuttle',
  64: 'Protoss Scout', 65: 'Protoss Arbiter', 66: 'Protoss Carrier', 67: 'Protoss Interceptor',
  68: 'Dark Templar (Hero)', 69: 'Zeratul', 70: 'Tassadar/Zeratul', 71: 'Fenix (Zealot)',
  72: 'Fenix (Dragoon)', 73: 'Tassadar', 74: 'Mojo', 75: 'Warbringer', 76: 'Gantrithor',
  77: 'Reaver', 78: 'Observer', 79: 'Scarab', 80: 'Danimoth', 81: 'Aldaris',
  82: 'Artanis', 83: 'Rhynadon', 84: 'Bengalaas', 85: 'Cargo Ship', 86: 'Mercenary Gunship',
  87: 'Scantid', 88: 'Kakaru', 89: 'Ragnasaur', 90: 'Ursadon', 91: 'Lurker Egg',
  92: 'Raszagal', 93: 'Samir Duran', 94: 'Alexei Stukov', 95: 'Map Revealer',
  96: 'Gerard DuGalle', 97: 'Lurker', 98: 'Infested Duran', 99: 'Disruption Web',
  100: 'Command Center', 101: 'ComSat Station', 102: 'Nuclear Silo', 103: 'Supply Depot',
  104: 'Refinery', 105: 'Barracks', 106: 'Academy', 107: 'Factory', 108: 'Starport',
  109: 'Control Tower', 110: 'Science Facility', 111: 'Covert Ops', 112: 'Physics Lab',
  113: 'Machine Shop', 114: 'Repair Bay', 115: 'Engineering Bay', 116: 'Armory',
  117: 'Missile Turret', 118: 'Bunker', 119: 'Crashed Norad II', 120: 'Ion Cannon',
  121: 'Uraj Crystal', 122: 'Khalis Crystal', 123: 'Infested Command Center', 124: 'Hatchery',
  125: 'Lair', 126: 'Hive', 127: 'Nydus Canal', 128: 'Hydralisk Den', 129: 'Defiler Mound',
  130: 'Greater Spire', 131: 'Queens Nest', 132: 'Evolution Chamber', 133: 'Ultralisk Cavern',
  134: 'Spire', 135: 'Spawning Pool', 136: 'Creep Colony', 137: 'Spore Colony',
  138: 'Unused Zerg Building', 139: 'Sunken Colony', 140: 'Overmind (With Shell)',
  141: 'Overmind', 142: 'Extractor', 143: 'Mature Chrysalis', 144: 'Cerebrate',
  145: 'Cerebrate Daggoth', 146: 'Unused Zerg Building 5', 147: 'Nexus', 148: 'Robotics Facility',
  149: 'Pylon', 150: 'Assimilator', 151: 'Unused Protoss Building', 152: 'Observatory',
  153: 'Gateway', 154: 'Unused Protoss Building 2', 155: 'Photon Cannon', 156: 'Citadel of Adun',
  157: 'Cybernetics Core', 158: 'Templar Archives', 159: 'Forge', 160: 'Stargate',
  161: 'Fleet Beacon', 162: 'Arbiter Tribunal', 163: 'Robotics Support Bay', 164: 'Shield Battery'
};

// Enhanced header parser with proper binary reading
class ReplayHeaderParser {
  private reader: ReplayBinaryReader;

  constructor(reader: ReplayBinaryReader) {
    this.reader = reader;
  }

  parseHeader() {
    console.log('[HeaderParser] Parsing SC:R header with enhanced binary reading...');
    
    // Read replay signature
    this.reader.setPosition(0);
    const signature = this.reader.readBytes(4);
    const sigString = String.fromCharCode(...signature);
    console.log('[HeaderParser] Signature:', sigString);
    
    // Engine version (4 bytes at 0x04)
    this.reader.setPosition(0x04);
    const engineVersion = this.reader.readUInt32LE();
    console.log('[HeaderParser] Engine version:', engineVersion);
    
    // Game length in frames - try multiple offsets
    let frames = 0;
    const frameOffsets = [0x08, 0x0C, 0x10, 0x14, 0x18];
    for (const offset of frameOffsets) {
      try {
        this.reader.setPosition(offset);
        const testFrames = this.reader.readUInt32LE();
        // Valid frame count should be reasonable (1-60 minutes at 23.8 FPS)
        if (testFrames > 1000 && testFrames < 85000) {
          frames = testFrames;
          console.log(`[HeaderParser] Found frames at offset 0x${offset.toString(16)}: ${frames}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Enhanced map name detection
    const mapName = this.findMapName();
    console.log('[HeaderParser] Map name:', mapName);
    
    // Game type
    let gameType = 'Unknown';
    try {
      this.reader.setPosition(0x18);
      const gameTypeId = this.reader.readUInt16LE();
      gameType = this.getGameTypeName(gameTypeId);
    } catch (e) {
      console.warn('[HeaderParser] Could not read game type');
    }
    
    const duration = this.framesToDuration(frames);
    console.log('[HeaderParser] Duration:', duration);
    
    return {
      signature: sigString,
      engineVersion,
      frames,
      mapName,
      gameType,
      duration,
      durationSeconds: Math.floor(frames / 23.8)
    };
  }

  private findMapName(): string {
    // Enhanced map name search with better string validation
    const mapOffsets = [0x61, 0x65, 0x69, 0x6D, 0x75, 0x89, 0x95, 0xA5];
    
    for (const offset of mapOffsets) {
      try {
        this.reader.setPosition(offset);
        const name = this.reader.readNullTerminatedString(32);
        if (this.isValidMapName(name)) {
          return name.trim();
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: scan for map name pattern
    for (let pos = 0x40; pos < Math.min(0x200, this.reader.length - 32); pos += 2) {
      try {
        this.reader.setPosition(pos);
        const name = this.reader.readNullTerminatedString(32);
        if (this.isValidMapName(name) && name.length > 5) {
          return name.trim();
        }
      } catch (e) {
        continue;
      }
    }
    
    return 'Unknown Map';
  }

  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
    
    // Check for reasonable character distribution
    const printableChars = name.split('').filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126);
    const printableRatio = printableChars.length / name.length;
    
    return printableRatio >= 0.8 && /^[a-zA-Z0-9\s\-_.()]+$/.test(name.trim());
  }

  private framesToDuration(frames: number): string {
    const seconds = Math.floor(frames / 23.8); // SC:R runs at ~23.8 FPS
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private getGameTypeName(gameType: number): string {
    const gameTypes: Record<number, string> = {
      1: 'Melee',
      2: 'Free For All',
      3: 'One on One',
      8: 'Ladder',
      9: 'Use Map Settings',
      10: 'Team Melee',
      15: 'Top vs Bottom'
    };
    return gameTypes[gameType] || 'Unknown';
  }
}

// Enhanced player parser with better name extraction
class ReplayPlayerParser {
  private reader: ReplayBinaryReader;

  constructor(reader: ReplayBinaryReader) {
    this.reader = reader;
  }

  parsePlayers() {
    console.log('[PlayerParser] Parsing SC:R players with enhanced detection...');
    
    // Extended player offsets for different SC:R versions
    const playerOffsets = [
      0x161, 0x1A1, 0x1C1, 0x1B1, 0x19C, 0x18E, 
      0x181, 0x175, 0x169, 0x1D1, 0x1E1, 0x1F1,
      0x201, 0x211, 0x221, 0x231, 0x241, 0x251
    ];
    
    for (const offset of playerOffsets) {
      try {
        const players = this.tryParsePlayersAt(offset);
        const validPlayers = players.filter(p => this.isValidPlayer(p));
        
        if (validPlayers.length >= 2 && validPlayers.length <= 8) {
          console.log(`[PlayerParser] Found ${validPlayers.length} valid players at offset 0x${offset.toString(16)}`);
          validPlayers.forEach(p => console.log(`[PlayerParser] Player: ${p.name} (${p.race})`));
          return validPlayers;
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log('[PlayerParser] No valid players found, scanning for names...');
    return this.scanForPlayerNames();
  }

  private tryParsePlayersAt(baseOffset: number) {
    const players: any[] = [];
    
    for (let i = 0; i < 8; i++) {
      const offset = baseOffset + (i * 36);
      
      if (offset + 36 > this.reader.length) break;
      
      try {
        this.reader.setPosition(offset);
        
        // Player name (25 bytes)
        const nameBytes = this.reader.readBytes(25);
        const name = this.decodePlayerName(nameBytes);
        
        if (!this.isValidPlayerName(name)) continue;
        
        // Race, team, color
        this.reader.skip(6); // Skip padding
        const raceId = this.reader.readUInt8();
        const team = this.reader.readUInt8();
        const color = this.reader.readUInt8();
        
        players.push({
          id: players.length,
          name: name.trim(),
          race: this.getRaceName(raceId),
          team,
          color
        });
      } catch (e) {
        continue;
      }
    }
    
    return players;
  }

  private scanForPlayerNames() {
    const players: any[] = [];
    
    // Scan for player name patterns
    for (let pos = 0x100; pos < Math.min(0x400, this.reader.length - 25); pos += 4) {
      try {
        this.reader.setPosition(pos);
        const nameBytes = this.reader.readBytes(25);
        const name = this.decodePlayerName(nameBytes);
        
        if (this.isValidPlayerName(name) && !players.find(p => p.name === name)) {
          players.push({
            id: players.length,
            name: name.trim(),
            race: players.length % 2 === 0 ? 'Terran' : 'Protoss',
            team: players.length,
            color: players.length
          });
          
          if (players.length >= 2) break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback if no names found
    if (players.length === 0) {
      players.push(
        { id: 0, name: 'Player 1', race: 'Terran', team: 0, color: 0 },
        { id: 1, name: 'Player 2', race: 'Protoss', team: 1, color: 1 }
      );
    }
    
    return players;
  }

  private decodePlayerName(nameBytes: Uint8Array): string {
    // Find null terminator
    let length = nameBytes.indexOf(0);
    if (length === -1) length = nameBytes.length;
    
    // Decode using UTF-8 with fallback to latin1
    try {
      return new TextDecoder('utf-8').decode(nameBytes.slice(0, length));
    } catch {
      return new TextDecoder('latin1').decode(nameBytes.slice(0, length));
    }
  }

  private isValidPlayerName(name: string): boolean {
    return name.length >= 2 && 
           name.length <= 24 && 
           /^[a-zA-Z0-9_\-\[\]()@.]+$/.test(name) &&
           !name.includes('Observer') &&
           !name.includes('Computer') &&
           !name.includes('\x00');
  }

  private isValidPlayer(player: any): boolean {
    return player.name && 
           player.name.length >= 2 && 
           ['Terran', 'Protoss', 'Zerg', 'Random'].includes(player.race);
  }

  private getRaceName(raceId: number): string {
    const races: Record<number, string> = {
      0: 'Zerg',
      1: 'Terran', 
      2: 'Protoss',
      6: 'Random'
    };
    return races[raceId] || 'Terran';
  }
}

// Enhanced command parser for build orders and APM
class ReplayCommandParser {
  private reader: ReplayBinaryReader;

  constructor(reader: ReplayBinaryReader) {
    this.reader = reader;
  }

  parseCommands() {
    console.log('[CommandParser] Parsing SC:R commands...');
    
    // Find command section
    const commandOffset = this.findCommandSection();
    if (!commandOffset) {
      console.warn('[CommandParser] No command section found');
      return [];
    }
    
    console.log(`[CommandParser] Command section at 0x${commandOffset.toString(16)}`);
    this.reader.setPosition(commandOffset);
    
    const commands: any[] = [];
    let currentFrame = 0;
    let iterations = 0;
    const maxIterations = 10000;
    
    while (this.reader.canRead(1) && iterations < maxIterations) {
      iterations++;
      
      try {
        const byte = this.reader.readUInt8();
        
        // Frame sync commands
        if (byte === 0x00) {
          currentFrame++;
          continue;
        } else if (byte === 0x01) {
          if (this.reader.canRead(1)) {
            currentFrame += this.reader.readUInt8();
          }
          continue;
        } else if (byte === 0x02) {
          if (this.reader.canRead(2)) {
            currentFrame += this.reader.readUInt16LE();
          }
          continue;
        } else if (byte === 0x03) {
          if (this.reader.canRead(4)) {
            currentFrame += this.reader.readUInt32LE();
          }
          continue;
        }
        
        // Regular command
        const command = this.parseCommand(byte, currentFrame);
        if (command) {
          commands.push(command);
        }
        
      } catch (error) {
        console.warn('[CommandParser] Parse error:', error);
        break;
      }
    }
    
    console.log(`[CommandParser] Parsed ${commands.length} commands`);
    return commands;
  }

  private findCommandSection(): number | null {
    // Look for command section signature
    for (let pos = 0x400; pos < Math.min(this.reader.length - 100, 0x2000); pos += 16) {
      if (this.looksLikeCommandSection(pos)) {
        return pos;
      }
    }
    return null;
  }

  private looksLikeCommandSection(offset: number): boolean {
    try {
      this.reader.setPosition(offset);
      const sample = this.reader.readBytes(64);
      
      let frameSync = 0;
      let validCommands = 0;
      
      for (let i = 0; i < sample.length - 2; i++) {
        const byte = sample[i];
        const next = sample[i + 1];
        
        // Frame sync patterns
        if (byte <= 0x03) frameSync++;
        
        // Valid command + reasonable player ID
        if (COMMAND_TYPES[byte] && next < 8) {
          validCommands++;
        }
      }
      
      return frameSync >= 2 && validCommands >= 1;
    } catch {
      return false;
    }
  }

  private parseCommand(commandType: number, frame: number): any | null {
    if (!COMMAND_TYPES[commandType] || !this.reader.canRead(1)) {
      return null;
    }
    
    const playerID = this.reader.readUInt8();
    if (playerID > 7) return null;
    
    const command = {
      frame,
      playerID,
      type: commandType,
      typeString: COMMAND_TYPES[commandType],
      timestamp: this.frameToTimeString(frame),
      parameters: {}
    };
    
    // Parse command parameters
    switch (commandType) {
      case 0x0C: // Build
        if (this.reader.canRead(6)) {
          const unitType = this.reader.readUInt16LE();
          const x = this.reader.readUInt16LE();
          const y = this.reader.readUInt16LE();
          command.parameters = {
            unitType,
            unitName: UNIT_NAMES[unitType] || `Unit_${unitType}`,
            x, y
          };
        }
        break;
        
      case 0x1A: // Train
        if (this.reader.canRead(2)) {
          const unitType = this.reader.readUInt16LE();
          command.parameters = {
            unitType,
            unitName: UNIT_NAMES[unitType] || `Unit_${unitType}`
          };
        }
        break;
        
      case 0x1E: // Unit Morph
        if (this.reader.canRead(2)) {
          const unitType = this.reader.readUInt16LE();
          command.parameters = {
            unitType,
            unitName: UNIT_NAMES[unitType] || `Unit_${unitType}`
          };
        }
        break;
        
      case 0x34: // Building Morph
        if (this.reader.canRead(2)) {
          const unitType = this.reader.readUInt16LE();
          command.parameters = {
            unitType,
            unitName: UNIT_NAMES[unitType] || `Unit_${unitType}`
          };
        }
        break;
        
      case 0x2F: // Tech
        if (this.reader.canRead(1)) {
          const tech = this.reader.readUInt8();
          command.parameters = { tech };
        }
        break;
        
      case 0x31: // Upgrade
        if (this.reader.canRead(1)) {
          const upgrade = this.reader.readUInt8();
          command.parameters = { upgrade };
        }
        break;
        
      case 0x14: // Move
      case 0x15: // Attack
      case 0x17: // Right Click
        if (this.reader.canRead(4)) {
          const x = this.reader.readUInt16LE();
          const y = this.reader.readUInt16LE();
          command.parameters = { x, y };
        }
        break;
        
      case 0x13: // Hotkey
        if (this.reader.canRead(2)) {
          const hotkey = this.reader.readUInt8();
          const action = this.reader.readUInt8();
          command.parameters = { hotkey, action };
        }
        break;
        
      case 0x09: // Select
      case 0x0A: // Shift Select
        if (this.reader.canRead(1)) {
          const count = this.reader.readUInt8();
          command.parameters = { count };
          this.reader.skip(count * 2); // Skip unit IDs
        }
        break;
    }
    
    return command;
  }

  private frameToTimeString(frame: number): string {
    const seconds = Math.floor(frame / 23.8);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Main parsing function with proper data structure
function parseReplayComplete(buffer: ArrayBuffer) {
  console.log('[ReplayParser] Starting enhanced SC:R parsing...');
  
  try {
    const reader = new ReplayBinaryReader(buffer);
    
    // Parse header
    const headerParser = new ReplayHeaderParser(reader);
    const header = headerParser.parseHeader();
    
    // Parse players
    const playerParser = new ReplayPlayerParser(reader);
    const players = playerParser.parsePlayers();
    
    // Parse commands
    const commandParser = new ReplayCommandParser(reader);
    const commands = commandParser.parseCommands();
    
    // Calculate APM and build analysis
    const gameMinutes = Math.max(header.durationSeconds / 60, 1);
    const analysis: any = {};
    
    players.forEach(player => {
      const playerCommands = commands.filter(cmd => cmd.playerID === player.id);
      const buildCommands = playerCommands.filter(cmd => 
        ['Build', 'Train', 'Unit Morph', 'Building Morph'].includes(cmd.typeString)
      );
      
      const apm = Math.round(playerCommands.length / gameMinutes);
      const eapm = Math.round(buildCommands.length / gameMinutes);
      
      // Build order analysis
      const buildOrder = buildCommands.slice(0, 15).map(cmd => ({
        timestamp: cmd.timestamp,
        action: cmd.typeString,
        unitName: cmd.parameters.unitName || 'Unknown',
        supply: Math.floor(cmd.frame / 500) + 9 // Rough supply estimate
      }));
      
      // Generate coaching recommendations
      const recommendations = this.generateRecommendations(apm, eapm, buildOrder);
      
      analysis[player.id] = {
        playerId: player.id,
        playerName: player.name,
        race: player.race,
        apm,
        eapm,
        buildOrder,
        totalCommands: playerCommands.length,
        buildCommands: buildCommands.length,
        efficiency: playerCommands.length > 0 ? Math.round((buildCommands.length / playerCommands.length) * 100) : 0,
        recommendations,
        strengths: this.identifyStrengths(apm, eapm, buildOrder),
        weaknesses: this.identifyWeaknesses(apm, eapm, buildOrder)
      };
    });
    
    console.log('[ReplayParser] Analysis complete');
    console.log('[ReplayParser] Players:', players.map(p => `${p.name} (${p.race})`));
    console.log('[ReplayParser] APM:', Object.values(analysis).map((a: any) => `${a.playerName}: ${a.apm}`));
    
    return {
      success: true,
      data: {
        mapName: header.mapName,
        duration: header.duration,
        durationSeconds: header.durationSeconds,
        gameType: header.gameType,
        players: players.map(p => ({
          id: p.id,
          name: p.name,
          race: p.race,
          team: p.team,
          color: p.color,
          apm: analysis[p.id]?.apm || 0,
          eapm: analysis[p.id]?.eapm || 0
        })),
        analysis,
        commands: commands.slice(0, 100) // Limit for response size
      }
    };
    
  } catch (error) {
    console.error('[ReplayParser] Enhanced parsing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper functions for analysis
function generateRecommendations(apm: number, eapm: number, buildOrder: any[]): string[] {
  const recommendations = [];
  
  if (apm < 100) {
    recommendations.push("Focus on increasing your actions per minute by practicing macro and micro simultaneously");
  }
  
  if (eapm < 50) {
    recommendations.push("Work on your economy - build more workers and expand your production");
  }
  
  if (buildOrder.length < 10) {
    recommendations.push("Practice longer build orders to improve your strategic planning");
  }
  
  const efficiency = eapm / apm;
  if (efficiency < 0.4) {
    recommendations.push("Reduce unnecessary actions and focus on meaningful commands");
  }
  
  return recommendations;
}

function identifyStrengths(apm: number, eapm: number, buildOrder: any[]): string[] {
  const strengths = [];
  
  if (apm > 150) strengths.push("High APM - good mechanical skill");
  if (eapm > 80) strengths.push("Strong economy management");
  if (buildOrder.length > 12) strengths.push("Good strategic planning");
  
  return strengths;
}

function identifyWeaknesses(apm: number, eapm: number, buildOrder: any[]): string[] {
  const weaknesses = [];
  
  if (apm < 80) weaknesses.push("Low APM - practice mechanics");
  if (eapm < 40) weaknesses.push("Weak economy - build more workers");
  if (buildOrder.length < 8) weaknesses.push("Short build orders - plan ahead");
  
  return weaknesses;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[EdgeFunction] Received enhanced replay parse request')
    
    const formData = await req.formData()
    const file = formData.get('replayFile') as File
    
    if (!file) {
      console.error('[EdgeFunction] No replay file provided')
      return new Response(
        JSON.stringify({ success: false, error: 'No replay file provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('[EdgeFunction] Processing file:', file.name, 'Size:', file.size)
    
    const buffer = await file.arrayBuffer()
    const result = parseReplayComplete(buffer)
    
    if (result.success) {
      console.log('[EdgeFunction] Enhanced parsing successful!')
      console.log('[EdgeFunction] Map:', result.data.mapName)
      console.log('[EdgeFunction] Duration:', result.data.duration)
      console.log('[EdgeFunction] Players:', result.data.players.map(p => `${p.name} (${p.race}) - APM: ${p.apm}`))
      
      return new Response(
        JSON.stringify(result),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.error('[EdgeFunction] Enhanced parsing failed:', result.error)
      return new Response(
        JSON.stringify(result),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
  } catch (error) {
    console.error('[EdgeFunction] Handler error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
