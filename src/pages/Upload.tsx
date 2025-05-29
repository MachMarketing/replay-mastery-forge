
/**
 * Main upload page - clean and focused
 */

import React, { useState } from 'react';
import ReplayUpload from '@/components/ReplayUpload';
import ReplayResults from '@/components/ReplayResults';
import { RemasteredReplayData } from '@/services/replayParser/scRemasteredParser';

const Upload: React.FC = () => {
  const [replayData, setReplayData] = useState<RemasteredReplayData | null>(null);

  const handleParseComplete = (data: RemasteredReplayData) => {
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
            StarCraft: Remastered Replay Parser
          </h1>
          <p className="text-gray-600">
            Lade deine .rep Datei hoch für eine detaillierte Analyse
          </p>
        </div>

        {!replayData ? (
          <ReplayUpload onParseComplete={handleParseComplete} />
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Replay Analyse</h2>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Neue Analyse
              </button>
            </div>
            <ReplayResults data={replayData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
