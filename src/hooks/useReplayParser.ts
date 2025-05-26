
import { useState, useEffect, useCallback, useRef } from 'react';
import { ParsedReplayData } from '@/services/replayParser/types';
import { useToast } from '@/hooks/use-toast';
import { hasBrowserWasmIssues } from '@/utils/browserDetection';
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
  
  // Check for known WASM issues on mount
  useEffect(() => {
    // If we already know there are WASM issues, show a warning toast
    if (hasBrowserWasmIssues()) {
      console.warn('[useReplayParser] WASM issues detected');
      toast({
        title: "Browser Compatibility Notice",
        description: "Your browser may have limited support for replay parsing features.",
        variant: "default",
      });
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
  }, [toast]);

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
        return Math.min(prev + 0.5, 95); // Slightly faster progress
      });
    }, 100);
    
    // Set timeout for the entire processing (60 seconds)
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
    }, 60000); // 60 seconds timeout
    
    try {
      // Enhanced file validation
      if (!file || file.size === 0) {
        throw new Error('Ungültige oder leere Datei');
      }
      
      if (file.size < 1024) {
        throw new Error('Datei ist zu klein für eine gültige Replay-Datei');
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Datei ist zu groß (Maximum: 10MB)');
      }
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        throw new Error('Nur StarCraft Replay Dateien (.rep) sind erlaubt');
      }
      
      // Check if file is readable
      try {
        await file.arrayBuffer();
      } catch (fileError) {
        throw new Error('Datei kann nicht gelesen werden - möglicherweise beschädigt');
      }
      
      // Parse using our unified parser
      console.log('[useReplayParser] Calling unified parseReplay with file:', file.name);
      
      const parsedData: ParsedReplayData = await parseReplay(file);
      
      // Enhanced debugging - log the full structure
      console.log('[useReplayParser] Parsing successful!');
      console.log('[useReplayParser] Player data:', {
        primary: {
          name: parsedData.primaryPlayer.name,
          race: parsedData.primaryPlayer.race,
          buildOrderItems: parsedData.primaryPlayer.buildOrder?.length || 0
        },
        secondary: {
          name: parsedData.secondaryPlayer.name,
          race: parsedData.secondaryPlayer.race,
          buildOrderItems: parsedData.secondaryPlayer.buildOrder?.length || 0
        }
      });
      
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
      
      return parsedData;
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Fehler beim Parsen der Replay-Datei';
      
      // Enhanced error handling
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('makeslice') || 
            errorMessage.includes('runtime error') ||
            errorMessage.includes('out of bounds') ||
            errorMessage.includes('screparsed module')) {
          errorMessage = 'Browser-Kompatibilitätsproblem beim Parsen. Versuche es mit einem anderen Browser oder einer anderen Replay-Datei.';
          console.warn('[useReplayParser] WASM compatibility issues detected');
        } else if (errorMessage.includes('Failed to fetch')) {
          errorMessage = 'Netzwerkfehler beim Laden des Parsers. Überprüfe deine Internetverbindung.';
        } else if (errorMessage.includes('Cannot read properties')) {
          errorMessage = 'Replay-Datei hat ein unerwartetes Format oder ist beschädigt.';
        }
      }
      
      setError(errorMessage);
      console.error('[useReplayParser] Replay parsing error:', err);
      
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
      setProgress(100);
      
      // Show user-friendly error message
      toast({
        title: 'Replay-Analyse fehlgeschlagen',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Don't throw error, return null to allow for graceful handling
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
