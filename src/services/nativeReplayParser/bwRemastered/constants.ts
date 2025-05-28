
/**
 * StarCraft: Brood War Remastered constants
 */

export const RACE_MAPPING = {
  0: 'Zerg',
  1: 'Terran',
  2: 'Protoss',
  3: 'Random',
  6: 'Random'
} as const;

export const COMMAND_MAPPING = {
  0x09: 'Select',
  0x0A: 'Shift Select',
  0x0B: 'Shift Deselect',
  0x0C: 'Build',
  0x0D: 'Vision',
  0x0E: 'Alliance',
  0x13: 'Hotkey',
  0x14: 'Move',
  0x15: 'Attack',
  0x16: 'Cancel',
  0x18: 'Stop',
  0x1D: 'Train',
  0x1E: 'Cancel Train',
  0x1F: 'Cloak',
  0x20: 'Decloak',
  0x21: 'Unit Morph',
  0x23: 'Unsiege',
  0x24: 'Siege',
  0x2A: 'Hold Position',
  0x2B: 'Burrow',
  0x2C: 'Unburrow',
  0x2F: 'Research',
  0x31: 'Upgrade',
  0x34: 'Building Morph',
  0x35: 'Stim'
} as const;

export const GAME_TYPE_MAPPING = {
  0x02: 'Melee',
  0x03: 'Free For All',
  0x04: 'One on One',
  0x0F: 'Use Map Settings',
  0x10: 'Team Melee',
  0x20: 'Team Free For All'
} as const;

// Frame rate for APM calculation (Fastest speed)
export const FRAMES_PER_SECOND = 24;
