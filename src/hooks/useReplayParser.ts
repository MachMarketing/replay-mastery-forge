
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
  const [wasmInitialized, setWasmInitialized] = useState(false);

  // Pre-initialize WASM on hook mount with proper useEffect
  useEffect(() => {
    console.log('[useReplayParser] Pre-initializing WASM module');
    
    let isMounted = true;
    
    initParserWasm()
      .then(() => {
        if (isMounted) {
          console.log('[useReplayParser] WASM pre-initialized successfully');
          setWasmInitialized(true);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('[useReplayParser] Failed to pre-initialize WASM:', err);
          // Don't set error state here, we'll retry before parsing
          toast({
            title: "WASM initialization warning",
            description: "Parser initialization encountered an issue. Will retry when needed.",
            variant: "default",
          });
        }
      });
      
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array to run only once

  const clearError = () => {
    setError(null);
  };

  const parseReplay = async (file: File): Promise<AnalyzedReplayResult | null> => {
    if (isProcessing) {
      console.log('[useReplayParser] Already processing a file, aborting');
      return null;
    }
    
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
      
      // Always try to initialize WASM again if it failed earlier
      if (!wasmInitialized) {
        try {
          console.log('[useReplayParser] Trying to initialize WASM before parsing');
          await initParserWasm();
          setWasmInitialized(true);
          console.log('[useReplayParser] WASM initialization successful');
        } catch (err) {
          console.warn('[useReplayParser] WASM initialization failed, but continuing with parsing:', err);
          // Show a toast but continue anyway
          toast({
            title: "Parser Initialization Warning",
            description: "WASM initialization had issues, but we'll try to parse anyway",
            variant: "default",
          });
        }
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
