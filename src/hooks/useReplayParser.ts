
import { useState } from 'react';
import { parseReplayFile, ParsedReplayResult, AnalyzedReplayResult } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<AnalyzedReplayResult | null>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useReplayParser(): ReplayParserResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = () => {
    setError(null);
  };

  const parseReplay = async (file: File): Promise<AnalyzedReplayResult | null> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        const extensionError = 'Only StarCraft replay files (.rep) are allowed';
        setError(extensionError);
        
        toast({
          title: 'Invalid File',
          description: extensionError,
          variant: 'destructive',
        });
        
        return null;
      }
      
      console.log('[useReplayParser] Starting browser-based replay parsing with screp-js');
      console.log('[useReplayParser] File details:', file.name, file.size, 'bytes');
      
      // Parse the replay file in the browser using screp-js
      const parsedData = await parseReplayFile(file);
      
      if (!parsedData) {
        throw new Error('Failed to parse replay file');
      }
      
      console.log('[useReplayParser] Successfully parsed replay data:', parsedData);
      return parsedData;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse replay file';
      setError(errorMessage);
      
      console.error('[useReplayParser] Replay parsing error:', err);
      
      // Display a toast notification with the error
      toast({
        title: 'Processing Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    parseReplay,
    isProcessing,
    error,
    clearError
  };
}
