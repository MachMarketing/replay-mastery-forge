
import { useState } from 'react';
import { parseReplayFile, analyzeReplayData, ParsedReplayData } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<{
    parsedData: ParsedReplayData | null;
    analysis: any | null;
  }>;
  isProcessing: boolean;
  error: string | null;
}

export function useReplayParser(): ReplayParserResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const parseReplay = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        throw new Error('Only StarCraft replay files (.rep) are allowed');
      }
      
      // Parse the replay file
      const parsedData = await parseReplayFile(file);
      
      if (!parsedData) {
        throw new Error('Failed to parse replay file');
      }
      
      // Analyze the parsed data
      const analysis = await analyzeReplayData(parsedData);
      
      return { parsedData, analysis };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error processing replay';
      setError(errorMessage);
      toast({
        title: 'Error Processing Replay',
        description: errorMessage,
        variant: 'destructive',
      });
      return { parsedData: null, analysis: null };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    parseReplay,
    isProcessing,
    error
  };
}
