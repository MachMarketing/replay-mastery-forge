
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadBoxProps {
  onUploadComplete?: (file: File) => void;
  maxFileSize?: number; // in MB
}

const UploadBox: React.FC<UploadBoxProps> = ({ onUploadComplete, maxFileSize = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  
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

  const processFile = (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    setFile(file);
    setUploadStatus('uploading');
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Simulate a small delay at 100% for better UX
        setTimeout(() => {
          setUploadStatus('success');
          if (onUploadComplete) {
            onUploadComplete(file);
          }
          
          toast({
            title: "Upload Complete",
            description: `${file.name} has been successfully uploaded.`,
          });
        }, 500);
      }
      setProgress(progress);
    }, 200);
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
          <Button onClick={handleButtonClick} variant="outline">Select File</Button>
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
            {uploadStatus === 'uploading' && (
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
          
          {uploadStatus === 'uploading' && (
            <>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-right mt-1 text-muted-foreground">
                {Math.round(progress)}%
              </p>
            </>
          )}
          
          {uploadStatus === 'success' && (
            <div className="mt-2">
              <p className="text-sm text-strength flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Upload complete
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your replay is being analyzed...
              </p>
            </div>
          )}
          
          {uploadStatus === 'error' && (
            <div className="mt-2">
              <p className="text-sm text-weakness flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                Upload failed
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try again or contact support if the issue persists.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={handleCancel}>
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
