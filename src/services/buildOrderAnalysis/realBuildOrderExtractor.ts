/**
 * Real Build Order Extractor - Phase 1-3 Implementation
 * Extracts genuine build orders from screparsed commands
 */

import { CompleteUnitDatabase, SCUnitData } from './completeUnitDatabase';

export interface RealBuildOrderAction {
  time: string;
  frame: number;
  supply: string;
  action: 'Build' | 'Train' | 'Morph' | 'Research' | 'Upgrade';
  unitName: string;
  unitId: number;
  category: 'economy' | 'military' | 'tech' | 'supply' | 'defense' | 'special';
  cost: { minerals: number; gas: number; supply: number };
  efficiency: number;
  confidence: number;
  extractionMethod: string;
  strategic: {
    priority: 'essential' | 'important' | 'situational' | 'spam';
    timing: 'opening' | 'early' | 'mid' | 'late';
    purpose: string;
  };
}

export interface CommandToUnitMapping {
  commandType: string;
  unitId?: number;
  actionType: 'Build' | 'Train' | 'Research' | 'Upgrade';
  priority: number;
}

export class RealBuildOrderExtractor {
  
  /**
   * Phase 1: Command Analysis
   * Analyze real screparsed commands and extract build orders
   */
  static extractRealBuildOrder(
    commands: any[], 
    playerRace: string, 
    playerId: number
  ): RealBuildOrderAction[] {
    console.log(`[RealBuildOrderExtractor] Extracting build order for ${playerRace} player ${playerId}`);
    console.log(`[RealBuildOrderExtractor] Total commands to analyze: ${commands.length}`);
    
    // Phase 1: Filter player-specific build commands
    const playerCommands = commands.filter(cmd => 
      cmd.playerId === playerId && this.isBuildCommand(cmd)
    );
    
    console.log(`[RealBuildOrderExtractor] Player build commands: ${playerCommands.length}`);
    
    // Phase 2: Convert commands to build order actions
    const buildActions: RealBuildOrderAction[] = [];
    let currentSupply = this.getStartingSupply(playerRace);
    let supplyUsed = this.getStartingSupplyUsed(playerRace);
    
    // Sort by frame (chronological order)
    const sortedCommands = playerCommands.sort((a, b) => a.frame - b.frame);
    
    for (const command of sortedCommands) {
      const action = this.convertCommandToBuildOrder(
        command, 
        playerRace, 
        currentSupply, 
        supplyUsed
      );
      
      if (action && this.isValidForRace(action.unitName, playerRace)) {
        buildActions.push(action);
        
        // Update supply calculation
        const unitData = CompleteUnitDatabase.getUnitById(action.unitId);
        if (unitData) {
          if (CompleteUnitDatabase.isSupplyProvider(action.unitId)) {
            currentSupply += 8; // Standard supply increase
          }
          supplyUsed += unitData.cost.supply;
        }
        
        console.log(`[RealBuildOrderExtractor] ${action.time}: ${action.unitName} (${supplyUsed}/${currentSupply})`);
      }
    }
    
    console.log(`[RealBuildOrderExtractor] Final build order: ${buildActions.length} actions`);
    return buildActions;
  }
  
  /**
   * Phase 2: Command Type Analysis
   * Identify build-related commands from screparsed
   */
  private static isBuildCommand(command: any): boolean {
    console.log(`[RealBuildOrderExtractor] Checking command:`, {
      command: command.command,
      type: command.type,
      commandType: command.commandType,
      data: command.data,
      full: command
    });
    
    // Debug: Log all command structures to understand screparsed format
    return true; // Temporarily accept all commands to see what we get
  }
  
  /**
   * Phase 3: Command-to-Unit Conversion
   * Convert screparsed commands to build order items
   */
  private static convertCommandToBuildOrder(
    command: any,
    playerRace: string,
    currentSupply: number,
    supplyUsed: number
  ): RealBuildOrderAction | null {
    
    // Extract unit information from command
    const unitMapping = this.extractUnitFromCommand(command, playerRace);
    if (!unitMapping) {
      return null;
    }
    
    const unitData = CompleteUnitDatabase.getUnitById(unitMapping.unitId);
    if (!unitData) {
      console.warn(`[RealBuildOrderExtractor] Unknown unit ID: ${unitMapping.unitId}`);
      return null;
    }
    
    // Build the action
    return {
      time: this.framesToTime(command.frame),
      frame: command.frame,
      supply: `${supplyUsed}/${currentSupply}`,
      action: unitMapping.actionType,
      unitName: unitData.name,
      unitId: unitData.id,
      category: unitData.category,
      cost: unitData.cost,
      efficiency: 95, // High confidence from real data
      confidence: 98, // Very high confidence from real commands
      extractionMethod: 'screparsed-real',
      strategic: {
        priority: this.getPriority(unitData),
        timing: this.getTimingPhase(command.frame),
        purpose: this.getPurpose(unitData)
      }
    };
  }
  
  /**
   * Phase 2: Unit Extraction from Commands
   * Extract unit IDs and types from command data
   */
  private static extractUnitFromCommand(command: any, playerRace: string): CommandToUnitMapping | null {
    // Try multiple ways to extract unit information
    
    // Method 1: Direct unit ID from parameters
    if (command.data?.unitType || command.parameters?.unitType) {
      const unitId = command.data?.unitType || command.parameters?.unitType;
      return {
        commandType: command.command || 'Build',
        unitId: unitId,
        actionType: this.inferActionType(command),
        priority: 1
      };
    }
    
    // Method 2: Parse from command string
    const commandStr = command.command || command.type || '';
    const unitId = this.parseUnitFromString(commandStr, playerRace);
    if (unitId !== null) {
      return {
        commandType: commandStr,
        unitId: unitId,
        actionType: this.inferActionType(command),
        priority: 2
      };
    }
    
    // Method 3: Target building/unit from command data
    if (command.data?.targetId || command.parameters?.target) {
      const targetId = command.data?.targetId || command.parameters?.target;
      return {
        commandType: commandStr,
        unitId: targetId,
        actionType: 'Build',
        priority: 3
      };
    }
    
    return null;
  }
  
  /**
   * Parse unit ID from command string using race-specific patterns
   */
  private static parseUnitFromString(commandStr: string, playerRace: string): number | null {
    const raceUnits = CompleteUnitDatabase.getUnitsByRace(playerRace as any);
    
    for (const unit of raceUnits) {
      const unitName = unit.name.toLowerCase();
      const cmdLower = commandStr.toLowerCase();
      
      // Direct name match
      if (cmdLower.includes(unitName)) {
        return unit.id;
      }
      
      // Common abbreviations
      if (this.matchesAbbreviation(cmdLower, unitName)) {
        return unit.id;
      }
    }
    
    return null;
  }
  
  /**
   * Check for common StarCraft abbreviations
   */
  private static matchesAbbreviation(command: string, unitName: string): boolean {
    const abbreviations: Record<string, string[]> = {
      'zealot': ['zeal', 'lot'],
      'dragoon': ['goon', 'drag'],
      'probe': ['prob'],
      'pylon': ['pyl'],
      'gateway': ['gate', 'gw'],
      'cybernetics core': ['cyber', 'core'],
      'marine': ['rine'],
      'supply depot': ['depot', 'sup'],
      'barracks': ['rax', 'racks'],
      'command center': ['cc', 'command'],
      'zergling': ['ling', 'zer'],
      'hydralisk': ['hydra', 'hydr'],
      'spawning pool': ['pool'],
      'overlord': ['ovie', 'ol']
    };
    
    const unitLower = unitName.toLowerCase();
    const abbrevs = abbreviations[unitLower] || [];
    
    return abbrevs.some(abbrev => command.includes(abbrev));
  }
  
  /**
   * Infer action type from command
   */
  private static inferActionType(command: any): 'Build' | 'Train' | 'Research' | 'Upgrade' {
    const commandStr = (command.command || command.type || '').toLowerCase();
    
    if (commandStr.includes('train')) return 'Train';
    if (commandStr.includes('research')) return 'Research';
    if (commandStr.includes('upgrade')) return 'Upgrade';
    return 'Build';
  }
  
  /**
   * Phase 4: Race Validation
   * Ensure units match player race
   */
  private static isValidForRace(unitName: string, playerRace: string): boolean {
    const raceUnits = CompleteUnitDatabase.getUnitsByRace(playerRace as any);
    return raceUnits.some(unit => unit.name === unitName);
  }
  
  /**
   * Get starting supply for race
   */
  private static getStartingSupply(race: string): number {
    switch (race.toLowerCase()) {
      case 'protoss': return 9;  // Nexus provides 9
      case 'terran': return 10;  // Command Center provides 10  
      case 'zerg': return 9;     // Overlord provides 8 + Hatchery 1
      default: return 9;
    }
  }
  
  /**
   * Get starting supply used for race
   */
  private static getStartingSupplyUsed(race: string): number {
    switch (race.toLowerCase()) {
      case 'protoss': return 4; // 4 Probes
      case 'terran': return 4;  // 4 SCVs
      case 'zerg': return 4;    // 4 Drones
      default: return 4;
    }
  }
  
  /**
   * Convert frames to time string
   */
  private static framesToTime(frame: number): string {
    const seconds = Math.floor(frame / 24); // 24 FPS for SC:R
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Get strategic priority of unit
   */
  private static getPriority(unit: SCUnitData): 'essential' | 'important' | 'situational' | 'spam' {
    if (CompleteUnitDatabase.isWorker(unit.id) || 
        CompleteUnitDatabase.isSupplyProvider(unit.id)) {
      return 'essential';
    }
    
    if (unit.category === 'military' || unit.category === 'economy') {
      return 'important';
    }
    
    return 'situational';
  }
  
  /**
   * Get timing phase based on frame
   */
  private static getTimingPhase(frame: number): 'opening' | 'early' | 'mid' | 'late' {
    const minutes = frame / (24 * 60); // 24 FPS
    
    if (minutes < 2) return 'opening';
    if (minutes < 5) return 'early';
    if (minutes < 10) return 'mid';
    return 'late';
  }
  
  /**
   * Get strategic purpose of unit
   */
  private static getPurpose(unit: SCUnitData): string {
    switch (unit.category) {
      case 'economy': return 'Economic development';
      case 'military': return 'Military production';
      case 'tech': return 'Technology advancement';
      case 'supply': return 'Supply management';
      case 'defense': return 'Base defense';
      default: return 'Strategic development';
    }
  }
}