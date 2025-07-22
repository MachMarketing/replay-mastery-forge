
import React, { useState } from 'react';
import { useEnhancedReplayParser, type EnhancedReplayData } from '@/hooks/useEnhancedReplayParser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import ProAnalysisDashboard from '@/components/analysis/ProAnalysisDashboard';

const UploadPage: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<EnhancedReplayData | null>(null);
  const { parseReplay, isLoading } = useEnhancedReplayParser();

  const handleUploadComplete = async (file: File) => {
    console.log('[UploadPage] Starting enhanced replay analysis for:', file.name);
    
    const result = await parseReplay(file);
    
    console.log('[UploadPage] Enhanced parsing result:', {
      success: result.success,
      playerName: result.playerName,
      playerRace: result.playerRace,
      opponentName: result.opponentName,
      opponentRace: result.opponentRace,
      mapName: result.mapName,
      apm: result.apm,
      buildOrderLength: result.buildOrder.length
    });
    
    setAnalysisData(result);
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            SC:R Pro Analyzer
          </h1>
          <p className="text-center text-muted-foreground mb-2 text-lg">
            Von Beginner zu Pro • Echte SC:R Datenanalyse • KI-gestützte Verbesserungen
          </p>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Analysiere deine StarCraft: Remastered Replays mit bewährter screp-js Engine
          </p>
          
          {analysisData ? (
            <div className="space-y-8">
              <ProAnalysisDashboard data={analysisData} />
              
              <div className="text-center pt-6 border-t">
                <button 
                  onClick={() => setAnalysisData(null)}
                  className="text-primary hover:underline text-lg font-medium"
                >
                  ← Neue Replay analysieren
                </button>
              </div>
            </div>
          ) : (
            <UploadBox onUploadComplete={handleUploadComplete} isLoading={isLoading} />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UploadPage;
