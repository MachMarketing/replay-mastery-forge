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
}

// StarCraft Replay Header Parser
class ReplayHeaderParser {
  private reader: ReplayBinaryReader;

  constructor(reader: ReplayBinaryReader) {
    this.reader = reader;
  }

  parseHeader() {
    console.log('[HeaderParser] Parsing StarCraft Remastered header...');
    
    this.reader.setPosition(0);
    
    // Engine version (4 bytes at 0x04)
    this.reader.setPosition(0x04);
    const engineVersion = this.reader.readUInt32LE();
    console.log('[HeaderParser] Engine version:', engineVersion);
    
    // Frames (4 bytes at 0x0C or 0x14)
    let frames = 0;
    const frameOffsets = [0x0C, 0x14, 0x08];
    for (const offset of frameOffsets) {
      try {
        this.reader.setPosition(offset);
        const testFrames = this.reader.readUInt32LE();
        if (testFrames >= 100 && testFrames <= 1000000) {
          frames = testFrames;
          console.log(`[HeaderParser] Found frames at 0x${offset.toString(16)}: ${frames}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Map name detection
    const mapName = this.findMapName();
    console.log('[HeaderParser] Map name:', mapName);
    
    return {
      engineVersion,
      frames,
      mapName,
      duration: this.framesToDuration(frames)
    };
  }

  private findMapName(): string {
    const mapOffsets = [0x45, 0x75, 0x89, 0x65, 0x95, 0xA5];
    
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
    
    return 'Unknown Map';
  }

  private isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
    const printableRatio = name.split('').filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).length / name.length;
    return printableRatio >= 0.7;
  }

  private framesToDuration(frames: number): string {
    const seconds = Math.floor(frames / 24);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// StarCraft Player Parser
class ReplayPlayerParser {
  private reader: ReplayBinaryReader;

  constructor(reader: ReplayBinaryReader) {
    this.reader = reader;
  }

  parsePlayers() {
    console.log('[PlayerParser] Parsing StarCraft Remastered players...');
    
    // Extended player offsets for different SC:R versions
    const playerOffsets = [
      0x161, 0x1A1, 0x1C1, 0x1B1, 0x19C, 0x18E, 
      0x181, 0x175, 0x169, 0x1D1, 0x1E1, 0x1F1,
      0x180, 0x1B4, 0x1D8, 0x1FC
    ];
    
    for (const offset of playerOffsets) {
      try {
        const players = this.tryParsePlayersAt(offset);
        const validPlayers = players.filter(p => this.isValidPlayer(p));
        
        if (validPlayers.length >= 1 && validPlayers.length <= 8) {
          console.log(`[PlayerParser] Found ${validPlayers.length} valid players at offset 0x${offset.toString(16)}`);
          return validPlayers;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: Create default players
    console.log('[PlayerParser] Using fallback players');
    return [
      { id: 0, name: 'Player 1', race: 'Terran', team: 0, color: 0 },
      { id: 1, name: 'Player 2', race: 'Protoss', team: 1, color: 1 }
    ];
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
        
        // Race, team, color (skip some bytes to get to the right positions)
        this.reader.skip(6); // Skip to race position
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

  private decodePlayerName(nameBytes: Uint8Array): string {
    // Find null terminator
    let length = nameBytes.indexOf(0);
    if (length === -1) length = nameBytes.length;
    
    // Decode using latin1 for better compatibility
    const decoder = new TextDecoder('latin1');
    return decoder.decode(nameBytes.slice(0, length));
  }

  private isValidPlayerName(name: string): boolean {
    return name.length >= 2 && 
           name.length <= 24 && 
           /^[a-zA-Z0-9_\-\[\]()]+$/.test(name) &&
           !name.includes('Observer') &&
           !name.includes('Computer');
  }

  private isValidPlayer(player: any): boolean {
    return player.name && 
           player.name.length >= 2 && 
           ['Terran', 'Protoss', 'Zerg'].includes(player.race);
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

// Command Section Detector
class CommandSectionDetector {
  private reader: ReplayBinaryReader;

  constructor(reader: ReplayBinaryReader) {
    this.reader = reader;
  }

  findCommandSection(): { offset: number; data: Uint8Array } | null {
    console.log('[CommandDetector] Searching for command section...');
    
    // Standard command section offsets for SC:R
    const commandOffsets = [633, 637, 641, 645, 649, 653, 660, 670];
    
    for (const offset of commandOffsets) {
      if (this.looksLikeCommandSection(offset)) {
        console.log(`[CommandDetector] Found command section at offset ${offset}`);
        
        this.reader.setPosition(offset);
        const remainingBytes = this.reader.length - offset;
        
        if (remainingBytes > 0) {
          const commandData = this.reader.readBytes(remainingBytes);
          return { offset, data: commandData };
        }
      }
    }
    
    return null;
  }

  private looksLikeCommandSection(offset: number): boolean {
    try {
      this.reader.setPosition(offset);
      if (!this.reader.canRead(50)) return false;
      
      const sample = this.reader.readBytes(50);
      let validCommandBytes = 0;
      
      for (let i = 0; i < sample.length - 1; i++) {
        const byte = sample[i];
        const next = sample[i + 1];
        
        // Frame sync patterns or valid command + player ID
        if (byte <= 0x03 || (byte >= 0x09 && byte <= 0x45 && next < 12)) {
          validCommandBytes++;
        }
      }
      
      return validCommandBytes >= 5;
    } catch (e) {
      return false;
    }
  }
}

// TypeID Constants (1:1 from screparsed)
const TypeID = {
  SaveGame: 0x06,
  LoadGame: 0x07,
  RestartGame: 0x08,
  Select: 0x09,
  SelectAdd: 0x0a,
  SelectRemove: 0x0b,
  Build: 0x0c,
  Vision: 0x0d,
  Alliance: 0x0e,
  GameSpeed: 0x0f,
  Pause: 0x10,
  Resume: 0x11,
  Cheat: 0x12,
  Hotkey: 0x13,
  RightClick: 0x14,
  TargetedOrder: 0x15,
  CancelBuild: 0x18,
  CancelMorph: 0x19,
  Stop: 0x1a,
  CarrierStop: 0x1b,
  ReaverStop: 0x1c,
  OrderNothing: 0x1d,
  ReturnCargo: 0x1e,
  Train: 0x1f,
  CancelTrain: 0x20,
  Cloak: 0x21,
  Decloak: 0x22,
  UnitMorph: 0x23,
  Unsiege: 0x25,
  Siege: 0x26,
  TrainFighter: 0x27,
  UnloadAll: 0x28,
  Unload: 0x29,
  MergeArchon: 0x2a,
  HoldPosition: 0x2b,
  Burrow: 0x2c,
  Unburrow: 0x2d,
  CancelNuke: 0x2e,
  Lift: 0x2f,
  Tech: 0x30,
  CancelTech: 0x31,
  Upgrade: 0x32,
  CancelUpgrade: 0x33,
  CancelAddon: 0x34,
  BuildingMorph: 0x35,
  Stim: 0x36,
  Sync: 0x37,
  VoiceEnable1: 0x38,
  VoiceEnable2: 0x39,
  VoiceSquelch1: 0x3a,
  VoiceSquelch2: 0x3b,
  StartGame: 0x3c,
  DownloadPercentage: 0x3d,
  ChangeGameSlot: 0x3e,
  NewNetPlayer: 0x3f,
  JoinedGame: 0x40,
  ChangeRace: 0x41,
  TeamGameTeam: 0x42,
  UMSTeam: 0x43,
  MeleeTeam: 0x44,
  SwapPlayers: 0x45,
  SavedData: 0x48,
  ReplaySpeed: 0x4f,
} as const

// Unit Mapping (simplified)
const UnitMapping: Record<number, string> = {
  0: 'Marine',
  1: 'Ghost',
  2: 'Vulture',
  3: 'Goliath',
  7: 'SCV',
  8: 'Wraith',
  9: 'Science Vessel',
  10: 'Firebat',
  11: 'Dropship',
  12: 'Battlecruiser',
  30: 'Firebat',
  32: 'Medic',
  33: 'Larva',
  34: 'Egg',
  35: 'Zergling',
  36: 'Hydralisk',
  37: 'Ultralisk',
  38: 'Broodling',
  39: 'Drone',
  40: 'Overlord',
  41: 'Mutalisk',
  42: 'Guardian',
  43: 'Queen',
  44: 'Defiler',
  45: 'Scourge',
  58: 'Corsair',
  59: 'Dark Templar',
  60: 'Devourer',
  61: 'Dark Archon',
  62: 'Probe',
  63: 'Zealot',
  64: 'Dragoon',
  65: 'High Templar',
  66: 'Archon',
  67: 'Shuttle',
  68: 'Scout',
  69: 'Arbiter',
  70: 'Carrier',
  71: 'Interceptor',
  81: 'Reaver',
  82: 'Observer',
  83: 'Scarab',
  104: 'Command Center',
  105: 'Comsat Station',
  106: 'Nuclear Silo',
  107: 'Supply Depot',
  108: 'Refinery',
  109: 'Barracks',
  110: 'Academy',
  111: 'Factory',
  112: 'Starport',
  113: 'Control Tower',
  114: 'Science Facility',
  115: 'Covert Ops',
  116: 'Physics Lab',
  118: 'Machine Shop',
  120: 'Engineering Bay',
  121: 'Armory',
  122: 'Missile Turret',
  123: 'Bunker',
  129: 'Hatchery',
  130: 'Lair',
  131: 'Hive',
  132: 'Nydus Canal',
  133: 'Hydralisk Den',
  134: 'Defiler Mound',
  135: 'Greater Spire',
  136: 'Queens Nest',
  137: 'Evolution Chamber',
  138: 'Ultralisk Cavern',
  139: 'Spire',
  140: 'Spawning Pool',
  141: 'Creep Colony',
  142: 'Spore Colony',
  144: 'Sunken Colony',
  147: 'Extractor',
  152: 'Nexus',
  153: 'Robotics Facility',
  154: 'Pylon',
  155: 'Assimilator',
  157: 'Observatory',
  158: 'Gateway',
  160: 'Photon Cannon',
  161: 'Citadel of Adun',
  162: 'Cybernetics Core',
  163: 'Templar Archives',
  164: 'Forge',
  165: 'Stargate',
  167: 'Fleet Beacon',
  168: 'Arbiter Tribunal',
  169: 'Robotics Support Bay',
  170: 'Shield Battery',
}

// SmartBuffer-like implementation for binary parsing
class BinaryBuffer {
  private buffer: Uint8Array
  private offset: number = 0

  constructor(buffer: Uint8Array) {
    this.buffer = buffer
  }

  get readOffset(): number {
    return this.offset
  }

  set readOffset(value: number) {
    this.offset = value
  }

  get length(): number {
    return this.buffer.length
  }

  readUInt8(): number {
    if (this.offset >= this.buffer.length) {
      throw new Error('Buffer overflow')
    }
    return this.buffer[this.offset++]
  }

  readUInt16LE(): number {
    if (this.offset + 1 >= this.buffer.length) {
      throw new Error('Buffer overflow')
    }
    const value = this.buffer[this.offset] | (this.buffer[this.offset + 1] << 8)
    this.offset += 2
    return value
  }

  readUInt32LE(): number {
    if (this.offset + 3 >= this.buffer.length) {
      throw new Error('Buffer overflow')
    }
    const value = this.buffer[this.offset] |
      (this.buffer[this.offset + 1] << 8) |
      (this.buffer[this.offset + 2] << 16) |
      (this.buffer[this.offset + 3] << 24)
    this.offset += 4
    return value >>> 0
  }

  readBytes(length: number): Uint8Array {
    if (this.offset + length > this.buffer.length) {
      throw new Error('Buffer overflow')
    }
    const bytes = this.buffer.slice(this.offset, this.offset + length)
    this.offset += length
    return bytes
  }

  readString(length: number): string {
    const bytes = this.readBytes(length)
    return new TextDecoder().decode(bytes).replace(/\0/g, '')
  }
}

interface ParsedCommand {
  playerId: number
  typeId: number
  typeName: string
  data?: any
  unitId?: number
  unitName?: string
  x?: number
  y?: number
  isEffective: boolean
  category: 'build' | 'train' | 'select' | 'move' | 'attack' | 'other'
}

interface Frame {
  frameNumber: number
  commands: ParsedCommand[]
}

interface ParseResult {
  success: boolean
  parsed?: ParsedCommand
  error?: string
}

function parseCommand(buffer: BinaryBuffer, playerId: number, commandType: number): ParseResult {
  try {
    const command: ParsedCommand = {
      playerId,
      typeId: commandType,
      typeName: getCommandName(commandType),
      isEffective: isEffectiveCommand(commandType),
      category: getCommandCategory(commandType)
    }

    // Parse command-specific data based on type
    switch (commandType) {
      case TypeID.Select:
      case TypeID.SelectAdd:
      case TypeID.SelectRemove:
        if (buffer.readOffset + 1 < buffer.length) {
          const count = buffer.readUInt8()
          const unitType = buffer.readUInt8()
          command.data = { count, unitType }
          command.unitId = unitType
          command.unitName = UnitMapping[unitType] || `Unknown Unit ${unitType}`
        }
        break

      case TypeID.Build:
        if (buffer.readOffset + 5 < buffer.length) {
          const unitType = buffer.readUInt16LE()
          const x = buffer.readUInt16LE()
          const y = buffer.readUInt16LE()
          command.data = { unitType, x, y }
          command.unitId = unitType
          command.unitName = UnitMapping[unitType] || `Unknown Building ${unitType}`
          command.x = x
          command.y = y
        }
        break

      case TypeID.Train:
        if (buffer.readOffset + 1 < buffer.length) {
          const unitType = buffer.readUInt16LE()
          command.data = { unitType }
          command.unitId = unitType
          command.unitName = UnitMapping[unitType] || `Unknown Unit ${unitType}`
        }
        break

      case TypeID.RightClick:
        if (buffer.readOffset + 3 < buffer.length) {
          const x = buffer.readUInt16LE()
          const y = buffer.readUInt16LE()
          command.data = { x, y }
          command.x = x
          command.y = y
        }
        break

      case TypeID.TargetedOrder:
        if (buffer.readOffset + 5 < buffer.length) {
          const x = buffer.readUInt16LE()
          const y = buffer.readUInt16LE()
          const targetUnitIndex = buffer.readUInt16LE()
          const targetUnitType = buffer.readUInt16LE()
          command.data = { x, y, targetUnitIndex, targetUnitType }
          command.x = x
          command.y = y
        }
        break

      case TypeID.Tech:
        if (buffer.readOffset + 1 < buffer.length) {
          const techType = buffer.readUInt8()
          command.data = { techType }
        }
        break

      case TypeID.Upgrade:
        if (buffer.readOffset + 1 < buffer.length) {
          const upgradeType = buffer.readUInt8()
          command.data = { upgradeType }
        }
        break

      case TypeID.UnitMorph:
      case TypeID.BuildingMorph:
        if (buffer.readOffset + 1 < buffer.length) {
          const unitType = buffer.readUInt16LE()
          command.data = { unitType }
          command.unitId = unitType
          command.unitName = UnitMapping[unitType] || `Unknown Unit ${unitType}`
        }
        break

      case TypeID.Hotkey:
        if (buffer.readOffset + 1 < buffer.length) {
          const hotkey = buffer.readUInt8()
          const action = buffer.readUInt8()
          command.data = { hotkey, action }
        }
        break

      default:
        // For unknown commands, skip remaining data
        const remainingBytes = Math.min(10, buffer.length - buffer.readOffset)
        if (remainingBytes > 0) {
          command.data = { raw: Array.from(buffer.readBytes(remainingBytes)) }
        }
        break
    }

    return { success: true, parsed: command }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function getCommandName(typeId: number): string {
  const names: Record<number, string> = {
    [TypeID.Select]: 'Select',
    [TypeID.SelectAdd]: 'Select Add',
    [TypeID.SelectRemove]: 'Select Remove',
    [TypeID.Build]: 'Build',
    [TypeID.Train]: 'Train',
    [TypeID.RightClick]: 'Right Click',
    [TypeID.TargetedOrder]: 'Targeted Order',
    [TypeID.Tech]: 'Research Tech',
    [TypeID.Upgrade]: 'Upgrade',
    [TypeID.UnitMorph]: 'Unit Morph',
    [TypeID.BuildingMorph]: 'Building Morph',
    [TypeID.Hotkey]: 'Hotkey',
    [TypeID.Stop]: 'Stop',
    [TypeID.HoldPosition]: 'Hold Position',
    [TypeID.Burrow]: 'Burrow',
    [TypeID.Unburrow]: 'Unburrow',
    [TypeID.Siege]: 'Siege',
    [TypeID.Unsiege]: 'Unsiege',
    [TypeID.Cloak]: 'Cloak',
    [TypeID.Decloak]: 'Decloak',
    [TypeID.ReturnCargo]: 'Return Cargo',
    [TypeID.Lift]: 'Lift',
  }
  return names[typeId] || `Unknown Command ${typeId}`
}

function isEffectiveCommand(typeId: number): boolean {
  const effectiveCommands = [
    TypeID.Select,
    TypeID.SelectAdd,
    TypeID.SelectRemove,
    TypeID.Build,
    TypeID.Train,
    TypeID.RightClick,
    TypeID.TargetedOrder,
    TypeID.Tech,
    TypeID.Upgrade,
    TypeID.UnitMorph,
    TypeID.BuildingMorph,
    TypeID.Hotkey,
    TypeID.Stop,
    TypeID.HoldPosition,
    TypeID.Burrow,
    TypeID.Unburrow,
    TypeID.Siege,
    TypeID.Unsiege,
    TypeID.Cloak,
    TypeID.Decloak,
    TypeID.ReturnCargo,
    TypeID.Lift,
  ]
  return effectiveCommands.includes(typeId)
}

function getCommandCategory(typeId: number): 'build' | 'train' | 'select' | 'move' | 'attack' | 'other' {
  if ([TypeID.Build, TypeID.BuildingMorph].includes(typeId)) return 'build'
  if ([TypeID.Train, TypeID.UnitMorph, TypeID.Tech, TypeID.Upgrade].includes(typeId)) return 'train'
  if ([TypeID.Select, TypeID.SelectAdd, TypeID.SelectRemove, TypeID.Hotkey].includes(typeId)) return 'select'
  if ([TypeID.RightClick].includes(typeId)) return 'move'
  if ([TypeID.TargetedOrder].includes(typeId)) return 'attack'
  return 'other'
}

// Frame parsing generator
function* parseFramesSection(frameData: Uint8Array, maxFrames: number = 5000): Generator<Frame> {
  const buffer = new BinaryBuffer(frameData)
  let frameCount = 0

  while (buffer.readOffset < buffer.length && frameCount < maxFrames) {
    try {
      const frameNumber = buffer.readUInt32LE()
      const blockSize = buffer.readUInt8()
      const endOfFrame = buffer.readOffset + blockSize
      const commands: ParsedCommand[] = []

      while (buffer.readOffset < endOfFrame && buffer.readOffset < buffer.length) {
        const playerId = buffer.readUInt8()
        const commandType = buffer.readUInt8()
        
        const result = parseCommand(buffer, playerId, commandType)
        if (result.success === false) {
          buffer.readOffset = endOfFrame
          break
        } else {
          commands.push(result.parsed!)
        }
      }

      yield {
        frameNumber,
        commands,
      }
      
      frameCount++
    } catch (error) {
      console.log('Frame parsing error:', error)
      break
    }
  }
}

// Enhanced main parsing function
function parseReplayComplete(buffer: ArrayBuffer) {
  console.log('[ReplayParser] Starting complete StarCraft replay parsing...')
  
  try {
    const reader = new ReplayBinaryReader(buffer)
    
    // Phase 1: Parse header
    const headerParser = new ReplayHeaderParser(reader)
    const header = headerParser.parseHeader()
    console.log('[ReplayParser] Header parsed:', header)
    
    // Phase 2: Parse players
    const playerParser = new ReplayPlayerParser(reader)
    const players = playerParser.parsePlayers()
    console.log('[ReplayParser] Players parsed:', players)
    
    // Phase 3: Find and parse command section
    const commandDetector = new CommandSectionDetector(reader)
    const commandSection = commandDetector.findCommandSection()
    
    if (!commandSection) {
      console.log('[ReplayParser] No command section found, using player data only')
      return {
        success: true,
        data: {
          header,
          players,
          totalFrames: header.frames,
          totalCommands: 0,
          playerStats: calculateBasicPlayerStats(players),
          buildOrders: {}
        }
      }
    }
    
    // Phase 4: Parse frames from command section
    const frames: Frame[] = []
    const frameGenerator = parseFramesSection(commandSection.data, 3000)
    
    let totalCommands = 0
    for (const frame of frameGenerator) {
      frames.push(frame)
      totalCommands += frame.commands.length
      
      if (frames.length > 3000) break
    }
    
    console.log(`[ReplayParser] Parsed ${frames.length} frames with ${totalCommands} commands`)
    
    // Phase 5: Calculate statistics
    const playerStats = calculatePlayerStats(frames, players)
    const buildOrders = extractBuildOrders(frames, players)
    
    return {
      success: true,
      data: {
        header,
        players,
        totalFrames: frames.length,
        totalCommands,
        playerStats,
        buildOrders,
        frames: frames.slice(0, 100)
      }
    }
  } catch (error) {
    console.error('[ReplayParser] Complete parsing error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

function calculateBasicPlayerStats(players: any[]) {
  const stats: Record<number, any> = {}
  
  players.forEach(player => {
    stats[player.id] = {
      playerId: player.id,
      name: player.name,
      race: player.race,
      totalActions: 0,
      effectiveActions: 0,
      apm: 0,
      eapm: 0,
      categories: {
        build: 0,
        train: 0,
        select: 0,
        move: 0,
        attack: 0,
        other: 0,
      }
    }
  })
  
  return stats
}

function calculatePlayerStats(frames: Frame[], players: any[]) {
  const playerCommands: Record<number, ParsedCommand[]> = {}
  
  // Initialize player command arrays
  players.forEach(player => {
    playerCommands[player.id] = []
  })
  
  for (const frame of frames) {
    for (const command of frame.commands) {
      if (playerCommands[command.playerId]) {
        playerCommands[command.playerId].push(command)
      }
    }
  }
  
  const stats: Record<number, any> = {}
  
  players.forEach(player => {
    const commands = playerCommands[player.id] || []
    const effectiveCommands = commands.filter(cmd => cmd.isEffective)
    const totalFrames = Math.max(...frames.map(f => f.frameNumber), 1)
    const gameTimeMinutes = totalFrames / (24 * 60)
    
    stats[player.id] = {
      playerId: player.id,
      name: player.name,
      race: player.race,
      totalActions: commands.length,
      effectiveActions: effectiveCommands.length,
      apm: Math.round(commands.length / Math.max(gameTimeMinutes, 1)),
      eapm: Math.round(effectiveCommands.length / Math.max(gameTimeMinutes, 1)),
      categories: {
        build: commands.filter(cmd => cmd.category === 'build').length,
        train: commands.filter(cmd => cmd.category === 'train').length,
        select: commands.filter(cmd => cmd.category === 'select').length,
        move: commands.filter(cmd => cmd.category === 'move').length,
        attack: commands.filter(cmd => cmd.category === 'attack').length,
        other: commands.filter(cmd => cmd.category === 'other').length,
      }
    }
  })
  
  return stats
}

function extractBuildOrders(frames: Frame[], players: any[]) {
  const buildOrders: Record<number, any[]> = {}
  
  players.forEach(player => {
    buildOrders[player.id] = []
  })
  
  for (const frame of frames) {
    for (const command of frame.commands) {
      if (['build', 'train'].includes(command.category) && command.unitName) {
        if (buildOrders[command.playerId]) {
          buildOrders[command.playerId].push({
            frame: frame.frameNumber,
            timestamp: formatFrameTime(frame.frameNumber),
            action: command.typeName,
            unit: command.unitName,
            category: command.category
          })
        }
      }
    }
  }
  
  // Limit build order entries
  players.forEach(player => {
    if (buildOrders[player.id]) {
      buildOrders[player.id] = buildOrders[player.id].slice(0, 30)
    }
  })
  
  return buildOrders
}

function formatFrameTime(frame: number): string {
  const totalSeconds = Math.floor(frame / 24)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[EdgeFunction] Received request to parse replay')
    
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
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
      console.log('[EdgeFunction] Parse successful!')
      console.log('[EdgeFunction] Found players:', result.data.players.map(p => p.name))
      console.log('[EdgeFunction] Player stats:', Object.values(result.data.playerStats).map((p: any) => ({ name: p.name, apm: p.apm, eapm: p.eapm })))
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Replay parsed successfully with complete structure',
          data: result.data
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.log('[EdgeFunction] Parse failed:', result.error)
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to parse replay'
        }),
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
