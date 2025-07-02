
/**
 * Updated Hook - verwendet jetzt screp-core Parser
 */

import { useState } from 'react';
import { ScrepCore } from '@/services/screpParser';
import { adaptScrepResult } from '@/services/screpParser/resultAdapter';
import { NewFinalReplayResult } from '@/services/nativeReplayParser/newScrepParser';

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
  const parseReplay = async (file: File): Promise<NewFinalReplayResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    console.log('[useReplayParser] Starting official screp parsing for:', file.name);
    
    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 200);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Parse with official screp core
      const parser = new ScrepCore(arrayBuffer);
      const screpResult = await parser.parseReplay();
      
      // Convert to expected format
      const result = adaptScrepResult(screpResult);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('[useReplayParser] Official screp parsing successful:', {
        map: result.header.mapName,
        players: result.players.map(p => `${p.name} (${p.race}) APM:${p.apm} EAPM:${p.eapm}`),
        commands: result.dataQuality.commandsFound,
        frames: result.header.frames,
        quality: result.dataQuality.reliability
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Official screp parsing failed';
      console.error('[useReplayParser] Official screp parsing failed:', errorMessage);
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
