import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// screparsed-style Action Parsing Implementation
// Based on: https://github.com/evanandrewrose/screparsed

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
  TrainFighter: 0x27, // Build interceptor / scarab
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

// Unit Mapping (simplified - from screparsed units.ts)
const UnitMapping: Record<number, string> = {
  0: 'Marine',
  1: 'Ghost',
  2: 'Vulture',
  3: 'Goliath',
  4: 'Goliath Turret',
  5: 'Siege Tank (Tank Mode)',
  6: 'Siege Tank (Siege Mode)',
  7: 'SCV',
  8: 'Wraith',
  9: 'Science Vessel',
  10: 'Gui Montag (Firebat)',
  11: 'Dropship',
  12: 'Battlecruiser',
  13: 'Vulture Spider Mine',
  14: 'Nuclear Missile',
  15: 'Civilian',
  16: 'Sarah Kerrigan (Ghost)',
  17: 'Alan Schezar (Goliath)',
  18: 'Alan Schezar Turret',
  19: 'Jim Raynor (Vulture)',
  20: 'Jim Raynor (Marine)',
  21: 'Tom Kazansky (Wraith)',
  22: 'Magellan (Science Vessel)',
  23: 'Edmund Duke (Tank Mode)',
  24: 'Edmund Duke (Siege Mode)',
  25: 'Edmund Duke Turret',
  26: 'Arcturus Mengsk (Battlecruiser)',
  27: 'Hyperion (Battlecruiser)',
  28: 'Norad II (Battlecruiser)',
  29: 'Siege Tank Turret',
  30: 'Firebat',
  31: 'Scanner Sweep',
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
  46: 'Torrasque (Ultralisk)',
  47: 'Matriarch (Queen)',
  48: 'Infested Terran',
  49: 'Infested Kerrigan (Infested Terran)',
  50: 'Unclean One (Defiler)',
  51: 'Hunter Killer (Hydralisk)',
  52: 'Devouring One (Zergling)',
  53: 'Kukulza (Mutalisk)',
  54: 'Kukulza (Guardian)',
  55: 'Yggdrasill (Overlord)',
  56: 'Valkyrie',
  57: 'Mutalisk Cocoon',
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
  72: 'Dark Templar (Hero)',
  73: 'Zeratul (Dark Templar)',
  74: 'Tassadar/Zeratul (Archon)',
  75: 'Fenix (Zealot)',
  76: 'Fenix (Dragoon)',
  77: 'Tassadar (Templar)',
  78: 'Mojo (Scout)',
  79: 'Warbringer (Reaver)',
  80: 'Gantrithor (Carrier)',
  81: 'Reaver',
  82: 'Observer',
  83: 'Scarab',
  84: 'Danimoth (Arbiter)',
  85: 'Aldaris (Templar)',
  86: 'Artanis (Scout)',
  87: 'Rhynadon (Badlands Critter)',
  88: 'Bengalaas (Jungle Critter)',
  89: 'Cargo Ship (Unused)',
  90: 'Mercenary Gunship (Unused)',
  91: 'Scantid (Desert Critter)',
  92: 'Kakaru (Twilight Critter)',
  93: 'Ragnasaur (Ashworld Critter)',
  94: 'Ursadon (Ice World Critter)',
  95: 'Lurker Egg',
  96: 'Raszagal (Dark Templar)',
  97: 'Samir Duran (Ghost)',
  98: 'Alexei Stukov (Ghost)',
  99: 'Map Revealer',
  100: 'Gerard DuGalle (BattleCruiser)',
  101: 'Lurker',
  102: 'Infested Duran (Infested Terran)',
  103: 'Disruption Web',
  104: 'Terran Command Center',
  105: 'Terran Comsat Station',
  106: 'Terran Nuclear Silo',
  107: 'Terran Supply Depot',
  108: 'Terran Refinery',
  109: 'Terran Barracks',
  110: 'Terran Academy',
  111: 'Terran Factory',
  112: 'Terran Starport',
  113: 'Terran Control Tower',
  114: 'Terran Science Facility',
  115: 'Terran Covert Ops',
  116: 'Terran Physics Lab',
  117: 'Unused Terran Building',
  118: 'Terran Machine Shop',
  119: 'Unused Terran Building',
  120: 'Terran Engineering Bay',
  121: 'Terran Armory',
  122: 'Terran Missile Turret',
  123: 'Terran Bunker',
  124: 'Norad II (Crashed Battlecruiser)',
  125: 'Ion Cannon',
  126: 'Uraj Crystal',
  127: 'Khalis Crystal',
  128: 'Infested Command Center',
  129: 'Zerg Hatchery',
  130: 'Zerg Lair',
  131: 'Zerg Hive',
  132: 'Zerg Nydus Canal',
  133: 'Zerg Hydralisk Den',
  134: 'Zerg Defiler Mound',
  135: 'Zerg Greater Spire',
  136: 'Zerg Queens Nest',
  137: 'Zerg Evolution Chamber',
  138: 'Zerg Ultralisk Cavern',
  139: 'Zerg Spire',
  140: 'Zerg Spawning Pool',
  141: 'Zerg Creep Colony',
  142: 'Zerg Spore Colony',
  143: 'Unused Zerg Building',
  144: 'Zerg Sunken Colony',
  145: 'Zerg Overmind (With Shell)',
  146: 'Zerg Overmind',
  147: 'Zerg Extractor',
  148: 'Mature Chrysalis',
  149: 'Zerg Cerebrate',
  150: 'Zerg Cerebrate Daggoth',
  151: 'Unused Zerg Building',
  152: 'Protoss Nexus',
  153: 'Protoss Robotics Facility',
  154: 'Protoss Pylon',
  155: 'Protoss Assimilator',
  156: 'Unused Protoss Building',
  157: 'Protoss Observatory',
  158: 'Protoss Gateway',
  159: 'Unused Protoss Building',
  160: 'Protoss Photon Cannon',
  161: 'Protoss Citadel of Adun',
  162: 'Protoss Cybernetics Core',
  163: 'Protoss Templar Archives',
  164: 'Protoss Forge',
  165: 'Protoss Stargate',
  166: 'Stasis Cell/Prison',
  167: 'Protoss Fleet Beacon',
  168: 'Protoss Arbiter Tribunal',
  169: 'Protoss Robotics Support Bay',
  170: 'Protoss Shield Battery',
  171: 'Khaydarin Crystal Form',
  172: 'Protoss Temple',
  173: 'Xel\'Naga Temple',
  174: 'Mineral Field (Type 1)',
  175: 'Mineral Field (Type 2)',
  176: 'Mineral Field (Type 3)',
  177: 'Cave',
  178: 'Cave-in',
  179: 'Cantina',
  180: 'Mining Platform',
  181: 'Independent Command Center',
  182: 'Independent Starport',
  183: 'Independent Jump Gate',
  184: 'Ruins',
  185: 'Kyadarin Crystal Formation',
  186: 'Vespene Geyser',
  187: 'Warp Gate',
  188: 'PSI Disrupter',
  189: 'Zerg Marker',
  190: 'Terran Marker',
  191: 'Protoss Marker',
  192: 'Zerg Beacon',
  193: 'Terran Beacon',
  194: 'Protoss Beacon',
  195: 'Zerg Flag Beacon',
  196: 'Terran Flag Beacon',
  197: 'Protoss Flag Beacon',
  198: 'Power Generator',
  199: 'Overmind Cocoon',
  200: 'Dark Swarm',
  201: 'Floor Missile Trap',
  202: 'Floor Hatch (Unused)',
  203: 'Left Upper Level Door',
  204: 'Right Upper Level Door',
  205: 'Left Pit Door',
  206: 'Right Pit Door',
  207: 'Floor Gun Trap',
  208: 'Left Wall Missile Trap',
  209: 'Left Wall Flame Trap',
  210: 'Right Wall Missile Trap',
  211: 'Right Wall Flame Trap',
  212: 'Start Location',
  213: 'Flag',
  214: 'Young Chrysalis',
  215: 'Psi Emitter',
  216: 'Data Disc',
  217: 'Khaydarin Crystal',
  218: 'Mineral Chunk (Type 1)',
  219: 'Mineral Chunk (Type 2)',
  220: 'Protoss Vespene Gas Orb (Type 1)',
  221: 'Protoss Vespene Gas Orb (Type 2)',
  222: 'Zerg Vespene Gas Sac (Type 1)',
  223: 'Zerg Vespene Gas Sac (Type 2)',
  224: 'Terran Vespene Gas Tank (Type 1)',
  225: 'Terran Vespene Gas Tank (Type 2)',
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
    return value >>> 0 // Convert to unsigned
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

// Command parsing logic (1:1 from screparsed)
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
        // For unknown commands, try to skip reasonable amount of data
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

// Frame parsing generator (1:1 from screparsed)
function* parseFramesSection(frameData: Uint8Array): Generator<Frame> {
  const buffer = new BinaryBuffer(frameData)

  while (buffer.readOffset < buffer.length) {
    try {
      const frameNumber = buffer.readUInt32LE()
      const blockSize = buffer.readUInt8()
      const endOfFrame = buffer.readOffset + blockSize
      const commands: ParsedCommand[] = []

      while (buffer.readOffset < endOfFrame) {
        const playerId = buffer.readUInt8()
        const commandType = buffer.readUInt8()
        
        const result = parseCommand(buffer, playerId, commandType)
        if (result.success === false) {
          // Jump to end of frame if parsing fails
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
    } catch (error) {
      console.log('Frame parsing error:', error)
      break
    }
  }
}

// Main parsing function
function parseScreparsedReplay(buffer: ArrayBuffer) {
  console.log('Starting screparsed-style parsing...')
  
  try {
    const data = new Uint8Array(buffer)
    
    // For now, assume the entire buffer is frame data
    // In a full implementation, we'd need to parse the replay header first
    // to locate the frame data section
    
    const frames: Frame[] = []
    const frameGenerator = parseFramesSection(data)
    
    let totalCommands = 0
    for (const frame of frameGenerator) {
      frames.push(frame)
      totalCommands += frame.commands.length
      
      // Limit frames for performance
      if (frames.length > 10000) break
    }
    
    console.log(`Parsed ${frames.length} frames with ${totalCommands} commands`)
    
    // Calculate player statistics
    const playerStats = calculatePlayerStats(frames)
    
    // Extract build orders
    const buildOrders = extractBuildOrders(frames)
    
    return {
      success: true,
      data: {
        totalFrames: frames.length,
        totalCommands,
        playerStats,
        buildOrders,
        frames: frames.slice(0, 100) // Return first 100 frames for UI
      }
    }
  } catch (error) {
    console.error('Parsing error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

function calculatePlayerStats(frames: Frame[]) {
  const playerCommands: Record<number, ParsedCommand[]> = {}
  
  for (const frame of frames) {
    for (const command of frame.commands) {
      if (!playerCommands[command.playerId]) {
        playerCommands[command.playerId] = []
      }
      playerCommands[command.playerId].push(command)
    }
  }
  
  const stats: Record<number, any> = {}
  
  for (const [playerId, commands] of Object.entries(playerCommands)) {
    const effectiveCommands = commands.filter(cmd => cmd.isEffective)
    const totalFrames = Math.max(...frames.map(f => f.frameNumber))
    const gameTimeMinutes = totalFrames / (24 * 60) // 24 fps
    
    stats[Number(playerId)] = {
      playerId: Number(playerId),
      totalActions: commands.length,
      effectiveActions: effectiveCommands.length,
      apm: Math.round(commands.length / gameTimeMinutes),
      eapm: Math.round(effectiveCommands.length / gameTimeMinutes),
      categories: {
        build: commands.filter(cmd => cmd.category === 'build').length,
        train: commands.filter(cmd => cmd.category === 'train').length,
        select: commands.filter(cmd => cmd.category === 'select').length,
        move: commands.filter(cmd => cmd.category === 'move').length,
        attack: commands.filter(cmd => cmd.category === 'attack').length,
        other: commands.filter(cmd => cmd.category === 'other').length,
      }
    }
  }
  
  return stats
}

function extractBuildOrders(frames: Frame[]) {
  const buildOrders: Record<number, any[]> = {}
  
  for (const frame of frames) {
    for (const command of frame.commands) {
      if (['build', 'train'].includes(command.category) && command.unitName) {
        if (!buildOrders[command.playerId]) {
          buildOrders[command.playerId] = []
        }
        
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
  
  // Limit build order entries
  for (const playerId of Object.keys(buildOrders)) {
    buildOrders[Number(playerId)] = buildOrders[Number(playerId)].slice(0, 50)
  }
  
  return buildOrders
}

function formatFrameTime(frame: number): string {
  const totalSeconds = Math.floor(frame / 24) // 24 fps
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
    console.log('Received request to parse replay')
    
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
    
    console.log('Processing file:', file.name, 'Size:', file.size)
    
    const buffer = await file.arrayBuffer()
    const result = parseScreparsedReplay(buffer)
    
    if (result.success) {
      console.log('Parse successful!')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Replay parsed successfully using screparsed logic',
          data: result.data
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.log('Parse failed:', result.error)
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
    console.error('Handler error:', error)
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
