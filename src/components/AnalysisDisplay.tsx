
import React, { useEffect } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { AnalyzedReplayResult } from '@/services/replayParserService';
import AnalysisResult from '@/components/AnalysisResult';
import PlayerSelector from '@/components/PlayerSelector';

interface AnalysisDisplayProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  replayData: any | null;
  rawParsedData: AnalyzedReplayResult | null;
  selectedPlayerIndex: number;
  isPremium: boolean;
  onPlayerSelect: (playerIndex: number) => void;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({
  isAnalyzing,
  analysisComplete,
  replayData,
  rawParsedData,
  selectedPlayerIndex,
  isPremium,
  onPlayerSelect
}) => {
  // Helper function for race normalization
  const normalizeRace = (race: string): 'Terran' | 'Protoss' | 'Zerg' => {
    if (!race) return 'Terran';
    const normalizedRace = race.toLowerCase() || '';
    if (normalizedRace.includes('terr') || normalizedRace.includes('t')) return 'Terran';
    if (normalizedRace.includes('prot') || normalizedRace.includes('p')) return 'Protoss';
    if (normalizedRace.includes('zerg') || normalizedRace.includes('z')) return 'Zerg';
    return 'Terran'; 
  };

  // Log data for debugging purposes
  useEffect(() => {
    console.log('AnalysisDisplay - State:', { 
      isAnalyzing, 
      analysisComplete, 
      hasReplayData: !!replayData, 
      hasRawData: !!rawParsedData,
      selectedPlayerIndex,
      rawParsedDataKeys: rawParsedData ? Object.keys(rawParsedData) : 'none'
    });
  }, [isAnalyzing, analysisComplete, replayData, rawParsedData, selectedPlayerIndex]);

  if (isAnalyzing) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-black/5 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg">
        <div className="text-center max-w-md p-6">
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto">
              <Loader2 className="w-24 h-24 animate-spin text-primary" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm font-bold text-primary">
                {Math.round(Math.random() * 100)}%
              </div>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-4">Analysiere dein Replay...</h3>
          <p className="text-muted-foreground mb-6">
            Unsere KI analysiert detailliert deine Spielmuster, Build-Order und strategischen Entscheidungen.
          </p>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground flex items-center">
              <div className="w-5 h-5 mr-2 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="animate-pulse">⌛</span>
              </div>
              <span>Extrahiere Replay-Daten...</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center">
              <div className="w-5 h-5 mr-2 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="animate-pulse">⚙️</span>
              </div>
              <span>Analysiere Build-Order...</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center">
              <div className="w-5 h-5 mr-2 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="animate-pulse">🧠</span>
              </div>
              <span>Generiere Coaching-Erkenntnisse...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show analysis results if data is available and analysis is complete
  if ((replayData || rawParsedData) && analysisComplete) {
    console.log('Zeige Analyseergebnis mit Daten:', replayData || rawParsedData);
    
    // Use either replayData or create a compatible object from rawParsedData
    const displayData = replayData || {
      ...rawParsedData,
      id: crypto.randomUUID(), // Add required id field if using rawParsedData
      // Ensure all required fields have values
      strengths: rawParsedData?.strengths || ['Gute mechanische Fähigkeiten'],
      weaknesses: rawParsedData?.weaknesses || ['Könnte Scouting verbessern'],
      recommendations: rawParsedData?.recommendations || ['Übe Build-Order Timings'],
      trainingPlan: rawParsedData?.trainingPlan || []
    };
    
    return (
      <>
        {/* Player Selector */}
        <PlayerSelector 
          player1={rawParsedData?.playerName || displayData?.playerName || 'Spieler'} 
          player2={rawParsedData?.opponentName || displayData?.opponentName || 'Gegner'}
          race1={normalizeRace(rawParsedData?.playerRace || displayData?.playerRace || 'Terran')}
          race2={normalizeRace(rawParsedData?.opponentRace || displayData?.opponentRace || 'Terran')}
          selectedPlayerIndex={selectedPlayerIndex}
          onSelectPlayer={onPlayerSelect}
        />
        
        <div className="mt-4">
          <AnalysisResult data={displayData} isPremium={isPremium} />
        </div>
      </>
    );
  }
  
  // Default fallback state when no data is available
  console.log('Zeige Upload-Platzhalter');
  return (
    <div className="h-96 flex flex-col items-center justify-center bg-card/30 backdrop-blur-sm rounded-lg border border-dashed border-border shadow-inner">
      <div className="text-center max-w-md p-6">
        <div className="w-20 h-20 bg-secondary/40 rounded-full mx-auto mb-6 flex items-center justify-center">
          <Upload className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-3">Kein Replay ausgewählt</h3>
        <p className="text-muted-foreground">
          Lade ein Replay hoch, um deine personalisierte Analyse hier zu sehen
        </p>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
