
/**
 * Der EINZIGE Replay Parser Hook
 */

import { useState } from 'react';
import { EnhancedDataMapper, EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';

export interface UseEnhancedReplayParserReturn {
  parseReplay: (file: File) => Promise<EnhancedReplayResult>;
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useEnhancedReplayParser(): UseEnhancedReplayParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const parseReplay = async (file: File): Promise<EnhancedReplayResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    console.log('[useEnhancedReplayParser] Starting unified parsing for:', file.name);
    
    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 20, 90));
      }, 200);

      const result = await EnhancedDataMapper.parseReplay(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('[useEnhancedReplayParser] Parsing complete:', {
        quality: result.dataQuality.reliability,
        commands: result.dataQuality.commandsExtracted,
        players: result.players.map(p => `${p.name} (${p.race})`)
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Parsen der Replay';
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
