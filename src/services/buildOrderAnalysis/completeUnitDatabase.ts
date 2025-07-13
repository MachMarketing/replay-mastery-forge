/**
 * Complete StarCraft: Remastered Unit Database
 * Step 3: Comprehensive mappings for all units, buildings, tech, and upgrades
 */

export interface SCUnitData {
  id: number;
  name: string;
  race: 'Terran' | 'Protoss' | 'Zerg' | 'Neutral';
  type: 'unit' | 'building' | 'tech' | 'upgrade';
  category: 'economy' | 'military' | 'tech' | 'supply' | 'defense' | 'special';
  cost: {
    minerals: number;
    gas: number;
    supply: number;
  };
  buildTime: number; // in game seconds
  hotkey?: string;
  description?: string;
}

/**
 * Complete SC:R Unit Database - All races, all units
 */
export class CompleteUnitDatabase {
  
  private static readonly UNITS: Record<number, SCUnitData> = {
    // === TERRAN UNITS ===
    0x00: { id: 0x00, name: 'Marine', race: 'Terran', type: 'unit', category: 'military', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 24, hotkey: 'A' },
    0x01: { id: 0x01, name: 'Ghost', race: 'Terran', type: 'unit', category: 'military', cost: { minerals: 25, gas: 75, supply: 1 }, buildTime: 50, hotkey: 'G' },
    0x02: { id: 0x02, name: 'Vulture', race: 'Terran', type: 'unit', category: 'military', cost: { minerals: 75, gas: 0, supply: 2 }, buildTime: 30, hotkey: 'V' },
    0x03: { id: 0x03, name: 'Goliath', race: 'Terran', type: 'unit', category: 'military', cost: { minerals: 100, gas: 50, supply: 2 }, buildTime: 39, hotkey: 'G' },
    0x05: { id: 0x05, name: 'Siege Tank', race: 'Terran', type: 'unit', category: 'military', cost: { minerals: 150, gas: 100, supply: 2 }, buildTime: 50, hotkey: 'T' },
    0x07: { id: 0x07, name: 'SCV', race: 'Terran', type: 'unit', category: 'economy', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 20, hotkey: 'S' },
    0x08: { id: 0x08, name: 'Wraith', race: 'Terran', type: 'unit', category: 'military', cost: { minerals: 150, gas: 100, supply: 2 }, buildTime: 60, hotkey: 'W' },
    0x09: { id: 0x09, name: 'Science Vessel', race: 'Terran', type: 'unit', category: 'tech', cost: { minerals: 100, gas: 225, supply: 2 }, buildTime: 80, hotkey: 'V' },
    0x0B: { id: 0x0B, name: 'Dropship', race: 'Terran', type: 'unit', category: 'special', cost: { minerals: 100, gas: 100, supply: 2 }, buildTime: 50, hotkey: 'D' },
    0x0C: { id: 0x0C, name: 'Battlecruiser', race: 'Terran', type: 'unit', category: 'military', cost: { minerals: 400, gas: 300, supply: 6 }, buildTime: 133, hotkey: 'B' },
    0x20: { id: 0x20, name: 'Firebat', race: 'Terran', type: 'unit', category: 'military', cost: { minerals: 50, gas: 25, supply: 1 }, buildTime: 24, hotkey: 'F' },
    0x21: { id: 0x21, name: 'Medic', race: 'Terran', type: 'unit', category: 'tech', cost: { minerals: 50, gas: 25, supply: 1 }, buildTime: 30, hotkey: 'M' },
    0x22: { id: 0x22, name: 'Valkyrie', race: 'Terran', type: 'unit', category: 'military', cost: { minerals: 250, gas: 125, supply: 3 }, buildTime: 50, hotkey: 'V' },

    // === TERRAN BUILDINGS ===
    0x6A: { id: 0x6A, name: 'Command Center', race: 'Terran', type: 'building', category: 'economy', cost: { minerals: 400, gas: 0, supply: 0 }, buildTime: 120 },
    0x6B: { id: 0x6B, name: 'Supply Depot', race: 'Terran', type: 'building', category: 'supply', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 40, hotkey: 'S' },
    0x6C: { id: 0x6C, name: 'Refinery', race: 'Terran', type: 'building', category: 'economy', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 40, hotkey: 'R' },
    0x6D: { id: 0x6D, name: 'Barracks', race: 'Terran', type: 'building', category: 'military', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 80, hotkey: 'B' },
    0x6E: { id: 0x6E, name: 'Academy', race: 'Terran', type: 'building', category: 'tech', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 80, hotkey: 'A' },
    0x6F: { id: 0x6F, name: 'Factory', race: 'Terran', type: 'building', category: 'military', cost: { minerals: 200, gas: 100, supply: 0 }, buildTime: 80, hotkey: 'F' },
    0x70: { id: 0x70, name: 'Starport', race: 'Terran', type: 'building', category: 'military', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 70, hotkey: 'S' },
    0x71: { id: 0x71, name: 'Control Tower', race: 'Terran', type: 'building', category: 'tech', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 40, hotkey: 'C' },
    0x72: { id: 0x72, name: 'Science Facility', race: 'Terran', type: 'building', category: 'tech', cost: { minerals: 100, gas: 150, supply: 0 }, buildTime: 60, hotkey: 'S' },
    0x73: { id: 0x73, name: 'Covert Ops', race: 'Terran', type: 'building', category: 'tech', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 40, hotkey: 'C' },
    0x74: { id: 0x74, name: 'Physics Lab', race: 'Terran', type: 'building', category: 'tech', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 40, hotkey: 'P' },
    0x76: { id: 0x76, name: 'Machine Shop', race: 'Terran', type: 'building', category: 'tech', cost: { minerals: 50, gas: 50, supply: 0 }, buildTime: 40, hotkey: 'M' },
    0x77: { id: 0x77, name: 'Engineering Bay', race: 'Terran', type: 'building', category: 'tech', cost: { minerals: 125, gas: 0, supply: 0 }, buildTime: 45, hotkey: 'E' },
    0x78: { id: 0x78, name: 'Armory', race: 'Terran', type: 'building', category: 'tech', cost: { minerals: 100, gas: 50, supply: 0 }, buildTime: 65, hotkey: 'A' },
    0x79: { id: 0x79, name: 'Missile Turret', race: 'Terran', type: 'building', category: 'defense', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 30, hotkey: 'T' },
    0x7A: { id: 0x7A, name: 'Bunker', race: 'Terran', type: 'building', category: 'defense', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 30, hotkey: 'U' },

    // === PROTOSS UNITS ===
    0x40: { id: 0x40, name: 'Probe', race: 'Protoss', type: 'unit', category: 'economy', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 20, hotkey: 'P' },
    0x41: { id: 0x41, name: 'Zealot', race: 'Protoss', type: 'unit', category: 'military', cost: { minerals: 100, gas: 0, supply: 2 }, buildTime: 40, hotkey: 'Z' },
    0x42: { id: 0x42, name: 'Dragoon', race: 'Protoss', type: 'unit', category: 'military', cost: { minerals: 125, gas: 50, supply: 2 }, buildTime: 50, hotkey: 'D' },
    0x43: { id: 0x43, name: 'High Templar', race: 'Protoss', type: 'unit', category: 'tech', cost: { minerals: 50, gas: 150, supply: 2 }, buildTime: 55, hotkey: 'T' },
    0x44: { id: 0x44, name: 'Archon', race: 'Protoss', type: 'unit', category: 'military', cost: { minerals: 0, gas: 0, supply: 4 }, buildTime: 20 },
    0x45: { id: 0x45, name: 'Shuttle', race: 'Protoss', type: 'unit', category: 'special', cost: { minerals: 200, gas: 0, supply: 2 }, buildTime: 60, hotkey: 'S' },
    0x46: { id: 0x46, name: 'Scout', race: 'Protoss', type: 'unit', category: 'military', cost: { minerals: 275, gas: 125, supply: 3 }, buildTime: 80, hotkey: 'S' },
    0x47: { id: 0x47, name: 'Arbiter', race: 'Protoss', type: 'unit', category: 'tech', cost: { minerals: 100, gas: 350, supply: 4 }, buildTime: 160, hotkey: 'A' },
    0x48: { id: 0x48, name: 'Carrier', race: 'Protoss', type: 'unit', category: 'military', cost: { minerals: 350, gas: 250, supply: 6 }, buildTime: 140, hotkey: 'C' },
    0x53: { id: 0x53, name: 'Dark Templar', race: 'Protoss', type: 'unit', category: 'military', cost: { minerals: 125, gas: 100, supply: 2 }, buildTime: 50, hotkey: 'D' },
    0x54: { id: 0x54, name: 'Dark Archon', race: 'Protoss', type: 'unit', category: 'tech', cost: { minerals: 0, gas: 0, supply: 4 }, buildTime: 20 },
    0x61: { id: 0x61, name: 'Observer', race: 'Protoss', type: 'unit', category: 'tech', cost: { minerals: 25, gas: 75, supply: 1 }, buildTime: 40, hotkey: 'O' },
    0x63: { id: 0x63, name: 'Reaver', race: 'Protoss', type: 'unit', category: 'military', cost: { minerals: 200, gas: 100, supply: 4 }, buildTime: 70, hotkey: 'R' },
    0x64: { id: 0x64, name: 'Corsair', race: 'Protoss', type: 'unit', category: 'military', cost: { minerals: 150, gas: 100, supply: 2 }, buildTime: 40, hotkey: 'C' },

    // === PROTOSS BUILDINGS ===
    0x9A: { id: 0x9A, name: 'Nexus', race: 'Protoss', type: 'building', category: 'economy', cost: { minerals: 400, gas: 0, supply: 0 }, buildTime: 120 },
    0x9B: { id: 0x9B, name: 'Robotics Facility', race: 'Protoss', type: 'building', category: 'military', cost: { minerals: 200, gas: 200, supply: 0 }, buildTime: 65, hotkey: 'R' },
    0x9C: { id: 0x9C, name: 'Pylon', race: 'Protoss', type: 'building', category: 'supply', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 30, hotkey: 'P' },
    0x9D: { id: 0x9D, name: 'Assimilator', race: 'Protoss', type: 'building', category: 'economy', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 40, hotkey: 'A' },
    0x9F: { id: 0x9F, name: 'Gateway', race: 'Protoss', type: 'building', category: 'military', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 60, hotkey: 'G' },
    0xA0: { id: 0xA0, name: 'Photon Cannon', race: 'Protoss', type: 'building', category: 'defense', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 50, hotkey: 'C' },
    0xA1: { id: 0xA1, name: 'Citadel of Adun', race: 'Protoss', type: 'building', category: 'tech', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 60, hotkey: 'C' },
    0xA2: { id: 0xA2, name: 'Cybernetics Core', race: 'Protoss', type: 'building', category: 'tech', cost: { minerals: 200, gas: 0, supply: 0 }, buildTime: 60, hotkey: 'C' },
    0xA3: { id: 0xA3, name: 'Templar Archives', race: 'Protoss', type: 'building', category: 'tech', cost: { minerals: 150, gas: 200, supply: 0 }, buildTime: 60, hotkey: 'T' },
    0xA4: { id: 0xA4, name: 'Forge', race: 'Protoss', type: 'building', category: 'tech', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 45, hotkey: 'F' },
    0xA5: { id: 0xA5, name: 'Stargate', race: 'Protoss', type: 'building', category: 'military', cost: { minerals: 150, gas: 150, supply: 0 }, buildTime: 70, hotkey: 'S' },
    0xA7: { id: 0xA7, name: 'Fleet Beacon', race: 'Protoss', type: 'building', category: 'tech', cost: { minerals: 300, gas: 200, supply: 0 }, buildTime: 60, hotkey: 'F' },
    0xA8: { id: 0xA8, name: 'Arbiter Tribunal', race: 'Protoss', type: 'building', category: 'tech', cost: { minerals: 200, gas: 150, supply: 0 }, buildTime: 60, hotkey: 'A' },
    0xA9: { id: 0xA9, name: 'Robotics Support Bay', race: 'Protoss', type: 'building', category: 'tech', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 30, hotkey: 'S' },
    0xAA: { id: 0xAA, name: 'Shield Battery', race: 'Protoss', type: 'building', category: 'defense', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 30, hotkey: 'S' },
    0xAB: { id: 0xAB, name: 'Observatory', race: 'Protoss', type: 'building', category: 'tech', cost: { minerals: 50, gas: 100, supply: 0 }, buildTime: 30, hotkey: 'O' },

    // === ZERG UNITS ===
    0x25: { id: 0x25, name: 'Drone', race: 'Zerg', type: 'unit', category: 'economy', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 20, hotkey: 'D' },
    0x26: { id: 0x26, name: 'Zergling', race: 'Zerg', type: 'unit', category: 'military', cost: { minerals: 50, gas: 0, supply: 1 }, buildTime: 28, hotkey: 'Z' },
    0x27: { id: 0x27, name: 'Hydralisk', race: 'Zerg', type: 'unit', category: 'military', cost: { minerals: 75, gas: 25, supply: 1 }, buildTime: 28, hotkey: 'H' },
    0x28: { id: 0x28, name: 'Ultralisk', race: 'Zerg', type: 'unit', category: 'military', cost: { minerals: 200, gas: 200, supply: 4 }, buildTime: 60, hotkey: 'U' },
    0x29: { id: 0x29, name: 'Broodling', race: 'Zerg', type: 'unit', category: 'military', cost: { minerals: 0, gas: 0, supply: 0 }, buildTime: 0 },
    0x2A: { id: 0x2A, name: 'Overlord', race: 'Zerg', type: 'unit', category: 'supply', cost: { minerals: 100, gas: 0, supply: 0 }, buildTime: 40, hotkey: 'O' },
    0x2B: { id: 0x2B, name: 'Mutalisk', race: 'Zerg', type: 'unit', category: 'military', cost: { minerals: 100, gas: 100, supply: 2 }, buildTime: 40, hotkey: 'M' },
    0x2C: { id: 0x2C, name: 'Guardian', race: 'Zerg', type: 'unit', category: 'military', cost: { minerals: 50, gas: 100, supply: 2 }, buildTime: 40, hotkey: 'G' },
    0x2D: { id: 0x2D, name: 'Queen', race: 'Zerg', type: 'unit', category: 'tech', cost: { minerals: 100, gas: 100, supply: 2 }, buildTime: 50, hotkey: 'Q' },
    0x2E: { id: 0x2E, name: 'Defiler', race: 'Zerg', type: 'unit', category: 'tech', cost: { minerals: 50, gas: 150, supply: 2 }, buildTime: 50, hotkey: 'D' },
    0x2F: { id: 0x2F, name: 'Scourge', race: 'Zerg', type: 'unit', category: 'military', cost: { minerals: 25, gas: 75, supply: 1 }, buildTime: 30, hotkey: 'S' },
    0x67: { id: 0x67, name: 'Lurker', race: 'Zerg', type: 'unit', category: 'military', cost: { minerals: 50, gas: 100, supply: 2 }, buildTime: 40, hotkey: 'L' },
    0x68: { id: 0x68, name: 'Devourer', race: 'Zerg', type: 'unit', category: 'military', cost: { minerals: 50, gas: 100, supply: 2 }, buildTime: 40, hotkey: 'D' },

    // === ZERG BUILDINGS ===
    0x82: { id: 0x82, name: 'Hatchery', race: 'Zerg', type: 'building', category: 'economy', cost: { minerals: 300, gas: 0, supply: 0 }, buildTime: 120, hotkey: 'H' },
    0x83: { id: 0x83, name: 'Lair', race: 'Zerg', type: 'building', category: 'economy', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 100, hotkey: 'L' },
    0x84: { id: 0x84, name: 'Hive', race: 'Zerg', type: 'building', category: 'economy', cost: { minerals: 200, gas: 150, supply: 0 }, buildTime: 120, hotkey: 'H' },
    0x85: { id: 0x85, name: 'Nydus Canal', race: 'Zerg', type: 'building', category: 'special', cost: { minerals: 150, gas: 0, supply: 0 }, buildTime: 40, hotkey: 'N' },
    0x86: { id: 0x86, name: 'Hydralisk Den', race: 'Zerg', type: 'building', category: 'military', cost: { minerals: 100, gas: 50, supply: 0 }, buildTime: 40, hotkey: 'H' },
    0x87: { id: 0x87, name: 'Defiler Mound', race: 'Zerg', type: 'building', category: 'tech', cost: { minerals: 100, gas: 100, supply: 0 }, buildTime: 50, hotkey: 'D' },
    0x88: { id: 0x88, name: 'Greater Spire', race: 'Zerg', type: 'building', category: 'military', cost: { minerals: 100, gas: 150, supply: 0 }, buildTime: 100, hotkey: 'G' },
    0x89: { id: 0x89, name: "Queen's Nest", race: 'Zerg', type: 'building', category: 'tech', cost: { minerals: 150, gas: 100, supply: 0 }, buildTime: 50, hotkey: 'Q' },
    0x8A: { id: 0x8A, name: 'Evolution Chamber', race: 'Zerg', type: 'building', category: 'tech', cost: { minerals: 75, gas: 0, supply: 0 }, buildTime: 40, hotkey: 'E' },
    0x8B: { id: 0x8B, name: 'Ultralisk Cavern', race: 'Zerg', type: 'building', category: 'military', cost: { minerals: 150, gas: 200, supply: 0 }, buildTime: 80, hotkey: 'U' },
    0x8C: { id: 0x8C, name: 'Spire', race: 'Zerg', type: 'building', category: 'military', cost: { minerals: 200, gas: 150, supply: 0 }, buildTime: 120, hotkey: 'S' },
    0x8D: { id: 0x8D, name: 'Spawning Pool', race: 'Zerg', type: 'building', category: 'military', cost: { minerals: 200, gas: 0, supply: 0 }, buildTime: 80, hotkey: 'S' },
    0x8E: { id: 0x8E, name: 'Creep Colony', race: 'Zerg', type: 'building', category: 'defense', cost: { minerals: 75, gas: 0, supply: 0 }, buildTime: 20, hotkey: 'C' },
    0x8F: { id: 0x8F, name: 'Spore Colony', race: 'Zerg', type: 'building', category: 'defense', cost: { minerals: 50, gas: 0, supply: 0 }, buildTime: 30, hotkey: 'S' },
    0x92: { id: 0x92, name: 'Sunken Colony', race: 'Zerg', type: 'building', category: 'defense', cost: { minerals: 50, gas: 0, supply: 0 }, buildTime: 30, hotkey: 'S' },
    0x96: { id: 0x96, name: 'Extractor', race: 'Zerg', type: 'building', category: 'economy', cost: { minerals: 50, gas: 0, supply: 0 }, buildTime: 40, hotkey: 'E' }
  };

  /**
   * Get unit data by ID
   */
  public static getUnitById(unitId: number): SCUnitData | null {
    return this.UNITS[unitId] || null;
  }

  /**
   * Get unit name by ID
   */
  public static getUnitName(unitId: number): string {
    const unit = this.getUnitById(unitId);
    return unit?.name || `Unknown Unit (${unitId})`;
  }

  /**
   * Check if unit ID exists in database
   */
  public static hasUnit(unitId: number): boolean {
    return unitId in this.UNITS;
  }

  /**
   * Get all units for a specific race
   */
  public static getUnitsByRace(race: 'Terran' | 'Protoss' | 'Zerg'): SCUnitData[] {
    return Object.values(this.UNITS).filter(unit => unit.race === race);
  }

  /**
   * Get all units of a specific type
   */
  public static getUnitsByType(type: 'unit' | 'building' | 'tech' | 'upgrade'): SCUnitData[] {
    return Object.values(this.UNITS).filter(unit => unit.type === type);
  }

  /**
   * Get all units in a specific category
   */
  public static getUnitsByCategory(category: 'economy' | 'military' | 'tech' | 'supply' | 'defense' | 'special'): SCUnitData[] {
    return Object.values(this.UNITS).filter(unit => unit.category === category);
  }

  /**
   * Search units by name (fuzzy matching)
   */
  public static searchUnitsByName(searchTerm: string): SCUnitData[] {
    const term = searchTerm.toLowerCase();
    return Object.values(this.UNITS).filter(unit => 
      unit.name.toLowerCase().includes(term)
    );
  }

  /**
   * Get all supply providing units
   */
  public static getSupplyProviders(): SCUnitData[] {
    return this.getUnitsByCategory('supply');
  }

  /**
   * Get all economy units (workers + eco buildings)
   */
  public static getEconomyUnits(): SCUnitData[] {
    return this.getUnitsByCategory('economy');
  }

  /**
   * Get all military units
   */
  public static getMilitaryUnits(): SCUnitData[] {
    return this.getUnitsByCategory('military');
  }

  /**
   * Check if unit is a worker
   */
  public static isWorker(unitId: number): boolean {
    return [0x07, 0x40, 0x25].includes(unitId); // SCV, Probe, Drone
  }

  /**
   * Check if unit provides supply
   */
  public static isSupplyProvider(unitId: number): boolean {
    const unit = this.getUnitById(unitId);
    return unit?.category === 'supply' || [0x6B, 0x9C, 0x2A].includes(unitId); // Supply Depot, Pylon, Overlord
  }

  /**
   * Check if unit is a military unit
   */
  public static isMilitaryUnit(unitId: number): boolean {
    const unit = this.getUnitById(unitId);
    return unit?.category === 'military';
  }

  /**
   * Check if unit is a building
   */
  public static isBuilding(unitId: number): boolean {
    const unit = this.getUnitById(unitId);
    return unit?.type === 'building';
  }

  /**
   * Get all unit IDs as array
   */
  public static getAllUnitIds(): number[] {
    return Object.keys(this.UNITS).map(id => parseInt(id));
  }

  /**
   * Get total number of units in database
   */
  public static getTotalUnits(): number {
    return Object.keys(this.UNITS).length;
  }

  /**
   * Get database statistics
   */
  public static getDatabaseStats(): {
    total: number;
    byRace: Record<string, number>;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const units = Object.values(this.UNITS);
    
    return {
      total: units.length,
      byRace: {
        Terran: units.filter(u => u.race === 'Terran').length,
        Protoss: units.filter(u => u.race === 'Protoss').length,
        Zerg: units.filter(u => u.race === 'Zerg').length,
        Neutral: units.filter(u => u.race === 'Neutral').length
      },
      byType: {
        unit: units.filter(u => u.type === 'unit').length,
        building: units.filter(u => u.type === 'building').length,
        tech: units.filter(u => u.type === 'tech').length,
        upgrade: units.filter(u => u.type === 'upgrade').length
      },
      byCategory: {
        economy: units.filter(u => u.category === 'economy').length,
        military: units.filter(u => u.category === 'military').length,
        tech: units.filter(u => u.category === 'tech').length,
        supply: units.filter(u => u.category === 'supply').length,
        defense: units.filter(u => u.category === 'defense').length,
        special: units.filter(u => u.category === 'special').length
      }
    };
  }
}