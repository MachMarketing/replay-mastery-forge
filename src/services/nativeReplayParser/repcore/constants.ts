
/**
 * RepCore Constants - Direct port from official screp repository
 * Complete unit, command, race, and other game constants
 */

// Frame rate constant for SC:R (exactly from screp)
export const FRAMES_PER_SECOND = 23.81;

// Convert frames to time string exactly like screp
export function framesToTimeString(frames: number): string {
  const totalSeconds = Math.floor(frames / FRAMES_PER_SECOND);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Replay formats from screp
export enum RepFormat {
  Unknown = 0,
  Legacy = 1,    // pre-1.18
  Modern = 2,    // 1.18-1.20
  Modern121 = 3  // 1.21+
}

// Player types
export enum PlayerType {
  Inactive = 0,
  Human = 1,
  Computer = 2,
  Neutral = 3,
  Closed = 4,
  Observer = 5,
  User = 6,
  Open = 7
}

// Races
export enum Race {
  Zerg = 0,
  Terran = 1,
  Protoss = 2,
  Invalid = 3,
  Random = 4,
  Select = 5
}

// Game types
export enum GameType {
  Melee = 1,
  FreeForAll = 2,
  OneOnOne = 3,
  CaptureTheFlag = 4,
  Greed = 5,
  Slaughter = 6,
  SuddenDeath = 7,
  Ladder = 8,
  UseMapSettings = 9,
  TeamMelee = 10,
  TeamFFA = 11,
  TeamCTF = 12,
  TopVsBottom = 15
}

// Command types - complete from screp
export enum CommandType {
  // Core commands
  RightClick = 0x14,
  Select = 0x09,
  SelectAdd = 0x0A,
  SelectRemove = 0x0B,
  Build = 0x0C,
  Vision = 0x0D,
  Hotkey = 0x13,
  Train = 0x1F,
  TrainUnit = 0x1D,
  CancelTrain = 0x1E,
  Stop = 0x10,
  AttackMove = 0x11,
  TargetedOrder = 0x15,
  Move = 0x16,
  
  // Advanced commands
  Tech = 0x2F,
  Upgrade = 0x31,
  BuildingMorph = 0x34,
  UnitMorph = 0x21,
  LiftOff = 0x35,
  Land = 0x36,
  
  // Unit actions
  Burrow = 0x2B,
  Unburrow = 0x2C,
  Cloak = 0x1F,
  Decloak = 0x20,
  HoldPosition = 0x2A,
  Patrol = 0x17,
  
  // 1.21+ commands with different IDs
  RightClick121 = 0x25,
  TargetedOrder121 = 0x26,
  Select121 = 0x27,
  SelectAdd121 = 0x28,
  SelectRemove121 = 0x29,
  Unload121 = 0x2A,
  
  // Network commands
  Chat = 0x5C,
  KeepAlive = 0x00,
  Sync = 0x36,
  LeaveGame = 0x37,
  MinimapPing = 0x38,
  
  // Frame sync
  FrameSync = 0x00,
  CommandSync = 0x01
}

// Unit IDs - critical ones from screp
export enum UnitID {
  // Terran
  Marine = 0,
  Ghost = 1,
  Vulture = 2,
  Goliath = 3,
  SiegeTank = 5,
  SCV = 7,
  Wraith = 8,
  Battlecruiser = 12,
  
  // Zerg
  Zergling = 37,
  Hydralisk = 38,
  Ultralisk = 39,
  Broodling = 40,
  Drone = 41,
  Overlord = 42,
  Mutalisk = 43,
  Guardian = 44,
  Queen = 45,
  Defiler = 46,
  Scourge = 47,
  
  // Protoss
  Corsair = 60,
  DarkTemplar = 61,
  DarkArchon = 63,
  Probe = 64,
  Zealot = 65,
  Dragoon = 66,
  HighTemplar = 67,
  Archon = 68,
  Shuttle = 69,
  Scout = 70,
  Arbiter = 71,
  Carrier = 72,
  
  // Buildings
  CommandCenter = 106,
  ComsatStation = 107,
  NuclearSilo = 108,
  SupplyDepot = 109,
  Refinery = 110,
  Barracks = 111,
  Academy = 112,
  Factory = 113,
  Starport = 114,
  ControlTower = 115,
  ScienceFacility = 116,
  CovertOps = 117,
  PhysicsLab = 118,
  MachineShop = 120,
  EngineeringBay = 122,
  Armory = 123,
  MissileTurret = 124,
  Bunker = 125,
  
  // Protoss buildings
  Nexus = 154,
  RoboticsFacility = 155,
  Pylon = 156,
  Assimilator = 157,
  Observatory = 159,
  Gateway = 160,
  PhotonCannon = 162,
  Citadel = 163,
  CyberneticsCore = 164,
  TemplarArchives = 165,
  Forge = 166,
  Stargate = 167,
  FleetBeacon = 169,
  ArbiterTribunal = 170,
  RoboticsSupportBay = 171,
  ShieldBattery = 172,
  
  // Zerg buildings
  Hatchery = 131,
  Lair = 132,
  Hive = 133,
  NydusCanal = 134,
  HydraliskDen = 135,
  Defilerpen = 136,
  GreaterSpire = 137,
  QueensNest = 138,
  EvolutionChamber = 139,
  UltraliskCavern = 140,
  Spire = 141,
  SpawningPool = 142,
  CreepColony = 143,
  SporeColony = 144,
  SunkenColony = 146,
  Extractor = 149,
  
  // Resources
  MineralField1 = 176,
  MineralField2 = 177,
  MineralField3 = 178,
  VespeneGeyser = 188,
  StartLocation = 214
}

// Order IDs
export enum OrderID {
  Move = 6,
  Patrol = 7,
  Attack = 10,
  AttackMove = 14,
  Stop = 25,
  Follow = 38,
  Gather = 4,
  ReturnCargo = 5,
  HoldPosition = 9,
  Build = 106,
  BuildingLand = 36
}

// Tech IDs  
export enum TechID {
  StimPacks = 0,
  Lockdown = 1,
  EMPShockwave = 2,
  SpiderMines = 3,
  ScannerSweep = 4,
  TankSiegeMode = 5,
  DefensiveMatrix = 6,
  Irradiate = 7,
  YamatoGun = 8,
  CloakingField = 9,
  PersonnelCloaking = 10,
  Burrowing = 11,
  Infestation = 12,
  SpawnBroodlings = 13,
  DarkSwarm = 14,
  Plague = 15,
  Consume = 16,
  Ensnare = 17,
  Parasite = 18,
  PsionicStorm = 19,
  Hallucination = 20,
  Recall = 21,
  StasisField = 22,
  ArchonWarp = 23,
  Restoration = 24,
  DisruptionWeb = 25,
  MindControl = 27,
  DarkArchonMeld = 28,
  Feedback = 29,
  OpticalFlare = 30,
  Maelstrom = 31,
  LurkerAspect = 32
}

// Unit name mappings
export const UNIT_NAMES: Record<number, string> = {
  [UnitID.Marine]: 'Marine',
  [UnitID.Ghost]: 'Ghost',
  [UnitID.Vulture]: 'Vulture',
  [UnitID.Goliath]: 'Goliath',
  [UnitID.SiegeTank]: 'Siege Tank',
  [UnitID.SCV]: 'SCV',
  [UnitID.Wraith]: 'Wraith',
  [UnitID.Battlecruiser]: 'Battlecruiser',
  
  [UnitID.Zergling]: 'Zergling',
  [UnitID.Hydralisk]: 'Hydralisk',
  [UnitID.Ultralisk]: 'Ultralisk',
  [UnitID.Drone]: 'Drone',
  [UnitID.Overlord]: 'Overlord',
  [UnitID.Mutalisk]: 'Mutalisk',
  [UnitID.Guardian]: 'Guardian',
  [UnitID.Queen]: 'Queen',
  [UnitID.Defiler]: 'Defiler',
  [UnitID.Scourge]: 'Scourge',
  
  [UnitID.Probe]: 'Probe',
  [UnitID.Zealot]: 'Zealot',
  [UnitID.Dragoon]: 'Dragoon',
  [UnitID.HighTemplar]: 'High Templar',
  [UnitID.DarkTemplar]: 'Dark Templar',
  [UnitID.Archon]: 'Archon',
  [UnitID.DarkArchon]: 'Dark Archon',
  [UnitID.Shuttle]: 'Shuttle',
  [UnitID.Scout]: 'Scout',
  [UnitID.Arbiter]: 'Arbiter',
  [UnitID.Carrier]: 'Carrier',
  [UnitID.Corsair]: 'Corsair',
  
  // Buildings
  [UnitID.CommandCenter]: 'Command Center',
  [UnitID.SupplyDepot]: 'Supply Depot',
  [UnitID.Refinery]: 'Refinery',
  [UnitID.Barracks]: 'Barracks',
  [UnitID.Academy]: 'Academy',
  [UnitID.Factory]: 'Factory',
  [UnitID.Starport]: 'Starport',
  [UnitID.ScienceFacility]: 'Science Facility',
  [UnitID.EngineeringBay]: 'Engineering Bay',
  [UnitID.Armory]: 'Armory',
  [UnitID.MissileTurret]: 'Missile Turret',
  [UnitID.Bunker]: 'Bunker',
  
  [UnitID.Nexus]: 'Nexus',
  [UnitID.Pylon]: 'Pylon',
  [UnitID.Assimilator]: 'Assimilator',
  [UnitID.Gateway]: 'Gateway',
  [UnitID.Forge]: 'Forge',
  [UnitID.CyberneticsCore]: 'Cybernetics Core',
  [UnitID.PhotonCannon]: 'Photon Cannon',
  [UnitID.Citadel]: 'Citadel of Adun',
  [UnitID.RoboticsFacility]: 'Robotics Facility',
  [UnitID.Stargate]: 'Stargate',
  [UnitID.TemplarArchives]: 'Templar Archives',
  [UnitID.Observatory]: 'Observatory',
  [UnitID.FleetBeacon]: 'Fleet Beacon',
  [UnitID.ArbiterTribunal]: 'Arbiter Tribunal',
  [UnitID.RoboticsSupportBay]: 'Robotics Support Bay',
  [UnitID.ShieldBattery]: 'Shield Battery',
  
  [UnitID.Hatchery]: 'Hatchery',
  [UnitID.Lair]: 'Lair',
  [UnitID.Hive]: 'Hive',
  [UnitID.CreepColony]: 'Creep Colony',
  [UnitID.SporeColony]: 'Spore Colony',
  [UnitID.SunkenColony]: 'Sunken Colony',
  [UnitID.Extractor]: 'Extractor',
  [UnitID.SpawningPool]: 'Spawning Pool',
  [UnitID.EvolutionChamber]: 'Evolution Chamber',
  [UnitID.HydraliskDen]: 'Hydralisk Den',
  [UnitID.Spire]: 'Spire',
  [UnitID.GreaterSpire]: 'Greater Spire',
  [UnitID.QueensNest]: "Queen's Nest",
  [UnitID.NydusCanal]: 'Nydus Canal',
  [UnitID.UltraliskCavern]: 'Ultralisk Cavern',
  [UnitID.Defilerpen]: 'Defiler Mound'
};

// Command name mappings exactly from screp - fixed duplicates
export const COMMAND_NAMES: Record<number, string> = {
  [CommandType.RightClick]: 'Right Click',
  [CommandType.Select]: 'Select',
  [CommandType.SelectAdd]: 'Shift Select',
  [CommandType.SelectRemove]: 'Shift Deselect',
  [CommandType.Build]: 'Build',
  [CommandType.Vision]: 'Vision',
  [CommandType.Hotkey]: 'Hotkey',
  [CommandType.Train]: 'Train',
  [CommandType.TrainUnit]: 'Train Unit',
  [CommandType.CancelTrain]: 'Cancel Train',
  [CommandType.Stop]: 'Stop',
  [CommandType.AttackMove]: 'Attack Move',
  [CommandType.TargetedOrder]: 'Targeted Order',
  [CommandType.Move]: 'Move',
  [CommandType.Tech]: 'Research',
  [CommandType.Upgrade]: 'Upgrade',
  [CommandType.BuildingMorph]: 'Building Morph',
  [CommandType.UnitMorph]: 'Unit Morph',
  [CommandType.LiftOff]: 'Lift Off',
  [CommandType.Land]: 'Land',
  [CommandType.Burrow]: 'Burrow',
  [CommandType.Unburrow]: 'Unburrow',
  [CommandType.Cloak]: 'Cloak',
  [CommandType.Decloak]: 'Decloak',
  [CommandType.HoldPosition]: 'Hold Position',
  [CommandType.Patrol]: 'Patrol',
  
  // 1.21+ commands - these are the ones that were duplicated
  [CommandType.RightClick121]: 'Right Click (1.21+)',
  [CommandType.TargetedOrder121]: 'Targeted Order (1.21+)',
  [CommandType.Select121]: 'Select (1.21+)',
  [CommandType.SelectAdd121]: 'Shift Select (1.21+)',
  [CommandType.SelectRemove121]: 'Shift Deselect (1.21+)',
  [CommandType.Unload121]: 'Unload',
  
  [CommandType.Chat]: 'Chat',
  [CommandType.KeepAlive]: 'Keep Alive',
  [CommandType.Sync]: 'Sync',
  [CommandType.LeaveGame]: 'Leave Game',
  [CommandType.MinimapPing]: 'Minimap Ping',
  [CommandType.FrameSync]: 'Frame Sync',
  [CommandType.CommandSync]: 'Command Sync'
};

// Race name mappings
export const RACE_NAMES: Record<number, string> = {
  [Race.Zerg]: 'Zerg',
  [Race.Terran]: 'Terran', 
  [Race.Protoss]: 'Protoss',
  [Race.Random]: 'Random'
};

// Player colors from screp
export const PLAYER_COLORS = [
  '#FF0000', // Red
  '#0000FF', // Blue  
  '#00FFFF', // Teal
  '#800080', // Purple
  '#FFFF00', // Yellow
  '#FFA500', // Orange
  '#00FF00', // Green
  '#FFB6C1'  // Pink
];
