
import { useState } from 'react';
import { parseReplayFile, processReplayData } from '@/services/replayParserService';
import { analyzeReplayData } from '@/services/replayParser';
import type { ParsedReplayData, ReplayAnalysis } from '@/services/replayParser/types';
import { useToast } from '@/hooks/use-toast';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<{
    parsedData: ParsedReplayData | null;
    analysis: ReplayAnalysis | null;
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
      
      console.log('Starting replay parsing with jssuh');
      
      // Step 1: Parse the replay file with jssuh
      const rawParsedData = await parseReplayFile(file);
      
      if (!rawParsedData) {
        throw new Error('Failed to parse replay file');
      }
      
      console.log('Transforming parsed data');
      
      // Step 2: Process the raw data into our application format
      const parsedData = processReplayData(rawParsedData);
      
      console.log('Starting replay analysis');
      
      // Step 3: Analyze the parsed data
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
