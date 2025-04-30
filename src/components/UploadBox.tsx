
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { parseReplayFile, ParsedReplayResult } from '@/services/replayParserService';

interface UploadBoxProps {
  onUploadComplete?: (file: File, replayData: ParsedReplayResult) => void;
  maxFileSize?: number; // in MB
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete, maxFileSize = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
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
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxFileSize}MB`,
        variant: "destructive",
      });
      return false;
    }

    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'rep') {
      toast({
        title: "Invalid file type",
        description: "Only StarCraft replay files (.rep) are allowed",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const processFile = async (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    setFile(file);
    setUploadStatus('uploading');
    setStatusMessage('Uploading replay file...');
    
    try {
      // First step: Upload the file to storage
      setProgress(0);
      let uploadProgress = 0;
      const interval = setInterval(() => {
        uploadProgress += Math.random() * 10;
        if (uploadProgress >= 100) {
          uploadProgress = 100;
          clearInterval(interval);
        }
        setProgress(uploadProgress);
      }, 200);

      // Parse the file with Go parser
      setUploadStatus('parsing');
      setStatusMessage('Parsing replay with Go parser...');
      setProgress(0);
      
      // Start progress animation for parsing phase
      let parsingProgress = 0;
      const parsingInterval = setInterval(() => {
        parsingProgress += Math.random() * 5;
        if (parsingProgress >= 100) {
          parsingProgress = 100;
          clearInterval(parsingInterval);
        }
        setProgress(parsingProgress);
      }, 300);
      
      // Parse the file with Go parser
      console.log('UploadBox: sending to Go parser', file.name);
      const parsedData = await parseReplayFile(file);
      console.log('UploadBox: parser response', parsedData);
      
      clearInterval(parsingInterval);
      
      if (!parsedData) {
        throw new Error('Failed to parse replay file');
      }
      
      // Success state
      setProgress(100);
      setUploadStatus('success');
      
      toast({
        title: "Upload Complete",
        description: `${file.name} has been successfully parsed and analyzed.`,
      });
      
      if (onUploadComplete && parsedData) {
        onUploadComplete(file, parsedData);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : 'Failed to process replay file',
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFile(null);
    setProgress(0);
    setUploadStatus('idle');
    setStatusMessage('');
  };

  return (
    <div className="w-full">
      {uploadStatus === 'idle' ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-all ${
            isDragging 
              ? 'border-primary bg-primary/10 upload-pulse' 
              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }`}
        >
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Upload your replay file</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Drag and drop your .rep file here, or click to browse
          </p>
          <Button onClick={open} variant="outline">Select File</Button>
          <input
            {...getInputProps()}
            accept=".rep"
          />
          <p className="text-xs text-muted-foreground mt-4">
            Max file size: {maxFileSize}MB | Supported format: .rep
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-3 text-primary" />
              <div>
                <p className="font-medium truncate max-w-[200px] sm:max-w-md">{file?.name}</p>
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
              <CheckCircle className="h-5 w-5 text-strength" />
            )}
            {uploadStatus === 'error' && (
              <AlertCircle className="h-5 w-5 text-weakness" />
            )}
          </div>
          
          {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
            <>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Parsing with Go parser...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(progress)}%
                </p>
              </div>
            </>
          )}
          
          {uploadStatus === 'success' && (
            <div className="mt-2">
              <p className="text-sm text-strength flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Analysis complete
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your replay has been analyzed and is ready to view.
              </p>
            </div>
          )}
          
          {uploadStatus === 'error' && (
            <div className="mt-2">
              <p className="text-sm text-weakness flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {statusMessage || 'Parsing failed'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try again or contact support if the issue persists.
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2" 
                onClick={handleCancel}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadBox;
