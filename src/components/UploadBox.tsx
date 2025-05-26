
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ParsedReplayData } from '@/services/replayParser/types';
import { useReplayParser } from '@/hooks/useReplayParser';

interface UploadBoxProps {
  onUploadComplete?: (file: File, replayData: ParsedReplayData) => void;
  maxFileSize?: number; // in MB
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete, maxFileSize = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { parseReplay, isProcessing, error: parsingError, clearError, progress: parserProgress } = useReplayParser();
  
  // Update UI based on screparsed parser progress
  useEffect(() => {
    if (isProcessing && uploadStatus === 'parsing') {
      // Update status message based on parser progress
      if (parserProgress < 25) {
        setStatusMessage('Initialisiere Screparsed Parser...');
      } else if (parserProgress < 50) {
        setStatusMessage('Lese SC:BW Replay-Struktur...');
      } else if (parserProgress < 75) {
        setStatusMessage('Extrahiere echte Spielerdaten...');
      } else if (parserProgress < 95) {
        setStatusMessage('Analysiere Build Order & APM...');
      } else if (parserProgress === 100) {
        setStatusMessage('Screparsed Analyse abgeschlossen!');
      } else {
        setStatusMessage('Verarbeite SC:BW Remastered Daten...');
      }
    }
  }, [isProcessing, parserProgress, uploadStatus]);
  
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
  };
  
  const clearTimeouts = () => {
    if (processingTimeoutRef.current) {
      window.clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  };

  const processFile = async (file: File) => {
    console.log("[UploadBox] Starting screparsed file processing:", file.name);
    clearError();
    setFile(file);
    setErrorDetails(null);
    setUploadStatus('parsing');
    setStatusMessage('Verbinde mit Screparsed Parser...');
    resetProgress();
    clearTimeouts();
    
    try {
      console.log("[UploadBox] Starting parsing with screparsed for SC:BW Remastered support:", file.name);
      
      // Use the screparsed-based parser
      const parsedData = await parseReplay(file);
      
      if (!parsedData) {
        throw new Error(parsingError || 'Screparsed konnte die Replay-Datei nicht verarbeiten');
      }
      
      // Log the real extracted data for verification
      console.log("[UploadBox] Real screparsed data extracted:", {
        primaryPlayer: {
          name: parsedData.primaryPlayer.name,
          race: parsedData.primaryPlayer.race,
          apm: parsedData.primaryPlayer.apm,
          realBuildOrder: parsedData.primaryPlayer.buildOrder?.slice(0, 5)
        },
        secondaryPlayer: {
          name: parsedData.secondaryPlayer.name,
          race: parsedData.secondaryPlayer.race,
          apm: parsedData.secondaryPlayer.apm
        },
        gameData: {
          map: parsedData.map,
          matchup: parsedData.matchup,
          duration: parsedData.duration,
          result: parsedData.result
        },
        analysis: {
          strengths: parsedData.strengths?.length || 0,
          weaknesses: parsedData.weaknesses?.length || 0,
          recommendations: parsedData.recommendations?.length || 0
        }
      });
      
      // Validate that we have real player names (not fallback data)
      if (!parsedData.primaryPlayer.name || parsedData.primaryPlayer.name === 'Player 1') {
        console.warn("[UploadBox] Warning: Still getting fallback player names");
      }
      
      // Validate that we have real build order data
      if (!parsedData.primaryPlayer.buildOrder || parsedData.primaryPlayer.buildOrder.length === 0) {
        console.warn("[UploadBox] Warning: No build order data extracted");
      } else {
        console.log("[UploadBox] Successfully extracted", parsedData.primaryPlayer.buildOrder.length, "build order items");
      }
      
      clearTimeouts();
      resetProgress();
      
      setUploadStatus('success');
      setStatusMessage('Screparsed Analyse erfolgreich abgeschlossen!');
      
      toast({
        title: "SC:BW Replay analysiert",
        description: `${file.name} wurde mit echten Daten erfolgreich analysiert.`,
      });
      
      // Ensure we wait a moment before transitioning to the analysis view
      setTimeout(() => {
        if (onUploadComplete && parsedData) {
          console.log("[UploadBox] Sending real screparsed data to parent component");
          onUploadComplete(file, parsedData);
        } else {
          console.warn("[UploadBox] Cannot complete upload: onUploadComplete missing or no data");
        }
      }, 500);
    } catch (error) {
      console.error("[UploadBox] Screparsed file processing error:", error);
      
      resetProgress();
      clearTimeouts();
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Parsen der SC:BW Replay-Datei';
      setErrorDetails(errorMessage);
      setUploadStatus('error');
      setStatusMessage('Screparsed-Fehler bei der Verarbeitung');
      
      toast({
        title: "Screparsed Verarbeitung fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    resetProgress();
    clearTimeouts();
    setFile(null);
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
            <p className="font-medium">Screparsed Verarbeitung fehlgeschlagen</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {errorDetails || statusMessage || 'Fehler beim Parsen der SC:BW Replay-Datei'}
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

  // Update the parser status indicator to show screparsed support
  const renderParserStatus = () => {
    return (
      <div className="mt-4 flex items-center">
        <div className="h-2 w-2 rounded-full mr-2 bg-green-500 animate-pulse" />
        <p className="text-xs text-muted-foreground">
          Screparsed Parser bereit (SC:BW Classic + Remastered)
        </p>
      </div>
    );
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
          <h3 className="text-lg font-semibold mb-2">SC:BW Replay-Datei hochladen</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Ziehe deine .rep Datei hierher oder klicke zum Auswählen<br />
            <span className="text-xs text-green-600">Unterstützt Classic & Remastered</span>
          </p>
          <Button onClick={open} variant="default" className="transition-all hover:shadow-md">
            Datei auswählen
          </Button>
          <input
            {...getInputProps()}
            accept=".rep"
          />
          <p className="text-xs text-muted-foreground mt-4">
            Max. Dateigröße: {maxFileSize}MB | Format: .rep
          </p>
          
          {/* Parser status indicator */}
          {renderParserStatus()}
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
              <Progress value={parserProgress} className="h-2" />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {statusMessage}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(parserProgress)}%
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
