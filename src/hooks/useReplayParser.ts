
import { useState, useEffect, useCallback, useRef } from 'react';
import { ParsedReplayData } from '@/services/replayParser/types';
import { useToast } from '@/hooks/use-toast';
import { parseReplay } from '@/services/replayParser';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<ParsedReplayData | null>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
  progress: number;
}

export function useReplayParser(): ReplayParserResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const progressIntervalRef = useRef<number | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);
  
  // Clean up intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setProgress(0);
  }, []);

  const handleParseReplay = useCallback(async (file: File): Promise<ParsedReplayData | null> => {
    if (isProcessing) {
      console.log('[useReplayParser] Already processing a file, aborting');
      toast({
        title: "Verarbeitung läuft bereits",
        description: "Bitte warte bis die aktuelle Datei vollständig verarbeitet ist",
        variant: "default",
      });
      return null;
    }
    
    console.log('[useReplayParser] Starting to process file with screparsed:', file.name);
    
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    
    // Simulate progress for screparsed parsing
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90;
        return Math.min(prev + 15, 90);
      });
    }, 300);
    
    try {
      console.log('[useReplayParser] Calling screparsed parser with file:', file.name);
      
      const parsedData: ParsedReplayData = await parseReplay(file);
      
      console.log('[useReplayParser] Screparsed parsing successful!');
      console.log('[useReplayParser] Real player data extracted:', {
        primary: {
          name: parsedData.primaryPlayer.name,
          race: parsedData.primaryPlayer.race,
          apm: parsedData.primaryPlayer.apm,
          buildOrderItems: parsedData.primaryPlayer.buildOrder?.length || 0
        },
        secondary: {
          name: parsedData.secondaryPlayer.name,
          race: parsedData.secondaryPlayer.race,
          apm: parsedData.secondaryPlayer.apm
        },
        gameInfo: {
          map: parsedData.map,
          matchup: parsedData.matchup,
          duration: parsedData.duration
        }
      });
      
      setProgress(100);
      
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsProcessing(false);
      console.log('[useReplayParser] Successfully parsed SC:BW replay with real data');
      
      return parsedData;
    } catch (err) {
      console.error('[useReplayParser] Screparsed parsing error:', err);
      
      let errorMessage = err instanceof Error ? err.message : 'Fehler beim Parsen der Replay-Datei mit screparsed';
      
      // Add specific guidance for different error types
      if (errorMessage.includes('screparsed')) {
        errorMessage += ' - Möglicherweise beschädigte oder nicht unterstützte Replay-Datei';
      }
      
      setError(errorMessage);
      
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      setIsProcessing(false);
      setProgress(100);
      
      toast({
        title: 'Screparsed Replay-Analyse fehlgeschlagen',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    }
  }, [isProcessing, toast]);

  return {
    parseReplay: handleParseReplay,
    isProcessing,
    error,
    clearError,
    progress
  };
}
