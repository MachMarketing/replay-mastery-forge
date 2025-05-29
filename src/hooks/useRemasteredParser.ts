
/**
 * Hook for parsing StarCraft: Remastered replays
 */

import { useState } from 'react';
import { SCRemasteredParser, RemasteredReplayData } from '@/services/replayParser/scRemasteredParser';

export interface UseRemasteredParserReturn {
  parseReplay: (file: File) => Promise<RemasteredReplayData>;
  isLoading: boolean;
  error: string | null;
}

export function useRemasteredParser(): UseRemasteredParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseReplay = async (file: File): Promise<RemasteredReplayData> => {
    setIsLoading(true);
    setError(null);
    
    console.log('[useRemasteredParser] Parsing file:', file.name, 'Size:', file.size);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const parser = new SCRemasteredParser(arrayBuffer);
      const result = await parser.parse();
      
      console.log('[useRemasteredParser] Parse successful:', {
        mapName: result.header.mapName,
        duration: result.header.duration,
        players: result.players.length,
        buildOrders: result.buildOrders.length,
        totalCommands: result.rawData.totalCommands
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Parse error';
      console.error('[useRemasteredParser] Parse failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    parseReplay,
    isLoading,
    error
  };
}
