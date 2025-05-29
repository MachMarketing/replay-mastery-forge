
/**
 * Hook für die erweiterte Replay-Analyse mit echten Command-Daten
 */

import { useState } from 'react';
import { EnhancedScrepIntegration, EnhancedReplayAnalysis } from '@/services/nativeReplayParser/enhancedScrepIntegration';

export interface UseEnhancedReplayAnalysisReturn {
  analyzeReplay: (file: File) => Promise<EnhancedReplayAnalysis>;
  isAnalyzing: boolean;
  error: string | null;
  progress: number;
}

export function useEnhancedReplayAnalysis(): UseEnhancedReplayAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const analyzeReplay = async (file: File): Promise<EnhancedReplayAnalysis> => {
    setIsAnalyzing(true);
    setError(null);
    setProgress(0);
    
    console.log('[useEnhancedReplayAnalysis] Starting enhanced analysis for:', file.name);
    
    try {
      // Simuliere Progress für bessere UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 85));
      }, 300);

      const result = await EnhancedScrepIntegration.analyzeReplay(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('[useEnhancedReplayAnalysis] Enhanced analysis complete:', {
        commandsExtracted: result.dataQuality.commandsExtracted,
        dataQuality: result.dataQuality.analysisReliability,
        players: result.players.map(p => `${p.name} (${p.race})`)
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler bei der erweiterten Analyse';
      console.error('[useEnhancedReplayAnalysis] Analysis failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeReplay,
    isAnalyzing,
    error,
    progress
  };
}
