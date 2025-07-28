
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReplayUploadProps {
  onParseComplete: (data: any) => void;
}

const ReplayUpload: React.FC<ReplayUploadProps> = ({ onParseComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseStatus, setParseStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    console.log('[ReplayUpload] File selected:', file.name, file.size);

    // Validate file
    if (!file.name.toLowerCase().endsWith('.rep')) {
      toast.error('Please upload a .rep replay file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setIsUploading(true);
    setParseStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      setParseStatus('parsing');
      toast.info('Parsing StarCraft Remastered replay...');

      // Call the enhanced parseReplay edge function
      const formData = new FormData();
      formData.append('replayFile', file);

      console.log('[ReplayUpload] Calling parseReplay edge function...');
      
      const { data, error } = await supabase.functions.invoke('parseReplayScreparsed', {
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        console.error('[ReplayUpload] Parse error:', error);
        throw new Error(error.message || 'Failed to parse replay');
      }

      if (!data || !data.success) {
        console.error('[ReplayUpload] Parse failed:', data);
        throw new Error(data?.error || 'Parsing failed');
      }

      console.log('[ReplayUpload] Parse successful:', data);
      
      setParseStatus('success');
      toast.success('Replay parsed successfully!');
      
      // Pass the parsed data to parent component
      onParseComplete(data);

    } catch (error) {
      console.error('[ReplayUpload] Upload/parse error:', error);
      
      setParseStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(errorMsg);
      toast.error(`Parse failed: ${errorMsg}`);
    } finally {
      setIsUploading(false);
    }
  }, [onParseComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.rep'],
      'application/x-binary': ['.rep']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  const resetUpload = () => {
    setParseStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
  };

  if (parseStatus === 'success') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Replay Parsed Successfully! ✅
            </h3>
            <p className="text-green-700 mb-4">
              Your StarCraft Remastered replay has been analyzed. Check the analysis results below.
            </p>
            <Button onClick={resetUpload} variant="outline">
              Upload Another Replay
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${isUploading ? 'cursor-not-allowed opacity-50' : 'hover:border-primary hover:bg-primary/5'}
          `}
        >
          <input {...getInputProps()} />
          
          {parseStatus === 'idle' && (
            <>
              <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Upload StarCraft Remastered Replay</h3>
              <p className="text-muted-foreground mb-4">
                {isDragActive
                  ? 'Drop your .rep file here...'
                  : 'Drag & drop your .rep file here, or click to select'}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports SC: Remastered .rep files (max 10MB)
              </p>
            </>
          )}

          {(parseStatus === 'uploading' || parseStatus === 'parsing') && (
            <>
              <Loader2 className="mx-auto mb-4 h-12 w-12 text-primary animate-spin" />
              <h3 className="text-lg font-semibold mb-2">
                {parseStatus === 'uploading' ? 'Uploading...' : 'Parsing Replay...'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {parseStatus === 'uploading' 
                  ? 'Uploading your replay file...'
                  : 'Analyzing StarCraft Remastered commands and build orders...'}
              </p>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">{uploadProgress}%</p>
            </>
          )}

          {parseStatus === 'error' && (
            <>
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
              <h3 className="text-lg font-semibold text-destructive mb-2">Parse Failed</h3>
              <p className="text-muted-foreground mb-4">{errorMessage}</p>
              <Button onClick={resetUpload} variant="outline" size="sm">
                Try Again
              </Button>
            </>
          )}
        </div>

        {parseStatus === 'idle' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold">Professional SC:R Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Get detailed build order analysis, APM/EAPM calculation, and AI-powered coaching recommendations
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Remastered Compatible</h4>
                <p className="text-sm text-muted-foreground">
                  Full support for modern SC:R replay format with enhanced binary parsing
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReplayUpload;
