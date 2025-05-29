
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
    
    console.log('[useRemasteredParser] Starting parse for:', file.name, 'Size:', file.size);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log('[useRemasteredParser] File loaded, creating parser...');
      
      const parser = new SCRemasteredParser(arrayBuffer);
      const result = await parser.parse();
      
      console.log('[useRemasteredParser] Parse completed successfully:', {
        mapName: result.header.mapName,
        duration: result.header.duration,
        frames: result.header.frames,
        playersCount: result.players.length,
        buildOrdersCount: result.buildOrders.length,
        totalCommands: result.rawData.totalCommands,
        gameMinutes: result.rawData.gameMinutes,
        extractionMethod: result.rawData.extractionMethod
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Parse error';
      console.error('[useRemasteredParser] Parse failed:', errorMessage, err);
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
