
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useReplayParser } from '@/hooks/useReplayParser';
import { FinalReplayResult } from '@/services/nativeReplayParser/screpJsParser';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReplayUploadProps {
  onParseComplete: (data: FinalReplayResult) => void;
}

const ReplayUpload: React.FC<ReplayUploadProps> = ({ onParseComplete }) => {
  const { parseReplay, isLoading, error, progress } = useReplayParser();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.rep')) {
      console.error('Invalid file type. Please select a .rep file.');
      return;
    }

    try {
      console.log('[ReplayUpload] Starting parsing with screp-js only:', file.name);
      const result = await parseReplay(file);
      onParseComplete(result);
      console.log('[ReplayUpload] Parse complete, calling onParseComplete');
    } catch (err) {
      console.error('[ReplayUpload] Parse error:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <Upload className="mx-auto h-16 w-16 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">StarCraft: Remastered Replay Upload</h2>
        <p className="text-muted-foreground">
          Powered by screp-js für präzise Analyse aller .rep Files
        </p>
      </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="text-lg font-medium">Parsing mit screp-js...</div>
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-muted-foreground">
              Analysiere Replay-Daten ({progress}%)
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg text-gray-600">
              Wähle eine .rep Datei aus
            </p>
            <Input
              type="file"
              accept=".rep"
              onChange={handleFileUpload}
              className="max-w-xs mx-auto"
              disabled={isLoading}
            />
            <Button
              onClick={() => document.querySelector('input[type="file"]')?.click()}
              disabled={isLoading}
              className="mx-auto"
            >
              Replay hochladen
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-muted-foreground text-center">
        <p>✅ Unterstützt alle StarCraft: Remastered .rep Dateien</p>
        <p>✅ Präzise APM/EAPM Berechnung mit screp-js</p>
        <p>✅ Detaillierte Build Order Analyse</p>
      </div>
    </div>
  );
};

export default ReplayUpload;
