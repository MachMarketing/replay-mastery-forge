/**
 * Professional Build Order Extractor for StarCraft: Remastered
 * Based on comprehensive research of screp command structure and complete unit database
 */

import { ScrepConstants } from '../screpParser/constants';
import { getUnitById, SC_UNITS, COMMAND_TYPES } from '../nativeReplayParser/scUnitDatabase';

export interface ProfessionalBuildOrderItem {
  supply: string;
  action: string;
  unitName: string;
  frame: number;
  timestamp: string;
  // Additional properties for compatibility
  category: 'economy' | 'military' | 'tech' | 'supply' | 'defense' | 'special';
  cost: { minerals: number; gas: number };
  efficiency: number;
  // Backward compatibility
  time?: string;
  unit?: string;
}

export interface PlayerBuildOrder {
  playerName: string;
  race: string;
  buildOrder: ProfessionalBuildOrderItem[];
  supplyHistory: { frame: number; supply: number }[];
}

/**
 * Professional Build Order Extractor
 * Implements complete command analysis based on screp structure research
 */
export class ProfessionalBuildOrderExtractor {
  
  // Supply providing units and buildings
  private static readonly SUPPLY_PROVIDERS = new Set([
    0x6B, // Supply Depot
    0x9C, // Pylon
    0x2A  // Overlord
  ]);

  // Essential buildings that should always be included
  private static readonly ESSENTIAL_BUILDINGS = new Set([
    0x6A, 0x6B, 0x6D, 0x6E, 0x6F, 0x70, 0x76, 0x77, // Terran buildings
    0x9A, 0x9C, 0x9F, 0xA2, 0xA1, 0xA4, 0xA5, // Protoss buildings
    0x82, 0x83, 0x84, 0x8D, 0x86, 0x87, 0x8A, 0x8B, 0x8C // Zerg buildings
  ]);

  // Essential units for build order tracking
  private static readonly ESSENTIAL_UNITS = new Set([
    0x07, 0x00, 0x01, 0x02, 0x03, 0x05, 0x20, 0x21, // Terran units
    0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x53, 0x54, 0x61, 0x63, 0x64, // Protoss units
    0x25, 0x26, 0x27, 0x28, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x67, 0x68 // Zerg units
  ]);

  // Essential tech and upgrades
  private static readonly ESSENTIAL_TECH = new Set([
    // Add common tech/upgrade IDs here
  ]);

  /**
   * Main extraction function - processes screp data and returns build orders
   */
  public static extractBuildOrders(screpData: any): Record<number, PlayerBuildOrder> {
    console.log('[ProfessionalBuildOrderExtractor] Starting professional extraction');
    
    if (!screpData?.commands || !Array.isArray(screpData.commands)) {
      console.warn('[ProfessionalBuildOrderExtractor] No commands found in screp data');
      return {};
    }

    const buildOrders: Record<number, PlayerBuildOrder> = {};
    const players = screpData.header?.players || screpData.players || [];
    
    // Initialize build orders for each player
    players.forEach((player: any, index: number) => {
      const playerId = player.id !== undefined ? player.id : index;
      buildOrders[playerId] = {
        playerName: player.name || `Player ${playerId + 1}`,
        race: ScrepConstants.getRaceName(player.race || player.raceId || 0),
        buildOrder: [],
        supplyHistory: [{ frame: 0, supply: 4 }]
      };
    });

    // Extract and process commands for each player
    Object.keys(buildOrders).forEach(playerIdStr => {
      const playerId = parseInt(playerIdStr);
      const playerCommands = this.extractPlayerCommands(screpData, playerId);
      const processedData = this.processPlayerCommands(playerCommands, buildOrders[playerId]);
      
      buildOrders[playerId].buildOrder = processedData.items;
      buildOrders[playerId].supplyHistory = processedData.supplyHistory;
    });

    console.log('[ProfessionalBuildOrderExtractor] Extraction complete:', buildOrders);
    return buildOrders;
  }

  /**
   * Extract commands for a specific player
   */
  private static extractPlayerCommands(screpData: any, playerId: number): any[] {
    const allCommands = screpData.commands || [];
    return allCommands.filter((cmd: any) => {
      const cmdPlayerId = cmd.playerId !== undefined ? cmd.playerId : cmd.playerID;
      return cmdPlayerId === playerId && this.isRelevantCommand(cmd);
    });
  }

  /**
   * Check if a command is relevant for build order extraction
   */
  private static isRelevantCommand(cmd: any): boolean {
    const commandType = cmd.commandType || cmd.typeString || cmd.typeName || cmd.kind || '';
    
    return commandType.includes('Build') || 
           commandType.includes('Train') || 
           commandType.includes('Morph') ||
           commandType.includes('Research') ||
           commandType.includes('Upgrade') ||
           commandType.includes('TypeIDBuild') ||
           commandType.includes('TypeIDTrain') ||
           commandType.includes('TypeIDUnitMorph') ||
           commandType.includes('TypeIDResearch') ||
           commandType.includes('TypeIDUpgrade');
  }

  /**
   * Process commands for a single player
   */
  private static processPlayerCommands(commands: any[], player: any): {
    items: ProfessionalBuildOrderItem[];
    supplyHistory: { frame: number; supply: number }[];
  } {
    const items: ProfessionalBuildOrderItem[] = [];
    const supplyHistory: { frame: number; supply: number }[] = [{ frame: 0, supply: 4 }];
    let currentSupply = 4;

    console.log(`[ProfessionalBuildOrderExtractor] Processing ${commands.length} commands for ${player.playerName}`);

    commands.forEach((cmd, index) => {
      console.log(`[ProfessionalBuildOrderExtractor] Processing command ${index + 1}/${commands.length}:`, {
        commandType: cmd.commandType || cmd.typeString || cmd.typeName,
        frame: cmd.frame,
        parameters: cmd.parameters
      });

      const item = this.processCommand(cmd, currentSupply);
      if (item) {
        // Update supply tracking
        const unitId = this.extractUnitIdFromCommand(cmd);
        if (unitId !== undefined && this.SUPPLY_PROVIDERS.has(unitId)) {
          currentSupply += 8; // Standard supply increase
          supplyHistory.push({ frame: cmd.frame || 0, supply: currentSupply });
          item.supply = `${currentSupply - 8}/${currentSupply}`;
        } else {
          item.supply = `${currentSupply}`;
        }

        items.push(item);
        console.log(`[ProfessionalBuildOrderExtractor] Added build order item:`, item);
      }
    });

    return { items, supplyHistory };
  }

  /**
   * Process a single command to create a build order item
   */
  private static processCommand(cmd: any, currentSupply: number): ProfessionalBuildOrderItem | null {
    const commandType = cmd.commandType || cmd.typeString || cmd.typeName || cmd.kind || '';
    const frame = cmd.frame || 0;
    const timestamp = this.frameToTime(frame);
    
    // Extract unit ID using comprehensive method
    const unitId = this.extractUnitIdFromCommand(cmd);
    
    if (unitId === undefined) {
      console.log('[ProfessionalBuildOrderExtractor] No unit ID found for command:', commandType);
      return null;
    }

    // Get unit information from database
    const unit = getUnitById(unitId);
    let unitName = unit?.name || ScrepConstants.getUnitName(unitId) || `Unit ID ${unitId}`;
    let action = 'Build';

    // Determine action type based on command
    if (commandType.includes('Train') || commandType.includes('TypeIDTrain')) {
      action = 'Train';
    } else if (commandType.includes('Morph') || commandType.includes('TypeIDUnitMorph')) {
      action = 'Morph';
    } else if (commandType.includes('Research') || commandType.includes('TypeIDResearch')) {
      action = 'Research';
      unitName = this.getTechName(unitId) || unitName;
    } else if (commandType.includes('Upgrade') || commandType.includes('TypeIDUpgrade')) {
      action = 'Upgrade';
      unitName = this.getUpgradeName(unitId) || unitName;
    }

    // Only include essential items for cleaner build order
    if (!this.isEssentialItem(unitId, action)) {
      console.log(`[ProfessionalBuildOrderExtractor] Skipping non-essential item: ${unitName}`);
      return null;
    }

    // Get additional properties for compatibility
    const category = this.getCategoryForUnit(unitName);
    const cost = unit?.cost || { minerals: this.getResourceCost(unitName), gas: 0 };
    const efficiency = this.calculateEfficiency(unitName, frame);

    return {
      supply: `${currentSupply}`,
      action,
      unitName,
      frame,
      timestamp,
      category,
      cost,
      efficiency,
      // Backward compatibility
      time: timestamp,
      unit: unitName
    };
  }

  /**
   * Extract unit ID from command using comprehensive analysis
   */
  private static extractUnitIdFromCommand(cmd: any): number | undefined {
    const commandType = cmd.commandType || cmd.typeString || cmd.typeName || cmd.kind || '';
    const params = cmd.parameters || {};
    
    // Method 1: Check parameters for various unit ID fields
    if (params.unitTypeId !== undefined) return params.unitTypeId;
    if (params.unitType !== undefined) return params.unitType;
    if (params.buildingType !== undefined) return params.buildingType;
    if (params.unit !== undefined) return params.unit;
    if (params.unitId !== undefined) return params.unitId;
    if (params.type !== undefined) return params.type;
    if (params.id !== undefined) return params.id;
    
    // Method 2: Extract from command type name (e.g., "TypeIDTrain121" -> 121)
    const typeIdMatch = commandType.match(/TypeID\w+(\d+)/);
    if (typeIdMatch) {
      return parseInt(typeIdMatch[1]);
    }
    
    // Method 3: Check for raw parameter arrays or objects
    if (Array.isArray(params) && params.length > 0) {
      // First element might be unit ID
      const firstParam = params[0];
      if (typeof firstParam === 'number') return firstParam;
    }
    
    // Method 4: Check for nested parameter structures
    if (params.data && typeof params.data === 'object') {
      return this.extractUnitIdFromCommand({ parameters: params.data });
    }
    
    console.log(`[ProfessionalBuildOrderExtractor] Could not extract unit ID from command:`, {
      commandType,
      parameters: params
    });
    
    return undefined;
  }

  /**
   * Get tech/research name by ID
   */
  private static getTechName(techId: number): string | null {
    return ScrepConstants.getTechName(techId);
  }

  /**
   * Get upgrade name by ID
   */
  private static getUpgradeName(upgradeId: number): string | null {
    return ScrepConstants.getTechName(upgradeId); // Tech names include upgrades
  }

  /**
   * Determine if an item should be included in the build order
   */
  private static isEssentialItem(unitId: number, action: string): boolean {
    // Always include buildings
    if (this.ESSENTIAL_BUILDINGS.has(unitId)) return true;
    
    // Always include essential units
    if (this.ESSENTIAL_UNITS.has(unitId)) return true;
    
    // Always include supply providers
    if (this.SUPPLY_PROVIDERS.has(unitId)) return true;
    
    // Include research and upgrades if they're in our essential tech set
    if ((action === 'Research' || action === 'Upgrade') && this.ESSENTIAL_TECH.has(unitId)) {
      return true;
    }
    
    // For now, include all items to see full build order
    // Later this can be made more restrictive
    return true;
  }

  /**
   * Convert frame number to time string
   */
  private static frameToTime(frame: number): string {
    const seconds = Math.floor(frame / 24); // 24 FPS
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get resource cost for a unit or tech
   */
  private static getResourceCost(name: string): number {
    // This is a simplified cost estimation
    const costs: Record<string, number> = {
      'SCV': 50, 'Probe': 50, 'Drone': 50,
      'Marine': 50, 'Zealot': 100, 'Zergling': 50,
      'Supply Depot': 100, 'Pylon': 100, 'Overlord': 100,
      'Barracks': 150, 'Gateway': 150, 'Spawning Pool': 200
    };
    return costs[name] || 0;
  }

  /**
   * Categorize unit for analysis
   */
  private static getCategoryForUnit(unitName: string): 'tech' | 'supply' | 'economy' | 'military' {
    if (['Supply Depot', 'Pylon', 'Overlord'].includes(unitName)) return 'supply';
    if (['SCV', 'Probe', 'Drone', 'Command Center', 'Nexus', 'Hatchery'].includes(unitName)) return 'economy';
    if (['Marine', 'Zealot', 'Zergling', 'Dragoon', 'Hydralisk'].includes(unitName)) return 'military';
    return 'tech';
  }

  /**
   * Calculate efficiency rating for a unit based on timing
   */
  private static calculateEfficiency(unitName: string, frame: number): number {
    // Simplified efficiency calculation based on timing
    // Earlier builds get higher efficiency scores
    const timeInSeconds = frame / 24;
    const baseEfficiency = 100;
    
    // Efficiency decreases over time
    if (timeInSeconds < 60) return baseEfficiency;
    if (timeInSeconds < 300) return Math.max(80, baseEfficiency - (timeInSeconds - 60) / 10);
    if (timeInSeconds < 600) return Math.max(60, baseEfficiency - (timeInSeconds - 60) / 20);
    
    return Math.max(40, baseEfficiency - timeInSeconds / 30);
  }

  /**
   * Format build order for display
   */
  public static formatBuildOrder(buildOrder: ProfessionalBuildOrderItem[]): string[] {
    return buildOrder.map(item => 
      `${item.supply} ${item.timestamp} - ${item.action} ${item.unitName}`
    );
  }

  /**
   * Generate build order summary with strategic analysis
   */
  public static getBuildOrderSummary(buildOrder: ProfessionalBuildOrderItem[], race: string): {
    openingStrategy: string;
    keyTimings: string[];
    techPath: string[];
  } {
    const openingStrategy = this.analyzeOpeningStrategy(buildOrder, race);
    const keyTimings = this.extractKeyTimings(buildOrder);
    const techPath = this.analyzeTechPath(buildOrder);

    return { openingStrategy, keyTimings, techPath };
  }

  private static analyzeOpeningStrategy(buildOrder: ProfessionalBuildOrderItem[], race: string): string {
    const first10Items = buildOrder.slice(0, 10);
    const buildingCount = first10Items.filter(item => item.action === 'Build').length;
    const unitCount = first10Items.filter(item => item.action === 'Train').length;

    if (buildingCount > unitCount) return 'Defensive/Economic Opening';
    if (unitCount > buildingCount * 2) return 'Aggressive Rush Opening';
    return 'Standard Opening';
  }

  private static extractKeyTimings(buildOrder: ProfessionalBuildOrderItem[]): string[] {
    const keyTimings: string[] = [];
    
    buildOrder.forEach(item => {
      if (['Academy', 'Cybernetics Core', 'Spawning Pool'].includes(item.unitName)) {
        keyTimings.push(`${item.timestamp} - ${item.unitName}`);
      }
    });

    return keyTimings;
  }

  private static analyzeTechPath(buildOrder: ProfessionalBuildOrderItem[]): string[] {
    return buildOrder
      .filter(item => item.action === 'Research' || item.action === 'Upgrade')
      .map(item => `${item.timestamp} - ${item.unitName}`);
  }
}