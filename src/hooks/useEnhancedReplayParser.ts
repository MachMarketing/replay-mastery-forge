
/**
 * Der BESTE Replay Parser Hook - verwendet screp-core Implementation  
 */

import { useState } from 'react';
import { NewScrepParser, NewFinalReplayResult } from '@/services/nativeReplayParser/newScrepParser';

export interface UseEnhancedReplayParserReturn {
  parseReplay: (file: File) => Promise<NewFinalReplayResult>;
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useEnhancedReplayParser(): UseEnhancedReplayParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const parseReplay = async (file: File): Promise<NewFinalReplayResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    console.log('[useEnhancedReplayParser] Starting screp-core parsing for:', file.name);
    
    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 85));
      }, 150);

      // Verwende den bewährten NewScrepParser mit screp-core
      const parser = new NewScrepParser();
      const result = await parser.parseReplay(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('[useEnhancedReplayParser] screp-core parsing complete:', {
        map: result.header.mapName,
        players: result.players.map(p => `${p.name} (${p.race}) APM:${p.apm} EAPM:${p.eapm}`),
        quality: result.dataQuality.reliability,
        commands: result.dataQuality.commandsFound,
        buildOrders: Object.values(result.buildOrders).reduce((sum, bo) => sum + bo.length, 0)
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'screp-core parsing failed';
      console.error('[useEnhancedReplayParser] Parsing failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    parseReplay,
    isLoading,
    error,
    progress
  };
}
