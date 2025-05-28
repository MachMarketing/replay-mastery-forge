
import { useState } from 'react';
import { EnhancedScrepWrapper, EnhancedReplayData } from '@/services/nativeReplayParser/enhancedScrepWrapper';

export interface UseReplayParserReturn {
  parseFile: (file: File) => Promise<EnhancedReplayData>;
  isLoading: boolean;
  error: string | null;
}

export function useReplayParser(): UseReplayParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = async (file: File): Promise<EnhancedReplayData> => {
    setIsLoading(true);
    setError(null);
    
    console.log('[useReplayParser] Starting enhanced parsing for file:', file.name);
    
    try {
      // Use the new enhanced parsing method
      const result = await EnhancedScrepWrapper.parseReplayEnhanced(file);
      
      console.log('[useReplayParser] Enhanced parsing completed:', {
        method: result.enhanced.extractionMethod,
        hasActions: result.enhanced.hasDetailedActions,
        actionsExtracted: result.enhanced.debugInfo.actionsExtracted,
        buildOrdersGenerated: result.enhanced.debugInfo.buildOrdersGenerated,
        activeParser: result.enhanced.debugInfo.qualityCheck.activeParser,
        finalAPM: result.enhanced.debugInfo.qualityCheck.apmValidation.chosenAPM
      });
      
      // Debug log the full result structure
      console.log('[useReplayParser] ENHANCED REPLAY DATA:', result);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler beim Parsen der Replay-Datei';
      console.error('[useReplayParser] Enhanced parsing failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    parseFile,
    isLoading,
    error
  };
}
