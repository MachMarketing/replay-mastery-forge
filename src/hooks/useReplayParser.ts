
import { useState } from 'react';
import { parseReplayFile, ParsedReplayResult } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<ParsedReplayResult | null>;
  isProcessing: boolean;
  error: string | null;
}

export function useReplayParser(): ReplayParserResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const parseReplay = async (file: File): Promise<ParsedReplayResult | null> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        throw new Error('Only StarCraft replay files (.rep) are allowed');
      }
      
      console.log('Starting browser-based replay parsing');
      
      // Parse the replay file in the browser
      const parsedData = await parseReplayFile(file);
      
      if (!parsedData) {
        throw new Error('Failed to parse replay file');
      }
      
      console.log('Successfully parsed replay data', parsedData);
      return parsedData;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error processing replay';
      setError(errorMessage);
      toast({
        title: 'Error Processing Replay',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Replay parsing error:', errorMessage);
      return null;
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
