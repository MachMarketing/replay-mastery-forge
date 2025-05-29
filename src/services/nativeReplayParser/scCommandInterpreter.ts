
/**
 * StarCraft: Remastered Command Interpreter
 * Konvertiert rohe Command-IDs zu verständlichen Gameplay-Aktionen
 */

import { getUnitInfo, getUnitName } from './commandMapper';

export interface InterpretedCommand {
  frame: number;
  playerId: number;
  timestamp: string;
  actionType: 'build' | 'train' | 'attack' | 'move' | 'select' | 'tech' | 'micro' | 'macro' | 'other';
  actionName: string;
  unitName?: string;
  targetUnit?: string;
  position?: { x: number; y: number };
  isEconomicAction: boolean;
  isMicroAction: boolean;
  cost?: { minerals: number; gas: number };
  priority: 'critical' | 'important' | 'normal' | 'spam';
}

// StarCraft: Remastered Command ID Mapping (basierend auf BWAPI)
export const SC_COMMAND_MAPPING: Record<number, {
  name: string;
  category: 'build' | 'train' | 'attack' | 'move' | 'select' | 'tech' | 'micro' | 'macro' | 'other';
  isEconomic: boolean;
  isMicro: boolean;
  priority: 'critical' | 'important' | 'normal' | 'spam';
}> = {
  // Build Commands (KRITISCH für Build Order)
  0x0C: { name: 'Build Structure', category: 'build', isEconomic: true, isMicro: false, priority: 'critical' },
  0x20: { name: 'Build Self/Morph', category: 'build', isEconomic: true, isMicro: false, priority: 'critical' },
  0x34: { name: 'Building Morph', category: 'build', isEconomic: true, isMicro: false, priority: 'critical' },
  
  // Train Commands (KRITISCH für Build Order)
  0x14: { name: 'Train Unit', category: 'train', isEconomic: true, isMicro: false, priority: 'critical' },
  0x1D: { name: 'Train Unit', category: 'train', isEconomic: true, isMicro: false, priority: 'critical' },
  0x25: { name: 'Train Fighter', category: 'train', isEconomic: true, isMicro: false, priority: 'important' },
  
  // Tech Commands (WICHTIG für Strategie)
  0x2F: { name: 'Research Technology', category: 'tech', isEconomic: true, isMicro: false, priority: 'important' },
  0x31: { name: 'Upgrade', category: 'tech', isEconomic: true, isMicro: false, priority: 'important' },
  
  // Combat Commands (MICRO)
  0x15: { name: 'Attack', category: 'attack', isEconomic: false, isMicro: true, priority: 'important' },
  0x11: { name: 'Attack Move', category: 'attack', isEconomic: false, isMicro: true, priority: 'important' },
  0x13: { name: 'Right Click', category: 'move', isEconomic: false, isMicro: true, priority: 'normal' },
  
  // Movement Commands (MICRO)
  0x18: { name: 'Stop', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  0x2A: { name: 'Hold Position', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  0x2B: { name: 'Burrow', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x2C: { name: 'Unburrow', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x23: { name: 'Unsiege', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x24: { name: 'Siege', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x1F: { name: 'Cloak', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x35: { name: 'Stim Pack', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  
  // Special Abilities (MICRO)
  0x1A: { name: 'Use Tech', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x1B: { name: 'Use Tech Position', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x29: { name: 'Merge Archon', category: 'micro', isEconomic: false, isMicro: true, priority: 'critical' },
  
  // Selection Commands (MACRO - aber SPAM wenn zu oft)
  0x09: { name: 'Select Units', category: 'select', isEconomic: false, isMicro: false, priority: 'spam' },
  0x0A: { name: 'Shift Select', category: 'select', isEconomic: false, isMicro: false, priority: 'spam' },
  0x0B: { name: 'Shift Deselect', category: 'select', isEconomic: false, isMicro: false, priority: 'spam' },
  
  // Cancel Commands
  0x16: { name: 'Cancel', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  0x1E: { name: 'Cancel Train', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  0x30: { name: 'Cancel Research', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  0x32: { name: 'Cancel Upgrade', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  
  // Utility Commands
  0x1C: { name: 'Return Cargo', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  0x27: { name: 'Unload All', category: 'macro', isEconomic: false, isMicro: false, priority: 'normal' },
  0x28: { name: 'Unload', category: 'macro', isEconomic: false, isMicro: false, priority: 'normal' },
  0x2E: { name: 'Lift Building', category: 'macro', isEconomic: false, isMicro: false, priority: 'normal' },
  
  // Network/Sync (IGNORIEREN für APM)
  0x36: { name: 'Sync', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x37: { name: 'Voice Enable', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x38: { name: 'Voice Enable', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' }
};

export class SCCommandInterpreter {
  
  /**
   * Interpretiert einen rohen Command zu einer verständlichen Aktion
   */
  static interpretCommand(command: any): InterpretedCommand {
    const commandId = command.type || command.commandId;
    const mapping = SC_COMMAND_MAPPING[commandId];
    
    if (!mapping) {
      return {
        frame: command.frame || 0,
        playerId: command.playerId || 0,
        timestamp: this.frameToTime(command.frame || 0),
        actionType: 'other',
        actionName: `Unknown Command 0x${commandId.toString(16)}`,
        isEconomicAction: false,
        isMicroAction: false,
        priority: 'spam'
      };
    }
    
    // Erweiterte Interpretation basierend auf Parametern
    let actionName = mapping.name;
    let unitName: string | undefined;
    let cost: { minerals: number; gas: number } | undefined;
    
    // Unit/Building Namen aus Parametern extrahieren
    if (command.parameters?.unitTypeId || command.parameters?.unitId) {
      const unitId = command.parameters.unitTypeId || command.parameters.unitId;
      unitName = getUnitName(unitId);
      const unitInfo = getUnitInfo(unitId);
      
      if (unitInfo) {
        cost = {
          minerals: unitInfo.mineralCost || 0,
          gas: unitInfo.gasCost || 0
        };
        
        // Spezifische Action Namen
        if (mapping.category === 'build') {
          actionName = `Build ${unitName}`;
        } else if (mapping.category === 'train') {
          actionName = `Train ${unitName}`;
        }
      }
    }
    
    // Position extrahieren
    let position: { x: number; y: number } | undefined;
    if (command.parameters?.x !== undefined && command.parameters?.y !== undefined) {
      position = {
        x: command.parameters.x,
        y: command.parameters.y
      };
    }
    
    return {
      frame: command.frame || 0,
      playerId: command.playerId || 0,
      timestamp: this.frameToTime(command.frame || 0),
      actionType: mapping.category,
      actionName,
      unitName,
      position,
      isEconomicAction: mapping.isEconomic,
      isMicroAction: mapping.isMicro,
      cost,
      priority: mapping.priority
    };
  }
  
  /**
   * Analysiert Commands und erstellt Gameplay-Insights
   */
  static analyzeGameplay(interpretedCommands: InterpretedCommand[]): {
    buildOrder: Array<{
      time: string;
      action: string;
      unit: string;
      supply: number;
      cost?: { minerals: number; gas: number };
    }>;
    microEvents: Array<{
      time: string;
      action: string;
      intensity: number;
    }>;
    economicEfficiency: number;
    playstyle: 'aggressive' | 'defensive' | 'economic' | 'tech-focused';
    apmBreakdown: {
      economic: number;
      micro: number;
      selection: number;
      spam: number;
    };
  } {
    // Build Order extrahieren (nur kritische wirtschaftliche Aktionen)
    const buildOrder = interpretedCommands
      .filter(cmd => cmd.isEconomicAction && cmd.priority === 'critical')
      .slice(0, 25) // Erste 25 Build-Aktionen
      .map((cmd, index) => ({
        time: cmd.timestamp,
        action: cmd.actionName,
        unit: cmd.unitName || 'Unknown',
        supply: this.estimateSupply(index),
        cost: cmd.cost
      }));
    
    // Micro Events extrahieren
    const microCommands = interpretedCommands.filter(cmd => cmd.isMicroAction);
    const microEvents = this.groupMicroActions(microCommands);
    
    // APM Breakdown berechnen
    const totalCommands = interpretedCommands.length;
    const economicCommands = interpretedCommands.filter(cmd => cmd.isEconomicAction).length;
    const microCommands2 = interpretedCommands.filter(cmd => cmd.isMicroAction).length;
    const selectionCommands = interpretedCommands.filter(cmd => cmd.actionType === 'select').length;
    const spamCommands = interpretedCommands.filter(cmd => cmd.priority === 'spam').length;
    
    const apmBreakdown = {
      economic: Math.round((economicCommands / totalCommands) * 100),
      micro: Math.round((microCommands2 / totalCommands) * 100),
      selection: Math.round((selectionCommands / totalCommands) * 100),
      spam: Math.round((spamCommands / totalCommands) * 100)
    };
    
    // Playstyle bestimmen
    const playstyle = this.determinePlaystyle(apmBreakdown, buildOrder);
    
    // Economic Efficiency
    const economicEfficiency = Math.min((economicCommands / Math.max(totalCommands, 1)) * 100, 100);
    
    return {
      buildOrder,
      microEvents,
      economicEfficiency: Math.round(economicEfficiency),
      playstyle,
      apmBreakdown
    };
  }
  
  private static frameToTime(frame: number): string {
    const seconds = Math.floor(frame / 23.81);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  private static estimateSupply(buildIndex: number): number {
    // Vereinfachte Supply-Schätzung basierend auf Build-Reihenfolge
    return Math.min(9 + buildIndex * 2, 200);
  }
  
  private static groupMicroActions(microCommands: InterpretedCommand[]): Array<{
    time: string;
    action: string;
    intensity: number;
  }> {
    const grouped: Array<{ time: string; action: string; intensity: number }> = [];
    const timeWindows = new Map<string, number>();
    
    // Gruppiere Micro-Aktionen in 10-Sekunden-Fenster
    microCommands.forEach(cmd => {
      const timeWindow = Math.floor(cmd.frame / (23.81 * 10)) * 10; // 10-Sekunden-Fenster
      const timeKey = this.frameToTime(timeWindow * 23.81);
      timeWindows.set(timeKey, (timeWindows.get(timeKey) || 0) + 1);
    });
    
    // Konvertiere zu Array und sortiere nach Intensität
    timeWindows.forEach((count, time) => {
      if (count >= 3) { // Nur signifikante Micro-Bursts
        grouped.push({
          time,
          action: `${count} Micro Actions`,
          intensity: Math.min(Math.round(count / 2), 10)
        });
      }
    });
    
    return grouped.sort((a, b) => b.intensity - a.intensity).slice(0, 10);
  }
  
  private static determinePlaystyle(
    apmBreakdown: { economic: number; micro: number; selection: number; spam: number },
    buildOrder: any[]
  ): 'aggressive' | 'defensive' | 'economic' | 'tech-focused' {
    const { economic, micro } = apmBreakdown;
    
    if (micro > 40) return 'aggressive';
    if (economic > 60) return 'economic';
    
    // Analysiere Build Order für Tech-Focus
    const techBuildings = buildOrder.filter(item => 
      ['Research', 'Upgrade', 'Tech', 'Academy', 'Archives', 'Laboratory'].some(keyword =>
        item.action.includes(keyword)
      )
    );
    
    if (techBuildings.length > buildOrder.length * 0.3) return 'tech-focused';
    
    return 'defensive';
  }
}
