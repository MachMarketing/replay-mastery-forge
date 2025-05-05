
import { useState, useEffect, useCallback } from 'react';
import { parseReplayFile, AnalyzedReplayResult } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';
import { initParserWasm, isWasmInitialized } from '@/services/wasmLoader';

interface ReplayParserResult {
  parseReplay: (file: File) => Promise<AnalyzedReplayResult | null>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
  progress: number; // Added progress tracking
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
    
    // Update progress at regular intervals to give user feedback
    const progressUpdateInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return prev;
        // Progress will be slow at first, then accelerate
        const increment = prev < 50 ? 2 : prev < 80 ? 5 : 2;
        return Math.min(prev + increment, 95); // Never reach 100% automatically
      });
    }, 800);
    
    // Set a timeout to prevent infinite processing
    const processingTimeout = setTimeout(() => {
      if (isProcessing) {
        console.error('[useReplayParser] Processing timed out after 30 seconds');
        setError('Zeitüberschreitung bei der Verarbeitung');
        setIsProcessing(false);
        clearInterval(progressUpdateInterval);
        
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
        
        clearTimeout(processingTimeout);
        clearInterval(progressUpdateInterval);
        setIsProcessing(false);
        return null;
      }
      
      // Verify file is readable
      if (!file.size) {
        throw new Error('Die Datei scheint leer oder beschädigt zu sein');
      }
      
      // Progress update - file validated
      setProgress(10);
      
      // Initialize WASM if needed
      if (!wasmReady) {
        try {
          console.log('[useReplayParser] WASM not ready, initializing now...');
          await initParserWasm();
          setWasmReady(true);
          // Progress update - WASM initialized
          setProgress(20);
        } catch (wasmError) {
          throw new Error(`WASM-Initialisierung fehlgeschlagen: ${wasmError instanceof Error ? wasmError.message : 'Unbekannter Fehler'}`);
        }
      } else {
        // Skip ahead if WASM was already initialized
        setProgress(25);
      }
      
      // Parse the file - this will take the longest time
      console.log('[useReplayParser] WASM ready, calling parseReplayFile with file:', file.name);
      setProgress(30);
      const parsedData = await parseReplayFile(file);
      setProgress(70);
      
      if (!parsedData) {
        throw new Error('Parser hat keine Daten zurückgegeben');
      }
      
      // Log parsed data
      console.log('[useReplayParser] Parsing completed. Data received:', parsedData);
      console.log('[useReplayParser] Player data:', {
        name: parsedData.playerName,
        race: parsedData.playerRace,
        opponent: parsedData.opponentName,
        opponentRace: parsedData.opponentRace
      });
      
      // Progress update - data verification
      setProgress(90);
      
      // Verify we have essential data
      const missingFields = [];
      if (!parsedData.playerName) missingFields.push('playerName');
      if (!parsedData.map) missingFields.push('map');
      
      if (missingFields.length > 0) {
        console.error('[useReplayParser] Missing essential data:', missingFields.join(', '));
        throw new Error(`Unvollständige Analyse-Daten: ${missingFields.join(', ')} fehlen`);
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
      
      clearTimeout(processingTimeout);
      clearInterval(progressUpdateInterval);
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
      clearTimeout(processingTimeout);
      clearInterval(progressUpdateInterval);
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
