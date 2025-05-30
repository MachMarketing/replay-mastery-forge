
import React, { useState } from 'react';
import { NewFinalReplayResult } from '@/services/nativeReplayParser/newScrepParser';
import ReplayUpload from '@/components/ReplayUpload';
import { ReplayAnalysisDisplay } from '@/components/ReplayAnalysisDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Upload: React.FC = () => {
  const [replayData, setReplayData] = useState<NewFinalReplayResult | null>(null);

  const handleParseComplete = (data: NewFinalReplayResult) => {
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
            <ReplayAnalysisDisplay replayData={replayData} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Upload;
