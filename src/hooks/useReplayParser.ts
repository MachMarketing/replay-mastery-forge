
/**
 * Vereinfachter Hook - verwendet nur noch screp-js
 */

import { useState } from 'react';
import { ScrepJsParser, FinalReplayResult } from '@/services/nativeReplayParser/screpJsParser';

export interface UseReplayParserReturn {
  parseReplay: (file: File) => Promise<FinalReplayResult>;
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useReplayParser(): UseReplayParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [parser] = useState(() => new ScrepJsParser());

  const parseReplay = async (file: File): Promise<FinalReplayResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    console.log('[useReplayParser] Starting screp-js only parsing for:', file.name);
    
    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 20, 90));
      }, 300);

      const result = await parser.parseReplay(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('[useReplayParser] Parsing erfolgreich:', {
        map: result.header.mapName,
        players: result.players.map(p => `${p.name} (${p.race}) APM:${p.apm} EAPM:${p.eapm}`),
        quality: result.dataQuality.reliability
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Parsen der Replay';
      console.error('[useReplayParser] Parsing failed:', errorMessage);
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
