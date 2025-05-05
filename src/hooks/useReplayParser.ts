
import { useState, useEffect, useCallback, useRef } from 'react';
import { parseReplayFile, AnalyzedReplayResult } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';
import { abortActiveProcess } from '@/services/replayParser';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<AnalyzedReplayResult | null>;
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

  const parseReplay = useCallback(async (file: File): Promise<AnalyzedReplayResult | null> => {
    if (isProcessing) {
      console.log('[useReplayParser] Already processing a file, aborting');
      toast({
        title: "Verarbeitung läuft bereits",
        description: "Bitte warte bis die aktuelle Datei vollständig verarbeitet ist",
        variant: "default",
      });
      return null;
    }
    
    console.log('[useReplayParser] Starting to process file:', file.name, 'size:', file.size);
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    
    // Show continuous progress with steady speed
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        // Increase progress continuously up to 98%
        if (prev >= 98) return 98;
        return Math.min(prev + 0.8, 98);
      });
    }, 100);
    
    // Timeout for the entire processing (30 seconds)
    if (processingTimeoutRef.current) {
      window.clearTimeout(processingTimeoutRef.current);
    }
    
    processingTimeoutRef.current = window.setTimeout(() => {
      if (isProcessing) {
        console.error('[useReplayParser] Processing timed out after 30 seconds');
        setError('Zeitüberschreitung bei der Verarbeitung');
        setIsProcessing(false);
        
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        // Abort the running process
        abortActiveProcess();
        
        toast({
          title: 'Verarbeitung abgebrochen',
          description: 'Die Verarbeitung hat zu lange gedauert. Bitte versuche es erneut.',
          variant: 'destructive',
        });
      }
    }, 30000);
    
    try {
      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        throw new Error('Nur StarCraft Replay Dateien (.rep) sind erlaubt');
      }
      
      // Verify file is readable
      if (!file.size) {
        throw new Error('Die Datei scheint leer oder beschädigt zu sein');
      }
      
      // Parse the file with real parsing, not mock data
      console.log('[useReplayParser] Calling parseReplayFile with file:', file.name);
      
      const parsedData = await parseReplayFile(file);
      
      if (!parsedData) {
        throw new Error('Parser hat keine Daten zurückgegeben');
      }
      
      // Verify we have essential data
      if (!parsedData.playerName) {
        console.error('[useReplayParser] Missing essential data: playerName');
        throw new Error('Unvollständige Analyse-Daten: playerName fehlt');
      }
      
      // Final progress update
      setProgress(100);
      
      // Clean up timeouts and intervals
      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Short delay before completing for UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setIsProcessing(false);
      console.log('[useReplayParser] Successfully parsed replay file:', parsedData);
      
      return parsedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Parsen der Replay-Datei';
      setError(errorMessage);
      
      console.error('[useReplayParser] Replay parsing error:', err);
      
      toast({
        title: 'Verarbeitung fehlgeschlagen',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Clean up timeouts and intervals
      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      setIsProcessing(false);
      return null;
    }
  }, [isProcessing, toast]);

  return {
    parseReplay,
    isProcessing,
    error,
    clearError,
    progress
  };
}
