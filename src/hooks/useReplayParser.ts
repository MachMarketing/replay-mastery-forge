
import { useState } from 'react';
import { parseReplay } from '@/services/replayParser';
import { ParsedReplayData } from '@/services/replayParser/types';

export interface UseReplayParserReturn {
  parseFile: (file: File) => Promise<ParsedReplayData>;
  isLoading: boolean;
  error: string | null;
}

export function useReplayParser(): UseReplayParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = async (file: File): Promise<ParsedReplayData> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await parseReplay(file);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
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
