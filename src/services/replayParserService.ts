
import { ParsedReplayData } from './replayParser/types';

export interface ParsedReplayResult extends ParsedReplayData {
  playerName: string;
  opponentName: string;
  playerRace: string;
  opponentRace: string;
  apm: number;
  eapm: number;
  opponentApm: number;
  opponentEapm: number;
  trainingPlan: Array<{
    day: number;
    focus: string;
    drill: string;
  }>;
}

export async function parseReplayWithService(file: File): Promise<ParsedReplayResult> {
  // This is a simplified service that uses the existing parser
  const { parseReplay } = await import('./replayParser');
  const result = await parseReplay(file);
  
  return {
    ...result,
    playerName: result.primaryPlayer?.name || 'Player',
    opponentName: result.secondaryPlayer?.name || 'Opponent',
    playerRace: result.primaryPlayer?.race || 'Unknown',
    opponentRace: result.secondaryPlayer?.race || 'Unknown',
    apm: result.primaryPlayer?.apm || 0,
    eapm: result.primaryPlayer?.eapm || 0,
    opponentApm: result.secondaryPlayer?.apm || 0,
    opponentEapm: result.secondaryPlayer?.eapm || 0,
    trainingPlan: result.trainingPlan || [
      { day: 1, focus: "Macro Management", drill: "Constant worker production" },
      { day: 2, focus: "Micro Control", drill: "Unit positioning practice" },
      { day: 3, focus: "Build Order", drill: "Timing attack execution" }
    ]
  };
}
