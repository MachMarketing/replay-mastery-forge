
import React, { useState } from 'react';
import { useEnhancedReplayParser } from '@/hooks/useEnhancedReplayParser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import { AnalysisResult } from '@/components/AnalysisResult';
import { EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';

const UploadPage: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<EnhancedReplayResult | null>(null);

  const handleUploadComplete = async (file: File, replayData: EnhancedReplayResult) => {
    console.log('[UploadPage] Received enhanced replay data:', {
      playerCount: replayData.players.length,
      mapName: replayData.header.mapName,
      dataQuality: replayData.dataQuality.reliability,
      extractionMethod: replayData.dataQuality.source,
      commandsExtracted: replayData.dataQuality.commandsExtracted,
      buildOrdersCount: Object.values(replayData.enhancedBuildOrders).reduce((sum, bo) => sum + bo.length, 0)
    });
    
    setAnalysisData(replayData);
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Enhanced Replay Master Forge
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Analysiere deine StarCraft: Remastered Replays mit Enhanced Data Mapping für echte Gameplay-Insights
          </p>
          
          {analysisData ? (
            <div className="space-y-6">
              <AnalysisResult replayData={analysisData} onReset={() => setAnalysisData(null)} />
              <div className="text-center">
                <button 
                  onClick={() => setAnalysisData(null)}
                  className="text-primary hover:underline"
                >
                  Neue Enhanced Replay analysieren
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
