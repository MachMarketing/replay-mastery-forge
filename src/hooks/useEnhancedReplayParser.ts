
/**
 * Production-Ready SC:R Parser - Uses proven screp-js library
 */

import { useState } from 'react';
import { ScrepJsParser, ScrepJsReplayResult } from '@/services/replayParser/screpJsParser';

export interface UseEnhancedReplayParserReturn {
  parseReplay: (file: File) => Promise<ScrepJsReplayResult>;
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useEnhancedReplayParser(): UseEnhancedReplayParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const parseReplay = async (file: File): Promise<ScrepJsReplayResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    console.log('[useEnhancedReplayParser] Starting production screp-js parsing for:', file.name);
    
    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 120);

      // Use the proven screp-js parser
      const parser = new ScrepJsParser();
      const result = await parser.parseReplay(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('[useEnhancedReplayParser] screp-js parsing complete:', {
        map: result.header.mapName,
        players: result.players.map(p => `${p.name} (${p.race}) APM:${p.apm} EAPM:${p.eapm}`),
        quality: result.dataQuality.reliability,
        commands: result.dataQuality.commandsFound,
        buildOrders: result.dataQuality.buildOrdersExtracted
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'screp-js parsing failed';
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
