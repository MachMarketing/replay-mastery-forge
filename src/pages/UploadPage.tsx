
import React, { useState } from 'react';
import { useReplayParser } from '@/hooks/useReplayParser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import { AnalysisResult } from '@/components/AnalysisResult';
import { EnhancedReplayData } from '@/services/nativeReplayParser/enhancedScrepWrapper';

const UploadPage: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<EnhancedReplayData | null>(null);
  const { parseFile } = useReplayParser();

  const handleUploadComplete = async (file: File, replayData: EnhancedReplayData) => {
    console.log('[UploadPage] Received enhanced replay data:', {
      playerCount: replayData.players.length,
      mapName: replayData.header.mapName,
      hasDetailedActions: replayData.enhanced.hasDetailedActions,
      extractionMethod: replayData.enhanced.extractionMethod,
      buildOrdersCount: replayData.computed.buildOrders.reduce((sum, bo) => sum + bo.length, 0)
    });
    
    setAnalysisData(replayData);
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Replay Master Forge
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Analysiere deine StarCraft: Brood War Replays für professionelle Insights
          </p>
          
          {analysisData ? (
            <div className="space-y-6">
              <AnalysisResult replayData={analysisData} onReset={() => setAnalysisData(null)} />
              <div className="text-center">
                <button 
                  onClick={() => setAnalysisData(null)}
                  className="text-primary hover:underline"
                >
                  Neue Replay analysieren
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
