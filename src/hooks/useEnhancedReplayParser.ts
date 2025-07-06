
/**
 * ECHTER StarCraft: Remastered Parser - verwendet jssuh von ShieldBattery
 */

import { useState } from 'react';
import { JssuhParser, JssuhReplayResult } from '@/services/nativeReplayParser/jssuhParser';

export interface UseEnhancedReplayParserReturn {
  parseReplay: (file: File) => Promise<JssuhReplayResult>;
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export function useEnhancedReplayParser(): UseEnhancedReplayParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const parseReplay = async (file: File): Promise<JssuhReplayResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    console.log('[useEnhancedReplayParser] Starting jssuh parsing for:', file.name);
    
    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 12, 85));
      }, 100);

      // Verwende den ECHTEN jssuh Parser
      const parser = new JssuhParser();
      const result = await parser.parseReplay(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('[useEnhancedReplayParser] jssuh parsing complete:', {
        map: result.header.mapName,
        players: result.players.map(p => `${p.name} (${p.race}) APM:${p.apm} EAPM:${p.eapm}`),
        quality: result.dataQuality.reliability,
        commands: result.dataQuality.commandsFound,
        buildOrders: Object.values(result.buildOrders).reduce((sum, bo) => sum + bo.length, 0)
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'jssuh parsing failed';
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
