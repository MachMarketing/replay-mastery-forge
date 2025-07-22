
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface UploadBoxProps {
  onUploadComplete: (file: File) => Promise<void>;
  isLoading?: boolean;
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete, isLoading = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);

    try {
      setUploadStatus('uploading');
      console.log('[UploadBox] Processing file:', file.name);
      
      await onUploadComplete(file);
      
      setUploadStatus('success');
      toast({
        title: "Erfolg!",
        description: "Replay erfolgreich analysiert!"
      });
    } catch (error) {
      console.error('[UploadBox] Upload/parsing error:', error);
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: "Fehler",
        description: `Fehler beim Verarbeiten: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  const onDrop = useCallback(handleFiles, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.rep']
    },
    maxFiles: 1,
    disabled: uploadStatus === 'uploading' || isLoading
  });

  const handleDragEnter = () => setIsDragging(true);
  const handleDragLeave = () => setIsDragging(false);

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Upload className="w-8 h-8 text-primary animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <FileText className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return isLoading ? 'Analysiere Replay...' : 'Verarbeite Datei...';
      case 'success':
        return 'Analyse erfolgreich abgeschlossen!';
      case 'error':
        return 'Fehler beim Verarbeiten der Datei';
      default:
        return isDragging ? 'Datei hier ablegen...' : 'StarCraft: Remastered Replay hochladen';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive || isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${uploadStatus === 'uploading' || isLoading ? 'cursor-not-allowed opacity-70' : ''}
          ${uploadStatus === 'error' ? 'border-destructive bg-destructive/10 text-destructive-foreground' : ''}
          ${uploadStatus === 'success' ? 'border-green-500 bg-green-50 text-foreground' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {getStatusIcon()}
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              {getStatusText()}
            </h3>
            
            {uploadStatus === 'idle' && (
              <p className="text-sm text-muted-foreground">
                Unterstützte Formate: .rep (Hybrid Parser: Client + Server)
              </p>
            )}
            
            {selectedFile && uploadStatus !== 'idle' && (
              <p className="text-sm text-muted-foreground">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          
          {(uploadStatus === 'uploading' || isLoading) && (
            <div className="w-full max-w-xs">
              <Progress value={75} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Verarbeite SC:R Replay...
              </p>
            </div>
          )}
          
          {uploadStatus === 'idle' && (
            <Button variant="outline" className="mt-4">
              Datei auswählen
            </Button>
          )}
          
          {uploadStatus === 'error' && (
            <Button 
              onClick={() => {
                setUploadStatus('idle');
                setSelectedFile(null);
              }}
              variant="outline" 
              className="mt-4"
            >
              Erneut versuchen
            </Button>
          )}
        </div>
      </div>
      
      {uploadStatus === 'idle' && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Native SC:R Parser: Vollständige Replay-Analyse mit echten Daten
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadBox;
