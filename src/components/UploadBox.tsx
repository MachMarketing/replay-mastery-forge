
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ParsedReplayResult, AnalyzedReplayResult } from '@/services/replayParserService';
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
  const { toast } = useToast();
  const { parseReplay, isProcessing, error: parsingError, clearError } = useReplayParser();
  
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
    setStatusMessage('Preparing replay file...');
    
    try {
      // Show initial progress
      setProgress(10);
      
      // Start parsing phase immediately
      setUploadStatus('parsing');
      setStatusMessage('Parsing replay in browser...');
      setProgress(30);
      
      // Parse the file with browser-based parser
      console.log('[UploadBox] Starting parsing with browser parser:', file.name);
      const parsedData = await parseReplay(file);
      console.log('[UploadBox] Parser response:', parsedData);
      
      if (!parsedData) {
        throw new Error(parsingError || 'Failed to parse replay file');
      }
      
      // Advance progress to show near completion
      setProgress(90);
      
      // Complete the upload
      setProgress(100);
      setUploadStatus('success');
      
      toast({
        title: "Analysis Complete",
        description: `${file.name} has been successfully parsed and analyzed.`,
      });
      
      // Use the actual parsed data instead of fallback/dummy data
      if (onUploadComplete && parsedData) {
        console.log('[UploadBox] Sending parsed data to parent component:', parsedData);
        onUploadComplete(file, parsedData);
      }
    } catch (error) {
      console.error('[UploadBox] Error processing file:', error);
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to parse replay file');
      
      if (!parsingError) {
        toast({
          title: "Processing Failed",
          description: error instanceof Error ? error.message : "Failed to parse replay file",
          variant: "destructive",
        });
      }
    }
  };

  const handleCancel = () => {
    setFile(null);
    setProgress(0);
    setUploadStatus('idle');
    setStatusMessage('');
    clearError();
  };

  const handleRetry = () => {
    if (file) {
      processFile(file);
    } else {
      handleCancel();
    }
  };

  // Display the error state that matches the design in the image
  const renderFileError = () => {
    if (uploadStatus === 'error' && file) {
      return (
        <div className="mt-4 p-4 bg-opacity-10 bg-destructive border border-destructive/40 rounded-md">
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertCircle className="h-4 w-4" />
            <p className="font-medium">{statusMessage || 'Failed to parse replay file'}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Please try again or contact support if the issue persists.
          </p>
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center" 
              onClick={handleRetry}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Try Again
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-muted-foreground" 
              onClick={handleCancel}
            >
              Cancel
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
          
          {/* Parser status indicator */}
          <div className="mt-4 flex items-center">
            <div className="h-2 w-2 rounded-full mr-2 bg-green-500" />
            <p className="text-xs text-muted-foreground">
              Browser Parser Ready
            </p>
          </div>
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
                  {uploadStatus === 'uploading' ? 'Preparing...' : 'Parsing replay...'}
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
                Analysis complete
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your replay has been analyzed and is ready to view.
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
