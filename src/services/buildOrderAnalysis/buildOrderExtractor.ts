
/**
 * Intelligenter Build Order Extractor - Interpretiert screp-js Commands
 */

import { UNIT_NAMES, UnitID, CommandType } from '../nativeReplayParser/repcore/constants';

export interface BuildOrderAction {
  time: string;
  frame: number;
  supply: number;
  action: 'build' | 'train' | 'research' | 'upgrade';
  unitName: string;
  unitId: number;
  cost: { minerals: number; gas: number };
  category: 'worker' | 'military' | 'building' | 'tech' | 'economy';
  strategic: {
    isEconomic: boolean;
    isMilitary: boolean;
    isTech: boolean;
    timing: 'early' | 'normal' | 'late';
    efficiency: number;
  };
}

export interface BuildOrderTimeline {
  playerName: string;
  race: string;
  actions: BuildOrderAction[];
  analysis: {
    strategy: string;
    economicTiming: number;
    militaryTiming: number;
    techTiming: number;
    errors: string[];
    suggestions: string[];
    efficiency: number;
  };
}

export class BuildOrderExtractor {
  
  static extractFromCommands(commands: any[], playerInfo: any, gameFrames: number): BuildOrderTimeline {
    console.log(`[BuildOrderExtractor] Analyzing ${commands.length} commands for ${playerInfo.name}`);
    
    const buildActions: BuildOrderAction[] = [];
    let currentSupply = 4; // Starting supply for most races
    
    // Filter und sortiere relevante Commands
    const relevantCommands = commands
      .filter(cmd => this.isBuildCommand(cmd))
      .sort((a, b) => a.frame - b.frame);
    
    console.log(`[BuildOrderExtractor] Found ${relevantCommands.length} build commands`);
    
    for (const cmd of relevantCommands) {
      const action = this.parseCommand(cmd, currentSupply);
      if (action) {
        buildActions.push(action);
        
        // Update supply basierend auf gebauter Einheit
        currentSupply += this.getSupplyIncrease(action.unitId);
        
        console.log(`[BuildOrderExtractor] ${action.time}: ${action.unitName} at ${action.supply} supply`);
      }
    }
    
    // Strategische Analyse
    const analysis = this.analyzeStrategy(buildActions, playerInfo.race, gameFrames);
    
    return {
      playerName: playerInfo.name,
      race: playerInfo.race,
      actions: buildActions,
      analysis
    };
  }
  
  private static isBuildCommand(cmd: any): boolean {
    const buildCommandTypes = [
      CommandType.Build,
      CommandType.Train,
      CommandType.TrainUnit,
      CommandType.Tech,
      CommandType.Upgrade,
      CommandType.BuildingMorph,
      CommandType.UnitMorph
    ];
    
    return buildCommandTypes.includes(cmd.type) || 
           cmd.typeString?.includes('Build') || 
           cmd.typeString?.includes('Train') ||
           cmd.typeString?.includes('Research') ||
           cmd.typeString?.includes('Upgrade');
  }
  
  private static parseCommand(cmd: any, currentSupply: number): BuildOrderAction | null {
    const unitId = cmd.parameters?.unitType || cmd.parameters?.unit;
    const unitName = this.getUnitName(cmd, unitId);
    
    if (!unitName || unitName === 'Unknown') {
      return null;
    }
    
    const time = this.framesToTime(cmd.frame);
    const cost = this.getUnitCost(unitId);
    const category = this.categorizeUnit(unitId, unitName);
    const actionType = this.getActionType(cmd.typeString);
    
    return {
      time,
      frame: cmd.frame,
      supply: currentSupply,
      action: actionType,
      unitName,
      unitId: unitId || 0,
      cost,
      category,
      strategic: {
        isEconomic: category === 'economy' || category === 'worker',
        isMilitary: category === 'military',
        isTech: category === 'tech',
        timing: this.getTimingCategory(cmd.frame),
        efficiency: cmd.effective ? 100 : 50
      }
    };
  }
  
  private static getUnitName(cmd: any, unitId: number): string {
    // Versuche verschiedene Quellen für Unit Namen
    if (cmd.parameters?.unitName) return cmd.parameters.unitName;
    if (UNIT_NAMES[unitId]) return UNIT_NAMES[unitId];
    
    // Parse aus Command String
    const cmdString = cmd.typeString || '';
    if (cmdString.includes('Build')) {
      const match = cmdString.match(/Build (.+)/);
      if (match) return match[1];
    }
    if (cmdString.includes('Train')) {
      const match = cmdString.match(/Train (.+)/);
      if (match) return match[1];
    }
    
    return 'Unknown';
  }
  
  private static getActionType(cmdString: string): 'build' | 'train' | 'research' | 'upgrade' {
    if (cmdString?.includes('Build')) return 'build';
    if (cmdString?.includes('Train')) return 'train';
    if (cmdString?.includes('Research')) return 'research';
    if (cmdString?.includes('Upgrade')) return 'upgrade';
    return 'build';
  }
  
  private static categorizeUnit(unitId: number, unitName: string): 'worker' | 'military' | 'building' | 'tech' | 'economy' {
    const workers = [UnitID.SCV, UnitID.Probe, UnitID.Drone];
    const military = [UnitID.Marine, UnitID.Zealot, UnitID.Zergling, UnitID.Hydralisk, UnitID.Dragoon];
    const economy = [UnitID.CommandCenter, UnitID.Nexus, UnitID.Hatchery, UnitID.SupplyDepot, UnitID.Pylon, UnitID.Overlord];
    const tech = [UnitID.Academy, UnitID.CyberneticsCore, UnitID.SpawningPool];
    
    if (workers.includes(unitId)) return 'worker';
    if (military.includes(unitId)) return 'military';
    if (tech.includes(unitId)) return 'tech';
    if (economy.includes(unitId)) return 'economy';
    
    // Fallback basierend auf Namen
    const name = unitName.toLowerCase();
    if (name.includes('scv') || name.includes('probe') || name.includes('drone')) return 'worker';
    if (name.includes('depot') || name.includes('pylon') || name.includes('overlord')) return 'economy';
    if (name.includes('gateway') || name.includes('barracks') || name.includes('pool')) return 'building';
    
    return 'building';
  }
  
  private static getUnitCost(unitId: number): { minerals: number; gas: number } {
    const costs: Record<number, { minerals: number; gas: number }> = {
      [UnitID.SCV]: { minerals: 50, gas: 0 },
      [UnitID.Probe]: { minerals: 50, gas: 0 },
      [UnitID.Drone]: { minerals: 50, gas: 0 },
      [UnitID.Marine]: { minerals: 50, gas: 0 },
      [UnitID.Zealot]: { minerals: 100, gas: 0 },
      [UnitID.Zergling]: { minerals: 50, gas: 0 },
      [UnitID.Hydralisk]: { minerals: 75, gas: 25 },
      [UnitID.Dragoon]: { minerals: 125, gas: 50 },
      [UnitID.SupplyDepot]: { minerals: 100, gas: 0 },
      [UnitID.Pylon]: { minerals: 100, gas: 0 },
      [UnitID.Gateway]: { minerals: 150, gas: 0 },
      [UnitID.Barracks]: { minerals: 150, gas: 0 },
      [UnitID.CyberneticsCore]: { minerals: 200, gas: 0 },
    };
    
    return costs[unitId] || { minerals: 0, gas: 0 };
  }
  
  private static getSupplyIncrease(unitId: number): number {
    const supplyProviders: Record<number, number> = {
      [UnitID.SupplyDepot]: 8,
      [UnitID.Pylon]: 8,
      [UnitID.Overlord]: 8,
    };
    
    return supplyProviders[unitId] || 0;
  }
  
  private static getTimingCategory(frame: number): 'early' | 'normal' | 'late' {
    const minutes = frame / (23.81 * 60);
    if (minutes < 3) return 'early';
    if (minutes < 8) return 'normal';
    return 'late';
  }
  
  private static framesToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 23.81);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  private static analyzeStrategy(actions: BuildOrderAction[], race: string, gameFrames: number): any {
    const gameMinutes = gameFrames / (23.81 * 60);
    
    // Find key timings
    const firstWorker = actions.find(a => a.category === 'worker');
    const firstMilitary = actions.find(a => a.category === 'military');
    const firstTech = actions.find(a => a.category === 'tech');
    
    const economicTiming = firstWorker ? firstWorker.frame / (23.81 * 60) : 0;
    const militaryTiming = firstMilitary ? firstMilitary.frame / (23.81 * 60) : gameMinutes;
    const techTiming = firstTech ? firstTech.frame / (23.81 * 60) : gameMinutes;
    
    // Determine strategy
    let strategy = 'balanced';
    if (militaryTiming < 3) strategy = 'aggressive rush';
    else if (economicTiming < militaryTiming * 0.7) strategy = 'economic';
    else if (techTiming < militaryTiming) strategy = 'tech-focused';
    
    // Find errors and suggestions
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    if (race === 'Protoss') {
      const pylon = actions.find(a => a.unitName.includes('Pylon'));
      const gateway = actions.find(a => a.unitName.includes('Gateway'));
      
      if (pylon && gateway && pylon.frame > gateway.frame) {
        errors.push('Gateway vor Pylon gebaut - unmöglich!');
        suggestions.push('Baue immer zuerst Pylons für Supply');
      }
      
      if (!actions.find(a => a.unitName.includes('Cybernetics'))) {
        suggestions.push('Cybernetics Core für Tech-Upgrades fehlt');
      }
    }
    
    // Calculate efficiency
    const effectiveActions = actions.filter(a => a.strategic.efficiency > 75);
    const efficiency = effectiveActions.length / Math.max(actions.length, 1) * 100;
    
    return {
      strategy,
      economicTiming,
      militaryTiming,
      techTiming,
      errors,
      suggestions,
      efficiency: Math.round(efficiency)
    };
  }
}
