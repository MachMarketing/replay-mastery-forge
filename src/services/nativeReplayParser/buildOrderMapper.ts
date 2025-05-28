
/**
 * Enhanced Build Order Generation with realistic timing and supply calculation
 */

import { getUnitInfo, getUnitName, categorizeAction, detectRaceFromBuildOrder } from './commandMapper';

export interface BuildOrderEntry {
  time: string;
  supply: number;
  action: string;
  unitName?: string;
  category: 'build' | 'train' | 'tech' | 'micro' | 'macro' | 'other';
  frame: number;
  cost?: {
    minerals: number;
    gas: number;
  };
}

export interface EnhancedBuildOrder {
  race: 'Protoss' | 'Terran' | 'Zerg' | 'Unknown';
  entries: BuildOrderEntry[];
  benchmarks: BuildOrderBenchmark[];
  efficiency: BuildOrderEfficiency;
}

export interface BuildOrderBenchmark {
  name: string;
  expectedTime: string;
  actualTime?: string;
  status: 'early' | 'on-time' | 'late' | 'missing';
  importance: 'critical' | 'important' | 'optional';
}

export interface BuildOrderEfficiency {
  economyScore: number; // 0-100
  techScore: number;    // 0-100
  timingScore: number;  // 0-100
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

const REMASTERED_FPS = 23.81;

export class BuildOrderMapper {
  
  static convertActionsToBuildOrder(
    actions: any[],
    playerName: string = 'Player'
  ): EnhancedBuildOrder {
    console.log(`[BuildOrderMapper] Converting ${actions.length} actions for ${playerName}`);
    
    // Filter relevant actions for build order
    const buildActions = actions.filter(action => {
      const category = categorizeAction(action.type || action.commandId, action.parameters?.unitTypeId);
      return ['build', 'train', 'tech'].includes(category);
    });
    
    console.log(`[BuildOrderMapper] Found ${buildActions.length} build-related actions`);
    
    // Detect race
    const race = detectRaceFromBuildOrder(buildActions);
    console.log(`[BuildOrderMapper] Detected race: ${race}`);
    
    // Convert to build order entries
    const entries = buildActions.slice(0, 30).map((action, index) => 
      this.convertActionToEntry(action, index, buildActions)
    );
    
    // Generate benchmarks
    const benchmarks = this.generateBenchmarks(race, entries);
    
    // Calculate efficiency
    const efficiency = this.calculateEfficiency(race, entries, benchmarks);
    
    return {
      race,
      entries,
      benchmarks,
      efficiency
    };
  }
  
  private static convertActionToEntry(
    action: any,
    index: number,
    allActions: any[]
  ): BuildOrderEntry {
    const unitId = action.parameters?.unitTypeId;
    const unitInfo = unitId ? getUnitInfo(unitId) : null;
    const unitName = unitId ? getUnitName(unitId) : '';
    
    const category = categorizeAction(action.type || action.commandId, unitId);
    const frame = action.frame || 0;
    const time = this.frameToTime(frame);
    const supply = this.estimateSupply(frame, allActions, index);
    
    let actionText = '';
    if (category === 'build') {
      actionText = `Build ${unitName}`;
    } else if (category === 'train') {
      actionText = `Train ${unitName}`;
    } else if (category === 'tech') {
      actionText = `Research ${unitName}`;
    } else {
      actionText = unitName || 'Unknown Action';
    }
    
    return {
      time,
      supply,
      action: actionText,
      unitName,
      category,
      frame,
      cost: unitInfo ? {
        minerals: unitInfo.mineralCost || 0,
        gas: unitInfo.gasCost || 0
      } : undefined
    };
  }
  
  private static frameToTime(frame: number): string {
    const totalSeconds = Math.floor(frame / REMASTERED_FPS);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  private static estimateSupply(frame: number, allActions: any[], currentIndex: number): number {
    const baseSupply = 4; // Starting supply for most races (9 for Zerg with Overlord)
    
    // Count supply-providing buildings/units built before this action
    const previousActions = allActions.slice(0, currentIndex);
    let supplyFromBuildings = 0;
    let unitsBuilt = 0;
    
    for (const prevAction of previousActions) {
      const unitId = prevAction.parameters?.unitTypeId;
      const unitInfo = unitId ? getUnitInfo(unitId) : null;
      
      if (unitInfo) {
        // Supply providers
        if (['Pylon', 'Supply Depot', 'Overlord'].includes(unitInfo.name)) {
          supplyFromBuildings += 8; // Standard supply per building
        }
        
        // Count units for supply usage
        if (unitInfo.type === 'unit' && unitInfo.supplyCost) {
          unitsBuilt += unitInfo.supplyCost;
        }
      }
    }
    
    // Estimate current supply usage
    const estimatedUsed = Math.min(baseSupply + unitsBuilt, 200);
    return estimatedUsed;
  }
  
  private static generateBenchmarks(
    race: 'Protoss' | 'Terran' | 'Zerg' | 'Unknown',
    entries: BuildOrderEntry[]
  ): BuildOrderBenchmark[] {
    const benchmarks: BuildOrderBenchmark[] = [];
    
    // Race-specific benchmarks
    switch (race) {
      case 'Protoss':
        benchmarks.push(
          { name: '8 Pylon', expectedTime: '1:15', status: 'missing', importance: 'critical' },
          { name: '10 Gateway', expectedTime: '1:45', status: 'missing', importance: 'critical' },
          { name: '12 Assimilator', expectedTime: '2:30', status: 'missing', importance: 'important' },
          { name: '14 Nexus', expectedTime: '4:30', status: 'missing', importance: 'critical' },
          { name: '16 Cybernetics Core', expectedTime: '3:00', status: 'missing', importance: 'important' }
        );
        break;
        
      case 'Terran':
        benchmarks.push(
          { name: '9 Supply Depot', expectedTime: '1:20', status: 'missing', importance: 'critical' },
          { name: '11 Barracks', expectedTime: '1:50', status: 'missing', importance: 'critical' },
          { name: '13 Refinery', expectedTime: '2:45', status: 'missing', importance: 'important' },
          { name: '1 Rax FE', expectedTime: '4:00', status: 'missing', importance: 'critical' },
          { name: 'Academy', expectedTime: '3:30', status: 'missing', importance: 'important' }
        );
        break;
        
      case 'Zerg':
        benchmarks.push(
          { name: '9 Spawning Pool', expectedTime: '1:30', status: 'missing', importance: 'critical' },
          { name: '12 Hatchery', expectedTime: '3:00', status: 'missing', importance: 'critical' },
          { name: 'Extractor', expectedTime: '2:15', status: 'missing', importance: 'important' },
          { name: 'Lair', expectedTime: '5:30', status: 'missing', importance: 'important' },
          { name: 'Hydralisk Den', expectedTime: '4:00', status: 'missing', importance: 'optional' }
        );
        break;
    }
    
    // Check actual timings against benchmarks
    for (const benchmark of benchmarks) {
      const matchingEntry = entries.find(entry => 
        entry.action.toLowerCase().includes(benchmark.name.toLowerCase()) ||
        entry.unitName?.toLowerCase().includes(benchmark.name.toLowerCase())
      );
      
      if (matchingEntry) {
        benchmark.actualTime = matchingEntry.time;
        benchmark.status = this.compareTiming(benchmark.expectedTime, matchingEntry.time);
      }
    }
    
    return benchmarks;
  }
  
  private static compareTiming(expected: string, actual: string): 'early' | 'on-time' | 'late' {
    const expectedSeconds = this.timeToSeconds(expected);
    const actualSeconds = this.timeToSeconds(actual);
    
    const diff = actualSeconds - expectedSeconds;
    
    if (diff < -10) return 'early';
    if (diff > 15) return 'late';
    return 'on-time';
  }
  
  private static timeToSeconds(timeStr: string): number {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }
  
  private static calculateEfficiency(
    race: 'Protoss' | 'Terran' | 'Zerg' | 'Unknown',
    entries: BuildOrderEntry[],
    benchmarks: BuildOrderBenchmark[]
  ): BuildOrderEfficiency {
    // Economy score (based on early economy buildings)
    const economyActions = entries.filter(e => 
      ['Nexus', 'Command Center', 'Hatchery', 'Probe', 'SCV', 'Drone'].includes(e.unitName || '')
    );
    const economyScore = Math.min(economyActions.length * 15, 100);
    
    // Tech score (based on tech buildings and timing)
    const techActions = entries.filter(e => e.category === 'tech');
    const techScore = Math.min(techActions.length * 20, 100);
    
    // Timing score (based on benchmark performance)
    const onTimeBenchmarks = benchmarks.filter(b => b.status === 'on-time' || b.status === 'early').length;
    const timingScore = Math.min((onTimeBenchmarks / Math.max(benchmarks.length, 1)) * 100, 100);
    
    // Overall grade
    const average = (economyScore + techScore + timingScore) / 3;
    let overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    
    if (average >= 85) overallGrade = 'A';
    else if (average >= 70) overallGrade = 'B';
    else if (average >= 55) overallGrade = 'C';
    else if (average >= 40) overallGrade = 'D';
    else overallGrade = 'F';
    
    return {
      economyScore: Math.round(economyScore),
      techScore: Math.round(techScore),
      timingScore: Math.round(timingScore),
      overallGrade
    };
  }
}

export const calculateAPM = (actions: any[], frameCount: number): number => {
  const minutes = frameCount / REMASTERED_FPS / 60;
  return Math.round(actions.length / minutes);
};

export const calculateEAPM = (actions: any[], frameCount: number): number => {
  const effectiveActions = actions.filter(action => {
    const category = categorizeAction(action.type || action.commandId);
    return !['other'].includes(category);
  });
  
  const minutes = frameCount / REMASTERED_FPS / 60;
  return Math.round(effectiveActions.length / minutes);
};
