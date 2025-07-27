/**
 * Enhanced Build Order Extractor für SC:R Replays
 * Konvertiert Commands zu echten Build Orders mit Supply, Timing und Race-Logic
 */

interface Command {
  frame: number;
  playerId: number;
  type: number;
  typeString: string;
  parameters?: any;
  effective: boolean;
  ineffKind: string;
  time: string;
  rawData: Uint8Array;
  data: Uint8Array;
}

export interface SCUnit {
  id: number;
  name: string;
  race: 'protoss' | 'terran' | 'zerg';
  category: 'worker' | 'military' | 'building' | 'tech';
  cost: {
    minerals: number;
    gas: number;
    supply: number;
    buildTime: number; // in seconds
  };
  produces?: number; // supply produced (for overlords, pylons, etc.)
  prerequisites?: string[];
}

export interface EnhancedBuildOrderEntry {
  time: string;
  frame: number;
  gameTime: number; // in seconds
  supply: string; // "12/17"
  currentSupply: number;
  maxSupply: number;
  action: 'Build' | 'Train' | 'Research' | 'Upgrade';
  unitName: string;
  unitId: number;
  cost: {
    minerals: number;
    gas: number;
  };
  category: 'economy' | 'military' | 'tech' | 'supply';
  race: string;
  efficiency: 'optimal' | 'early' | 'late' | 'supply-blocked';
  description: string;
}

export interface PlayerResourceState {
  minerals: number;
  gas: number;
  currentSupply: number;
  maxSupply: number;
  workerCount: number;
  buildings: string[];
  units: string[];
}

// Complete SC:R Unit Database
const SC_UNITS: Record<number, SCUnit> = {
  // Protoss Units
  0x40: { id: 0x40, name: 'Probe', race: 'protoss', category: 'worker', cost: { minerals: 50, gas: 0, supply: 1, buildTime: 20 } },
  0x41: { id: 0x41, name: 'Zealot', race: 'protoss', category: 'military', cost: { minerals: 100, gas: 0, supply: 2, buildTime: 33 } },
  0x42: { id: 0x42, name: 'Dragoon', race: 'protoss', category: 'military', cost: { minerals: 125, gas: 50, supply: 2, buildTime: 30 } },
  0x43: { id: 0x43, name: 'High Templar', race: 'protoss', category: 'military', cost: { minerals: 50, gas: 150, supply: 2, buildTime: 50 } },
  0x44: { id: 0x44, name: 'Archon', race: 'protoss', category: 'military', cost: { minerals: 0, gas: 0, supply: 4, buildTime: 20 } },
  0x45: { id: 0x45, name: 'Shuttle', race: 'protoss', category: 'military', cost: { minerals: 200, gas: 0, supply: 2, buildTime: 60 } },
  0x46: { id: 0x46, name: 'Scout', race: 'protoss', category: 'military', cost: { minerals: 275, gas: 125, supply: 3, buildTime: 80 } },
  0x47: { id: 0x47, name: 'Arbiter', race: 'protoss', category: 'military', cost: { minerals: 100, gas: 350, supply: 4, buildTime: 160 } },
  0x48: { id: 0x48, name: 'Carrier', race: 'protoss', category: 'military', cost: { minerals: 350, gas: 250, supply: 6, buildTime: 140 } },
  0x49: { id: 0x49, name: 'Interceptor', race: 'protoss', category: 'military', cost: { minerals: 25, gas: 0, supply: 0, buildTime: 20 } },
  0x50: { id: 0x50, name: 'Dark Templar', race: 'protoss', category: 'military', cost: { minerals: 125, gas: 100, supply: 2, buildTime: 50 } },
  0x51: { id: 0x51, name: 'Dark Archon', race: 'protoss', category: 'military', cost: { minerals: 0, gas: 0, supply: 4, buildTime: 20 } },
  0x52: { id: 0x52, name: 'Corsair', race: 'protoss', category: 'military', cost: { minerals: 150, gas: 100, supply: 2, buildTime: 40 } },
  0x53: { id: 0x53, name: 'Reaver', race: 'protoss', category: 'military', cost: { minerals: 200, gas: 100, supply: 4, buildTime: 70 } },
  0x54: { id: 0x54, name: 'Observer', race: 'protoss', category: 'military', cost: { minerals: 25, gas: 75, supply: 1, buildTime: 40 } },

  // Protoss Buildings
  0x9A: { id: 0x9A, name: 'Nexus', race: 'protoss', category: 'building', cost: { minerals: 400, gas: 0, supply: 0, buildTime: 120 }, produces: 1 },
  0x9B: { id: 0x9B, name: 'Robotics Facility', race: 'protoss', category: 'building', cost: { minerals: 200, gas: 200, supply: 0, buildTime: 65 } },
  0x9C: { id: 0x9C, name: 'Pylon', race: 'protoss', category: 'building', cost: { minerals: 100, gas: 0, supply: 0, buildTime: 25 }, produces: 8 },
  0x9D: { id: 0x9D, name: 'Assimilator', race: 'protoss', category: 'building', cost: { minerals: 100, gas: 0, supply: 0, buildTime: 30 } },
  0x9E: { id: 0x9E, name: 'Observatory', race: 'protoss', category: 'building', cost: { minerals: 50, gas: 100, supply: 0, buildTime: 30 } },
  0x9F: { id: 0x9F, name: 'Gateway', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 0, supply: 0, buildTime: 60 } },
  0xA0: { id: 0xA0, name: 'Photon Cannon', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 0, supply: 0, buildTime: 50 } },
  0xA1: { id: 0xA1, name: 'Citadel of Adun', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 100, supply: 0, buildTime: 60 } },
  0xA2: { id: 0xA2, name: 'Cybernetics Core', race: 'protoss', category: 'building', cost: { minerals: 200, gas: 0, supply: 0, buildTime: 60 } },
  0xA3: { id: 0xA3, name: 'Templar Archives', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 200, supply: 0, buildTime: 60 } },
  0xA4: { id: 0xA4, name: 'Forge', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 0, supply: 0, buildTime: 45 } },
  0xA5: { id: 0xA5, name: 'Stargate', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 150, supply: 0, buildTime: 70 } },
  0xA6: { id: 0xA6, name: 'Fleet Beacon', race: 'protoss', category: 'building', cost: { minerals: 300, gas: 200, supply: 0, buildTime: 60 } },
  0xA7: { id: 0xA7, name: 'Arbiter Tribunal', race: 'protoss', category: 'building', cost: { minerals: 200, gas: 150, supply: 0, buildTime: 60 } },
  0xA8: { id: 0xA8, name: 'Robotics Support Bay', race: 'protoss', category: 'building', cost: { minerals: 150, gas: 100, supply: 0, buildTime: 30 } },
  0xA9: { id: 0xA9, name: 'Shield Battery', race: 'protoss', category: 'building', cost: { minerals: 100, gas: 0, supply: 0, buildTime: 30 } },

  // Terran Units
  0x07: { id: 0x07, name: 'SCV', race: 'terran', category: 'worker', cost: { minerals: 50, gas: 0, supply: 1, buildTime: 20 } },
  0x00: { id: 0x00, name: 'Marine', race: 'terran', category: 'military', cost: { minerals: 50, gas: 0, supply: 1, buildTime: 24 } },
  0x01: { id: 0x01, name: 'Firebat', race: 'terran', category: 'military', cost: { minerals: 50, gas: 25, supply: 1, buildTime: 24 } },
  0x02: { id: 0x02, name: 'Medic', race: 'terran', category: 'military', cost: { minerals: 50, gas: 25, supply: 1, buildTime: 30 } },
  0x03: { id: 0x03, name: 'Ghost', race: 'terran', category: 'military', cost: { minerals: 25, gas: 75, supply: 1, buildTime: 50 } },
  0x05: { id: 0x05, name: 'Vulture', race: 'terran', category: 'military', cost: { minerals: 75, gas: 0, supply: 2, buildTime: 30 } },
  0x06: { id: 0x06, name: 'Goliath', race: 'terran', category: 'military', cost: { minerals: 100, gas: 50, supply: 2, buildTime: 40 } },
  0x08: { id: 0x08, name: 'Siege Tank', race: 'terran', category: 'military', cost: { minerals: 150, gas: 100, supply: 2, buildTime: 50 } },
  0x0B: { id: 0x0B, name: 'Wraith', race: 'terran', category: 'military', cost: { minerals: 150, gas: 100, supply: 2, buildTime: 60 } },
  0x0C: { id: 0x0C, name: 'Dropship', race: 'terran', category: 'military', cost: { minerals: 100, gas: 100, supply: 2, buildTime: 50 } },
  0x0D: { id: 0x0D, name: 'Science Vessel', race: 'terran', category: 'military', cost: { minerals: 100, gas: 225, supply: 2, buildTime: 80 } },
  0x0E: { id: 0x0E, name: 'Battlecruiser', race: 'terran', category: 'military', cost: { minerals: 400, gas: 300, supply: 6, buildTime: 133 } },
  0x20: { id: 0x20, name: 'Valkyrie', race: 'terran', category: 'military', cost: { minerals: 250, gas: 125, supply: 3, buildTime: 50 } },

  // Terran Buildings
  0x6A: { id: 0x6A, name: 'Command Center', race: 'terran', category: 'building', cost: { minerals: 400, gas: 0, supply: 0, buildTime: 120 } },
  0x6B: { id: 0x6B, name: 'Supply Depot', race: 'terran', category: 'building', cost: { minerals: 100, gas: 0, supply: 0, buildTime: 30 }, produces: 8 },
  0x6C: { id: 0x6C, name: 'Refinery', race: 'terran', category: 'building', cost: { minerals: 100, gas: 0, supply: 0, buildTime: 30 } },
  0x6D: { id: 0x6D, name: 'Barracks', race: 'terran', category: 'building', cost: { minerals: 150, gas: 0, supply: 0, buildTime: 60 } },
  0x6E: { id: 0x6E, name: 'Academy', race: 'terran', category: 'building', cost: { minerals: 150, gas: 0, supply: 0, buildTime: 60 } },
  0x6F: { id: 0x6F, name: 'Factory', race: 'terran', category: 'building', cost: { minerals: 200, gas: 100, supply: 0, buildTime: 60 } },
  0x70: { id: 0x70, name: 'Starport', race: 'terran', category: 'building', cost: { minerals: 150, gas: 100, supply: 0, buildTime: 70 } },
  0x71: { id: 0x71, name: 'Control Tower', race: 'terran', category: 'building', cost: { minerals: 50, gas: 50, supply: 0, buildTime: 30 } },
  0x72: { id: 0x72, name: 'Science Facility', race: 'terran', category: 'building', cost: { minerals: 100, gas: 150, supply: 0, buildTime: 60 } },
  0x73: { id: 0x73, name: 'Covert Ops', race: 'terran', category: 'building', cost: { minerals: 50, gas: 50, supply: 0, buildTime: 30 } },
  0x74: { id: 0x74, name: 'Physics Lab', race: 'terran', category: 'building', cost: { minerals: 50, gas: 50, supply: 0, buildTime: 30 } },
  0x75: { id: 0x75, name: 'Machine Shop', race: 'terran', category: 'building', cost: { minerals: 50, gas: 50, supply: 0, buildTime: 30 } },
  0x76: { id: 0x76, name: 'Bunker', race: 'terran', category: 'building', cost: { minerals: 100, gas: 0, supply: 0, buildTime: 30 } },
  0x77: { id: 0x77, name: 'Missile Turret', race: 'terran', category: 'building', cost: { minerals: 100, gas: 0, supply: 0, buildTime: 30 } },
  0x78: { id: 0x78, name: 'Engineering Bay', race: 'terran', category: 'building', cost: { minerals: 125, gas: 0, supply: 0, buildTime: 35 } },
  0x79: { id: 0x79, name: 'Armory', race: 'terran', category: 'building', cost: { minerals: 100, gas: 50, supply: 0, buildTime: 65 } },

  // Zerg Units
  0x25: { id: 0x25, name: 'Drone', race: 'zerg', category: 'worker', cost: { minerals: 50, gas: 0, supply: 1, buildTime: 20 } },
  0x26: { id: 0x26, name: 'Zergling', race: 'zerg', category: 'military', cost: { minerals: 50, gas: 0, supply: 1, buildTime: 28 } },
  0x27: { id: 0x27, name: 'Hydralisk', race: 'zerg', category: 'military', cost: { minerals: 75, gas: 25, supply: 1, buildTime: 28 } },
  0x28: { id: 0x28, name: 'Ultralisk', race: 'zerg', category: 'military', cost: { minerals: 200, gas: 200, supply: 4, buildTime: 60 } },
  0x29: { id: 0x29, name: 'Broodling', race: 'zerg', category: 'military', cost: { minerals: 0, gas: 0, supply: 0, buildTime: 0 } },
  0x2A: { id: 0x2A, name: 'Overlord', race: 'zerg', category: 'military', cost: { minerals: 100, gas: 0, supply: 0, buildTime: 40 }, produces: 8 },
  0x2B: { id: 0x2B, name: 'Mutalisk', race: 'zerg', category: 'military', cost: { minerals: 100, gas: 100, supply: 2, buildTime: 40 } },
  0x2C: { id: 0x2C, name: 'Guardian', race: 'zerg', category: 'military', cost: { minerals: 50, gas: 100, supply: 2, buildTime: 40 } },
  0x2D: { id: 0x2D, name: 'Queen', race: 'zerg', category: 'military', cost: { minerals: 100, gas: 100, supply: 2, buildTime: 50 } },
  0x2E: { id: 0x2E, name: 'Defiler', race: 'zerg', category: 'military', cost: { minerals: 50, gas: 150, supply: 2, buildTime: 50 } },
  0x2F: { id: 0x2F, name: 'Scourge', race: 'zerg', category: 'military', cost: { minerals: 25, gas: 75, supply: 1, buildTime: 30 } },
  0x3A: { id: 0x3A, name: 'Lurker', race: 'zerg', category: 'military', cost: { minerals: 50, gas: 100, supply: 2, buildTime: 40 } },
  0x67: { id: 0x67, name: 'Devourer', race: 'zerg', category: 'military', cost: { minerals: 50, gas: 100, supply: 2, buildTime: 40 } },

  // Zerg Buildings
  0x82: { id: 0x82, name: 'Hatchery', race: 'zerg', category: 'building', cost: { minerals: 300, gas: 0, supply: 0, buildTime: 120 }, produces: 1 },
  0x83: { id: 0x83, name: 'Lair', race: 'zerg', category: 'building', cost: { minerals: 150, gas: 100, supply: 0, buildTime: 80 } },
  0x84: { id: 0x84, name: 'Hive', race: 'zerg', category: 'building', cost: { minerals: 200, gas: 150, supply: 0, buildTime: 100 } },
  0x85: { id: 0x85, name: 'Nydus Canal', race: 'zerg', category: 'building', cost: { minerals: 150, gas: 0, supply: 0, buildTime: 30 } },
  0x86: { id: 0x86, name: 'Hydralisk Den', race: 'zerg', category: 'building', cost: { minerals: 100, gas: 50, supply: 0, buildTime: 40 } },
  0x87: { id: 0x87, name: 'Defiler Mound', race: 'zerg', category: 'building', cost: { minerals: 100, gas: 100, supply: 0, buildTime: 50 } },
  0x88: { id: 0x88, name: 'Greater Spire', race: 'zerg', category: 'building', cost: { minerals: 100, gas: 150, supply: 0, buildTime: 100 } },
  0x89: { id: 0x89, name: 'Queens Nest', race: 'zerg', category: 'building', cost: { minerals: 150, gas: 100, supply: 0, buildTime: 50 } },
  0x8A: { id: 0x8A, name: 'Evolution Chamber', race: 'zerg', category: 'building', cost: { minerals: 75, gas: 0, supply: 0, buildTime: 40 } },
  0x8B: { id: 0x8B, name: 'Ultralisk Cavern', race: 'zerg', category: 'building', cost: { minerals: 150, gas: 200, supply: 0, buildTime: 80 } },
  0x8C: { id: 0x8C, name: 'Spire', race: 'zerg', category: 'building', cost: { minerals: 200, gas: 150, supply: 0, buildTime: 100 } },
  0x8D: { id: 0x8D, name: 'Spawning Pool', race: 'zerg', category: 'building', cost: { minerals: 200, gas: 0, supply: 0, buildTime: 65 } },
  0x8E: { id: 0x8E, name: 'Creep Colony', race: 'zerg', category: 'building', cost: { minerals: 75, gas: 0, supply: 0, buildTime: 20 } },
  0x8F: { id: 0x8F, name: 'Spore Colony', race: 'zerg', category: 'building', cost: { minerals: 50, gas: 0, supply: 0, buildTime: 30 } },
  0x90: { id: 0x90, name: 'Sunken Colony', race: 'zerg', category: 'building', cost: { minerals: 50, gas: 0, supply: 0, buildTime: 30 } },
  0x91: { id: 0x91, name: 'Extractor', race: 'zerg', category: 'building', cost: { minerals: 50, gas: 0, supply: 0, buildTime: 30 } }
};

export class EnhancedBuildOrderExtractor {
  private playerStates: Map<number, PlayerResourceState> = new Map();
  private buildOrders: Map<number, EnhancedBuildOrderEntry[]> = new Map();
  private raceMapping: Record<number, string> = {};

  constructor(players: any[]) {
    // Initialize player states based on race
    players.forEach((player, index) => {
      const race = player.race?.toLowerCase() || 'unknown';
      this.raceMapping[index] = race;
      
      const startingSupply = this.getStartingSupply(race);
      const startingMaxSupply = this.getStartingMaxSupply(race);
      
      this.playerStates.set(index, {
        minerals: 50,
        gas: 0,
        currentSupply: startingSupply,
        maxSupply: startingMaxSupply,
        workerCount: 4,
        buildings: this.getStartingBuildings(race),
        units: this.getStartingUnits(race)
      });
      
      this.buildOrders.set(index, []);
    });
  }

  private getStartingSupply(race: string): number {
    switch (race) {
      case 'protoss': return 4; // 4 Probes
      case 'terran': return 4;  // 4 SCVs 
      case 'zerg': return 4;    // 4 Drones
      default: return 4;
    }
  }

  private getStartingMaxSupply(race: string): number {
    switch (race) {
      case 'protoss': return 9; // Nexus (1) + starting workers don't need supply
      case 'terran': return 10; // Command Center provides 10 starting supply
      case 'zerg': return 9;    // 1 starting Overlord (8) + 1 from Hatchery
      default: return 10;
    }
  }

  private getStartingBuildings(race: string): string[] {
    switch (race) {
      case 'protoss': return ['Nexus'];
      case 'terran': return ['Command Center'];
      case 'zerg': return ['Hatchery'];
      default: return [];
    }
  }

  private getStartingUnits(race: string): string[] {
    switch (race) {
      case 'protoss': return ['Probe', 'Probe', 'Probe', 'Probe'];
      case 'terran': return ['SCV', 'SCV', 'SCV', 'SCV'];
      case 'zerg': return ['Drone', 'Drone', 'Drone', 'Drone', 'Overlord'];
      default: return [];
    }
  }

  public processCommands(commands: Command[]): void {
    console.log('[EnhancedBuildOrderExtractor] Processing', commands.length, 'commands');
    
    for (const cmd of commands) {
      if (cmd.effective) {
        console.log(`[EnhancedBuildOrderExtractor] Processing command:`, {
          type: cmd.typeString,
          playerId: cmd.playerId,
          time: cmd.time,
          parameters: cmd.parameters
        });
        
        const playerId = cmd.playerId || 0;
        const playerState = this.playerStates.get(playerId);
        if (!playerState) continue;
        
        // Call the correct method based on command type
        switch (cmd.typeString) {
          case 'Build':
            this.processBuildCommand(cmd, playerId, playerState);
            break;
          case 'Train':
            // Only process essential supply units (Overlords), skip other units
            this.processEssentialTrainCommand(cmd, playerId, playerState);
            break;
          case 'Research':
            this.processResearchCommand(cmd, playerId, playerState);
            break;
          case 'Upgrade':
            this.processUpgradeCommand(cmd, playerId, playerState);
            break;
          case 'Morph':
            // Morph commands can create buildings (like Lair from Hatchery)
            this.processBuildCommand(cmd, playerId, playerState);
            break;
        }
      }
    }
    
    console.log('[EnhancedBuildOrderExtractor] Extraction complete. Build orders found:', 
      Array.from(this.buildOrders.entries()).map(([playerId, orders]) => 
        `Player ${playerId}: ${orders.length} entries`
      ).join(', ')
    );
  }

  private processCommand(cmd: Command): void {
    const playerId = cmd.playerId || 0;
    const playerState = this.playerStates.get(playerId);
    if (!playerState) return;

    // Update resources over time (simplified)
    this.updateResourcesOverTime(playerId, cmd.frame);

    switch (cmd.typeString) {
      case 'Build':
        this.processBuildCommand(cmd, playerId, playerState);
        break;
      case 'Train':
        this.processTrainCommand(cmd, playerId, playerState);
        break;
      case 'Research':
        this.processResearchCommand(cmd, playerId, playerState);
        break;
      case 'Upgrade':
        this.processUpgradeCommand(cmd, playerId, playerState);
        break;
    }
  }

  private processBuildCommand(cmd: Command, playerId: number, playerState: PlayerResourceState): void {
    // Extract building info based on race and supply timing (Liquipedia style)
    const gameTime = cmd.frame / 24; // seconds
    const race = this.raceMapping[playerId];
    const supply = playerState.currentSupply;
    
    // First try to get real unit name from command parameters
    let unitName = this.extractUnitNameFromCommand(cmd, race, supply, gameTime);
    let cost = this.getUnitCost(unitName);
    let category: 'economy' | 'military' | 'tech' | 'supply' = this.categorizeBuilding(unitName);
    
    // Race-specific build estimation based on professional build orders
    if (race === 'protoss') {
      if (supply === 8 && gameTime < 60) {
        unitName = 'Pylon';
        cost = { minerals: 100, gas: 0 };
        category = 'supply';
        playerState.maxSupply += 8;
      } else if (supply >= 10 && supply <= 12 && gameTime < 120) {
        unitName = 'Gateway';
        cost = { minerals: 150, gas: 0 };
        category = 'military';
      } else if (supply >= 13 && supply <= 16 && gameTime < 180) {
        unitName = 'Assimilator';
        cost = { minerals: 100, gas: 0 };
        category = 'economy';
      } else if (supply >= 14 && supply <= 18 && gameTime > 120 && gameTime < 300) {
        // Could be Nexus expansion or Cybernetics Core
        if (gameTime < 200) {
          unitName = 'Nexus';
          cost = { minerals: 400, gas: 0 };
          category = 'economy';
        } else {
          unitName = 'Cybernetics Core';
          cost = { minerals: 200, gas: 0 };
          category = 'tech';
        }
      } else if (gameTime > 180) {
        unitName = 'Pylon';
        cost = { minerals: 100, gas: 0 };
        category = 'supply';
        playerState.maxSupply += 8;
      }
    } else if (race === 'terran') {
      if (supply === 9 && gameTime < 60) {
        unitName = 'Supply Depot';
        cost = { minerals: 100, gas: 0 };
        category = 'supply';
        playerState.maxSupply += 8;
      } else if (supply >= 10 && supply <= 14 && gameTime < 120) {
        unitName = 'Barracks';
        cost = { minerals: 150, gas: 0 };
        category = 'military';
      } else if (supply >= 15 && supply <= 20 && gameTime > 120 && gameTime < 300) {
        if (gameTime < 180) {
          unitName = 'Supply Depot';
          cost = { minerals: 100, gas: 0 };
          category = 'supply';
          playerState.maxSupply += 8;
        } else {
          unitName = 'Command Center';
          cost = { minerals: 400, gas: 0 };
          category = 'economy';
        }
      } else if (gameTime > 180) {
        unitName = 'Factory';
        cost = { minerals: 200, gas: 100 };
        category = 'military';
      }
    } else if (race === 'zerg') {
      if (supply >= 9 && supply <= 12 && gameTime < 120) {
        unitName = 'Spawning Pool';
        cost = { minerals: 200, gas: 0 };
        category = 'military';
      } else if (supply >= 12 && supply <= 16 && gameTime > 120 && gameTime < 300) {
        unitName = 'Hatchery';
        cost = { minerals: 300, gas: 0 };
        category = 'economy';
      } else if (gameTime > 120) {
        unitName = 'Hydralisk Den';
        cost = { minerals: 100, gas: 50 };
        category = 'military';
      }
    }

    // Deduct costs
    playerState.minerals = Math.max(0, playerState.minerals - cost.minerals);
    playerState.gas = Math.max(0, playerState.gas - cost.gas);
    playerState.buildings.push(unitName);

    // Create build order entry in Liquipedia style: "Supply Building"
    const entry: EnhancedBuildOrderEntry = {
      time: this.frameToTimeString(cmd.frame),
      frame: cmd.frame,
      gameTime: cmd.frame / 24,
      supply: `${playerState.currentSupply}/${playerState.maxSupply}`,
      currentSupply: playerState.currentSupply,
      maxSupply: playerState.maxSupply,
      action: 'Build',
      unitName: `${supply} ${unitName}`, // Liquipedia format: "8 Pylon", "10 Gateway"
      unitId: 0,
      cost: cost,
      category: category,
      race: this.raceMapping[playerId],
      efficiency: this.evaluateEfficiency({ name: unitName, race: race as any, category: 'building', cost: { minerals: cost.minerals, gas: cost.gas, supply: 0, buildTime: 0 }, id: 0 }, playerState, cmd.frame),
      description: `${race.charAt(0).toUpperCase() + race.slice(1)} build order - ${supply} ${unitName}`
    };

    this.buildOrders.get(playerId)?.push(entry);
  }

  private processTrainCommand(cmd: Command, playerId: number, playerState: PlayerResourceState): void {
    // Extract unit info from command parameters or estimate based on timing
    const gameTime = cmd.frame / 24; // seconds
    const race = this.raceMapping[playerId];
    const supply = playerState.currentSupply;
    
    // Estimate unit based on race, timing and supply
    let unitName = 'Unit';
    let cost = { minerals: 50, gas: 0 };
    let category: 'economy' | 'military' | 'tech' | 'supply' = 'military';
    let supplyUsed = 1;
    
    // Race-specific unit estimation based on standard timings
    if (race === 'protoss') {
      if (supply <= 6 || gameTime < 30) {
        unitName = 'Probe';
        cost = { minerals: 50, gas: 0 };
        category = 'economy';
        supplyUsed = 1;
        playerState.workerCount++;
      } else if (supply >= 9 && gameTime < 180) {
        unitName = 'Zealot';
        cost = { minerals: 100, gas: 0 };
        category = 'military';
        supplyUsed = 2;
      } else if (gameTime > 120) {
        unitName = 'Dragoon';
        cost = { minerals: 125, gas: 50 };
        category = 'military';
        supplyUsed = 2;
      }
    } else if (race === 'terran') {
      if (supply <= 8 || gameTime < 30) {
        unitName = 'SCV';
        cost = { minerals: 50, gas: 0 };
        category = 'economy';
        supplyUsed = 1;
        playerState.workerCount++;
      } else if (supply >= 10 && gameTime < 300) {
        unitName = 'Marine';
        cost = { minerals: 50, gas: 0 };
        category = 'military';
        supplyUsed = 1;
      } else if (gameTime > 180) {
        unitName = 'Vulture';
        cost = { minerals: 75, gas: 0 };
        category = 'military';
        supplyUsed = 2;
      }
    } else if (race === 'zerg') {
      if (supply <= 8 || gameTime < 30) {
        unitName = 'Drone';
        cost = { minerals: 50, gas: 0 };
        category = 'economy';
        supplyUsed = 1;
        playerState.workerCount++;
      } else if (supply >= 9 && supply <= 15 && gameTime < 300) {
        unitName = 'Overlord';
        cost = { minerals: 100, gas: 0 };
        category = 'supply';
        supplyUsed = 0;
        playerState.maxSupply += 8;
      } else if (gameTime > 120) {
        unitName = 'Zergling';
        cost = { minerals: 50, gas: 0 };
        category = 'military';
        supplyUsed = 1;
      }
    }

    // Deduct costs and update supply
    playerState.minerals = Math.max(0, playerState.minerals - cost.minerals);
    playerState.gas = Math.max(0, playerState.gas - cost.gas);
    playerState.currentSupply += supplyUsed;
    playerState.units.push(unitName);

    // Create build order entry
    const entry: EnhancedBuildOrderEntry = {
      time: this.frameToTimeString(cmd.frame),
      frame: cmd.frame,
      gameTime: cmd.frame / 24,
      supply: `${playerState.currentSupply}/${playerState.maxSupply}`,
      currentSupply: playerState.currentSupply,
      maxSupply: playerState.maxSupply,
      action: 'Train',
      unitName: unitName,
      unitId: 0,
      cost: cost,
      category: category,
      race: this.raceMapping[playerId],
      efficiency: this.evaluateEfficiency({ name: unitName, race: race as any, category: 'military', cost: { minerals: cost.minerals, gas: cost.gas, supply: supplyUsed, buildTime: 0 }, id: 0 }, playerState, cmd.frame),
      description: `${race.charAt(0).toUpperCase() + race.slice(1)} unit - ${unitName}`
    };

    this.buildOrders.get(playerId)?.push(entry);
  }

  private processResearchCommand(cmd: Command, playerId: number, playerState: PlayerResourceState): void {
    // Simplified research handling
    const entry: EnhancedBuildOrderEntry = {
      time: this.frameToTimeString(cmd.frame),
      frame: cmd.frame,
      gameTime: cmd.frame / 24,
      supply: `${playerState.currentSupply}/${playerState.maxSupply}`,
      currentSupply: playerState.currentSupply,
      maxSupply: playerState.maxSupply,
      action: 'Research',
      unitName: 'Technology',
      unitId: 0,
      cost: { minerals: 0, gas: 0 },
      category: 'tech',
      race: this.raceMapping[playerId],
      efficiency: 'optimal',
      description: 'Research Technology'
    };

    this.buildOrders.get(playerId)?.push(entry);
  }

  private processUpgradeCommand(cmd: Command, playerId: number, playerState: PlayerResourceState): void {
    // Simplified upgrade handling
    const entry: EnhancedBuildOrderEntry = {
      time: this.frameToTimeString(cmd.frame),
      frame: cmd.frame,
      gameTime: cmd.frame / 24,
      supply: `${playerState.currentSupply}/${playerState.maxSupply}`,
      currentSupply: playerState.currentSupply,
      maxSupply: playerState.maxSupply,
      action: 'Upgrade',
      unitName: 'Upgrade',
      unitId: 0,
      cost: { minerals: 0, gas: 0 },
      category: 'tech',
      race: this.raceMapping[playerId],
      efficiency: 'optimal',
      description: 'Unit Upgrade'
    };

    this.buildOrders.get(playerId)?.push(entry);
  }

  private updateResourcesOverTime(playerId: number, frame: number): void {
    const playerState = this.playerStates.get(playerId);
    if (!playerState) return;

    // Simplified resource generation (8 minerals per second per worker)
    const gameTime = frame / 24;
    const resourceRate = 8 * playerState.workerCount / 60; // per second to per frame
    
    playerState.minerals += resourceRate;
    playerState.gas += resourceRate * 0.5; // Gas is slower
  }

  private canAfford(playerState: PlayerResourceState, unit: SCUnit): boolean {
    return playerState.minerals >= unit.cost.minerals && 
           playerState.gas >= unit.cost.gas &&
           (playerState.currentSupply + unit.cost.supply) <= playerState.maxSupply;
  }

  private categorizeBuilding(unitName: string): 'economy' | 'military' | 'tech' | 'supply' {
    const supplyBuildings = ['Pylon', 'Supply Depot', 'Overlord'];
    const economyBuildings = ['Nexus', 'Command Center', 'Hatchery', 'Assimilator', 'Refinery', 'Extractor'];
    const techBuildings = ['Cybernetics Core', 'Academy', 'Evolution Chamber', 'Forge', 'Engineering Bay'];
    
    if (supplyBuildings.includes(unitName)) return 'supply';
    if (economyBuildings.includes(unitName)) return 'economy';
    if (techBuildings.includes(unitName)) return 'tech';
    return 'military';
  }

  private categorizeUnit(unitName: string): 'economy' | 'military' | 'tech' | 'supply' {
    const workers = ['Probe', 'SCV', 'Drone'];
    const supplyUnits = ['Overlord'];
    
    if (workers.includes(unitName)) return 'economy';
    if (supplyUnits.includes(unitName)) return 'supply';
    return 'military';
  }

  private evaluateEfficiency(unit: SCUnit, playerState: PlayerResourceState, frame: number): 'optimal' | 'early' | 'late' | 'supply-blocked' {
    const gameTime = frame / 24;
    const supply = playerState.currentSupply;
    
    // Supply blocked check
    if (supply >= playerState.maxSupply - 1) return 'supply-blocked';
    
    // Race-specific build order timing evaluation
    if (unit.name === 'Pylon' && gameTime < 25 && supply <= 8) return 'optimal';
    if (unit.name === 'Gateway' && gameTime >= 30 && gameTime <= 45 && supply >= 9) return 'optimal';
    if (unit.name === 'Supply Depot' && gameTime < 30 && supply <= 9) return 'optimal';
    if (unit.name === 'Barracks' && gameTime >= 35 && gameTime <= 50 && supply >= 10) return 'optimal';
    if (unit.name === 'Spawning Pool' && gameTime >= 40 && gameTime <= 60 && supply >= 9) return 'optimal';
    
    // General timing evaluation
    if (gameTime < 30) return 'early';
    if (gameTime > 180) return 'late';
    return 'optimal';
  }

  private generateDescription(unit: SCUnit, playerState: PlayerResourceState): string {
    const race = unit.race.charAt(0).toUpperCase() + unit.race.slice(1);
    return `${race} ${unit.category} - ${unit.name}`;
  }

  private frameToTimeString(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public getBuildOrder(playerId: number): EnhancedBuildOrderEntry[] {
    return this.buildOrders.get(playerId) || [];
  }


  public getPlayerState(playerId: number): PlayerResourceState | undefined {
    return this.playerStates.get(playerId);
  }

  public getBuildOrderAnalysis(playerId: number) {
    const buildOrder = this.getBuildOrder(playerId);
    const playerState = this.getPlayerState(playerId);
    
    if (!buildOrder.length || !playerState) return null;

    return {
      totalActions: buildOrder.length,
      economicActions: buildOrder.filter(entry => entry.category === 'economy').length,
      militaryActions: buildOrder.filter(entry => entry.category === 'military').length,
      techActions: buildOrder.filter(entry => entry.category === 'tech').length,
      supplyActions: buildOrder.filter(entry => entry.category === 'supply').length,
      efficiency: {
        optimal: buildOrder.filter(entry => entry.efficiency === 'optimal').length,
        early: buildOrder.filter(entry => entry.efficiency === 'early').length,
        late: buildOrder.filter(entry => entry.efficiency === 'late').length,
        supplyBlocked: buildOrder.filter(entry => entry.efficiency === 'supply-blocked').length
      },
      averageSupply: buildOrder.reduce((sum, entry) => sum + entry.currentSupply, 0) / buildOrder.length,
      buildOrderScore: this.calculateBuildOrderScore(buildOrder)
    };
  }

  private calculateBuildOrderScore(buildOrder: EnhancedBuildOrderEntry[]): number {
    let score = 100;
    
    // Penalize late/early actions
    const lateActions = buildOrder.filter(entry => entry.efficiency === 'late').length;
    const earlyActions = buildOrder.filter(entry => entry.efficiency === 'early').length;
    const supplyBlocked = buildOrder.filter(entry => entry.efficiency === 'supply-blocked').length;
    
    score -= (lateActions * 5);
    score -= (earlyActions * 3);
    score -= (supplyBlocked * 10);
    
    return Math.max(0, score);
  }

  private extractUnitNameFromCommand(cmd: Command, race: string, supply: number, gameTime: number): string {
    // Try to extract unit ID from command parameters
    if (cmd.parameters && typeof cmd.parameters === 'object') {
      // Check for unitType or buildingType in parameters
      const unitType = cmd.parameters.unitType || cmd.parameters.buildingType || cmd.parameters.unit;
      if (unitType !== undefined) {
        const unitFromMap = this.getUnitNameFromId(unitType);
        if (unitFromMap) return unitFromMap;
      }
    }

    // Fallback to intelligent timing-based estimation
    return this.estimateUnitFromTiming(race, supply, gameTime, cmd.typeString);
  }

  private getUnitNameFromId(unitId: number): string | null {
    // Use the SC_UNITS database to find unit by ID
    const unit = SC_UNITS[unitId];
    return unit ? unit.name : null;
  }

  private estimateUnitFromTiming(race: string, supply: number, gameTime: number, commandType: string): string {
    // Intelligent estimation based on professional build orders
    if (race === 'protoss') {
      if (commandType === 'Build') {
        if (supply === 8 && gameTime < 60) return 'Pylon';
        if (supply >= 10 && supply <= 12 && gameTime < 120) return 'Gateway';
        if (supply >= 13 && supply <= 16 && gameTime < 180) return 'Assimilator';
        if (supply >= 14 && supply <= 18 && gameTime > 120 && gameTime < 300) {
          return gameTime < 200 ? 'Nexus' : 'Cybernetics Core';
        }
        if (gameTime > 180) return 'Pylon';
      }
      if (commandType === 'Train') {
        if (supply <= 6 || gameTime < 30) return 'Probe';
        if (supply >= 9 && gameTime < 180) return 'Zealot';
        return 'Dragoon';
      }
    } else if (race === 'terran') {
      if (commandType === 'Build') {
        if (supply === 9 && gameTime < 60) return 'Supply Depot';
        if (supply >= 10 && supply <= 14 && gameTime < 120) return 'Barracks';
        if (supply >= 15 && supply <= 20 && gameTime > 120 && gameTime < 300) {
          return gameTime < 180 ? 'Supply Depot' : 'Command Center';
        }
        return 'Factory';
      }
      if (commandType === 'Train') {
        if (supply <= 8 || gameTime < 30) return 'SCV';
        if (supply >= 10 && gameTime < 300) return 'Marine';
        return 'Vulture';
      }
    } else if (race === 'zerg') {
      if (commandType === 'Build') {
        if (supply >= 9 && supply <= 12 && gameTime < 120) return 'Spawning Pool';
        if (supply >= 12 && supply <= 16 && gameTime > 120 && gameTime < 300) return 'Hatchery';
        return 'Hydralisk Den';
      }
      if (commandType === 'Train') {
        if (supply <= 8 || gameTime < 30) return 'Drone';
        if (supply >= 9 && supply <= 15 && gameTime < 300) return 'Overlord';
        return 'Zergling';
      }
    }

    return commandType === 'Build' ? 'Building' : 'Unit';
  }

  private getUnitCost(unitName: string): { minerals: number; gas: number } {
    // Find unit in SC_UNITS database
    const unit = Object.values(SC_UNITS).find(u => u.name === unitName);
    if (unit) {
      return { minerals: unit.cost.minerals, gas: unit.cost.gas };
    }

    // Default costs for common units
    const defaultCosts: Record<string, { minerals: number; gas: number }> = {
      'Pylon': { minerals: 100, gas: 0 },
      'Gateway': { minerals: 150, gas: 0 },
      'Nexus': { minerals: 400, gas: 0 },
      'Assimilator': { minerals: 100, gas: 0 },
      'Cybernetics Core': { minerals: 200, gas: 0 },
      'Supply Depot': { minerals: 100, gas: 0 },
      'Barracks': { minerals: 150, gas: 0 },
      'Command Center': { minerals: 400, gas: 0 },
      'Factory': { minerals: 200, gas: 100 },
      'Spawning Pool': { minerals: 200, gas: 0 },
      'Hatchery': { minerals: 300, gas: 0 },
      'Hydralisk Den': { minerals: 100, gas: 50 },
      'Probe': { minerals: 50, gas: 0 },
      'Zealot': { minerals: 100, gas: 0 },
      'Dragoon': { minerals: 125, gas: 50 },
      'SCV': { minerals: 50, gas: 0 },
      'Marine': { minerals: 50, gas: 0 },
      'Vulture': { minerals: 75, gas: 0 },
      'Drone': { minerals: 50, gas: 0 },
      'Overlord': { minerals: 100, gas: 0 },
      'Zergling': { minerals: 50, gas: 0 }
    };

    return defaultCosts[unitName] || { minerals: 100, gas: 0 };
  }

  private processEssentialTrainCommand(cmd: Command, playerId: number, playerState: PlayerResourceState): void {
    const unitName = this.extractUnitNameFromCommand(cmd, this.raceMapping[playerId], playerState.currentSupply, cmd.frame / 24);
    
    // Only include essential supply units in build orders (Overlords for Zerg)
    const essentialUnits = ['Overlord'];
    
    if (!essentialUnits.includes(unitName)) {
      return; // Skip non-essential units
    }

    const cost = this.getUnitCost(unitName);
    let category: 'economy' | 'military' | 'tech' | 'supply' = 'supply';
    let supplyUsed = 0;
    
    if (unitName === 'Overlord') {
      playerState.maxSupply += 8;
      supplyUsed = 0; // Overlords don't cost supply
    }

    // Deduct costs and update supply
    playerState.minerals = Math.max(0, playerState.minerals - cost.minerals);
    playerState.gas = Math.max(0, playerState.gas - cost.gas);
    playerState.currentSupply += supplyUsed;
    playerState.units.push(unitName);

    // Create build order entry for essential units only
    const entry: EnhancedBuildOrderEntry = {
      time: this.frameToTimeString(cmd.frame),
      frame: cmd.frame,
      gameTime: cmd.frame / 24,
      supply: `${playerState.currentSupply}/${playerState.maxSupply}`,
      currentSupply: playerState.currentSupply,
      maxSupply: playerState.maxSupply,
      action: 'Train',
      unitName: `${playerState.currentSupply} ${unitName}`, // Supply format
      unitId: 0,
      cost: cost,
      category: category,
      race: this.raceMapping[playerId],
      efficiency: this.evaluateEfficiency({ name: unitName, race: this.raceMapping[playerId] as any, category: 'military', cost: { minerals: cost.minerals, gas: cost.gas, supply: supplyUsed, buildTime: 0 }, id: 0 }, playerState, cmd.frame),
      description: `${this.raceMapping[playerId].charAt(0).toUpperCase() + this.raceMapping[playerId].slice(1)} supply unit - ${unitName}`
    };

    this.buildOrders.get(playerId)?.push(entry);
  }

  public getAllBuildOrders(): Record<number, EnhancedBuildOrderEntry[]> {
    const result: Record<number, EnhancedBuildOrderEntry[]> = {};
    this.buildOrders.forEach((orders, playerId) => {
      result[playerId] = orders;
    });
    return result;
  }

  // Neue Methode um direkt aus BWRemastered Daten zu extrahieren
  public processBWRemasteredData(replayData: any): void {
    console.log('[EnhancedBuildOrderExtractor] Processing BWRemastered data directly');
    
    if (!replayData?.commands) {
      console.log('[EnhancedBuildOrderExtractor] No commands in BWRemastered data');
      return;
    }

    // Zähler für Supply-Tracking per Spieler
    const supplyTracking = new Map<number, number>();
    Array.from(this.playerStates.keys()).forEach(playerId => {
      supplyTracking.set(playerId, this.getStartingSupply(this.raceMapping[playerId]));
    });

    // Direkt aus BWRemastered commands extrahieren
    replayData.commands.forEach((cmd: any) => {
      const playerId = cmd.playerId || 0;
      if (!this.buildOrders.has(playerId)) {
        this.buildOrders.set(playerId, []);
      }

      // Schaue nach Build/Train/Research Commands in den rohen Daten
      const entry = this.extractFromBWRemasteredCommand(cmd, supplyTracking.get(playerId) || 4);
      if (entry) {
        this.buildOrders.get(playerId)!.push(entry);
        
        // Update supply tracking
        if (entry.category === 'supply' || entry.unitName.includes('Overlord') || entry.unitName.includes('Pylon') || entry.unitName.includes('Supply Depot')) {
          const currentSupply = supplyTracking.get(playerId) || 4;
          supplyTracking.set(playerId, currentSupply + 1);
        }
        
        console.log(`[EnhancedBuildOrderExtractor] Added BWRemastered entry for player ${playerId}:`, entry);
      }
    });

    // Sortiere nach Zeit
    this.buildOrders.forEach((orders) => {
      orders.sort((a, b) => a.frame - b.frame);
    });
  }

  private extractFromBWRemasteredCommand(cmd: any, currentSupply: number): EnhancedBuildOrderEntry | null {
    console.log('[extractFromBWRemasteredCommand] Processing command:', {
      typeName: cmd.typeName,
      parameters: cmd.parameters,
      data: cmd.data,
      targetUnitType: cmd.targetUnitType,
      unitType: cmd.unitType
    });
    
    const typeName = cmd.typeName || cmd.kind;
    if (!typeName) return null;

    // Nur Build/Train/Morph Commands verarbeiten
    if (!['TypeIDBuild', 'TypeIDTrain', 'TypeIDUnitMorph', 'TypeIDResearch', 'TypeIDUpgrade'].includes(typeName)) {
      return null;
    }

    let unitId = 0;
    let unitName = 'Unknown';
    let category: 'economy' | 'military' | 'tech' | 'supply' = 'military';
    let action: 'Build' | 'Train' | 'Research' | 'Upgrade' = 'Build';

    // Extrahiere Unit ID aus verschiedenen Quellen
    if (cmd.parameters?.unitTypeId !== undefined) {
      unitId = cmd.parameters.unitTypeId;
    } else if (cmd.targetUnitType !== undefined) {
      unitId = cmd.targetUnitType;
    } else if (cmd.unitType !== undefined) {
      unitId = cmd.unitType;
    } else if (cmd.data && cmd.data.length >= 2) {
      // Versuche aus raw data zu extrahieren
      unitId = cmd.data[0] | (cmd.data[1] << 8);
    }

    console.log('[extractFromBWRemasteredCommand] Extracted unitId:', unitId);

    if (unitId > 0) {
      const unitData = SC_UNITS[unitId];
      if (unitData) {
        unitName = unitData.name;
        
        // Bestimme Kategorie und Action basierend auf Unit Type
        if (unitData.category === 'building') {
          action = 'Build';
          category = this.determineBuildingCategory(unitName);
        } else if (unitData.category === 'worker') {
          action = 'Train';
          category = 'economy';
        } else if (unitName === 'Overlord' || unitName === 'Pylon' || unitName === 'Supply Depot') {
          action = 'Train';
          category = 'supply';
        } else {
          action = 'Train';
          category = 'military';
        }
      } else {
        // Fallback für unbekannte Unit IDs
        unitName = `Unit_${unitId}`;
      }
    } else {
      // Fallback basierend auf Command Type
      if (typeName.includes('Train')) {
        action = 'Train';
        unitName = 'Unit';
        category = 'military';
      } else if (typeName.includes('Build')) {
        action = 'Build';
        unitName = 'Building';
        category = 'economy';
      } else if (typeName.includes('Morph')) {
        action = 'Build';
        unitName = 'Morph';
        category = 'tech';
      }
    }

    // Filtere nur wichtige Build Order Einträge
    if (this.isImportantForBuildOrder(unitName, category)) {
      const supplyString = this.formatSupply(currentSupply, unitName);
      
      return {
        time: this.frameToTimeString(cmd.frame || 0),
        frame: cmd.frame || 0,
        gameTime: Math.floor((cmd.frame || 0) / 24),
        supply: supplyString,
        currentSupply: currentSupply,
        maxSupply: this.calculateMaxSupply(currentSupply, unitName),
        action: action,
        unitName: unitName,
        unitId: unitId,
        cost: this.getCostForUnit(unitId),
        category: category,
        race: this.raceMapping[cmd.playerId] || 'unknown',
        efficiency: 'optimal',
        description: `${supplyString} ${unitName}`
      };
    }

    return null;
  }

  private isImportantForBuildOrder(unitName: string, category: string): boolean {
    // Nur wichtige Einträge für Build Order
    if (category === 'supply') return true; // Overlords, Pylons, Supply Depots
    if (category === 'economy' && (unitName.includes('Hatchery') || unitName.includes('Nexus') || unitName.includes('Command Center'))) return true;
    if (category === 'economy' && (unitName.includes('Assimilator') || unitName.includes('Refinery') || unitName.includes('Extractor'))) return true;
    if (category === 'tech') return true; // Alle Tech Buildings
    
    // Wichtige Produktionsgebäude
    const importantBuildings = [
      'Gateway', 'Barracks', 'Spawning Pool',
      'Factory', 'Stargate', 'Spire',
      'Cybernetics Core', 'Academy', 'Hydralisk Den',
      'Forge', 'Engineering Bay', 'Evolution Chamber'
    ];
    
    return importantBuildings.includes(unitName);
  }

  private determineBuildingCategory(unitName: string): 'economy' | 'military' | 'tech' | 'supply' {
    if (unitName === 'Pylon' || unitName === 'Supply Depot' || unitName === 'Overlord') {
      return 'supply';
    }
    
    const economyBuildings = ['Nexus', 'Command Center', 'Hatchery', 'Assimilator', 'Refinery', 'Extractor'];
    if (economyBuildings.includes(unitName)) {
      return 'economy';
    }
    
    const techBuildings = ['Cybernetics Core', 'Academy', 'Engineering Bay', 'Evolution Chamber', 'Forge', 'Templar Archives'];
    if (techBuildings.includes(unitName)) {
      return 'tech';
    }
    
    return 'military';
  }

  private formatSupply(currentSupply: number, unitName: string): string {
    // Professionelles Format: "8 Pylon", "12 Gateway", etc.
    return `${currentSupply} ${unitName}`;
  }

  private calculateMaxSupply(currentSupply: number, unitName: string): number {
    if (unitName === 'Pylon' || unitName === 'Supply Depot') {
      return currentSupply + 8;
    }
    if (unitName === 'Overlord') {
      return currentSupply + 8;
    }
    return currentSupply;
  }

  private getCostForUnit(unitId: number): { minerals: number; gas: number } {
    const unitData = SC_UNITS[unitId];
    if (unitData) {
      return {
        minerals: unitData.cost.minerals,
        gas: unitData.cost.gas
      };
    }
    return { minerals: 0, gas: 0 };
  }

  private getUnitName(unitId: number): string {
    const unitData = SC_UNITS[unitId];
    return unitData ? unitData.name : `Unit_${unitId}`;
  }

  private getTechName(techId: number): string {
    // Vereinfachtes Tech-Mapping
    const techMap: Record<number, string> = {
      0: 'Stim Packs',
      1: 'Lockdown',
      2: 'EMP Shockwave',
      3: 'Spider Mines',
      4: 'Scanner Sweep',
      5: 'Tank Siege Mode',
      6: 'Defensive Matrix',
      7: 'Irradiate',
      8: 'Yamato Gun',
      9: 'Cloaking Field',
      10: 'Personnel Cloaking'
    };
    return techMap[techId] || `Tech_${techId}`;
  }

  private getUpgradeName(upgradeId: number): string {
    // Vereinfachtes Upgrade-Mapping
    const upgradeMap: Record<number, string> = {
      0: 'Terran Infantry Armor',
      1: 'Terran Vehicle Plating',
      2: 'Terran Ship Plating',
      3: 'Zerg Carapace',
      4: 'Zerg Flyer Carapace',
      5: 'Protoss Armor',
      6: 'Protoss Plating'
    };
    return upgradeMap[upgradeId] || `Upgrade_${upgradeId}`;
  }

  private frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private estimateSupply(playerId: number, frame: number): number {
    // Einfache Supply-Schätzung basierend auf Zeit
    const gameTime = Math.floor(frame / 24); // seconds
    const race = this.raceMapping[playerId];
    const startingSupply = this.getStartingSupply(race);
    
    // Grobe Schätzung: +1 Supply alle 30 Sekunden
    return startingSupply + Math.floor(gameTime / 30);
  }

  private addBuildOrderEntry(playerId: number, entry: { time: string; action: string; supply: number; unitName: string; category: string }): void {
    const buildOrder = this.buildOrders.get(playerId) || [];
    
    const enhancedEntry: EnhancedBuildOrderEntry = {
      time: entry.time,
      frame: 0,
      gameTime: 0,
      supply: `${entry.supply}`,
      currentSupply: entry.supply,
      maxSupply: entry.supply,
      action: entry.action as 'Build' | 'Train' | 'Research' | 'Upgrade',
      unitName: entry.unitName,
      unitId: 0,
      cost: { minerals: 0, gas: 0 },
      category: entry.category as 'economy' | 'military' | 'tech' | 'supply',
      race: this.raceMapping[playerId] || 'unknown',
      efficiency: 'optimal',
      description: entry.unitName
    };
    
    buildOrder.push(enhancedEntry);
    this.buildOrders.set(playerId, buildOrder);
  }
}