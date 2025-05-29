
import React, { useState } from 'react';
import ReplayUpload from '@/components/ReplayUpload';
import ReplayResults from '@/components/ReplayResults';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';

const Upload: React.FC = () => {
  const [replayData, setReplayData] = useState<EnhancedReplayResult | null>(null);

  const handleParseComplete = (data: EnhancedReplayResult) => {
    console.log('[Upload] Received Enhanced replay data:', data);
    setReplayData(data);
  };

  const handleReset = () => {
    setReplayData(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Enhanced StarCraft: Remastered Replay Parser
          </h1>
          <p className="text-gray-600">
            Lade deine .rep Datei hoch für eine Enhanced Analyse mit Hex-Command-Extraktion
          </p>
        </div>

        {!replayData ? (
          <ReplayUpload onParseComplete={handleParseComplete} />
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Enhanced Replay Analyse</h2>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Neue Enhanced Analyse
              </button>
            </div>
            <ReplayResults data={replayData as any} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
