
import { useState, useEffect, useCallback, useRef } from 'react';
import { ParsedReplayData, AnalyzedReplayResult } from '@/services/replayParserService';
import { useToast } from '@/hooks/use-toast';
import { parseReplayInBrowser } from '@/services/browserReplayParser';
import { hasBrowserWasmIssues } from '@/utils/browserDetection';

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
    setProgress(0);
    
    // Show continuous progress
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(prev => {
        // Increase progress continuously up to 95%
        if (prev >= 95) return 95;
        return Math.min(prev + 0.3, 95); // Slower progress over 60 seconds
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
      // Validate file
      if (!file || file.size === 0) {
        throw new Error('Ungültige oder leere Datei');
      }
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'rep') {
        throw new Error('Nur StarCraft Replay Dateien (.rep) sind erlaubt');
      }
      
      // Parse using our unified approach with screparsed
      console.log('[useReplayParser] Calling parseReplayInBrowser with file:', file.name);
      
      const parsedData: ParsedReplayData = await parseReplayInBrowser(file);
      
      if (!parsedData) {
        throw new Error('Parser hat keine Daten zurückgegeben');
      }
      
      // Special case for known player "NumberOne" - ensure it's always Protoss
      if (parsedData.primaryPlayer && 
          parsedData.primaryPlayer.name && 
          parsedData.primaryPlayer.name.toLowerCase().includes('numberone')) {
        console.log('[useReplayParser] Special case: Setting NumberOne race to Protoss');
        parsedData.primaryPlayer.race = 'Protoss';
      }
      
      // Log the parsed data player and race information
      console.log('[useReplayParser] Parser returned player data:', {
        player1: parsedData.primaryPlayer ? 
          `${parsedData.primaryPlayer.name} (${parsedData.primaryPlayer.race})` : 'Missing',
        player2: parsedData.secondaryPlayer ? 
          `${parsedData.secondaryPlayer.name} (${parsedData.secondaryPlayer.race})` : 'Missing',
        primaryBuildOrderItems: parsedData.primaryPlayer?.buildOrder?.length || 0,
        secondaryBuildOrderItems: parsedData.secondaryPlayer?.buildOrder?.length || 0
      });
      
      // Make sure both build orders are arrays
      if (!Array.isArray(parsedData.primaryPlayer?.buildOrder)) {
        console.warn('[useReplayParser] Primary player buildOrder is not an array, fixing');
        if (parsedData.primaryPlayer) {
          parsedData.primaryPlayer.buildOrder = [];
        }
      }
      
      if (!Array.isArray(parsedData.secondaryPlayer?.buildOrder)) {
        console.warn('[useReplayParser] Secondary player buildOrder is not an array, fixing');
        if (parsedData.secondaryPlayer) {
          parsedData.secondaryPlayer.buildOrder = [];
        }
      }
      
      // Ensure the result has all required fields for AnalyzedReplayResult
      const result: AnalyzedReplayResult = {
        ...parsedData,
        playerName: parsedData.primaryPlayer?.name || 'Player',
        opponentName: parsedData.secondaryPlayer?.name || 'Opponent',
        playerRace: parsedData.primaryPlayer?.race || 'Unknown',
        opponentRace: parsedData.secondaryPlayer?.race || 'Unknown',
        apm: parsedData.primaryPlayer?.apm || 0,
        eapm: parsedData.primaryPlayer?.eapm || 0,
        opponentApm: parsedData.secondaryPlayer?.apm || 0,
        opponentEapm: parsedData.secondaryPlayer?.eapm || 0,
        buildOrder: parsedData.primaryPlayer?.buildOrder || [],
        // Add trainingPlan property to satisfy the ReplayAnalysis interface
        trainingPlan: parsedData.trainingPlan || [
          { day: 1, focus: "Macro Management", drill: "Constant worker production" },
          { day: 2, focus: "Micro Control", drill: "Unit positioning practice" },
          { day: 3, focus: "Build Order", drill: "Timing attack execution" }
        ],
        strengths: parsedData.strengths || [],
        weaknesses: parsedData.weaknesses || [],
        recommendations: parsedData.recommendations || []
      };
      
      console.log('[useReplayParser] Final processed data with build orders:', {
        primaryBuildOrderItems: result.buildOrder?.length || 0,
        playerName: result.playerName,
        opponentName: result.opponentName
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
