
import React, { useState } from 'react';
import { useEnhancedReplayParser } from '@/hooks/useEnhancedReplayParser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import { AnalysisResult } from '@/components/AnalysisResult';
import { NewFinalReplayResult } from '@/services/nativeReplayParser/newScrepParser';

const UploadPage: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<NewFinalReplayResult | null>(null);

  const handleUploadComplete = async (file: File, replayData: NewFinalReplayResult) => {
    console.log('[UploadPage] Received screp-core replay data:', {
      playerCount: replayData.players.length,
      mapName: replayData.header.mapName,
      dataQuality: replayData.dataQuality.reliability,
      extractionMethod: replayData.dataQuality.source,
      commandsExtracted: replayData.dataQuality.commandsFound,
      buildOrdersCount: Object.values(replayData.buildOrders).reduce((sum, bo) => sum + bo.length, 0)
    });
    
    setAnalysisData(replayData);
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            screp-core Replay Master Forge
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Analysiere deine StarCraft: Remastered Replays mit vollständiger screp-core Implementation für echte Build Orders und Gameplay-Insights
          </p>
          
          {analysisData ? (
            <div className="space-y-6">
              <AnalysisResult replayData={analysisData} onReset={() => setAnalysisData(null)} />
              <div className="text-center">
                <button 
                  onClick={() => setAnalysisData(null)}
                  className="text-primary hover:underline"
                >
                  Neue screp-core Replay analysieren
                </button>
              </div>
            </div>
          ) : (
            <UploadBox onUploadComplete={handleUploadComplete} />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UploadPage;
