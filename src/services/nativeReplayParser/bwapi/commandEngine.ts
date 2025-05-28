/**
 * BWAPI-konforme Command Parser Engine für StarCraft: Brood War Remastered
 * Basiert auf der offiziellen BWAPI Binary Format Dokumentation
 * CORRECTED with official BWAPI command lengths
 */

import { Command } from '../types';

export interface BWAPICommand extends Command {
  frame: number;
  playerId: number;
  cmdId: number;
  typeString: string;
  data: Uint8Array;
  parameters: any;
  category: 'build' | 'train' | 'micro' | 'macro' | 'selection' | 'sync' | 'other';
  isEffectiveAction: boolean;
  userId: number;
  type: number;
}

// Remastered-spezifische Konstanten (CORRECTED FPS)
export const REMASTERED_FPS = 23.81; // Korrekte FPS für Remastered
export const FRAMES_PER_MINUTE = REMASTERED_FPS * 60;

// CORRECTED BWAPI Command Lengths based on official documentation
export const BWAPI_COMMAND_LENGTHS: Record<number, number> = {
  // Frame synchronization
  0x00: 0,   // Frame Increment
  0x01: 1,   // Frame Skip
  0x02: 2,   // Large Frame Skip
  
  // Core commands with OFFICIAL BWAPI lengths
  0x09: 2,   // Select Units
  0x0A: 2,   // Shift Select
  0x0B: 2,   // Shift Deselect
  0x0C: 10,  // Build (CORRECTED: 10 bytes, not 7)
  0x0D: 2,   // Vision
  0x0E: 4,   // Cancel Construction
  0x0F: 2,   // Cancel Morph
  0x10: 1,   // Stop
  0x11: 10,  // Attack Move (CORRECTED: 10 bytes)
  0x12: 2,   // Cheat
  0x13: 10,  // Right Click (CORRECTED: 10 bytes)
  0x14: 6,   // Train (CORRECTED: 6 bytes, not 4)
  0x15: 6,   // Attack
  0x16: 1,   // Cancel
  0x17: 1,   // Cancel Hatch
  0x18: 1,   // Stop
  0x19: 1,   // Carrier Stop
  0x1A: 6,   // Use Tech
  0x1B: 10,  // Use Tech Position
  0x1C: 1,   // Return Cargo
  0x1D: 6,   // Train Unit (CORRECTED: 6 bytes, not 2)
  0x1E: 2,   // Cancel Train
  0x1F: 1,   // Cloak
  0x20: 6,   // Build Self/Morph (CORRECTED: 6 bytes, not 10)
  0x21: 2,   // Unit Morph
  0x22: 2,   // Unload
  0x23: 1,   // Unsiege
  0x24: 1,   // Siege
  0x25: 2,   // Train Fighter
  0x26: 1,   // Unload All
  0x27: 1,   // Unload All
  0x28: 2,   // Unload
  0x29: 1,   // Merge Archon
  0x2A: 1,   // Hold Position
  0x2B: 1,   // Burrow
  0x2C: 1,   // Unburrow
  0x2D: 1,   // Cancel Nuke
  0x2E: 1,   // Lift
  0x2F: 2,   // Research
  0x30: 2,   // Cancel Research
  0x31: 2,   // Upgrade
  0x32: 2,   // Cancel Upgrade
  0x33: 2,   // Cancel Addon
  0x34: 2,   // Building Morph
  0x35: 1,   // Stim
  0x36: 1,   // Sync
  
  // Network commands
  0x37: 1,   // Voice Enable1
  0x38: 1,   // Voice Enable2
  0x39: 1,   // Voice Squelch1
  0x3A: 1,   // Voice Squelch2
  0x3B: 1,   // Start Game
  0x3C: 1,   // Download Percentage
  0x3D: 4,   // Change Game Slot
  0x3E: 4,   // New Net Player
  0x3F: 1,   // Joined Game
  0x40: 2,   // Change Race
  0x41: 2,   // Team Game Team
  0x42: 2,   // UMS Team
  0x43: 2,   // Melee Team
  0x44: 4,   // Swap Players
  0x45: 4,   // Saved Data
  0x48: 10   // Load Game
};

export const COMMAND_NAMES: Record<number, string> = {
  0x00: 'Frame Increment',
  0x01: 'Frame Skip',
  0x02: 'Large Frame Skip',
  0x05: 'Keep Alive',
  0x06: 'Save Game',
  0x07: 'Load Game',
  0x08: 'Restart Game',
  0x09: 'Select Units',
  0x0A: 'Shift Select',
  0x0B: 'Shift Deselect',
  0x0C: 'Build',
  0x0D: 'Vision',
  0x0E: 'Cancel Construction',
  0x0F: 'Cancel Morph',
  0x10: 'Stop',
  0x11: 'Attack Move',
  0x12: 'Cheat',
  0x13: 'Right Click',
  0x14: 'Train',
  0x15: 'Attack',
  0x16: 'Cancel',
  0x17: 'Cancel Hatch',
  0x18: 'Stop',
  0x19: 'Carrier Stop',
  0x1A: 'Use Tech',
  0x1B: 'Use Tech Position',
  0x1C: 'Return Cargo',
  0x1D: 'Train Unit',
  0x1E: 'Cancel Train',
  0x1F: 'Cloak',
  0x20: 'Build Self',
  0x21: 'Unit Morph',
  0x22: 'Unload',
  0x23: 'Unsiege',
  0x24: 'Siege',
  0x25: 'Train Fighter',
  0x26: 'Unload All',
  0x27: 'Unload All',
  0x28: 'Unload',
  0x29: 'Merge Archon',
  0x2A: 'Hold Position',
  0x2B: 'Burrow',
  0x2C: 'Unburrow',
  0x2D: 'Cancel Nuke',
  0x2E: 'Lift',
  0x2F: 'Research',
  0x30: 'Cancel Research',
  0x31: 'Upgrade',
  0x32: 'Cancel Upgrade',
  0x33: 'Cancel Addon',
  0x34: 'Building Morph',
  0x35: 'Stim',
  0x36: 'Sync',
  0x37: 'Voice Enable1',
  0x38: 'Voice Enable2',
  0x39: 'Voice Squelch1',
  0x3A: 'Voice Squelch2',
  0x3B: 'Start Game',
  0x3C: 'Download Percentage',
  0x3D: 'Change Game Slot',
  0x3E: 'New Net Player',
  0x3F: 'Joined Game',
  0x40: 'Change Race',
  0x41: 'Team Game Team',
  0x42: 'UMS Team',
  0x43: 'Melee Team',
  0x44: 'Swap Players',
  0x45: 'Saved Data',
  0x48: 'Load Game'
};

export class BWAPICommandEngine {
  /**
   * Categorisiert Commands für APM/EAPM-Berechnung (UPDATED for correct categorization)
   */
  static categorizeCommand(cmdId: number): 'build' | 'train' | 'micro' | 'macro' | 'selection' | 'sync' | 'other' {
    // Build Commands (10 bytes) - wichtig für Build Order
    if ([0x0C, 0x20, 0x34].includes(cmdId)) {
      return 'build';
    }
    
    // Train Commands (6 bytes) - wichtig für Build Order
    if ([0x14, 0x1D, 0x25].includes(cmdId)) {
      return 'train';
    }
    
    // Macro Commands (Research, Upgrade) - wichtig für Build Order
    if ([0x2F, 0x30, 0x31, 0x32, 0x33].includes(cmdId)) {
      return 'macro';
    }
    
    // Micro Commands (Movement, Combat) - wichtig für APM
    if ([0x11, 0x13, 0x15, 0x18, 0x1A, 0x1B, 0x1F, 0x23, 0x24, 0x2A, 0x2B, 0x2C, 0x35].includes(cmdId)) {
      return 'micro';
    }
    
    // Selection Commands (nicht für EAPM aber für APM)
    if ([0x09, 0x0A, 0x0B].includes(cmdId)) {
      return 'selection';
    }
    
    // Sync Commands (nicht für APM/EAPM)
    if ([0x00, 0x01, 0x02, 0x36].includes(cmdId)) {
      return 'sync';
    }
    
    return 'other';
  }

  /**
   * Bestimmt ob ein Command als "effective action" für EAPM zählt
   */
  static isEffectiveAction(cmdId: number): boolean {
    const category = this.categorizeCommand(cmdId);
    // Nur Build, Train, Macro und Micro Commands zählen für EAPM
    return ['build', 'train', 'macro', 'micro'].includes(category);
  }

  /**
   * Konvertiert Command zu BWAPICommand mit Kompatibilität
   */
  static toBWAPICommand(command: Command, frame: number): BWAPICommand {
    const category = this.categorizeCommand(command.type);
    const isEffectiveAction = this.isEffectiveAction(command.type);
    
    return {
      ...command,
      frame,
      cmdId: command.type,
      category,
      isEffectiveAction,
      parameters: command.parameters || {}, // Ensure parameters is always defined
      // Kompatibilität mit BWCommand
      userId: command.playerId,
      typeString: command.typeString || COMMAND_NAMES[command.type] || `UNKNOWN_${command.type.toString(16)}`
    };
  }

  /**
   * Validiert die Plausibilität von APM/EAPM-Werten mit korrekten FPS
   */
  static validateAPM(totalCommands: number, effectiveCommands: number, gameDurationMinutes: number): {
    apm: number;
    eapm: number;
    isRealistic: boolean;
    quality: 'excellent' | 'good' | 'suspicious' | 'invalid';
  } {
    const apm = gameDurationMinutes > 0 ? Math.round(totalCommands / gameDurationMinutes) : 0;
    const eapm = gameDurationMinutes > 0 ? Math.round(effectiveCommands / gameDurationMinutes) : 0;
    
    // Realistische Validierungsbenchmarks (angepasst für korrekte FPS)
    const isRealistic = apm >= 20 && apm <= 600 && eapm >= 10 && eapm <= 400;
    
    let quality: 'excellent' | 'good' | 'suspicious' | 'invalid';
    if (apm < 20 || eapm < 10) {
      quality = 'invalid';
    } else if (apm > 400 || eapm > 300) {
      quality = 'suspicious';
    } else if (apm >= 150 && eapm >= 80) {
      quality = 'excellent';
    } else {
      quality = 'good';
    }
    
    return { apm, eapm, isRealistic, quality };
  }

  /**
   * Parse Build Command (0x0C) - 10 Bytes
   */
  static parseBuildCommand(data: Uint8Array): any {
    if (data.length < 10) return {};
    
    return {
      playerId: data[1],
      unitTypeId: data[2] | (data[3] << 8),
      x: data[4] | (data[5] << 8),
      y: data[6] | (data[7] << 8),
      flags: data[8] | (data[9] << 8)
    };
  }

  /**
   * Parse Train Command (0x14, 0x1D) - 6 Bytes
   */
  static parseTrainCommand(data: Uint8Array): any {
    if (data.length < 6) return {};
    
    return {
      playerId: data[1],
      unitTypeId: data[2] | (data[3] << 8),
      flags: data[4] | (data[5] << 8)
    };
  }

  /**
   * Parse Build Self Command (0x20) - 10 Bytes (Zerg Morph)
   */
  static parseBuildSelfCommand(data: Uint8Array): any {
    if (data.length < 10) return {};
    
    return {
      playerId: data[1],
      unitTypeId: data[2] | (data[3] << 8),
      x: data[4] | (data[5] << 8),
      y: data[6] | (data[7] << 8),
      flags: data[8] | (data[9] << 8)
    };
  }

  /**
   * Konvertiert Frame zu realistischer Zeitangabe mit korrekten FPS
   */
  static frameToTimestamp(frame: number): string {
    const totalSeconds = Math.floor(frame / REMASTERED_FPS);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Validiert die Anzahl der Commands für ein Spiel
   */
  static validateCommandCount(commandCount: number, gameDurationMinutes: number, playerCount: number): {
    isRealistic: boolean;
    expectedRange: { min: number; max: number };
    quality: 'excellent' | 'good' | 'low' | 'suspicious';
  } {
    // Benchmark: typisches PvP mit 18 Minuten hat 200-400 Commands pro Spieler
    const expectedPerPlayer = {
      min: Math.round(gameDurationMinutes * 10), // Minimum: 10 Commands/Minute
      max: Math.round(gameDurationMinutes * 30)  // Maximum: 30 Commands/Minute
    };
    
    const expectedTotal = {
      min: expectedPerPlayer.min * playerCount,
      max: expectedPerPlayer.max * playerCount
    };
    
    const isRealistic = commandCount >= expectedTotal.min && commandCount <= expectedTotal.max;
    
    let quality: 'excellent' | 'good' | 'low' | 'suspicious';
    if (commandCount < expectedTotal.min * 0.5) {
      quality = 'suspicious';
    } else if (commandCount < expectedTotal.min) {
      quality = 'low';
    } else if (commandCount >= expectedTotal.min && commandCount <= expectedTotal.max) {
      quality = 'good';
    } else {
      quality = 'excellent';
    }
    
    return {
      isRealistic,
      expectedRange: expectedTotal,
      quality
    };
  }
}
