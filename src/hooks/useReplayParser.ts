
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
  const [initializationAttempts, setInitializationAttempts] = useState(0);

  // Pre-initialize WASM on hook mount
  useEffect(() => {
    console.log('[useReplayParser] Pre-initializing WASM module');
    
    let isMounted = true;
    
    const initWasm = async () => {
      try {
        await initParserWasm();
        if (isMounted) {
          console.log('[useReplayParser] WASM pre-initialized successfully');
          setWasmInitialized(true);
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

  const clearError = () => {
    setError(null);
  };

  const parseReplay = async (file: File): Promise<AnalyzedReplayResult | null> => {
    if (isProcessing) {
      console.log('[useReplayParser] Already processing a file, aborting');
      toast({
        title: "Verarbeitung läuft bereits",
        description: "Bitte warte bis die aktuelle Datei vollständig verarbeitet ist",
        variant: "default",
      });
      return null;
    }
    
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
      
      // Always try to initialize WASM again if it failed earlier
      if (!wasmInitialized) {
        try {
          console.log('[useReplayParser] Trying to initialize WASM before parsing');
          await initParserWasm();
          setWasmInitialized(true);
          setInitializationAttempts(0);
          console.log('[useReplayParser] WASM initialization successful');
        } catch (err) {
          setInitializationAttempts(prev => prev + 1);
          console.error('[useReplayParser] WASM initialization failed:', err);
          
          // If we've tried multiple times and still failing, show a specific error message
          if (initializationAttempts > 2) {
            throw new Error('Die Initialisierung des Parsers ist fehlgeschlagen. Bitte aktualisiere die Seite und versuche es erneut.');
          } else {
            throw new Error('WASM-Parser-Initialisierung fehlgeschlagen. Neuer Versuch wird gestartet...');
          }
        }
      }
      
      // Verify file is readable
      if (!file.size) {
        throw new Error('Die Datei scheint leer oder beschädigt zu sein');
      }
      
      // Use the real parser
      console.log('[useReplayParser] Calling parseReplayFile with file:', file.name);
      const parsedData = await parseReplayFile(file);
      
      if (!parsedData) {
        throw new Error('Parser hat keine Daten zurückgegeben');
      }
      
      console.log('[useReplayParser] Parsing completed successfully:', parsedData);
      setIsProcessing(false);
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
