
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useHybridReplayParser, type HybridParsingResult } from '@/hooks/useHybridReplayParser';
import { useToast } from '@/hooks/use-toast';

interface UploadBoxProps {
  onUploadComplete: (file: File, replayData: HybridParsingResult) => void;
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'complete' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { parseReplay, isLoading, progress } = useHybridReplayParser();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setSelectedFile(file);
    setUploadStatus('parsing');

    try {
      const replayData = await parseReplay(file);
      
      setUploadStatus('complete');
      
      toast({
        title: "Replay erfolgreich analysiert",
        description: `${replayData.metadata.players[0]?.name || 'Unknown'} vs ${replayData.metadata.players[1]?.name || 'Unknown'} | Map: ${replayData.metadata.header.mapName}`,
      });

      onUploadComplete(file, replayData);
      
    } catch (err) {
      setUploadStatus('error');
      console.error('Upload/parsing error:', err);
      
      toast({
        title: "Fehler beim Analysieren",
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  }, [parseReplay, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.rep']
    },
    maxFiles: 1,
    disabled: uploadStatus === 'parsing'
  });

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'parsing':
        return <Upload className="w-8 h-8 text-primary animate-pulse" />;
      case 'complete':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <FileText className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'parsing':
        return progress.message || 'Analysiere Replay...';
      case 'complete':
        return 'Analyse abgeschlossen!';
      case 'error':
        return progress.message || 'Fehler beim Verarbeiten der Datei';
      default:
        return isDragActive ? 'Datei hier ablegen...' : 'StarCraft: Remastered Replay hochladen';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${uploadStatus === 'parsing' ? 'cursor-not-allowed opacity-70' : ''}
          ${uploadStatus === 'error' ? 'border-destructive bg-destructive/10 text-destructive-foreground' : ''}
          ${uploadStatus === 'complete' ? 'border-strength bg-strength/10 text-foreground' : ''}
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
          
          {uploadStatus === 'parsing' && (
            <div className="w-full max-w-xs">
              <Progress value={progress.progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {progress.stage}: {Math.round(progress.progress)}%
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
            Hybrid-Parser: Sofortige Metadaten + detaillierte Server-Analyse
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadBox;
