import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { AnalyzedReplayResult } from '@/services/replayParserService';
import { useReplayParser } from '@/hooks/useReplayParser';

interface UploadBoxProps {
  onUploadComplete?: (file: File, replayData: AnalyzedReplayResult) => void;
  maxFileSize?: number; // in MB
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete, maxFileSize = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { parseReplay, isProcessing, error: parsingError, clearError, progress: parserProgress } = useReplayParser();
  
  // Update progress when parser progress changes
  useEffect(() => {
    if (parserProgress > 0 && uploadStatus === 'parsing') {
      // Calculate combined progress:
      // - First 50% is upload simulation
      // - Remaining 50% is parsing progress scaled from parser
      const baseProgress = 50;
      const scaledParserProgress = parserProgress * 0.5;
      const combinedProgress = baseProgress + scaledParserProgress;
      
      setProgress(combinedProgress);
      
      // Update status message for better feedback
      if (parserProgress < 25) {
        setStatusMessage('Initialisiere Parser...');
      } else if (parserProgress < 50) {
        setStatusMessage('Lese Replay-Daten...');
      } else if (parserProgress < 75) {
        setStatusMessage('Analysiere Spieler-Daten...');
      } else {
        setStatusMessage('Fast fertig...');
      }
    }
  }, [parserProgress, uploadStatus]);
  
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
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsDragging(false);
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (!validateFile(file)) return;
    
    await processFile(file);
  }, []);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      'application/octet-stream': ['.rep']
    },
    maxSize: maxFileSize * 1024 * 1024
  });

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: `Maximale Dateigröße ist ${maxFileSize}MB`,
        variant: "destructive",
      });
      return false;
    }

    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'rep') {
      toast({
        title: "Ungültiger Dateityp",
        description: "Nur StarCraft Replay Dateien (.rep) sind erlaubt",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const resetProgress = () => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(0);
  };
  
  const clearTimeouts = () => {
    if (processingTimeoutRef.current) {
      window.clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  };

  const simulateProgress = () => {
    resetProgress();
    
    // Start with a smaller initial progress and slow down near 50%
    const interval = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 50) {
          // Stop automatic progress at 50%, the rest will be controlled by parser
          window.clearInterval(interval);
          return prev;
        }
        
        // Slow down as we approach 50%
        const remainingToHalf = 50 - prev;
        const increment = Math.max(0.3, remainingToHalf * 0.03);
        const newProgress = Math.min(prev + increment, 50);
        
        // When we get close to 50%, switch to parsing stage
        if (newProgress >= 40 && uploadStatus === 'uploading') {
          setUploadStatus('parsing');
          setStatusMessage('Analysiere Replay-Daten...');
        }
        
        return newProgress;
      });
    }, 100);
    
    progressIntervalRef.current = interval;
    return interval;
  };

  const processFile = async (file: File) => {
    console.log('[UploadBox] Starting file processing:', file.name);
    clearError();
    setFile(file);
    setErrorDetails(null);
    setUploadStatus('uploading');
    setStatusMessage('Bereite Replay-Datei vor...');
    resetProgress();
    clearTimeouts();
    
    // Set a timeout to detect processing issues - extended to 45 seconds
    processingTimeoutRef.current = window.setTimeout(() => {
      if (uploadStatus === 'parsing' || uploadStatus === 'uploading') {
        console.error('[UploadBox] Processing timeout reached after 45 seconds');
        setUploadStatus('error');
        setStatusMessage('Verarbeitung fehlgeschlagen');
        setErrorDetails('Die Verarbeitung hat das Zeitlimit überschritten. Bitte versuche es erneut oder kontaktiere den Support.');
        
        toast({
          title: 'Zeitüberschreitung',
          description: 'Die Replay-Verarbeitung hat zu lange gedauert. Bitte versuche es erneut.',
          variant: 'destructive',
        });
      }
    }, 45000);
    
    // Start progress simulation for first 50%
    simulateProgress();
    
    try {
      // Start parsing after short delay for better UX
      setTimeout(() => {
        if (uploadStatus !== 'error') {
          setUploadStatus('parsing');
          setStatusMessage('Verarbeite Replay-Daten...');
        }
      }, 800);
      
      // Parse the file with browser-based parser
      console.log('[UploadBox] Starting parsing:', file.name);
      const parsedData = await parseReplay(file);
      
      if (!parsedData) {
        throw new Error(parsingError || 'Fehler beim Parsen der Replay-Datei');
      }
      
      // Log parsed data for debugging
      console.log('[UploadBox] Raw parsed data:', parsedData);
      
      // Validate that the returned data contains required fields
      if (!parsedData.playerName) {
        console.error('[UploadBox] Parsed data missing player name');
        throw new Error('Fehler: Keine Spielernamen gefunden');
      }
      
      if (!parsedData.playerRace || parsedData.playerRace === 'Unknown' as any) {
        console.warn('[UploadBox] No valid player race detected:', parsedData.playerRace);
      }
      
      // Complete the progress
      clearTimeouts();
      resetProgress();
      
      setProgress(100);
      setUploadStatus('success');
      setStatusMessage('Analyse erfolgreich abgeschlossen!');
      
      toast({
        title: "Analyse vollständig",
        description: `${file.name} wurde erfolgreich analysiert.`,
      });
      
      // Ensure we wait a moment before transitioning to the analysis view
      setTimeout(() => {
        if (onUploadComplete && parsedData) {
          console.log('[UploadBox] Sending parsed data to parent component');
          onUploadComplete(file, parsedData);
        } else {
          console.warn('[UploadBox] Cannot complete upload: onUploadComplete missing or no data');
        }
      }, 500);
    } catch (error) {
      console.error('[UploadBox] File processing error:', error);
      
      resetProgress();
      clearTimeouts();
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Parsen der Replay-Datei';
      setErrorDetails(errorMessage);
      setUploadStatus('error');
      setStatusMessage('Fehler bei der Verarbeitung');
      setProgress(0);
      
      toast({
        title: "Verarbeitung fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    resetProgress();
    clearTimeouts();
    setFile(null);
    setProgress(0);
    setUploadStatus('idle');
    setStatusMessage('');
    setErrorDetails(null);
    clearError();
  };

  const handleRetry = () => {
    if (file) {
      processFile(file);
    } else {
      handleCancel();
    }
  };

  const renderFileError = () => {
    if (uploadStatus === 'error' && file) {
      return (
        <div className="mt-4 p-4 bg-opacity-10 bg-destructive border border-destructive/40 rounded-md">
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertCircle className="h-4 w-4" />
            <p className="font-medium">Verarbeitung fehlgeschlagen</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {errorDetails || statusMessage || 'Fehler beim Parsen der Replay-Datei'}
          </p>
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center" 
              onClick={handleRetry}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Erneut versuchen
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-muted-foreground" 
              onClick={handleCancel}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {uploadStatus === 'idle' ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-all ${
            isDragging 
              ? 'border-primary bg-primary/10 animate-pulse' 
              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }`}
        >
          <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Replay-Datei hochladen</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Ziehe deine .rep Datei hierher oder klicke zum Auswählen
          </p>
          <Button onClick={open} variant="default" className="transition-all hover:shadow-md">
            Datei auswählen
          </Button>
          <input
            {...getInputProps()}
            accept=".rep"
          />
          <p className="text-xs text-muted-foreground mt-4">
            Max. Dateigröße: {maxFileSize}MB | Unterstütztes Format: .rep
          </p>
          
          {/* Parser status indicator */}
          <div className="mt-4 flex items-center">
            <div className="h-2 w-2 rounded-full mr-2 bg-green-500 animate-pulse" />
            <p className="text-xs text-muted-foreground">
              Browser-Parser bereit
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-3 text-primary" />
              <div className="max-w-[200px]">
                <p className="font-medium truncate" title={file?.name || ""}>
                  {file?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {file && (file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {uploadStatus === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {uploadStatus === 'error' && (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
          </div>
          
          {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
            <>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {statusMessage}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(progress)}%
                </p>
              </div>
            </>
          )}
          
          {uploadStatus === 'success' && (
            <div className="mt-2">
              <p className="text-sm text-green-500 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Analyse abgeschlossen
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Dein Replay wurde analysiert und ist bereit zum Anzeigen.
              </p>
            </div>
          )}
          
          {uploadStatus === 'error' && renderFileError()}
        </div>
      )}
    </div>
  );
};

export default UploadBox;
