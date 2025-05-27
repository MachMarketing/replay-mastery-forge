
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ParsedReplayData } from '@/services/replayParser/types';
import { parseReplay } from '@/services/replayParser';

interface UploadBoxProps {
  onUploadComplete?: (file: File, replayData: ParsedReplayData) => void;
  maxFileSize?: number;
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete, maxFileSize = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  
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
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: `Maximale Dateigröße ist ${maxFileSize}MB`,
        variant: "destructive",
      });
      return false;
    }

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

  const processFile = async (file: File) => {
    console.log("[UploadBox] Processing file:", file.name);
    setFile(file);
    setErrorDetails(null);
    setUploadStatus('uploading');
    setStatusMessage('Datei wird hochgeladen...');
    setProgress(0);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 90 ? 90 : prev + 15);
    }, 200);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(progressInterval);
      setProgress(100);
      
      setUploadStatus('parsing');
      setStatusMessage('Replay wird analysiert...');
      
      const parsedData = await parseReplay(file);
      
      setUploadStatus('success');
      setStatusMessage('Analyse erfolgreich abgeschlossen!');
      
      toast({
        title: "Replay analysiert",
        description: `${file.name} wurde erfolgreich analysiert.`,
      });
      
      setTimeout(() => {
        if (onUploadComplete && parsedData) {
          onUploadComplete(file, parsedData);
        }
      }, 500);
      
    } catch (error) {
      clearInterval(progressInterval);
      console.error("[UploadBox] Error:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setErrorDetails(errorMessage);
      setUploadStatus('error');
      setStatusMessage('Fehler beim Analysieren');
      
      toast({
        title: "Analyse fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFile(null);
    setUploadStatus('idle');
    setStatusMessage('');
    setErrorDetails(null);
    setProgress(0);
  };

  const handleRetry = () => {
    if (file) {
      processFile(file);
    } else {
      handleCancel();
    }
  };

  if (uploadStatus === 'idle') {
    return (
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-all ${
          isDragging 
            ? 'border-primary bg-primary/10 animate-pulse' 
            : 'border-border hover:border-primary/50 hover:bg-secondary/50'
        }`}
      >
        <div className="h-14 w-14 rounded-full flex items-center justify-center mb-4 bg-primary/20">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          StarCraft Replay hochladen
        </h3>
        <p className="text-sm mb-4 text-center text-muted-foreground">
          Ziehe deine .rep Datei hierher oder klicke zum Auswählen
        </p>
        <Button onClick={open} variant="default">
          Datei auswählen
        </Button>
        <input {...getInputProps()} accept=".rep" />
        <p className="text-xs text-muted-foreground mt-4">
          Max. Dateigröße: {maxFileSize}MB | Format: .rep
        </p>
      </div>
    );
  }

  return (
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
      
      {uploadStatus === 'error' && (
        <div className="mt-4 p-4 bg-opacity-10 bg-destructive border border-destructive/40 rounded-md">
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertCircle className="h-4 w-4" />
            <p className="font-medium">Analyse fehlgeschlagen</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {errorDetails || statusMessage}
          </p>
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRetry}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Erneut versuchen
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleCancel}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadBox;
