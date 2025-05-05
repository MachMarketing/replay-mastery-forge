
import { useState, useEffect, useCallback } from 'react';
import { parseReplayFile, AnalyzedReplayResult } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';
import { initParserWasm, isWasmInitialized } from '@/services/wasmLoader';

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
    
    // Verbesserte Fortschrittsanzeige mit mehr Schritten und kleineren Intervallen
    const progressUpdateInterval = setInterval(() => {
      setProgress(prev => {
        // Verhindern, dass der Fortschritt bei bestimmten Prozentsätzen hängen bleibt
        if (prev >= 95) return prev;
        // Schnellerer anfänglicher Fortschritt, dann langsamer bei mittleren Werten
        // und wieder schneller zum Ende hin
        if (prev < 30) return prev + 3;
        if (prev >= 60 && prev < 65) return 66; // Problem bei 65% überspringen
        if (prev >= 65 && prev < 70) return 70; // Problem bei 65% überspringen
        const increment = prev < 50 ? 2 : prev < 80 ? 1 : 2;
        return Math.min(prev + increment, 95);
      });
    }, 600); // Häufigere Updates
    
    // Processingzeitlimit verlängert
    const processingTimeout = setTimeout(() => {
      if (isProcessing) {
        console.error('[useReplayParser] Processing timed out after 45 seconds');
        setError('Zeitüberschreitung bei der Verarbeitung');
        setIsProcessing(false);
        clearInterval(progressUpdateInterval);
        
        toast({
          title: 'Verarbeitung abgebrochen',
          description: 'Die Verarbeitung hat zu lange gedauert. Bitte versuche es erneut.',
          variant: 'destructive',
        });
      }
    }, 45000); // Auf 45 Sekunden erhöht
    
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
      setProgress(15);
      
      // Initialize WASM if needed - mit verbesserten Timeouts
      if (!wasmReady) {
        try {
          console.log('[useReplayParser] WASM not ready, initializing now...');
          const wasmPromise = initParserWasm();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('WASM Initialisierung dauerte zu lange')), 15000);
          });
          
          await Promise.race([wasmPromise, timeoutPromise]);
          setWasmReady(true);
          // Progress update - WASM initialized
          setProgress(25);
        } catch (wasmError) {
          throw new Error(`WASM-Initialisierung fehlgeschlagen: ${wasmError instanceof Error ? wasmError.message : 'Unbekannter Fehler'}`);
        }
      } else {
        // Skip ahead if WASM was already initialized
        setProgress(25);
      }
      
      // Parse the file with explicit timeout handling
      console.log('[useReplayParser] WASM ready, calling parseReplayFile with file:', file.name);
      setProgress(35);
      
      // Race zwischen Parser und Timeout
      const parsePromise = parseReplayFile(file);
      const parseTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Parsing dauerte zu lange')), 30000);
      });
      
      // Explizite Progress-Updates während der Parsing-Phase
      const parsingProgressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 35 && prev < 70) {
            return prev + 1;
          }
          return prev;
        });
      }, 800);
      
      try {
        const parsedData = await Promise.race([parsePromise, parseTimeoutPromise]);
        clearInterval(parsingProgressInterval);
        setProgress(75);
        
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
      } catch (parseErr) {
        clearInterval(parsingProgressInterval);
        throw parseErr; // Weitergeben zum äußeren catch-Block
      }
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
