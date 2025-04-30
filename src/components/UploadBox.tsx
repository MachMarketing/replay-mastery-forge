
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { parseReplayFile } from '@/services/replayParserService';
import type { ParsedReplayData } from '@/services/replayParser/types';
import { useReplayParser } from '@/hooks/useReplayParser';
import { uploadReplayFile, saveReplayMetadata } from '@/services/uploadService';

interface UploadBoxProps {
  onUploadComplete?: (file: File, replayData: ParsedReplayData) => void;
  maxFileSize?: number; // in MB
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete, maxFileSize = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const { toast } = useToast();
  const { parseReplay } = useReplayParser();
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

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

      // Upload file to storage
      const { error, data } = await uploadReplayFile(file);
      
      clearInterval(interval);
      
      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      // Second step: Parse the replay file using jssuh
      setUploadStatus('parsing');
      setStatusMessage('Parsing replay with jssuh...');
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
      
      // Parse the file with jssuh
      const { parsedData, analysis } = await parseReplay(file);
      
      clearInterval(parsingInterval);
      
      if (!parsedData) {
        throw new Error('Failed to parse replay file');
      }

      // Add analysis data to the parsed data for easier access
      const enrichedData = {
        ...parsedData,
        analysis
      };
      
      // Third step: Save the metadata to the database
      if (data?.filename && data?.path) {
        await saveReplayMetadata(data.filename, file.name, {
          playerName: parsedData.playerName,
          opponentName: parsedData.opponentName,
          playerRace: parsedData.playerRace,
          opponentRace: parsedData.opponentRace,
          map: parsedData.map,
          duration: parsedData.duration,
          date: parsedData.date,
          result: parsedData.result,
          apm: parsedData.apm,
          eapm: parsedData.eapm,
          matchup: parsedData.matchup
        });
      }
      
      // Success state
      setProgress(100);
      setUploadStatus('success');
      
      toast({
        title: "Upload Complete",
        description: `${file.name} has been successfully parsed and analyzed.`,
      });
      
      if (onUploadComplete && parsedData) {
        onUploadComplete(file, enrichedData);
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      processFile(selectedFile);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-all ${
            isDragging 
              ? 'border-primary bg-primary/10 upload-pulse' 
              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Upload your replay file</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Drag and drop your .rep file here, or click to browse
          </p>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline">Select File</Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".rep"
            onChange={handleFileChange}
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
                onClick={() => {
                  setFile(null);
                  setProgress(0);
                  setUploadStatus('idle');
                  setStatusMessage('');
                }}
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
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Parsing with jssuh...'}
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
                onClick={() => {
                  setFile(null);
                  setProgress(0);
                  setUploadStatus('idle');
                  setStatusMessage('');
                }}
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
