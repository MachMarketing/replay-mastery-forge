
import { useState, useEffect, useCallback, useRef } from 'react';
import { ParsedReplayResult, ParsedReplayData } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';
import { parseReplayInBrowser } from '@/services/browserReplayParser';
import { hasBrowserWasmIssues } from '@/utils/browserDetection';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<ParsedReplayResult | null>;
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
  
  // Check for known WASM issues on mount
  useEffect(() => {
    // If we already know there are WASM issues, show a warning toast
    if (hasBrowserWasmIssues()) {
      console.warn('[useReplayParser] WASM issues detected, using fallback parser');
    }
    
    // Clean up on unmount
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

  const parseReplay = useCallback(async (file: File): Promise<ParsedReplayResult | null> => {
    if (isProcessing) {
      console.log('[useReplayParser] Already processing a file, aborting');
      toast({
        title: "Verarbeitung läuft bereits",
        description: "Bitte warte bis die aktuelle Datei vollständig verarbeitet ist",
        variant: "default",
      });
      return null;
    }
    
    console.log('[useReplayParser] Starting to process file:', file.name);
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    
    // Show continuous progress
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        // Increase progress continuously up to 95%
        if (prev >= 95) return 95;
        return Math.min(prev + 0.3, 95); // Verlangsamte Geschwindigkeit, da jetzt 60 statt 20 Sekunden
      });
    }, 100);
    
    // Set timeout for the entire processing (60 Sekunden - erhöht von 20)
    if (processingTimeoutRef.current) {
      window.clearTimeout(processingTimeoutRef.current);
    }
    
    processingTimeoutRef.current = window.setTimeout(() => {
      if (isProcessing) {
        console.error('[useReplayParser] Processing timed out after 60 seconds');
        setError('Zeitüberschreitung bei der Verarbeitung');
        setIsProcessing(false);
        
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        toast({
          title: 'Verarbeitung abgebrochen',
          description: 'Die Verarbeitung hat zu lange gedauert. Bitte versuche es erneut.',
          variant: 'destructive',
        });
      }
    }, 60000); // Erhöht von 20000 auf 60000 ms
    
    try {
      // Validate file
      if (!file || file.size === 0) {
        throw new Error('Ungültige oder leere Datei');
      }
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        throw new Error('Nur StarCraft Replay Dateien (.rep) sind erlaubt');
      }
      
      // Parse using our unified approach
      console.log('[useReplayParser] Calling parseReplayInBrowser with file:', file.name);
      
      const parsedData: ParsedReplayData = await parseReplayInBrowser(file);
      
      if (!parsedData) {
        throw new Error('Parser hat keine Daten zurückgegeben');
      }
      
      // Ensure the result has all required fields for ParsedReplayResult
      const result: ParsedReplayResult = {
        ...parsedData,
        playerName: parsedData.primaryPlayer?.name || 'Player',
        opponentName: parsedData.secondaryPlayer?.name || 'Opponent',
        playerRace: parsedData.primaryPlayer?.race || 'Terran',
        opponentRace: parsedData.secondaryPlayer?.race || 'Terran',
        apm: parsedData.primaryPlayer?.apm || 0,
        eapm: parsedData.primaryPlayer?.eapm || 0,
        opponentApm: parsedData.secondaryPlayer?.apm || 0,
        opponentEapm: parsedData.secondaryPlayer?.eapm || 0,
      };
      
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
      console.log('[useReplayParser] Successfully parsed replay file');
      
      return result;
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Fehler beim Parsen der Replay-Datei';
      
      // Special handling for WASM memory errors
      if (typeof errorMessage === 'string' && (
          errorMessage.includes('makeslice') || 
          errorMessage.includes('runtime error') ||
          errorMessage.includes('out of bounds'))) {
        errorMessage = 'Browser-Kompatibilitätsproblem beim Parsen. Versuche es mit einem anderen Browser oder einer anderen Replay-Datei.';
      }
      
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
