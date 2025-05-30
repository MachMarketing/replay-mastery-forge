
import React, { useState } from 'react';
import { FinalReplayResult } from '@/services/nativeReplayParser/screpJsParser';
import ReplayUpload from '@/components/ReplayUpload';
import { ReplayAnalysisDisplay } from '@/components/ReplayAnalysisDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Upload: React.FC = () => {
  const [replayData, setReplayData] = useState<FinalReplayResult | null>(null);

  const handleParseComplete = (data: FinalReplayResult) => {
    console.log('[Upload] Parse complete received:', data);
    setReplayData(data);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          StarCraft: Remastered Replay Analyzer
        </h1>
        <p className="text-lg text-muted-foreground">
          Präzise Analyse mit screp-js • Echte EAPM-Berechnung • Detaillierte Gameplay-Insights
        </p>
      </div>

      {!replayData ? (
        <ReplayUpload onParseComplete={handleParseComplete} />
      ) : (
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="analysis">Replay Analyse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis">
            <ReplayAnalysisDisplay replayData={replayData} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Upload;
