
import { useState, useEffect } from 'react';
import { parseReplayFile, AnalyzedReplayResult } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';
import { initParserWasm } from '@/services/wasmLoader';

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

  // Pre-initialize WASM on hook mount with proper useEffect
  useEffect(() => {
    console.log('[useReplayParser] Pre-initializing WASM module');
    initParserWasm()
      .then(() => console.log('[useReplayParser] WASM pre-initialized successfully'))
      .catch(err => {
        console.error('[useReplayParser] Failed to pre-initialize WASM:', err);
      });
  }, []); // Empty dependency array to run only once

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
        
        setIsProcessing(false);
        return null;
      }
      
      console.log('[useReplayParser] Starting replay parsing for file:', file.name, 'size:', file.size);
      
      try {
        // Re-initialize WASM just before parsing to ensure it's ready
        console.log('[useReplayParser] Re-initializing WASM before parsing');
        await initParserWasm();
        console.log('[useReplayParser] WASM re-initialization successful');
      } catch (err) {
        console.warn('[useReplayParser] WASM re-initialization failed, continuing with parsing:', err);
      }
      
      // Verify file is readable
      if (!file.size) {
        throw new Error('File appears to be empty or corrupted');
      }
      
      // Use the real parser
      console.log('[useReplayParser] Calling parseReplayFile with file:', file.name);
      const parsedData = await parseReplayFile(file);
      
      if (!parsedData) {
        throw new Error('Parser returned empty data');
      }
      
      console.log('[useReplayParser] Parsing completed successfully:', parsedData);
      setIsProcessing(false);
      return parsedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse replay file';
      setError(errorMessage);
      
      console.error('[useReplayParser] Replay parsing error:', err);
      
      toast({
        title: 'Processing Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      setIsProcessing(false);
      return null;
    }
  };

  return {
    parseReplay,
    isProcessing,
    error,
    clearError
  };
}
