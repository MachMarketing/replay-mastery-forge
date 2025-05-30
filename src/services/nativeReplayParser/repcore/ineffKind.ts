
/**
 * IneffKind - Classifies commands if and why they are ineffective
 * Direct port from Go repcore package for accurate EAPM calculation
 */

export enum IneffKind {
  // The command is considered effective
  Effective = 0,
  
  // Command is ineffective due to unit queue overflow
  UnitQueueOverflow = 1,
  
  // Command is ineffective due to too fast cancel
  FastCancel = 2,
  
  // Command is ineffective due to too fast repetition
  FastRepetition = 3,
  
  // Command is ineffective due to too fast selection change or reselection
  FastReselection = 4,
  
  // Command is ineffective due to repetition
  Repetition = 5,
  
  // Command is ineffective due to repeating the same hotkey add or assign
  RepetitionHotkeyAddAssign = 6
}

const ineffKindStrings = [
  "effective",
  "unit queue overflow", 
  "too fast cancel",
  "too fast repetition",
  "too fast selection change or reselection",
  "repetition",
  "repetition of the same hotkey add or assign"
];

export function ineffKindToString(kind: IneffKind): string {
  return ineffKindStrings[kind] || "unknown";
}

export function isEffective(kind: IneffKind): boolean {
  return kind === IneffKind.Effective;
}

// Helper function to determine ineffectiveness for EAPM calculation
export function analyzeCommandEffectiveness(
  command: any,
  previousCommands: any[],
  frameWindow: number = 24 // ~1 second at 23.81 FPS
): IneffKind {
  if (!command || !previousCommands) {
    return IneffKind.Effective;
  }

  const recentCommands = previousCommands.filter(cmd => 
    cmd.frame && command.frame && (command.frame - cmd.frame) <= frameWindow
  );

  // Check for fast repetition (same command type within frame window)
  const sameTypeCommands = recentCommands.filter(cmd => 
    cmd.type === command.type
  );
  
  if (sameTypeCommands.length > 0) {
    const timeDiff = command.frame - sameTypeCommands[sameTypeCommands.length - 1].frame;
    if (timeDiff < 12) { // Less than ~0.5 seconds
      return IneffKind.FastRepetition;
    }
  }

  // Check for fast reselection (selection commands too close together)
  if (command.type === 0x09 || command.type === 0x0A) { // Select/Shift Select
    const recentSelections = recentCommands.filter(cmd => 
      cmd.type === 0x09 || cmd.type === 0x0A
    );
    
    if (recentSelections.length > 2) {
      return IneffKind.FastReselection;
    }
  }

  // Check for repetition (exact same command with same parameters)
  const exactMatches = recentCommands.filter(cmd => 
    cmd.type === command.type &&
    JSON.stringify(cmd.parameters) === JSON.stringify(command.parameters)
  );
  
  if (exactMatches.length > 0) {
    return IneffKind.Repetition;
  }

  // Check for hotkey repetition
  if (command.type === 0x13) { // Hotkey command
    const sameHotkey = recentCommands.filter(cmd => 
      cmd.type === 0x13 && 
      cmd.parameters?.hotkey === command.parameters?.hotkey
    );
    
    if (sameHotkey.length > 0) {
      return IneffKind.RepetitionHotkeyAddAssign;
    }
  }

  return IneffKind.Effective;
}

// Calculate EAPM (Effective Actions Per Minute) from commands with IneffKind analysis
export function calculateEAPM(
  commands: any[],
  totalFrames: number
): { eapm: number; totalEffective: number; totalCommands: number; efficiency: number } {
  if (!commands || commands.length === 0 || !totalFrames) {
    return { eapm: 0, totalEffective: 0, totalCommands: 0, efficiency: 0 };
  }

  // Sort commands by frame
  const sortedCommands = [...commands].sort((a, b) => (a.frame || 0) - (b.frame || 0));
  let effectiveCommands = 0;

  // Analyze each command for effectiveness
  for (let i = 0; i < sortedCommands.length; i++) {
    const command = sortedCommands[i];
    const previousCommands = sortedCommands.slice(0, i);
    
    const ineffKind = analyzeCommandEffectiveness(command, previousCommands);
    command.ineffKind = ineffKind;
    command.effective = isEffective(ineffKind);
    
    if (command.effective) {
      effectiveCommands++;
    }
  }

  const gameMinutes = totalFrames / FRAMES_PER_SECOND / 60;
  const eapm = gameMinutes > 0 ? Math.round(effectiveCommands / gameMinutes) : 0;
  const efficiency = commands.length > 0 ? Math.round((effectiveCommands / commands.length) * 100) : 0;

  return {
    eapm,
    totalEffective: effectiveCommands,
    totalCommands: commands.length,
    efficiency
  };
}

// Frame timing constant for calculations
const FRAMES_PER_SECOND = 23.81;
