
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// StarCraft Remastered Unit Database
const UNIT_DATABASE = {
  // Terran Units
  0: { name: 'Marine', race: 'Terran', category: 'military', cost: { minerals: 50, gas: 0 } },
  1: { name: 'Ghost', race: 'Terran', category: 'military', cost: { minerals: 25, gas: 75 } },
  2: { name: 'Vulture', race: 'Terran', category: 'military', cost: { minerals: 75, gas: 0 } },
  3: { name: 'Goliath', race: 'Terran', category: 'military', cost: { minerals: 100, gas: 50 } },
  5: { name: 'Siege Tank', race: 'Terran', category: 'military', cost: { minerals: 150, gas: 100 } },
  7: { name: 'SCV', race: 'Terran', category: 'worker', cost: { minerals: 50, gas: 0 } },
  8: { name: 'Wraith', race: 'Terran', category: 'military', cost: { minerals: 150, gas: 100 } },
  9: { name: 'Science Vessel', race: 'Terran', category: 'military', cost: { minerals: 100, gas: 225 } },
  11: { name: 'Dropship', race: 'Terran', category: 'military', cost: { minerals: 100, gas: 100 } },
  12: { name: 'Battlecruiser', race: 'Terran', category: 'military', cost: { minerals: 400, gas: 300 } },
  32: { name: 'Firebat', race: 'Terran', category: 'military', cost: { minerals: 50, gas: 25 } },
  33: { name: 'Medic', race: 'Terran', category: 'military', cost: { minerals: 50, gas: 25 } },
  34: { name: 'Valkyrie', race: 'Terran', category: 'military', cost: { minerals: 250, gas: 125 } },
  
  // Protoss Units
  64: { name: 'Probe', race: 'Protoss', category: 'worker', cost: { minerals: 50, gas: 0 } },
  65: { name: 'Zealot', race: 'Protoss', category: 'military', cost: { minerals: 100, gas: 0 } },
  66: { name: 'Dragoon', race: 'Protoss', category: 'military', cost: { minerals: 125, gas: 50 } },
  67: { name: 'High Templar', race: 'Protoss', category: 'military', cost: { minerals: 50, gas: 150 } },
  68: { name: 'Archon', race: 'Protoss', category: 'military', cost: { minerals: 100, gas: 300 } },
  69: { name: 'Shuttle', race: 'Protoss', category: 'military', cost: { minerals: 200, gas: 0 } },
  70: { name: 'Scout', race: 'Protoss', category: 'military', cost: { minerals: 275, gas: 125 } },
  71: { name: 'Arbiter', race: 'Protoss', category: 'military', cost: { minerals: 100, gas: 350 } },
  72: { name: 'Carrier', race: 'Protoss', category: 'military', cost: { minerals: 350, gas: 250 } },
  73: { name: 'Interceptor', race: 'Protoss', category: 'military', cost: { minerals: 25, gas: 0 } },
  74: { name: 'Dark Templar', race: 'Protoss', category: 'military', cost: { minerals: 125, gas: 100 } },
  75: { name: 'Reaver', race: 'Protoss', category: 'military', cost: { minerals: 200, gas: 100 } },
  76: { name: 'Observer', race: 'Protoss', category: 'military', cost: { minerals: 25, gas: 75 } },
  77: { name: 'Scarab', race: 'Protoss', category: 'military', cost: { minerals: 15, gas: 0 } },
  83: { name: 'Corsair', race: 'Protoss', category: 'military', cost: { minerals: 150, gas: 100 } },
  84: { name: 'Dark Archon', race: 'Protoss', category: 'military', cost: { minerals: 250, gas: 200 } },
  
  // Zerg Units
  37: { name: 'Drone', race: 'Zerg', category: 'worker', cost: { minerals: 50, gas: 0 } },
  38: { name: 'Zergling', race: 'Zerg', category: 'military', cost: { minerals: 50, gas: 0 } },
  39: { name: 'Hydralisk', race: 'Zerg', category: 'military', cost: { minerals: 75, gas: 25 } },
  40: { name: 'Ultralisk', race: 'Zerg', category: 'military', cost: { minerals: 200, gas: 200 } },
  41: { name: 'Broodling', race: 'Zerg', category: 'military', cost: { minerals: 0, gas: 0 } },
  42: { name: 'Overlord', race: 'Zerg', category: 'supply', cost: { minerals: 100, gas: 0 } },
  43: { name: 'Mutalisk', race: 'Zerg', category: 'military', cost: { minerals: 100, gas: 100 } },
  44: { name: 'Guardian', race: 'Zerg', category: 'military', cost: { minerals: 100, gas: 100 } },
  45: { name: 'Queen', race: 'Zerg', category: 'military', cost: { minerals: 100, gas: 100 } },
  46: { name: 'Defiler', race: 'Zerg', category: 'military', cost: { minerals: 50, gas: 150 } },
  47: { name: 'Scourge', race: 'Zerg', category: 'military', cost: { minerals: 25, gas: 75 } },
  62: { name: 'Lurker', race: 'Zerg', category: 'military', cost: { minerals: 75, gas: 25 } },
  103: { name: 'Devourer', race: 'Zerg', category: 'military', cost: { minerals: 100, gas: 100 } },
  
  // Buildings
  106: { name: 'Command Center', race: 'Terran', category: 'building', cost: { minerals: 400, gas: 0 } },
  107: { name: 'Supply Depot', race: 'Terran', category: 'building', cost: { minerals: 100, gas: 0 } },
  108: { name: 'Refinery', race: 'Terran', category: 'building', cost: { minerals: 100, gas: 0 } },
  109: { name: 'Barracks', race: 'Terran', category: 'building', cost: { minerals: 150, gas: 0 } },
  110: { name: 'Academy', race: 'Terran', category: 'building', cost: { minerals: 150, gas: 0 } },
  111: { name: 'Factory', race: 'Terran', category: 'building', cost: { minerals: 200, gas: 100 } },
  112: { name: 'Starport', race: 'Terran', category: 'building', cost: { minerals: 150, gas: 100 } },
  113: { name: 'Control Tower', race: 'Terran', category: 'building', cost: { minerals: 50, gas: 50 } },
  154: { name: 'Nexus', race: 'Protoss', category: 'building', cost: { minerals: 400, gas: 0 } },
  155: { name: 'Robotics Facility', race: 'Protoss', category: 'building', cost: { minerals: 200, gas: 200 } },
  156: { name: 'Pylon', race: 'Protoss', category: 'building', cost: { minerals: 100, gas: 0 } },
  157: { name: 'Assimilator', race: 'Protoss', category: 'building', cost: { minerals: 100, gas: 0 } },
  159: { name: 'Gateway', race: 'Protoss', category: 'building', cost: { minerals: 150, gas: 0 } },
  160: { name: 'Photon Cannon', race: 'Protoss', category: 'building', cost: { minerals: 150, gas: 0 } },
  161: { name: 'Citadel of Adun', race: 'Protoss', category: 'building', cost: { minerals: 150, gas: 100 } },
  162: { name: 'Cybernetics Core', race: 'Protoss', category: 'building', cost: { minerals: 200, gas: 0 } },
  163: { name: 'Templar Archives', race: 'Protoss', category: 'building', cost: { minerals: 150, gas: 200 } },
  164: { name: 'Forge', race: 'Protoss', category: 'building', cost: { minerals: 150, gas: 0 } },
  165: { name: 'Stargate', race: 'Protoss', category: 'building', cost: { minerals: 150, gas: 150 } },
  131: { name: 'Hatchery', race: 'Zerg', category: 'building', cost: { minerals: 300, gas: 0 } },
  132: { name: 'Lair', race: 'Zerg', category: 'building', cost: { minerals: 150, gas: 100 } },
  133: { name: 'Hive', race: 'Zerg', category: 'building', cost: { minerals: 200, gas: 150 } },
  134: { name: 'Nydus Canal', race: 'Zerg', category: 'building', cost: { minerals: 150, gas: 0 } },
  135: { name: 'Hydralisk Den', race: 'Zerg', category: 'building', cost: { minerals: 100, gas: 50 } },
  136: { name: 'Defiler Mound', race: 'Zerg', category: 'building', cost: { minerals: 100, gas: 100 } },
  137: { name: 'Greater Spire', race: 'Zerg', category: 'building', cost: { minerals: 100, gas: 150 } },
  138: { name: 'Queen\'s Nest', race: 'Zerg', category: 'building', cost: { minerals: 150, gas: 100 } },
  139: { name: 'Evolution Chamber', race: 'Zerg', category: 'building', cost: { minerals: 75, gas: 0 } },
  140: { name: 'Ultralisk Cavern', race: 'Zerg', category: 'building', cost: { minerals: 150, gas: 200 } },
  141: { name: 'Spire', race: 'Zerg', category: 'building', cost: { minerals: 200, gas: 150 } },
  142: { name: 'Spawning Pool', race: 'Zerg', category: 'building', cost: { minerals: 200, gas: 0 } },
  143: { name: 'Creep Colony', race: 'Zerg', category: 'building', cost: { minerals: 75, gas: 0 } },
  144: { name: 'Spore Colony', race: 'Zerg', category: 'building', cost: { minerals: 75, gas: 0 } },
  146: { name: 'Extractor', race: 'Zerg', category: 'building', cost: { minerals: 50, gas: 0 } }
};

// Command Type Database
const COMMAND_TYPES = {
  0x09: { name: 'Select', category: 'select' },
  0x0A: { name: 'Shift Select', category: 'select' },
  0x0C: { name: 'Build', category: 'build' },
  0x0D: { name: 'Vision', category: 'other' },
  0x13: { name: 'Hotkey', category: 'select' },
  0x14: { name: 'Move', category: 'move' },
  0x15: { name: 'Attack', category: 'attack' },
  0x16: { name: 'Cancel', category: 'other' },
  0x18: { name: 'Stop', category: 'other' },
  0x1D: { name: 'Train', category: 'train' },
  0x1E: { name: 'Cancel Train', category: 'other' },
  0x21: { name: 'Unit Morph', category: 'build' },
  0x2F: { name: 'Research', category: 'tech' },
  0x31: { name: 'Upgrade', category: 'tech' },
  0x34: { name: 'Building Morph', category: 'build' }
};

// Race names mapping
const RACE_NAMES = ['Zerg', 'Terran', 'Protoss', 'Unknown', 'Unknown', 'Unknown', 'Random'];

class SCRemasteredParser {
  private data: Uint8Array;
  private position: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.data = new Uint8Array(buffer);
  }

  readUInt8(): number {
    return this.data[this.position++];
  }

  readUInt16LE(): number {
    const value = this.data[this.position] | (this.data[this.position + 1] << 8);
    this.position += 2;
    return value;
  }

  readUInt32LE(): number {
    const value = this.data[this.position] | 
                 (this.data[this.position + 1] << 8) |
                 (this.data[this.position + 2] << 16) |
                 (this.data[this.position + 3] << 24);
    this.position += 4;
    return value >>> 0; // Convert to unsigned
  }

  readString(length: number): string {
    let str = '';
    for (let i = 0; i < length; i++) {
      const byte = this.data[this.position++];
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) {
        str += String.fromCharCode(byte);
      }
    }
    return str.trim();
  }

  readNullTerminatedString(maxLength: number = 256): string {
    let str = '';
    let length = 0;
    while (length < maxLength && this.position < this.data.length) {
      const byte = this.data[this.position++];
      length++;
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) {
        str += String.fromCharCode(byte);
      }
    }
    return str.trim();
  }

  setPosition(pos: number): void {
    this.position = pos;
  }

  canRead(bytes: number): boolean {
    return this.position + bytes <= this.data.length;
  }

  parseHeader() {
    console.log('[SCRemasteredParser] Parsing header from binary data...');
    
    // Check for SC:R signature
    this.setPosition(12);
    const replayId = this.readString(4);
    console.log('[SCRemasteredParser] Replay ID:', replayId);
    
    if (replayId !== 'reRS' && replayId !== 'seRS') {
      throw new Error(`Invalid SC:R replay. Expected 'reRS' or 'seRS', got: '${replayId}'`);
    }

    // Get frame count
    this.setPosition(20);
    const frames = this.readUInt32LE();
    console.log('[SCRemasteredParser] Total frames:', frames);

    // Find map name
    const mapName = this.findMapName();
    console.log('[SCRemasteredParser] Map name:', mapName);

    return {
      replayId,
      frames,
      mapName,
      duration: this.framesToDuration(frames)
    };
  }

  findMapName(): string {
    // Try multiple offsets where map names are typically stored
    const mapOffsets = [0x61, 0x75, 0x89, 0x95, 0xB5, 0xC5, 0xE1];
    
    for (const offset of mapOffsets) {
      if (offset + 32 >= this.data.length) continue;
      
      this.setPosition(offset);
      const mapName = this.readNullTerminatedString(32);
      
      if (this.isValidMapName(mapName)) {
        console.log(`[SCRemasteredParser] Found map name at offset ${offset}: "${mapName}"`);
        return mapName;
      }
    }

    // Advanced search through the file
    for (let pos = 0x50; pos < Math.min(0x400, this.data.length - 32); pos += 4) {
      this.setPosition(pos);
      const testName = this.readNullTerminatedString(32);
      
      if (this.isValidMapName(testName) && testName.length > 5) {
        console.log(`[SCRemasteredParser] Found map name via search at ${pos}: "${testName}"`);
        return testName;
      }
    }

    return 'Unknown Map';
  }

  isValidMapName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 32) return false;
    
    // Check for printable characters
    let printableCount = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      if ((char >= 32 && char <= 126) || (char >= 160 && char <= 255)) {
        printableCount++;
      }
    }
    
    if (printableCount / name.length < 0.7) return false;
    
    // Common invalid patterns
    const invalidPatterns = [
      /^\s*$/, /StarCraft/i, /Blizzard/i, /\.exe$/i, /^[0-9]+$/
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(name));
  }

  parsePlayers() {
    console.log('[SCRemasteredParser] Parsing players...');
    const players = [];
    
    // Try different player section offsets
    const playerOffsets = [0x161, 0x1A1, 0x1B1, 0x181, 0x1C1, 0x19C];
    
    for (const offset of playerOffsets) {
      try {
        this.setPosition(offset);
        const foundPlayers = this.parsePlayersAtOffset(offset);
        
        if (foundPlayers.length >= 2) {
          console.log(`[SCRemasteredParser] Found ${foundPlayers.length} players at offset ${offset}`);
          return foundPlayers;
        }
      } catch (error) {
        continue;
      }
    }

    // Fallback: create default players
    return [
      { name: 'Player 1', race: 'Terran', id: 0 },
      { name: 'Player 2', race: 'Protoss', id: 1 }
    ];
  }

  parsePlayersAtOffset(baseOffset: number) {
    const players = [];
    
    for (let i = 0; i < 8; i++) {
      const offset = baseOffset + (i * 36);
      if (offset + 36 >= this.data.length) break;
      
      this.setPosition(offset);
      const name = this.readString(25);
      
      if (this.isValidPlayerName(name)) {
        const raceId = this.readUInt8();
        const team = this.readUInt8();
        const color = this.readUInt8();
        
        players.push({
          id: i,
          name: name.trim(),
          race: RACE_NAMES[raceId] || 'Unknown',
          raceId,
          team,
          color
        });
      }
    }
    
    return players;
  }

  isValidPlayerName(name: string): boolean {
    return name && 
           name.length >= 2 && 
           name.length <= 24 && 
           /^[a-zA-Z0-9_\-\[\]()]+$/.test(name) &&
           !name.includes('Observer');
  }

  parseCommands() {
    console.log('[SCRemasteredParser] Parsing commands...');
    const commands = [];
    
    // Find command section
    const commandOffset = this.findCommandSection();
    if (!commandOffset) {
      console.log('[SCRemasteredParser] No command section found');
      return [];
    }

    this.setPosition(commandOffset);
    let currentFrame = 0;
    let commandCount = 0;
    
    while (this.position < this.data.length - 10 && commandCount < 10000) {
      try {
        // Check for frame sync
        if (this.data[this.position] <= 0x03) {
          const frameIncrement = this.data[this.position + 1] | (this.data[this.position + 2] << 8);
          currentFrame += frameIncrement;
          this.position += 3;
          continue;
        }

        const commandId = this.readUInt8();
        const commandInfo = COMMAND_TYPES[commandId];
        
        if (commandInfo) {
          const playerId = this.readUInt8();
          
          if (playerId < 12) {
            const command = {
              frame: currentFrame,
              playerId,
              commandId,
              commandName: commandInfo.name,
              category: commandInfo.category,
              timestamp: this.framesToTime(currentFrame)
            };

            // Parse specific command data
            if (commandInfo.category === 'build' || commandInfo.category === 'train') {
              if (this.canRead(2)) {
                const unitId = this.readUInt16LE();
                const unit = UNIT_DATABASE[unitId];
                if (unit) {
                  command.unitId = unitId;
                  command.unitName = unit.name;
                  command.unitRace = unit.race;
                  command.cost = unit.cost;
                }
              }
            }

            commands.push(command);
            commandCount++;
          }
        } else {
          this.position++;
        }
      } catch (error) {
        this.position++;
      }
    }

    console.log(`[SCRemasteredParser] Parsed ${commands.length} commands`);
    return commands;
  }

  findCommandSection(): number | null {
    // Look for command patterns in typical locations
    for (let pos = 0x500; pos < Math.min(this.data.length - 1000, 0x8000); pos += 16) {
      if (this.looksLikeCommandSection(pos)) {
        return pos;
      }
    }
    return null;
  }

  looksLikeCommandSection(offset: number): boolean {
    if (offset + 128 >= this.data.length) return false;
    
    let frameSync = 0;
    let validCommands = 0;
    
    for (let i = 0; i < 128; i++) {
      const byte = this.data[offset + i];
      
      if (byte <= 0x03) frameSync++;
      if (COMMAND_TYPES[byte]) validCommands++;
    }
    
    return frameSync >= 3 && validCommands >= 2;
  }

  framesToDuration(frames: number): string {
    const seconds = Math.floor(frames / 24); // 24 FPS for SC:R
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  framesToTime(frame: number): string {
    const seconds = Math.floor(frame / 24);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Professional Build Order Engine
class BuildOrderEngine {
  static extractBuildOrder(commands: any[], players: any[]): any {
    console.log('[BuildOrderEngine] Extracting professional build orders...');
    
    const buildOrders = {};
    const supplyTracking = {};
    
    players.forEach(player => {
      buildOrders[player.id] = [];
      supplyTracking[player.id] = { current: 4, max: 9 }; // Starting supply
    });

    // Filter meaningful build commands
    const buildCommands = commands.filter(cmd => 
      ['build', 'train', 'tech'].includes(cmd.category) && 
      cmd.unitName && 
      !cmd.commandName.includes('Cancel')
    );

    buildCommands.forEach(cmd => {
      const playerId = cmd.playerId;
      if (!buildOrders[playerId]) return;

      const supply = supplyTracking[playerId];
      const buildItem = {
        supply: `${supply.current}/${supply.max}`,
        timestamp: cmd.timestamp,
        action: cmd.commandName,
        unitName: cmd.unitName,
        category: this.categorizeUnit(cmd.unitName),
        cost: cmd.cost || { minerals: 0, gas: 0 },
        frame: cmd.frame
      };

      // Update supply tracking
      if (this.isSupplyProvider(cmd.unitName)) {
        supply.max += 8;
      } else if (this.consumesSupply(cmd.unitName)) {
        supply.current += this.getSupplyConsumption(cmd.unitName);
      }

      buildOrders[playerId].push(buildItem);
    });

    return buildOrders;
  }

  static categorizeUnit(unitName: string): string {
    const categories = {
      worker: ['SCV', 'Probe', 'Drone'],
      supply: ['Supply Depot', 'Pylon', 'Overlord'],
      military: ['Marine', 'Zealot', 'Zergling', 'Dragoon', 'Hydralisk'],
      tech: ['Academy', 'Cybernetics Core', 'Spawning Pool', 'Factory', 'Stargate'],
      economy: ['Command Center', 'Nexus', 'Hatchery', 'Refinery', 'Assimilator', 'Extractor']
    };

    for (const [category, units] of Object.entries(categories)) {
      if (units.includes(unitName)) return category;
    }
    return 'other';
  }

  static isSupplyProvider(unitName: string): boolean {
    return ['Supply Depot', 'Pylon', 'Overlord'].includes(unitName);
  }

  static consumesSupply(unitName: string): boolean {
    const workers = ['SCV', 'Probe', 'Drone'];
    const military = ['Marine', 'Zealot', 'Zergling', 'Dragoon', 'Hydralisk'];
    return workers.includes(unitName) || military.includes(unitName);
  }

  static getSupplyConsumption(unitName: string): number {
    const supplyMap = {
      'SCV': 1, 'Probe': 1, 'Drone': 1,
      'Marine': 1, 'Zealot': 2, 'Zergling': 1,
      'Dragoon': 2, 'Hydralisk': 1
    };
    return supplyMap[unitName] || 1;
  }
}

// AI Coaching Engine
class CoachingEngine {
  static analyzePerformance(buildOrders: any, commands: any[], players: any[]): any {
    console.log('[CoachingEngine] Analyzing performance for coaching insights...');
    
    const analysis = {};
    
    players.forEach(player => {
      const playerId = player.id;
      const playerCommands = commands.filter(cmd => cmd.playerId === playerId);
      const playerBuildOrder = buildOrders[playerId] || [];
      
      analysis[playerId] = {
        playerName: player.name,
        race: player.race,
        apm: this.calculateAPM(playerCommands),
        eapm: this.calculateEAPM(playerCommands),
        buildOrderAnalysis: this.analyzeBuildOrder(playerBuildOrder, player.race),
        strengths: this.identifyStrengths(playerCommands, playerBuildOrder),
        weaknesses: this.identifyWeaknesses(playerCommands, playerBuildOrder),
        recommendations: this.generateRecommendations(playerCommands, playerBuildOrder, player.race)
      };
    });
    
    return analysis;
  }

  static calculateAPM(commands: any[]): number {
    if (commands.length === 0) return 0;
    const maxFrame = Math.max(...commands.map(c => c.frame));
    const gameMinutes = maxFrame / 24 / 60;
    return Math.round(commands.length / gameMinutes);
  }

  static calculateEAPM(commands: any[]): number {
    const effectiveCommands = commands.filter(cmd => 
      !cmd.commandName.includes('Cancel') && 
      !['Select', 'Shift Select'].includes(cmd.commandName)
    );
    
    if (effectiveCommands.length === 0) return 0;
    const maxFrame = Math.max(...commands.map(c => c.frame));
    const gameMinutes = maxFrame / 24 / 60;
    return Math.round(effectiveCommands.length / gameMinutes);
  }

  static analyzeBuildOrder(buildOrder: any[], race: string): any {
    if (buildOrder.length === 0) return { strategy: 'Unknown', timing: 'Unknown' };

    const first10 = buildOrder.slice(0, 10);
    const strategy = this.identifyStrategy(first10, race);
    const timing = this.analyzeTiming(buildOrder);
    
    return { strategy, timing, efficiency: this.calculateBuildEfficiency(buildOrder) };
  }

  static identifyStrategy(earlyBuild: any[], race: string): string {
    const buildNames = earlyBuild.map(item => item.unitName);
    
    if (race === 'Protoss') {
      if (buildNames.includes('Forge') && buildNames.indexOf('Forge') < 5) return 'Forge Fast Expand';
      if (buildNames.filter(name => name === 'Gateway').length >= 2) return '2-Gate Rush';
      if (buildNames.includes('Cybernetics Core')) return 'Tech Build';
    } else if (race === 'Terran') {
      if (buildNames.includes('Barracks') && buildNames.indexOf('Barracks') < 4) return 'Barracks First';
      if (buildNames.includes('Factory')) return 'Factory Build';
    } else if (race === 'Zerg') {
      if (buildNames.includes('Spawning Pool') && buildNames.indexOf('Spawning Pool') < 4) return 'Pool First';
      if (buildNames.includes('Hatchery') && buildNames.indexOf('Hatchery') < 4) return 'Hatch First';
    }
    
    return 'Standard';
  }

  static analyzeTiming(buildOrder: any[]): string {
    if (buildOrder.length === 0) return 'No data';
    
    const firstMilitary = buildOrder.find(item => item.category === 'military');
    if (firstMilitary) {
      const timing = this.parseTimestamp(firstMilitary.timestamp);
      if (timing < 180) return 'Rush timing';
      if (timing < 300) return 'Standard timing';
      return 'Late timing';
    }
    
    return 'Economic focus';
  }

  static calculateBuildEfficiency(buildOrder: any[]): number {
    if (buildOrder.length === 0) return 0;
    
    // Simple efficiency based on resource usage and timing
    let efficiency = 100;
    let previousTime = 0;
    
    buildOrder.forEach(item => {
      const currentTime = this.parseTimestamp(item.timestamp);
      const timeDiff = currentTime - previousTime;
      
      // Penalize large gaps in build order
      if (timeDiff > 30) efficiency -= 5;
      
      previousTime = currentTime;
    });
    
    return Math.max(0, efficiency);
  }

  static identifyStrengths(commands: any[], buildOrder: any[]): string[] {
    const strengths = [];
    
    const apm = this.calculateAPM(commands);
    if (apm > 150) strengths.push('High APM');
    
    const eapm = this.calculateEAPM(commands);
    if (eapm > 100) strengths.push('Good action efficiency');
    
    if (buildOrder.length > 15) strengths.push('Consistent macro');
    
    const earlyWorkers = buildOrder.filter(item => 
      item.category === 'worker' && this.parseTimestamp(item.timestamp) < 300
    );
    if (earlyWorkers.length >= 5) strengths.push('Good early economy');
    
    return strengths;
  }

  static identifyWeaknesses(commands: any[], buildOrder: any[]): string[] {
    const weaknesses = [];
    
    const apm = this.calculateAPM(commands);
    if (apm < 80) weaknesses.push('Low APM - practice faster execution');
    
    const cancelCommands = commands.filter(cmd => cmd.commandName.includes('Cancel'));
    if (cancelCommands.length > commands.length * 0.1) {
      weaknesses.push('Too many cancelled actions - improve decision making');
    }
    
    const supplyItems = buildOrder.filter(item => item.category === 'supply');
    if (supplyItems.length < buildOrder.length * 0.15) {
      weaknesses.push('Insufficient supply buildings - avoid supply blocks');
    }
    
    return weaknesses;
  }

  static generateRecommendations(commands: any[], buildOrder: any[], race: string): string[] {
    const recommendations = [];
    
    const apm = this.calculateAPM(commands);
    if (apm < 100) recommendations.push('Practice hotkeys and faster unit production');
    
    const workerCount = buildOrder.filter(item => item.category === 'worker').length;
    if (workerCount < 20) recommendations.push('Build more workers for better economy');
    
    const firstMilitary = buildOrder.find(item => item.category === 'military');
    if (firstMilitary && this.parseTimestamp(firstMilitary.timestamp) > 300) {
      recommendations.push('Consider earlier military production for map control');
    }
    
    if (race === 'Protoss') {
      const pylons = buildOrder.filter(item => item.unitName === 'Pylon').length;
      if (pylons < 3) recommendations.push('Build more Pylons to avoid supply blocks');
    }
    
    return recommendations;
  }

  static parseTimestamp(timestamp: string): number {
    const [minutes, seconds] = timestamp.split(':').map(Number);
    return minutes * 60 + seconds;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[parseReplay] Starting SC:R replay analysis...');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('[parseReplay] File received:', file.name, file.size, 'bytes');
    
    // Read file buffer
    const buffer = await file.arrayBuffer();
    console.log('[parseReplay] Buffer size:', buffer.byteLength);
    
    // Parse with enhanced SC:R parser
    const parser = new SCRemasteredParser(buffer);
    
    // Parse header
    const header = parser.parseHeader();
    console.log('[parseReplay] Header:', header);
    
    // Parse players
    const players = parser.parsePlayers();
    console.log('[parseReplay] Players:', players);
    
    // Parse commands
    const commands = parser.parseCommands();
    console.log('[parseReplay] Commands:', commands.length);
    
    // Extract build orders
    const buildOrders = BuildOrderEngine.extractBuildOrder(commands, players);
    console.log('[parseReplay] Build orders extracted');
    
    // Generate coaching analysis
    const analysis = CoachingEngine.analyzePerformance(buildOrders, commands, players);
    console.log('[parseReplay] Performance analysis complete');
    
    // Format response
    const result = {
      success: true,
      data: {
        // Basic match info
        map_name: header.mapName,
        duration: header.duration,
        total_frames: header.frames,
        
        // Players
        players: players.map(p => ({
          name: p.name,
          race: p.race,
          id: p.id
        })),
        
        // Analysis data for each player
        analysis: Object.entries(analysis).reduce((acc, [playerId, data]: [string, any]) => {
          acc[playerId] = {
            player_name: data.playerName,
            race: data.race,
            apm: data.apm,
            eapm: data.eapm,
            build_order: buildOrders[playerId] || [],
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            recommendations: data.recommendations,
            build_analysis: data.buildOrderAnalysis
          };
          return acc;
        }, {} as any),
        
        // Raw data for debugging
        raw_commands: commands.slice(0, 100), // First 100 commands for debug
        parsing_stats: {
          commands_parsed: commands.length,
          players_found: players.length,
          build_items_extracted: Object.values(buildOrders).reduce((sum: number, bo: any) => sum + bo.length, 0)
        }
      }
    };

    console.log('[parseReplay] Analysis complete, returning structured data');
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[parseReplay] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'Failed to parse SC:R replay file'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
