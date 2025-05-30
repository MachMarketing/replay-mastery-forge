/**
 * StarCraft: Remastered Command Interpreter
 * Enhanced with complete Go-repo command mappings and EAPM calculation
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
  ineffective: boolean;
  ineffectiveReason?: string;
}

// Complete StarCraft: Remastered Command ID Mapping (based on icza/screp)
export const SC_COMMAND_MAPPING: Record<number, {
  name: string;
  category: 'build' | 'train' | 'attack' | 'move' | 'select' | 'tech' | 'micro' | 'macro' | 'other';
  isEconomic: boolean;
  isMicro: boolean;
  priority: 'critical' | 'important' | 'normal' | 'spam';
}> = {
  // Network/Sync Commands (SPAM)
  0x05: { name: 'Keep Alive', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x06: { name: 'Save Game', category: 'other', isEconomic: false, isMicro: false, priority: 'normal' },
  0x07: { name: 'Load Game', category: 'other', isEconomic: false, isMicro: false, priority: 'normal' },
  0x08: { name: 'Restart Game', category: 'other', isEconomic: false, isMicro: false, priority: 'normal' },
  
  // Selection Commands (SPAM wenn zu oft)
  0x09: { name: 'Select Units', category: 'select', isEconomic: false, isMicro: false, priority: 'spam' },
  0x0A: { name: 'Shift Select', category: 'select', isEconomic: false, isMicro: false, priority: 'spam' },
  0x0B: { name: 'Shift Deselect', category: 'select', isEconomic: false, isMicro: false, priority: 'spam' },
  
  // Build Commands (KRITISCH für Build Order)
  0x0C: { name: 'Build Structure', category: 'build', isEconomic: true, isMicro: false, priority: 'critical' },
  
  // Alliance/Vision (MACRO)
  0x0D: { name: 'Share Vision', category: 'macro', isEconomic: false, isMicro: false, priority: 'normal' },
  0x0E: { name: 'Set Alliance', category: 'macro', isEconomic: false, isMicro: false, priority: 'normal' },
  
  // Game Control
  0x0F: { name: 'Change Game Speed', category: 'other', isEconomic: false, isMicro: false, priority: 'normal' },
  0x10: { name: 'Pause Game', category: 'other', isEconomic: false, isMicro: false, priority: 'normal' },
  0x11: { name: 'Resume Game', category: 'other', isEconomic: false, isMicro: false, priority: 'normal' },
  0x12: { name: 'Cheat', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  
  // Hotkey Commands (WICHTIG für Micro/Macro)
  0x13: { name: 'Hotkey', category: 'macro', isEconomic: false, isMicro: false, priority: 'normal' },
  
  // Movement/Attack Commands (MICRO)
  0x14: { name: 'Right Click', category: 'move', isEconomic: false, isMicro: true, priority: 'normal' },
  0x15: { name: 'Targeted Order', category: 'attack', isEconomic: false, isMicro: true, priority: 'important' },
  
  // Cancel Commands (MACRO)
  0x18: { name: 'Cancel Build', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  0x19: { name: 'Cancel Morph', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  
  // Unit Control (MICRO)
  0x1A: { name: 'Stop', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  0x1B: { name: 'Carrier Stop', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  0x1C: { name: 'Reaver Stop', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  0x1D: { name: 'Order Nothing', category: 'micro', isEconomic: false, isMicro: true, priority: 'spam' },
  0x1E: { name: 'Return Cargo', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  
  // Train Commands (KRITISCH für Build Order) - KORRIGIERTE IDs
  0x1F: { name: 'Train Unit', category: 'train', isEconomic: true, isMicro: false, priority: 'critical' },
  0x20: { name: 'Cancel Train', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  
  // Special Abilities (MICRO)
  0x21: { name: 'Cloak', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x22: { name: 'Decloak', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x23: { name: 'Unit Morph', category: 'train', isEconomic: true, isMicro: false, priority: 'critical' },
  
  // Siege Tank Control (MICRO)
  0x25: { name: 'Unsiege', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x26: { name: 'Siege', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  
  // Unit Production (WICHTIG)
  0x27: { name: 'Train Fighter', category: 'train', isEconomic: true, isMicro: false, priority: 'important' },
  
  // Transport Control (MICRO)
  0x28: { name: 'Unload All', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  0x29: { name: 'Unload', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  
  // Special Unit Creation (KRITISCH)
  0x2A: { name: 'Merge Archon', category: 'train', isEconomic: true, isMicro: false, priority: 'critical' },
  
  // Position Control (MICRO)
  0x2B: { name: 'Hold Position', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  0x2C: { name: 'Burrow', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  0x2D: { name: 'Unburrow', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  
  // Advanced Commands
  0x2E: { name: 'Cancel Nuke', category: 'macro', isEconomic: false, isMicro: false, priority: 'normal' },
  0x2F: { name: 'Lift Off', category: 'macro', isEconomic: false, isMicro: false, priority: 'normal' },
  
  // Tech/Research Commands (WICHTIG für Strategie) - KORRIGIERTE IDs
  0x30: { name: 'Research Technology', category: 'tech', isEconomic: true, isMicro: false, priority: 'important' },
  0x31: { name: 'Cancel Research', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  0x32: { name: 'Upgrade', category: 'tech', isEconomic: true, isMicro: false, priority: 'important' },
  0x33: { name: 'Cancel Upgrade', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  0x34: { name: 'Cancel Addon', category: 'macro', isEconomic: true, isMicro: false, priority: 'normal' },
  0x35: { name: 'Building Morph', category: 'build', isEconomic: true, isMicro: false, priority: 'critical' },
  
  // Combat Enhancements (MICRO)
  0x36: { name: 'Stim Pack', category: 'micro', isEconomic: false, isMicro: true, priority: 'important' },
  
  // Network/Sync (SPAM)
  0x37: { name: 'Sync', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x38: { name: 'Voice Enable', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x39: { name: 'Voice Disable', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x3A: { name: 'Voice Squelch', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x3B: { name: 'Voice Unsquelch', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  
  // Lobby Commands (ignorieren für APM)
  0x3C: { name: 'Start Game', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x3D: { name: 'Download Percentage', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x3E: { name: 'Change Game Slot', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x3F: { name: 'New Net Player', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x40: { name: 'Joined Game', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x41: { name: 'Change Race', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x42: { name: 'Team Game Team', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x43: { name: 'UMS Team', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x44: { name: 'Melee Team', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x45: { name: 'Swap Players', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x48: { name: 'Saved Data', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  
  // Game Control
  0x54: { name: 'Briefing Start', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x55: { name: 'Latency', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x56: { name: 'Replay Speed', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x57: { name: 'Leave Game', category: 'other', isEconomic: false, isMicro: false, priority: 'normal' },
  0x58: { name: 'Minimap Ping', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  0x5A: { name: 'Merge Dark Archon', category: 'train', isEconomic: true, isMicro: false, priority: 'critical' },
  0x5B: { name: 'Make Game Public', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  0x5C: { name: 'Chat', category: 'other', isEconomic: false, isMicro: false, priority: 'spam' },
  
  // Alternative Command IDs (121-format)
  0x60: { name: 'Right Click (121)', category: 'move', isEconomic: false, isMicro: true, priority: 'normal' },
  0x61: { name: 'Targeted Order (121)', category: 'attack', isEconomic: false, isMicro: true, priority: 'important' },
  0x62: { name: 'Unload (121)', category: 'micro', isEconomic: false, isMicro: true, priority: 'normal' },
  0x63: { name: 'Select (121)', category: 'select', isEconomic: false, isMicro: false, priority: 'spam' },
  0x64: { name: 'Select Add (121)', category: 'select', isEconomic: false, isMicro: false, priority: 'spam' },
  0x65: { name: 'Select Remove (121)', category: 'select', isEconomic: false, isMicro: false, priority: 'spam' },
  
  // Virtual Commands
  0xFE: { name: 'Land Building', category: 'build', isEconomic: true, isMicro: false, priority: 'important' }
};

export class SCCommandInterpreter {
  
  /**
   * Interpretiert einen rohen Command zu einer verständlichen Aktion
   */
  static interpretCommand(command: any, playerCommands: InterpretedCommand[] = []): InterpretedCommand {
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
        priority: 'spam',
        ineffective: false
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
    
    const interpretedCommand: InterpretedCommand = {
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
      priority: mapping.priority,
      ineffective: false
    };

    // EAPM-Klassifizierung (basierend auf Go-Repo Algorithmus)
    const ineffectiveResult = this.classifyCommandEffectiveness(interpretedCommand, playerCommands);
    interpretedCommand.ineffective = ineffectiveResult.ineffective;
    interpretedCommand.ineffectiveReason = ineffectiveResult.reason;
    
    return interpretedCommand;
  }

  /**
   * EAPM-Klassifizierung: Bestimmt ob ein Command effektiv oder ineffektiv ist
   * Basierend auf icza/screp EAPM-Algorithmus
   */
  static classifyCommandEffectiveness(
    command: InterpretedCommand, 
    playerCommands: InterpretedCommand[]
  ): { ineffective: boolean; reason?: string } {
    
    if (playerCommands.length === 0) {
      return { ineffective: false }; // Erster Command ist immer effektiv
    }

    const prevCommand = playerCommands[playerCommands.length - 1];
    const deltaFrame = command.frame - prevCommand.frame;
    
    // Unit queue overflow (zu viele Train-Commands)
    if (['Train Unit', 'Train Fighter', 'Cancel Train'].includes(command.actionName)) {
      const recentTrainCommands = this.countRecentSameCommands(command, playerCommands, 25); // ~1 Sekunde
      if (recentTrainCommands >= 6) {
        return { ineffective: true, reason: 'Unit Queue Overflow' };
      }
    }
    
    // Too fast cancel (zu schnelles Canceln)
    if (deltaFrame <= 20) { // ~0.8 Sekunden
      if ((prevCommand.actionName.includes('Train') && command.actionName === 'Cancel Train') ||
          (prevCommand.actionName.includes('Morph') && command.actionName === 'Cancel Morph') ||
          (prevCommand.actionName === 'Upgrade' && command.actionName === 'Cancel Upgrade') ||
          (prevCommand.actionName === 'Research Technology' && command.actionName === 'Cancel Research')) {
        return { ineffective: true, reason: 'Fast Cancel' };
      }
    }
    
    // Too fast repetition
    if (deltaFrame <= 10 && command.actionName === prevCommand.actionName) {
      if (['Stop', 'Hold Position', 'Land Building'].includes(command.actionName)) {
        return { ineffective: true, reason: 'Fast Repetition' };
      }
      
      if (command.actionType === 'attack' || command.actionType === 'move') {
        return { ineffective: true, reason: 'Fast Repetition' };
      }
    }
    
    // Fast reselection (zu schnelles Umselektieren)
    if (deltaFrame <= 8 && 
        command.actionType === 'select' && 
        prevCommand.actionType === 'select') {
      return { ineffective: true, reason: 'Fast Reselection' };
    }
    
    // Command repetition (Wiederholung ohne Zeitlimit)
    if (command.actionName === prevCommand.actionName) {
      const repetitionCommands = [
        'Unit Morph', 'Building Morph', 'Upgrade', 'Merge Archon', 'Merge Dark Archon',
        'Lift Off', 'Cancel Addon', 'Cancel Build', 'Cancel Morph', 'Cancel Nuke',
        'Cancel Research', 'Cancel Upgrade'
      ];
      
      if (repetitionCommands.includes(command.actionName)) {
        return { ineffective: true, reason: 'Repetition' };
      }
      
      // Protoss building exception
      if (command.actionName === 'Build Structure' && !this.isProtossBuilding(command)) {
        return { ineffective: true, reason: 'Repetition' };
      }
    }
    
    return { ineffective: false };
  }

  /**
   * Zählt ähnliche Commands in einem Zeitfenster
   */
  private static countRecentSameCommands(
    command: InterpretedCommand, 
    playerCommands: InterpretedCommand[], 
    frameWindow: number
  ): number {
    const frameLimit = command.frame - frameWindow;
    let count = 0;
    
    for (let i = playerCommands.length - 1; i >= 0; i--) {
      const cmd = playerCommands[i];
      if (cmd.frame < frameLimit) break;
      
      if (cmd.actionName === command.actionName) {
        count++;
        if (count >= 6) break; // Cap bei 6
      } else if (cmd.actionType === 'select') {
        break; // Selection ändert den Kontext
      }
    }
    
    return count;
  }

  /**
   * Prüft ob es sich um ein Protoss-Gebäude handelt
   */
  private static isProtossBuilding(command: InterpretedCommand): boolean {
    const protossBuildings = [
      'Nexus', 'Pylon', 'Gateway', 'Forge', 'Photon Cannon', 'Cybernetics Core',
      'Shield Battery', 'Stargate', 'Citadel of Adun', 'Robotics Facility',
      'Observatory', 'Templar Archives', 'Fleet Beacon', 'Arbiter Tribunal',
      'Robotics Support Bay', 'Assimilator'
    ];
    
    return command.unitName ? protossBuildings.includes(command.unitName) : false;
  }
  
  /**
   * Analysiert Commands und erstellt Gameplay-Insights mit EAPM
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
      effective: number;
    };
    eapm: number;
    totalCommands: number;
    effectiveCommands: number;
  } {
    const totalCommands = interpretedCommands.length;
    const effectiveCommands = interpretedCommands.filter(cmd => !cmd.ineffective).length;
    
    // Build Order extrahieren (nur kritische wirtschaftliche Aktionen)
    const buildOrder = interpretedCommands
      .filter(cmd => cmd.isEconomicAction && cmd.priority === 'critical' && !cmd.ineffective)
      .slice(0, 25) // Erste 25 Build-Aktionen
      .map((cmd, index) => ({
        time: cmd.timestamp,
        action: cmd.actionName,
        unit: cmd.unitName || 'Unknown',
        supply: this.estimateSupply(index),
        cost: cmd.cost
      }));
    
    // Micro Events extrahieren
    const microCommands = interpretedCommands.filter(cmd => cmd.isMicroAction && !cmd.ineffective);
    const microEvents = this.groupMicroActions(microCommands);
    
    // Enhanced APM Breakdown mit EAPM
    const economicCommands = interpretedCommands.filter(cmd => cmd.isEconomicAction).length;
    const microCommands2 = interpretedCommands.filter(cmd => cmd.isMicroAction).length;
    const selectionCommands = interpretedCommands.filter(cmd => cmd.actionType === 'select').length;
    const spamCommands = interpretedCommands.filter(cmd => cmd.priority === 'spam').length;
    
    const apmBreakdown = {
      economic: Math.round((economicCommands / totalCommands) * 100),
      micro: Math.round((microCommands2 / totalCommands) * 100),
      selection: Math.round((selectionCommands / totalCommands) * 100),
      spam: Math.round((spamCommands / totalCommands) * 100),
      effective: Math.round((effectiveCommands / totalCommands) * 100)
    };
    
    // EAPM berechnen
    const gameMinutes = interpretedCommands.length > 0 ? 
      (interpretedCommands[interpretedCommands.length - 1].frame / 23.81 / 60) : 1;
    const eapm = Math.round(effectiveCommands / gameMinutes);
    
    // Playstyle bestimmen
    const playstyle = this.determinePlaystyle(apmBreakdown, buildOrder);
    
    // Economic Efficiency
    const economicEfficiency = Math.min((effectiveCommands / Math.max(totalCommands, 1)) * 100, 100);
    
    return {
      buildOrder,
      microEvents,
      economicEfficiency: Math.round(economicEfficiency),
      playstyle,
      apmBreakdown,
      eapm,
      totalCommands,
      effectiveCommands
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
