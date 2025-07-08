
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
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="analysis">screp-core Replay Analyse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis">
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4">jssuh Parser Ergebnisse</h2>
              <pre className="bg-muted p-4 rounded overflow-auto text-sm">
                {JSON.stringify(replayData, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Upload;
