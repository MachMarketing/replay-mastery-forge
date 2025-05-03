
import React, { useEffect } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { AnalyzedReplayResult } from '@/services/replayParserService';
import AnalysisResult from '@/components/AnalysisResult';
import PlayerSelector from '@/components/PlayerSelector';
import { standardizeRaceName } from '@/lib/replayUtils';

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
  // Debug rendering state
  useEffect(() => {
    console.log('💡 AnalysisDisplay - Component mounted');
    
    return () => {
      console.log('💡 AnalysisDisplay - Component unmounted');
    };
  }, []);
  
  // Log data for debugging purposes with better visibility
  useEffect(() => {
    console.log('💡 AnalysisDisplay - Props received:', { 
      isAnalyzing, 
      analysisComplete, 
      hasReplayData: !!replayData, 
      hasRawData: !!rawParsedData,
      selectedPlayerIndex
    });
    
    if (replayData) {
      console.log('💡 AnalysisDisplay - ReplayData:', replayData);
      
      // Check for essential data
      if (!replayData.strengths || replayData.strengths.length === 0) {
        console.warn('⚠️ AnalysisDisplay - Missing strengths in replayData');
      }
      if (!replayData.playerName) {
        console.warn('⚠️ AnalysisDisplay - Missing playerName in replayData');
      }
      
      // Log race information for debugging
      console.log('💡 AnalysisDisplay - Player race data:', {
        raw: replayData.playerRace,
        normalized: standardizeRaceName(replayData.playerRace)
      });
      console.log('💡 AnalysisDisplay - Opponent race data:', {
        raw: replayData.opponentRace,
        normalized: standardizeRaceName(replayData.opponentRace)
      });
    }
    
    if (rawParsedData) {
      console.log('💡 AnalysisDisplay - RawParsedData available with keys:', Object.keys(rawParsedData));
      
      // Log race information from raw data
      console.log('💡 AnalysisDisplay - Raw player race:', rawParsedData.playerRace);
      console.log('💡 AnalysisDisplay - Raw opponent race:', rawParsedData.opponentRace);
    }

    // Log render decision criteria
    console.log('💡 AnalysisDisplay - Render decision:', {
      shouldShowAnalysis: analysisComplete && (!!replayData || !!rawParsedData),
      shouldShowLoading: isAnalyzing,
      shouldShowPlaceholder: !isAnalyzing && (!analysisComplete || (!replayData && !rawParsedData))
    });
  }, [isAnalyzing, analysisComplete, replayData, rawParsedData, selectedPlayerIndex]);

  // -- Render Logic --

  // 1. Show loading state while analyzing
  if (isAnalyzing) {
    console.log('💡 AnalysisDisplay - Rendering loading state');
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
  
  // 2. Show analysis results if analysis is complete AND we have data
  if (analysisComplete && (replayData || rawParsedData)) {
    console.log('💡 AnalysisDisplay - Rendering analysis results');
    
    // Use either replayData or create a compatible object from rawParsedData
    let displayData = replayData;
    
    // If we don't have processed replayData but we have rawParsedData
    if (!displayData && rawParsedData) {
      console.log('💡 AnalysisDisplay - Using rawParsedData as fallback');
      
      // Ensure minimum required data is present
      const hasMinimumData = rawParsedData.playerName && 
                            rawParsedData.map && 
                            rawParsedData.strengths &&
                            rawParsedData.weaknesses &&
                            rawParsedData.recommendations;
                             
      if (hasMinimumData) {
        displayData = {
          ...rawParsedData,
          id: crypto.randomUUID(), // Add required id field if using rawParsedData
          // Ensure all required fields have values with fallbacks
          strengths: rawParsedData.strengths || ['Gute mechanische Fähigkeiten'],
          weaknesses: rawParsedData.weaknesses || ['Könnte Scouting verbessern'],
          recommendations: rawParsedData.recommendations || ['Übe Build-Order Timings'],
          trainingPlan: rawParsedData.trainingPlan || [],
          buildOrder: rawParsedData.buildOrder || [],
          // Normalize race information using standardizeRaceName for consistent representation
          playerRace: standardizeRaceName(rawParsedData.playerRace),
          opponentRace: standardizeRaceName(rawParsedData.opponentRace)
        };
        console.log('💡 AnalysisDisplay - Created displayData from rawParsedData:', displayData);
      } else {
        console.error('⛔ AnalysisDisplay - Raw data missing essential fields:', rawParsedData);
        // Fall back to placeholder display
        return (
          <div className="h-96 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-sm rounded-lg border border-destructive/30 shadow-lg">
            <div className="text-center max-w-md p-6">
              <h3 className="text-xl font-semibold mb-3 text-destructive">Unvollständige Daten</h3>
              <p className="text-muted-foreground mb-6">
                Die Analyse konnte nicht vollständig abgeschlossen werden. 
                Bitte versuche es mit einem anderen Replay oder kontaktiere den Support.
              </p>
            </div>
          </div>
        );
      }
    }
    
    // Now if we have valid display data
    if (displayData) {
      // Ensure race information is properly normalized before displaying
      // Use our improved standardizeRaceName function for consistent results
      const normalizedPlayerRace = standardizeRaceName(displayData.playerRace);
      const normalizedOpponentRace = standardizeRaceName(displayData.opponentRace);
      
      console.log('💡 AnalysisDisplay - Final normalized races:', {
        player: normalizedPlayerRace,
        opponent: normalizedOpponentRace
      });
      
      return (
        <>
          {/* Player Selector */}
          <PlayerSelector 
            player1={displayData.playerName || 'Spieler'} 
            player2={displayData.opponentName || 'Gegner'}
            race1={normalizedPlayerRace}
            race2={normalizedOpponentRace}
            selectedPlayerIndex={selectedPlayerIndex}
            onSelectPlayer={onPlayerSelect}
          />
          
          <div className="mt-4">
            <AnalysisResult data={{
              ...displayData,
              playerRace: normalizedPlayerRace,
              opponentRace: normalizedOpponentRace
            }} isPremium={isPremium} />
          </div>
        </>
      );
    }
  }
  
  // 3. Default fallback state when no data is available
  console.log('💡 AnalysisDisplay - Rendering upload placeholder');
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
