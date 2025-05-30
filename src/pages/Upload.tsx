
import React, { useState } from 'react';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';
import ReplayUpload from '@/components/ReplayUpload';
import { ReplayAnalysisDisplay } from '@/components/ReplayAnalysisDisplay';
import { EnhancedParserDebug } from '@/components/EnhancedParserDebug';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Upload: React.FC = () => {
  const [replayData, setReplayData] = useState<EnhancedReplayResult | null>(null);

  const handleParseComplete = (data: EnhancedReplayResult) => {
    setReplayData(data);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          StarCraft: Remastered Replay Analyzer
        </h1>
        <p className="text-lg text-muted-foreground">
          Enhanced Parser mit EAPM-Analyse und detaillierter Command-Interpretation
        </p>
      </div>

      {!replayData ? (
        <ReplayUpload onParseComplete={handleParseComplete} />
      ) : (
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">Replay Analyse</TabsTrigger>
            <TabsTrigger value="debug">Parser Debug</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis">
            <ReplayAnalysisDisplay replayData={replayData} />
          </TabsContent>
          
          <TabsContent value="debug">
            <EnhancedParserDebug enhancedData={replayData} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Upload;
