
import React, { useState } from 'react';
import { JssuhReplayResult } from '@/services/nativeReplayParser/jssuhParser';
import ReplayUpload from '@/components/ReplayUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Upload: React.FC = () => {
  const [replayData, setReplayData] = useState<JssuhReplayResult | null>(null);

  const handleParseComplete = (data: JssuhReplayResult) => {
    console.log('[Upload] screp-core parse complete received:', data);
    setReplayData(data);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          StarCraft: Remastered Replay Analyzer
        </h1>
        <p className="text-lg text-muted-foreground">
          Vollständige screp-core Implementation • Command-Extraktion • Build Order Analyse
        </p>
      </div>

      {!replayData ? (
        <ReplayUpload onParseComplete={handleParseComplete} />
      ) : (
        <div className="space-y-6">
          <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
            <h2 className="text-xl font-bold mb-2 text-primary">Parsing Erfolgreich! ✅</h2>
            <p className="text-muted-foreground mb-4">
              Deine Replay wurde erfolgreich geparst. Für die vollständige Pro-Analyse gehe zur Upload-Seite.
            </p>
            <a 
              href="/upload" 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              🚀 Pro-Analyse ansehen
            </a>
          </div>
          
          <details className="bg-muted/30 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer mb-4">Raw JSON Debug Data (für Entwickler)</summary>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(replayData, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default Upload;
