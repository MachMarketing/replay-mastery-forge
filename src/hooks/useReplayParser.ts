import { useState } from 'react';
import { UnifiedReplayParser } from '@/services/replayParser/unifiedParser';

export interface ParsedReplayData {
  header: {
    mapName: string;
    gameLength: string;
    playerCount: number;
  };
  players: Array<{
    name: string;
    race: string;
    apm: number;
  }>;
  buildOrder: Array<{
    time: string;
    action: string;
    unit?: string;
    building?: string;
  }>;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export const useReplayParser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseReplayFile = async (file: File): Promise<ParsedReplayData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = await UnifiedReplayParser.parseReplay(buffer);
      
      return {
        header: {
          mapName: result.mapName || 'Unknown Map',
          gameLength: result.duration || '0:00',
          playerCount: result.players?.length || 0
        },
        players: result.players?.map(player => ({
          name: player.name || 'Unknown',
          race: player.race || 'Unknown',
          apm: player.apm || 0
        })) || [],
        buildOrder: result.buildOrder || [],
        analysis: result.analysis || { strengths: [], weaknesses: [], recommendations: [] }
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Replay parsing error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    parseReplayFile,
    isLoading,
    error
  };
};