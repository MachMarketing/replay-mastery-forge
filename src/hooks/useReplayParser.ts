
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
  
  useEffect(() => {
    if (hasBrowserWasmIssues()) {
      console.warn('[useReplayParser] WASM issues detected');
      toast({
        title: "Browser Compatibility Notice",
        description: "Your browser may have limited support for replay parsing features.",
        variant: "default",
      });
    }
    
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
    console.log('[useReplayParser] File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95;
        return Math.min(prev + 0.5, 95);
      });
    }, 100);
    
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
    }, 60000);
    
    try {
      // Enhanced file validation with detailed logging
      console.log('[useReplayParser] Starting file validation...');
      
      if (!file || file.size === 0) {
        throw new Error('Ungültige oder leere Datei');
      }
      
      if (file.size < 1024) {
        throw new Error('Datei ist zu klein für eine gültige Replay-Datei');
      }
      
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Datei ist zu groß (Maximum: 10MB)');
      }
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        throw new Error('Nur StarCraft Replay Dateien (.rep) sind erlaubt');
      }
      
      console.log('[useReplayParser] File validation passed');
      
      // Test file readability
      try {
        const testBuffer = await file.arrayBuffer();
        console.log('[useReplayParser] File readability test passed, size:', testBuffer.byteLength);
      } catch (fileError) {
        console.error('[useReplayParser] File readability test failed:', fileError);
        throw new Error('Datei kann nicht gelesen werden - möglicherweise beschädigt');
      }
      
      console.log('[useReplayParser] Calling unified parseReplay with file:', file.name);
      
      const parsedData: ParsedReplayData = await parseReplay(file);
      
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
      
      setProgress(100);
      
      if (processingTimeoutRef.current) {
        window.clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setIsProcessing(false);
      console.log('[useReplayParser] Successfully parsed replay file');
      
      return parsedData;
    } catch (err) {
      console.error('[useReplayParser] Replay parsing error:', err);
      console.error('[useReplayParser] Error type:', typeof err);
      console.error('[useReplayParser] Error details:', err instanceof Error ? {
        message: err.message,
        stack: err.stack,
        name: err.name
      } : err);
      
      let errorMessage = err instanceof Error ? err.message : 'Fehler beim Parsen der Replay-Datei';
      
      // Enhanced error classification
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('makeslice') || 
            errorMessage.includes('runtime error') ||
            errorMessage.includes('out of bounds') ||
            errorMessage.includes('screparsed module') ||
            errorMessage.includes('wasm')) {
          errorMessage = 'Browser-Kompatibilitätsproblem beim Parsen. Versuche es mit einem anderen Browser oder einer anderen Replay-Datei.';
          console.warn('[useReplayParser] WASM compatibility issues detected');
        } else if (errorMessage.includes('Failed to fetch') || 
                   errorMessage.includes('network') ||
                   errorMessage.includes('load')) {
          errorMessage = 'Netzwerkfehler beim Laden des Parsers. Überprüfe deine Internetverbindung.';
        } else if (errorMessage.includes('Cannot read properties') ||
                   errorMessage.includes('undefined') ||
                   errorMessage.includes('null')) {
          errorMessage = 'Replay-Datei hat ein unerwartetes Format oder ist beschädigt.';
        } else if (errorMessage.includes('memory') ||
                   errorMessage.includes('allocation')) {
          errorMessage = 'Speicherfehler beim Parsen. Datei möglicherweise zu groß oder beschädigt.';
        } else if (errorMessage.includes('format') ||
                   errorMessage.includes('invalid')) {
          errorMessage = 'Ungültiges Dateiformat. Stelle sicher, dass es eine echte StarCraft-Replay ist.';
        }
      }
      
      setError(errorMessage);
      
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
      
      toast({
        title: 'Replay-Analyse fehlgeschlagen',
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
