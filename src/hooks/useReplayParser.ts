
import { useState, useEffect, useCallback } from 'react';
import { parseReplayFile, AnalyzedReplayResult } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';
import { initParserWasm, isWasmInitialized } from '@/services/wasmLoader';
import { abortLongRunningProcess } from '@/services/replayParser';

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
  const [wasmReady, setWasmReady] = useState(isWasmInitialized());
  const [progress, setProgress] = useState(0);
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
          setWasmReady(true);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[useReplayParser] Failed to pre-initialize WASM:', err);
          setWasmReady(false);
          // We'll retry later when needed
        }
      }
    };
    
    // Only attempt to initialize if not already initialized
    if (!isWasmInitialized()) {
      initWasm();
    } else {
      setWasmReady(true);
    }
      
    return () => {
      isMounted = false;
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
    
    // Kontinuierlicher Fortschritt mit konstanter Geschwindigkeit
    // Keine Probleme bei bestimmten Prozentwerten (z.B. 65%)
    let progressUpdateInterval: number | null = null;
    progressUpdateInterval = window.setInterval(() => {
      setProgress(prev => {
        // Den Fortschritt kontinuierlich bis 98% erhöhen
        // Dann übernimmt die eigentliche Fertigstellung
        if (prev >= 98) return 98;
        
        // Lineare Erhöhung mit gleichmäßiger Geschwindigkeit
        return Math.min(prev + 0.6, 98);
      });
    }, 100);
    
    // Timeout für die gesamte Verarbeitung (30 Sekunden)
    let processingTimeout: number | null = null;
    processingTimeout = window.setTimeout(() => {
      if (isProcessing) {
        console.error('[useReplayParser] Processing timed out after 30 seconds');
        setError('Zeitüberschreitung bei der Verarbeitung');
        setIsProcessing(false);
        
        if (progressUpdateInterval) clearInterval(progressUpdateInterval);
        
        // Abbruch des laufenden Prozesses
        abortLongRunningProcess();
        
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
        const extensionError = 'Nur StarCraft Replay Dateien (.rep) sind erlaubt';
        setError(extensionError);
        
        toast({
          title: 'Ungültige Datei',
          description: extensionError,
          variant: 'destructive',
        });
        
        if (processingTimeout) clearTimeout(processingTimeout);
        if (progressUpdateInterval) clearInterval(progressUpdateInterval);
        setIsProcessing(false);
        return null;
      }
      
      // Verify file is readable
      if (!file.size) {
        throw new Error('Die Datei scheint leer oder beschädigt zu sein');
      }
      
      // Initialize WASM if needed
      if (!wasmReady) {
        try {
          console.log('[useReplayParser] WASM not ready, initializing now...');
          await initParserWasm();
          setWasmReady(true);
        } catch (wasmError) {
          throw new Error(`WASM-Initialisierung fehlgeschlagen: ${wasmError instanceof Error ? wasmError.message : 'Unbekannter Fehler'}`);
        }
      }
      
      // Parse the file - jetzt mit verbessertem Progress
      console.log('[useReplayParser] WASM ready, calling parseReplayFile with file:', file.name);
      
      const parsedData = await parseReplayFile(file);
      
      if (!parsedData) {
        throw new Error('Parser hat keine Daten zurückgegeben');
      }
      
      // Verify we have essential data
      if (!parsedData.playerName) {
        console.error('[useReplayParser] Missing essential data: playerName');
        throw new Error('Unvollständige Analyse-Daten: playerName fehlt');
      }
      
      // Generate dummy data ONLY if file name explicitly includes 'test_mock'
      if (process.env.NODE_ENV === 'development' && file.name.includes('test_mock')) {
        console.log('[useReplayParser] Adding dummy analysis data for explicit testing file');
        parsedData.strengths = ['Gute mechanische Fähigkeiten', 'Effektives Makromanagement'];
        parsedData.weaknesses = ['Könnte Scouting verbessern', 'Unregelmäßige Produktion'];
        parsedData.recommendations = ['Übe Build-Order Timings', 'Fokussiere dich auf Map-Kontrolle'];
      }
      
      // Final progress update
      setProgress(100);
      
      if (processingTimeout) clearTimeout(processingTimeout);
      if (progressUpdateInterval) clearInterval(progressUpdateInterval);
      
      // Kurze Verzögerung vor dem Abschluss für UX
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
      
      return null;
    } finally {
      if (processingTimeout) clearTimeout(processingTimeout);
      if (progressUpdateInterval) clearInterval(progressUpdateInterval);
      setIsProcessing(false);
    }
  }, [isProcessing, wasmReady, toast]);

  return {
    parseReplay,
    isProcessing,
    error,
    clearError,
    progress
  };
}
