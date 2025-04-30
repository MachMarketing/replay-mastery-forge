
import { useState } from 'react';
import { parseReplayFile, ParsedReplayResult } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<ParsedReplayResult | null>;
  isProcessing: boolean;
  error: string | null;
  serverStatus: 'online' | 'offline' | 'unknown';
}

export function useReplayParser(): ReplayParserResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const { toast } = useToast();

  // Check server status on hook initialization
  const checkServerStatus = async () => {
    try {
      // Simple HEAD request to check if the server is running
      const response = await fetch('http://localhost:8000/parse', { 
        method: 'HEAD',
        // Add a short timeout to avoid hanging if server is down
        signal: AbortSignal.timeout(2000)
      });
      
      setServerStatus(response.ok ? 'online' : 'offline');
    } catch (err) {
      console.warn('SCREP parser service appears to be offline:', err);
      setServerStatus('offline');
    }
  };

  // Call checkServerStatus when the component mounts
  useState(() => {
    checkServerStatus();
  });

  const parseReplay = async (file: File): Promise<ParsedReplayResult | null> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        throw new Error('Only StarCraft replay files (.rep) are allowed');
      }
      
      console.log('Starting replay parsing with Go SCREP parser');
      
      if (serverStatus === 'offline') {
        throw new Error('SCREP parser service is offline. Please start the server and try again.');
      }
      
      // Parse the replay file with the SCREP Go parser
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
    error,
    serverStatus
  };
}
