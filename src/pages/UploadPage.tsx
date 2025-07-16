
import React, { useState } from 'react';
import { useEnhancedReplayParser } from '@/hooks/useEnhancedReplayParser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import { HybridParsingResult } from '@/hooks/useHybridReplayParser';
import ProAnalysisDashboard from '@/components/analysis/ProAnalysisDashboard';
import ReplayComparisonTool from '@/components/analysis/ReplayComparisonTool';

const UploadPage: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<HybridParsingResult | null>(null);

  const handleUploadComplete = async (file: File, replayData: HybridParsingResult) => {
    console.log('[UploadPage] Received hybrid parsing result:', {
      playerCount: replayData.metadata.players.length,
      mapName: replayData.metadata.header.mapName,
      hasServerAnalysis: !!replayData.serverAnalysis,
      replayId: replayData.replayId
    });
    
    setAnalysisData(replayData);
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
              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-4">Analyse Ergebnis</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Map:</h3>
                    <p>{analysisData.metadata.header.mapName}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Spieler:</h3>
                    <p>{analysisData.metadata.players.map(p => `${p.name} (${p.race})`).join(' vs ')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Server Analyse:</h3>
                    <p>{analysisData.serverAnalysis ? 'Verfügbar' : 'Nur Metadaten'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Replay ID:</h3>
                    <p className="text-sm text-muted-foreground">{analysisData.replayId}</p>
                  </div>
                </div>
              </div>
              
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
            <UploadBox onUploadComplete={handleUploadComplete} />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UploadPage;
