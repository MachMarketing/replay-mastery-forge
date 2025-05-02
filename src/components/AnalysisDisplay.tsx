
import React from 'react';
import { Loader2, UploadIcon } from 'lucide-react';
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
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr') || normalizedRace.includes('t')) return 'Terran';
    if (normalizedRace.includes('prot') || normalizedRace.includes('p')) return 'Protoss';
    if (normalizedRace.includes('zerg') || normalizedRace.includes('z')) return 'Zerg';
    return 'Terran'; 
  };

  if (isAnalyzing) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-card rounded-lg border shadow-md">
        <div className="text-center max-w-md p-6">
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto">
              <Loader2 className="w-20 h-20 animate-spin text-primary" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs font-semibold text-primary">
                {Math.round(Math.random() * 100)}%
              </div>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2">Analyzing your replay...</h3>
          <p className="text-muted-foreground mb-4">
            Our AI is deeply analyzing your gameplay patterns, build order, and strategic decisions.
          </p>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground flex items-center">
              <div className="w-4 h-4 mr-2 flex-shrink-0">
                <span className="animate-pulse">⌛</span>
              </div>
              <span>Extracting replay data...</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center">
              <div className="w-4 h-4 mr-2 flex-shrink-0">
                <span className="animate-pulse">⚙️</span>
              </div>
              <span>Analyzing build order...</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center">
              <div className="w-4 h-4 mr-2 flex-shrink-0">
                <span className="animate-pulse">🧠</span>
              </div>
              <span>Generating coaching insights...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (analysisComplete && replayData) {
    return (
      <>
        {/* Player Selector */}
        <PlayerSelector 
          player1={rawParsedData?.playerName || 'Player'} 
          player2={rawParsedData?.opponentName || 'Opponent'}
          race1={normalizeRace(rawParsedData?.playerRace || 'Terran')}
          race2={normalizeRace(rawParsedData?.opponentRace || 'Terran')}
          selectedPlayerIndex={selectedPlayerIndex}
          onSelectPlayer={onPlayerSelect}
        />
        
        <div className="mt-4">
          <AnalysisResult data={replayData} isPremium={isPremium} />
        </div>
      </>
    );
  }
  
  return (
    <div className="h-96 flex flex-col items-center justify-center bg-secondary/20 rounded-lg border border-dashed border-border shadow-inner">
      <div className="text-center max-w-md p-6">
        <div className="w-16 h-16 bg-secondary/40 rounded-full mx-auto mb-4 flex items-center justify-center">
          <UploadIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-medium mb-2">No Replay Selected</h3>
        <p className="text-muted-foreground">
          Upload a replay file to see your personalized analysis here
        </p>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
