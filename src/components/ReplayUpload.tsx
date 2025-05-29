
/**
 * Clean, focused upload component for StarCraft: Remastered replays
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEnhancedReplayParser } from '@/hooks/useEnhancedReplayParser';
import { useToast } from '@/hooks/use-toast';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';

interface ReplayUploadProps {
  onParseComplete: (data: EnhancedReplayResult) => void;
}

const ReplayUpload: React.FC<ReplayUploadProps> = ({ onParseComplete }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'complete' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { parseReplay, isLoading, error, progress } = useEnhancedReplayParser();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    console.log('[ReplayUpload] Processing file:', file.name, file.size, 'bytes');
    
    setSelectedFile(file);
    setUploadStatus('parsing');

    try {
      const result = await parseReplay(file);
      
      setUploadStatus('complete');
      
      toast({
        title: "Replay erfolgreich geparst",
        description: `${result.header.mapName} - ${result.players.map(p => p.name).join(' vs ')}`,
      });

      onParseComplete(result);
      
    } catch (err) {
      setUploadStatus('error');
      console.error('[ReplayUpload] Parse error:', err);
      toast({
        title: "Parse-Fehler",
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  }, [parseReplay, onParseComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.rep']
    },
    maxFiles: 1,
    disabled: isLoading
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
        return 'Enhanced Replay wird geparst...';
      case 'complete':
        return 'Enhanced Parse erfolgreich!';
      case 'error':
        return error || 'Parse-Fehler';
      default:
        return isDragActive ? 'Datei hier ablegen...' : 'StarCraft: Remastered .rep Datei hochladen';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
          ${isLoading ? 'cursor-not-allowed opacity-70' : ''}
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
            
            {selectedFile && uploadStatus !== 'idle' && (
              <p className="text-sm text-gray-600">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          
          {uploadStatus === 'parsing' && (
            <div className="w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                Enhanced Parser: {Math.round(progress)}%
              </p>
            </div>
          )}
          
          {uploadStatus === 'idle' && (
            <Button variant="outline">
              .rep Datei auswählen
            </Button>
          )}
          
          {uploadStatus === 'error' && (
            <Button 
              onClick={() => {
                setUploadStatus('idle');
                setSelectedFile(null);
              }}
              variant="outline"
            >
              Erneut versuchen
            </Button>
          )}
        </div>
      </div>
      
      {uploadStatus === 'idle' && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Enhanced Parser für StarCraft: Remastered .rep Dateien
          </p>
        </div>
      )}
    </div>
  );
};

export default ReplayUpload;
