/**
 * Professional Build Order Extractor
 * Directly processes screp command data to create accurate build orders
 */

import { ScrepConstants } from '../screpParser/constants';

export interface ProfessionalBuildOrderItem {
  supply: string;
  action: "Research" | "Upgrade" | "Build" | "Train";
  unitName: string;
  frame: number;
  timestamp: string;
  isSupplyProvider: boolean;
  category: 'tech' | 'supply' | 'economy' | 'military';
  
  // Backward compatibility with EnhancedBuildOrderEntry
  time: string;
  gameTime: number;
  currentSupply: number;
  maxSupply: number;
  resourceCost: number;
  timing: string;
  name: string;
  buildingName: string;
  unitId: number;
  cost: { minerals: number; gas: number; };
  race: string;
  efficiency: "optimal" | "early" | "late" | "supply-blocked";
  description: string;
}

export interface PlayerBuildOrder {
  playerName: string;
  race: string;
  buildOrder: ProfessionalBuildOrderItem[];
  supplyHistory: { frame: number; supply: number }[];
}

export class ProfessionalBuildOrderExtractor {
  private static readonly SUPPLY_PROVIDERS: Record<string, number> = {
    // Protoss
    'Pylon': 8,
    
    // Terran  
    'Supply Depot': 8,
    
    // Zerg
    'Overlord': 8,
    'Overmind': 200,
    'Overmind With Shell': 200
  };

  private static readonly ESSENTIAL_BUILDINGS: Record<string, boolean> = {
    // Protoss Core Buildings
    'Nexus': true,
    'Pylon': true,
    'Gateway': true,
    'Cybernetics Core': true,
    'Forge': true,
    'Photon Cannon': true,
    'Assimilator': true,
    'Robotics Facility': true,
    'Observatory': true,
    'Stargate': true,
    'Fleet Beacon': true,
    'Citadel of Adun': true,
    'Templar Archives': true,
    'Arbiter Tribunal': true,
    'Robotics Support Bay': true,
    'Shield Battery': true,

    // Terran Core Buildings
    'Command Center': true,
    'Supply Depot': true,
    'Barracks': true,
    'Academy': true,
    'Engineering Bay': true,
    'Refinery': true,
    'Factory': true,
    'Machine Shop': true,
    'Starport': true,
    'Control Tower': true,
    'Science Facility': true,
    'Covert Ops': true,
    'Physics Lab': true,
    'Armory': true,
    'Missile Turret': true,
    'Bunker': true,
    'Comsat Station': true,
    'Nuclear Silo': true,

    // Zerg Core Buildings
    'Hatchery': true,
    'Lair': true,
    'Hive': true,
    'Spawning Pool': true,
    'Evolution Chamber': true,
    'Hydralisk Den': true,
    'Spire': true,
    'Greater Spire': true,
    'Queens Nest': true,
    'Defiler Mound': true,
    'Ultralisk Cavern': true,
    'Extractor': true,
    'Creep Colony': true,
    'Sunken Colony': true,
    'Spore Colony': true,
    'Nydus Canal': true
  };

  private static readonly ESSENTIAL_UNITS: Record<string, boolean> = {
    // Workers
    'Probe': true,
    'SCV': true,
    'Drone': true,
    
    // Supply units
    'Overlord': true
  };

  private static readonly ESSENTIAL_TECH: Record<string, boolean> = {
    'Stim Packs': true,
    'Spider Mines': true,
    'Tank Siege Mode': true,
    'Cloaking Field': true,
    'Personnel Cloaking': true,
    'Burrowing': true,
    'Lurker Aspect': true,
    'Psionic Storm': true,
    'Recall': true,
    'Stasis Field': true,
    'Disruption Web': true,
    'Mind Control': true
  };

  /**
   * Extract professional build orders from screp command data
   */
  static extractBuildOrders(screpData: any): Record<number, PlayerBuildOrder> {
    console.log('[ProfessionalBuildOrderExtractor] Processing screp data for build orders');
    
    const buildOrders: Record<number, PlayerBuildOrder> = {};
    
    if (!screpData || !screpData.computed || !screpData.players) {
      console.warn('[ProfessionalBuildOrderExtractor] Invalid screp data structure');
      return buildOrders;
    }

    // Process each player
    screpData.players.forEach((player: any, index: number) => {
      const playerCommands = this.extractPlayerCommands(screpData, player.id);
      const buildOrder = this.processPlayerCommands(playerCommands, player);
      
      buildOrders[player.id] = {
        playerName: player.name,
        race: player.race,
        buildOrder: buildOrder.items,
        supplyHistory: buildOrder.supplyHistory
      };
    });

    return buildOrders;
  }

  /**
   * Extract commands for a specific player
   */
  private static extractPlayerCommands(screpData: any, playerId: number): any[] {
    const playerCommands: any[] = [];
    
    // Process commands from computed data if available
    if (screpData.computed && screpData.computed.commands) {
      screpData.computed.commands.forEach((cmd: any) => {
        if (cmd.playerID === playerId && this.isRelevantCommand(cmd)) {
          playerCommands.push(cmd);
        }
      });
    }

    return playerCommands.sort((a, b) => a.frame - b.frame);
  }

  /**
   * Check if command is relevant for build order
   */
  private static isRelevantCommand(cmd: any): boolean {
    if (!cmd.parameters) return false;
    
    const hasUnitId = cmd.parameters.unitTypeId !== undefined;
    const hasTechId = cmd.parameters.techId !== undefined;
    const hasUpgradeId = cmd.parameters.upgradeId !== undefined;
    
    return hasUnitId || hasTechId || hasUpgradeId;
  }

  /**
   * Process commands for a single player
   */
  private static processPlayerCommands(commands: any[], player: any): {
    items: ProfessionalBuildOrderItem[];
    supplyHistory: { frame: number; supply: number }[];
  } {
    const items: ProfessionalBuildOrderItem[] = [];
    const supplyHistory: { frame: number; supply: number }[] = [];
    
    let currentSupply = this.getStartingSupply(player.race);
    supplyHistory.push({ frame: 0, supply: currentSupply });

    commands.forEach(cmd => {
      const item = this.processCommand(cmd, currentSupply);
      if (item) {
        // Update supply if this is a supply provider
        if (item.isSupplyProvider) {
          currentSupply += this.SUPPLY_PROVIDERS[item.unitName] || 0;
          supplyHistory.push({ frame: cmd.frame, supply: currentSupply });
        }
        
        items.push(item);
      }
    });

    // Filter to only essential items
    const essentialItems = items.filter(item => this.isEssentialItem(item));
    
    return { items: essentialItems, supplyHistory };
  }

  /**
   * Process a single command into a build order item
   */
  private static processCommand(cmd: any, currentSupply: number): ProfessionalBuildOrderItem | null {
    const params = cmd.parameters;
    const timeString = cmd.time || this.frameToTime(cmd.frame || 0);
    
    if (params.unitTypeId !== undefined) {
      const unitName = ScrepConstants.getUnitName(params.unitTypeId);
      const action = this.getActionName(cmd.typeString, unitName);
      
      return {
        supply: currentSupply.toString(),
        action: action as "Build" | "Train",
        unitName,
        frame: cmd.frame || 0,
        timestamp: timeString,
        isSupplyProvider: this.SUPPLY_PROVIDERS[unitName] !== undefined,
        category: this.getCategoryForUnit(unitName),
        
        // Backward compatibility fields
        time: timeString,
        gameTime: cmd.frame || 0,
        currentSupply: currentSupply,
        maxSupply: currentSupply + 200, // Estimate max supply
        resourceCost: this.getResourceCost(unitName),
        timing: timeString,
        name: unitName,
        buildingName: unitName,
        unitId: params.unitTypeId || 0,
        cost: { minerals: this.getResourceCost(unitName), gas: 0 },
        race: 'Unknown',
        efficiency: "optimal" as const,
        description: `${action} ${unitName} at ${timeString}`
      };
    }
    
    if (params.techId !== undefined) {
      const techName = ScrepConstants.getTechName(params.techId);
      
      return {
        supply: currentSupply.toString(),
        action: 'Research' as const,
        unitName: techName,
        frame: cmd.frame || 0,
        timestamp: timeString,
        isSupplyProvider: false,
        category: 'tech',
        
        // Backward compatibility fields
        time: timeString,
        gameTime: cmd.frame || 0,
        currentSupply: currentSupply,
        maxSupply: currentSupply + 200,
        resourceCost: this.getResourceCost(techName),
        timing: timeString,
        name: techName,
        buildingName: techName,
        unitId: params.techId || 0,
        cost: { minerals: this.getResourceCost(techName), gas: 0 },
        race: 'Unknown',
        efficiency: "optimal" as const,
        description: `Research ${techName} at ${timeString}`
      };
    }
    
    if (params.upgradeId !== undefined) {
      const upgradeName = ScrepConstants.getTechName(params.upgradeId);
      
      return {
        supply: currentSupply.toString(),
        action: 'Upgrade' as const,
        unitName: upgradeName,
        frame: cmd.frame || 0,
        timestamp: timeString,
        isSupplyProvider: false,
        category: 'tech',
        
        // Backward compatibility fields
        time: timeString,
        gameTime: cmd.frame || 0,
        currentSupply: currentSupply,
        maxSupply: currentSupply + 200,
        resourceCost: this.getResourceCost(upgradeName),
        timing: timeString,
        name: upgradeName,
        buildingName: upgradeName,
        unitId: params.upgradeId || 0,
        cost: { minerals: this.getResourceCost(upgradeName), gas: 0 },
        race: 'Unknown',
        efficiency: "optimal" as const,
        description: `Upgrade ${upgradeName} at ${timeString}`
      };
    }
    
    return null;
  }

  /**
   * Convert frame to time string
   */
  private static frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get estimated resource cost for unit/tech
   */
  private static getResourceCost(name: string): number {
    // Simple cost estimation based on unit type
    const costs: Record<string, number> = {
      'Pylon': 100,
      'Gateway': 150,
      'Nexus': 400,
      'Probe': 50,
      'Supply Depot': 100,
      'Barracks': 150,
      'Command Center': 400,
      'SCV': 50,
      'Overlord': 100,
      'Hatchery': 300,
      'Drone': 50
    };
    
    return costs[name] || 150; // Default cost
  }

  /**
   * Get action name based on command type
   */
  private static getActionName(commandType: string, unitName: string): string {
    if (commandType.includes('Build')) return 'Build';
    if (commandType.includes('Train')) return 'Train';
    if (commandType.includes('Morph')) return 'Morph';
    return 'Build';
  }

  /**
   * Get category for unit/building
   */
  private static getCategoryForUnit(unitName: string): 'tech' | 'supply' | 'economy' | 'military' {
    if (this.SUPPLY_PROVIDERS[unitName]) return 'supply';
    if (this.ESSENTIAL_BUILDINGS[unitName]) return 'economy';
    if (this.ESSENTIAL_UNITS[unitName]) return 'economy';
    return 'military';
  }

  /**
   * Check if item should be included in professional build order
   */
  private static isEssentialItem(item: ProfessionalBuildOrderItem): boolean {
    return this.ESSENTIAL_BUILDINGS[item.unitName] || 
           this.ESSENTIAL_UNITS[item.unitName] || 
           this.ESSENTIAL_TECH[item.unitName] ||
           item.category === 'tech' || 
           item.action === 'Upgrade';
  }

  /**
   * Get starting supply for race
   */
  private static getStartingSupply(race: string): number {
    switch (race) {
      case 'Protoss': return 4; // 4 Probes
      case 'Terran': return 4;  // 4 SCVs
      case 'Zerg': return 4;    // 4 Drones
      default: return 4;
    }
  }

  /**
   * Format build order for display (e.g., "8 Pylon")
   */
  static formatBuildOrder(buildOrder: ProfessionalBuildOrderItem[]): string[] {
    return buildOrder.map(item => {
      if (item.isSupplyProvider || item.category === 'economy') {
        return `${item.supply} ${item.unitName}`;
      }
      return `${item.action} ${item.unitName}`;
    });
  }

  /**
   * Get build order summary for race
   */
  static getBuildOrderSummary(buildOrder: ProfessionalBuildOrderItem[], race: string): {
    openingStrategy: string;
    keyTimings: string[];
    techPath: string[];
  } {
    const strategy = this.analyzeOpeningStrategy(buildOrder, race);
    const timings = this.extractKeyTimings(buildOrder);
    const techPath = this.extractTechPath(buildOrder);

    return {
      openingStrategy: strategy,
      keyTimings: timings,
      techPath: techPath
    };
  }

  private static analyzeOpeningStrategy(buildOrder: ProfessionalBuildOrderItem[], race: string): string {
    const first10 = buildOrder.slice(0, 10).map(item => item.unitName).join(' ');
    
    if (race === 'Protoss') {
      if (first10.includes('Gateway') && first10.includes('Zealot')) return 'Zealot Rush';
      if (first10.includes('Cybernetics Core')) return 'Tech Opening';
      if (first10.includes('Forge')) return 'Forge First';
      return 'Standard Opening';
    } else if (race === 'Terran') {
      if (first10.includes('Barracks') && first10.includes('Marine')) return 'Marine Rush';
      if (first10.includes('Factory')) return 'Factory Opening';
      return 'Standard Opening';
    } else if (race === 'Zerg') {
      if (first10.includes('Spawning Pool') && first10.includes('Zergling')) return 'Zergling Rush';
      if (first10.includes('Hydralisk Den')) return 'Hydra Build';
      return 'Standard Opening';
    }
    
    return 'Unknown Strategy';
  }

  private static extractKeyTimings(buildOrder: ProfessionalBuildOrderItem[]): string[] {
    const timings: string[] = [];
    
    buildOrder.forEach(item => {
      if (item.category === 'economy' || item.category === 'tech') {
        timings.push(`${item.timestamp} - ${item.unitName}`);
      }
    });
    
    return timings.slice(0, 5); // Top 5 key timings
  }

  private static extractTechPath(buildOrder: ProfessionalBuildOrderItem[]): string[] {
    return buildOrder
      .filter(item => item.category === 'tech' || item.action === 'Upgrade')
      .map(item => item.unitName);
  }
}