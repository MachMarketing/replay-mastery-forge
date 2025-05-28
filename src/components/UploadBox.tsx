
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useReplayParser } from '@/hooks/useReplayParser';
import { useToast } from '@/hooks/use-toast';
import { EnhancedReplayData } from '@/services/nativeReplayParser/enhancedScrepWrapper';

interface UploadBoxProps {
  onUploadComplete: (file: File, replayData: EnhancedReplayData) => void;
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'complete' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { parseFile, isLoading, error } = useReplayParser();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setSelectedFile(file);
    setUploadStatus('uploading');
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      // Complete upload simulation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUploadProgress(100);
      clearInterval(progressInterval);
      
      setUploadStatus('parsing');
      
      // Parse the file using the enhanced parser
      const replayData = await parseFile(file);
      
      setUploadStatus('complete');
      
      toast({
        title: "Replay erfolgreich analysiert",
        description: `${replayData.players[0]?.name || 'Unknown'} vs ${replayData.players[1]?.name || 'Unknown'}`,
      });

      onUploadComplete(file, replayData);
      
    } catch (err) {
      clearInterval(progressInterval);
      setUploadStatus('error');
      console.error('Upload/parsing error:', err);
      
      toast({
        title: "Fehler beim Analysieren",
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  }, [parseFile, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.rep']
    },
    maxFiles: 1,
    disabled: uploadStatus === 'uploading' || uploadStatus === 'parsing'
  });

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
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
      case 'uploading':
        return 'Datei wird hochgeladen...';
      case 'parsing':
        return 'Replay wird analysiert...';
      case 'complete':
        return 'Analyse abgeschlossen!';
      case 'error':
        return error || 'Fehler beim Verarbeiten der Datei';
      default:
        return isDragActive ? 'Datei hier ablegen...' : 'Replay-Datei hochladen';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${uploadStatus === 'uploading' || uploadStatus === 'parsing' ? 'cursor-not-allowed opacity-70' : ''}
          ${uploadStatus === 'error' ? 'border-red-300 bg-red-50' : ''}
          ${uploadStatus === 'complete' ? 'border-green-300 bg-green-50' : ''}
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
                Unterstützte Formate: .rep (StarCraft: Brood War Replays)
              </p>
            )}
            
            {selectedFile && uploadStatus !== 'idle' && (
              <p className="text-sm text-muted-foreground">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          
          {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
            <div className="w-full max-w-xs">
              <Progress 
                value={uploadStatus === 'uploading' ? uploadProgress : 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {uploadStatus === 'uploading' ? `${Math.round(uploadProgress)}%` : 'Analysiere...'}
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
                setUploadProgress(0);
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
            Lade deine StarCraft: Brood War Replay-Datei hoch für eine detaillierte Analyse
            deiner Spielstärken, Schwächen und Build Order.
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadBox;
