
/**
 * Updated Hook - verwendet jetzt screp-core Parser
 */

import { useState } from 'react';
import { NewScrepParser, NewFinalReplayResult } from '@/services/nativeReplayParser/newScrepParser';

export interface UseReplayParserReturn {
  parseReplay: (file: File) => Promise<NewFinalReplayResult>;
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useReplayParser(): UseReplayParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [parser] = useState(() => new NewScrepParser());

  const parseReplay = async (file: File): Promise<NewFinalReplayResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    console.log('[useReplayParser] Starting screp-core parsing for:', file.name);
    
    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 200);

      const result = await parser.parseReplay(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('[useReplayParser] screp-core parsing successful:', {
        map: result.header.mapName,
        players: result.players.map(p => `${p.name} (${p.race}) APM:${p.apm} EAPM:${p.eapm}`),
        commands: result.dataQuality.commandsFound,
        quality: result.dataQuality.reliability
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'screp-core parsing failed';
      console.error('[useReplayParser] screp-core parsing failed:', errorMessage);
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
