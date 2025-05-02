
import { useState, useEffect, useCallback } from 'react';
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

  // Pre-initialize WASM on hook mount
  useEffect(() => {
    console.log('[useReplayParser] Pre-initializing WASM module');
    
    let isMounted = true;
    
    const initWasm = async () => {
      try {
        await initParserWasm();
        if (isMounted) {
          console.log('[useReplayParser] WASM pre-initialized successfully');
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[useReplayParser] Failed to pre-initialize WASM:', err);
          // We'll retry later when needed
        }
      }
    };
    
    initWasm();
      
    return () => {
      isMounted = false;
    };
  }, []); 

  const clearError = useCallback(() => {
    setError(null);
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
    
    console.log('[useReplayParser] Starting to process file:', file.name);
    setIsProcessing(true);
    setError(null);
    
    try {
      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        const extensionError = 'Nur StarCraft Replay Dateien (.rep) sind erlaubt';
        setError(extensionError);
        
        toast({
          title: 'Ungültige Datei',
          description: extensionError,
          variant: 'destructive',
        });
        
        setIsProcessing(false);
        return null;
      }
      
      console.log('[useReplayParser] Starting replay parsing for file:', file.name, 'size:', file.size);
      
      // Verify file is readable
      if (!file.size) {
        throw new Error('Die Datei scheint leer oder beschädigt zu sein');
      }
      
      // Parse the file
      console.log('[useReplayParser] Calling parseReplayFile with file:', file.name);
      const parsedData = await parseReplayFile(file);
      
      if (!parsedData) {
        throw new Error('Parser hat keine Daten zurückgegeben');
      }
      
      // Log all key-value pairs for debugging
      console.log('[useReplayParser] Parsing completed. All data fields:');
      Object.entries(parsedData).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          console.log(`[useReplayParser] ${key}:`, JSON.stringify(value).substring(0, 100) + '...');
        } else {
          console.log(`[useReplayParser] ${key}:`, value);
        }
      });
      
      // Verify we have essential data
      if (!parsedData.playerName || !parsedData.map || !parsedData.strengths || parsedData.strengths.length === 0) {
        console.error('[useReplayParser] Missing essential data in parsed result', parsedData);
        throw new Error('Unvollständige Analyse-Daten');
      }
      
      console.log('[useReplayParser] Parsing completed successfully with', 
        parsedData.strengths.length, 'strengths,', 
        parsedData.weaknesses.length, 'weaknesses');
      
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
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, toast]);

  return {
    parseReplay,
    isProcessing,
    error,
    clearError
  };
}
