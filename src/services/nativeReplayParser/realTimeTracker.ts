/**
 * Real-Time Resource & Supply Tracker für SC:R Replays
 * Verfolgt echte Resources, Supply und Build Orders
 */

import { SCUnit, getUnitById, getCommandTypeName } from './scUnitDatabase';

export interface PlayerState {
  minerals: number;
  gas: number;
  currentSupply: number;
  maxSupply: number;
  buildings: SCUnit[];
  units: SCUnit[];
  upgrades: string[];
  technologies: string[];
}

export interface BuildOrderEntry {
  time: string;
  frame: number;
  supply: string; // z.B. "12/17"
  action: string;
  unitName: string;
  cost: { minerals: number; gas: number };
  category: 'build' | 'train' | 'tech' | 'upgrade';
}

export interface RealTimeEvent {
  frame: number;
  time: string;
  playerId: number;
  eventType: 'build' | 'train' | 'tech' | 'attack' | 'move' | 'micro';
  unitName?: string;
  targetUnitName?: string;
  minerals?: number;
  gas?: number;
  supply?: string;
}

export class RealTimeTracker {
  private playerStates: Map<number, PlayerState> = new Map();
  private buildOrders: Map<number, BuildOrderEntry[]> = new Map();
  private events: RealTimeEvent[] = [];

  constructor(playerCount: number, raceMapping: Record<number, string>) {
    // Initialisiere Player States
    for (let i = 0; i < playerCount; i++) {
      const race = raceMapping[i];
      this.playerStates.set(i, {
        minerals: 50, // SC standard start
        gas: 0,
        currentSupply: this.getStartingSupply(race),
        maxSupply: this.getStartingMaxSupply(race),
        buildings: this.getStartingBuildings(race),
        units: this.getStartingUnits(race),
        upgrades: [],
        technologies: []
      });
      this.buildOrders.set(i, []);
    }
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
      case 'protoss': return 9; // 1 Pylon (8) + Nexus (1)
      case 'terran': return 10; // 1 Supply Depot
      case 'zerg': return 9;    // 1 Overlord
      default: return 10;
    }
  }

  private getStartingBuildings(race: string): SCUnit[] {
    const buildings: SCUnit[] = [];
    
    switch (race) {
      case 'protoss':
        const nexus = getUnitById(0x9A);
        if (nexus) buildings.push(nexus);
        break;
      case 'terran':
        const commandCenter = getUnitById(0x6A);
        if (commandCenter) buildings.push(commandCenter);
        break;
      case 'zerg':
        const hatchery = getUnitById(0x82);
        if (hatchery) buildings.push(hatchery);
        break;
    }
    
    return buildings;
  }

  private getStartingUnits(race: string): SCUnit[] {
    const units: SCUnit[] = [];
    
    switch (race) {
      case 'protoss':
        const probe = getUnitById(0x40);
        if (probe) {
          for (let i = 0; i < 4; i++) units.push(probe);
        }
        break;
      case 'terran':
        const scv = getUnitById(0x07);
        if (scv) {
          for (let i = 0; i < 4; i++) units.push(scv);
        }
        break;
      case 'zerg':
        const drone = getUnitById(0x25);
        const overlord = getUnitById(0x2A);
        if (drone) {
          for (let i = 0; i < 4; i++) units.push(drone);
        }
        if (overlord) units.push(overlord);
        break;
    }
    
    return units;
  }

  public processCommand(cmd: any): void {
    const playerId = cmd.playerId || 0;
    const frame = cmd.frame || 0;
    const time = this.frameToTime(frame);
    const commandType = getCommandTypeName(cmd.typeName || '');
    
    const playerState = this.playerStates.get(playerId);
    if (!playerState) return;

    // Resource Generation (vereinfacht)
    this.updateResources(playerId, frame);

    let event: RealTimeEvent | null = null;

    switch (commandType) {
      case 'Train':
        event = this.processTrain(cmd, playerId, frame, time, playerState);
        break;
      case 'Build':
        event = this.processBuild(cmd, playerId, frame, time, playerState);
        break;
      case 'Research':
        event = this.processResearch(cmd, playerId, frame, time, playerState);
        break;
      case 'Upgrade':
        event = this.processUpgrade(cmd, playerId, frame, time, playerState);
        break;
      case 'Attack':
      case 'Attack Move':
      case 'Attack Unit':
        event = this.processAttack(cmd, playerId, frame, time);
        break;
      case 'Move':
        event = this.processMove(cmd, playerId, frame, time);
        break;
      default:
        // Andere Commands (Micro, etc.)
        if (['Select', 'Stop', 'Hold Position', 'Patrol'].includes(commandType)) {
          event = {
            frame,
            time,
            playerId,
            eventType: 'micro'
          };
        }
        break;
    }

    if (event) {
      this.events.push(event);
    }
  }

  private processTrain(cmd: any, playerId: number, frame: number, time: string, playerState: PlayerState): RealTimeEvent | null {
    // Vereinfachte Unit Detection basierend auf Command Daten
    const unitName = this.detectTrainedUnit(cmd, playerState);
    const unit = this.findUnitByName(unitName);
    
    if (unit && this.canAfford(playerState, unit)) {
      // Kosten abziehen
      playerState.minerals -= unit.cost.minerals;
      playerState.gas -= unit.cost.gas;
      playerState.currentSupply += unit.cost.supply;
      
      // Unit hinzufügen
      playerState.units.push(unit);

      // Build Order Entry
      const buildEntry: BuildOrderEntry = {
        time,
        frame,
        supply: `${playerState.currentSupply}/${playerState.maxSupply}`,
        action: 'Train',
        unitName: unit.name,
        cost: { minerals: unit.cost.minerals, gas: unit.cost.gas },
        category: 'train'
      };
      
      this.buildOrders.get(playerId)?.push(buildEntry);

      return {
        frame,
        time,
        playerId,
        eventType: 'train',
        unitName: unit.name,
        minerals: playerState.minerals,
        gas: playerState.gas,
        supply: `${playerState.currentSupply}/${playerState.maxSupply}`
      };
    }

    return null;
  }

  private processBuild(cmd: any, playerId: number, frame: number, time: string, playerState: PlayerState): RealTimeEvent | null {
    // Vereinfachte Building Detection
    const buildingName = this.detectBuiltBuilding(cmd, playerState);
    const building = this.findUnitByName(buildingName);
    
    if (building && this.canAfford(playerState, building)) {
      // Kosten abziehen
      playerState.minerals -= building.cost.minerals;
      playerState.gas -= building.cost.gas;
      
      // Building hinzufügen
      playerState.buildings.push(building);

      // Supply Update für Supply-Gebäude
      if (building.name === 'Pylon') playerState.maxSupply += 8;
      if (building.name === 'Supply Depot') playerState.maxSupply += 8;
      if (building.name === 'Overlord') playerState.maxSupply += 8;

      // Build Order Entry
      const buildEntry: BuildOrderEntry = {
        time,
        frame,
        supply: `${playerState.currentSupply}/${playerState.maxSupply}`,
        action: 'Build',
        unitName: building.name,
        cost: { minerals: building.cost.minerals, gas: building.cost.gas },
        category: 'build'
      };
      
      this.buildOrders.get(playerId)?.push(buildEntry);

      return {
        frame,
        time,
        playerId,
        eventType: 'build',
        unitName: building.name,
        minerals: playerState.minerals,
        gas: playerState.gas,
        supply: `${playerState.currentSupply}/${playerState.maxSupply}`
      };
    }

    return null;
  }

  private processResearch(cmd: any, playerId: number, frame: number, time: string, playerState: PlayerState): RealTimeEvent | null {
    const techName = this.detectResearch(cmd);
    
    if (techName) {
      playerState.technologies.push(techName);
      
      const buildEntry: BuildOrderEntry = {
        time,
        frame,
        supply: `${playerState.currentSupply}/${playerState.maxSupply}`,
        action: 'Research',
        unitName: techName,
        cost: { minerals: 0, gas: 0 }, // Vereinfacht
        category: 'tech'
      };
      
      this.buildOrders.get(playerId)?.push(buildEntry);

      return {
        frame,
        time,
        playerId,
        eventType: 'tech'
      };
    }

    return null;
  }

  private processUpgrade(cmd: any, playerId: number, frame: number, time: string, playerState: PlayerState): RealTimeEvent | null {
    const upgradeName = this.detectUpgrade(cmd);
    
    if (upgradeName) {
      playerState.upgrades.push(upgradeName);
      
      const buildEntry: BuildOrderEntry = {
        time,
        frame,
        supply: `${playerState.currentSupply}/${playerState.maxSupply}`,
        action: 'Upgrade',
        unitName: upgradeName,
        cost: { minerals: 0, gas: 0 }, // Vereinfacht
        category: 'upgrade'
      };
      
      this.buildOrders.get(playerId)?.push(buildEntry);

      return {
        frame,
        time,
        playerId,
        eventType: 'tech'
      };
    }

    return null;
  }

  private processAttack(cmd: any, playerId: number, frame: number, time: string): RealTimeEvent {
    return {
      frame,
      time,
      playerId,
      eventType: 'attack'
    };
  }

  private processMove(cmd: any, playerId: number, frame: number, time: string): RealTimeEvent {
    return {
      frame,
      time,
      playerId,
      eventType: 'move'
    };
  }

  private updateResources(playerId: number, frame: number): void {
    const playerState = this.playerStates.get(playerId);
    if (!playerState) return;

    // Vereinfachte Resource Generation (8 minerals/gas pro Sekunde pro Worker)
    const workersCount = this.countWorkers(playerState);
    const secondsElapsed = frame / (24 * 60); // SC frame rate
    const resourceRate = 8; // minerals per second per worker
    
    playerState.minerals += Math.floor(workersCount * resourceRate * (1 / 60)); // per frame
    playerState.gas += Math.floor(workersCount * resourceRate * 0.5 * (1 / 60)); // gas rate
  }

  private countWorkers(playerState: PlayerState): number {
    return playerState.units.filter(unit => 
      ['Probe', 'SCV', 'Drone'].includes(unit.name)
    ).length;
  }

  private canAfford(playerState: PlayerState, unit: SCUnit): boolean {
    return playerState.minerals >= unit.cost.minerals && 
           playerState.gas >= unit.cost.gas;
  }

  private detectTrainedUnit(cmd: any, playerState: PlayerState): string {
    // Vereinfachte Detection basierend auf verfügbaren Gebäuden
    const buildings = playerState.buildings.map(b => b.name);
    
    if (buildings.includes('Barracks')) return 'Marine';
    if (buildings.includes('Gateway')) return 'Zealot';
    if (buildings.includes('Spawning Pool')) return 'Zergling';
    
    return 'Worker';
  }

  private detectBuiltBuilding(cmd: any, playerState: PlayerState): string {
    // Einfache Heuristik basierend auf Command Timing und verfügbaren Tech
    const buildingCount = playerState.buildings.length;
    
    if (buildingCount < 3) return 'Supply Building';
    if (buildingCount < 5) return 'Production Building';
    
    return 'Advanced Building';
  }

  private detectResearch(cmd: any): string {
    return 'Technology';
  }

  private detectUpgrade(cmd: any): string {
    return 'Upgrade';
  }

  private findUnitByName(name: string): SCUnit | undefined {
    const unitMap: Record<string, number> = {
      'Marine': 0x00,
      'Zealot': 0x41,
      'Zergling': 0x26,
      'Worker': 0x07, // Default SCV
      'Supply Building': 0x6B, // Supply Depot
      'Production Building': 0x6D, // Barracks
      'Advanced Building': 0x6F // Factory
    };
    
    const unitId = unitMap[name];
    return unitId ? getUnitById(unitId) : undefined;
  }

  private frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / 24);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public getBuildOrder(playerId: number): BuildOrderEntry[] {
    return this.buildOrders.get(playerId) || [];
  }

  public getPlayerState(playerId: number): PlayerState | undefined {
    return this.playerStates.get(playerId);
  }

  public getEvents(): RealTimeEvent[] {
    return this.events;
  }

  public getPlayerStats(playerId: number) {
    const state = this.playerStates.get(playerId);
    const buildOrder = this.buildOrders.get(playerId) || [];
    
    if (!state) return null;

    return {
      totalBuildings: state.buildings.length,
      totalUnits: state.units.length,
      currentSupply: state.currentSupply,
      maxSupply: state.maxSupply,
      minerals: state.minerals,
      gas: state.gas,
      buildOrderLength: buildOrder.length,
      economicEfficiency: this.calculateEconomicEfficiency(state, buildOrder),
      strategicAssessment: this.assessStrategy(state, buildOrder)
    };
  }

  private calculateEconomicEfficiency(state: PlayerState, buildOrder: BuildOrderEntry[]): number {
    const workerCount = this.countWorkers(state);
    const totalBuildings = state.buildings.length;
    const efficiency = Math.min(100, (workerCount * 10) + (totalBuildings * 5));
    return Math.round(efficiency);
  }

  private assessStrategy(state: PlayerState, buildOrder: BuildOrderEntry[]): string {
    const workerCount = this.countWorkers(state);
    const militaryUnits = state.units.filter(u => u.category === 'unit' && 
      !['Probe', 'SCV', 'Drone', 'Overlord'].includes(u.name)).length;
    
    if (workerCount > militaryUnits * 2) return 'Economic Focus';
    if (militaryUnits > workerCount) return 'Military Rush';
    if (state.buildings.filter(b => b.category === 'building').length > 8) return 'Tech Focus';
    
    return 'Balanced Strategy';
  }
}