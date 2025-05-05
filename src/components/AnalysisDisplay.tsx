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
      
      // Enhanced data validation logging
      const missingFields = [];
      if (!replayData.strengths || replayData.strengths.length === 0) missingFields.push('strengths');
      if (!replayData.playerName) missingFields.push('playerName');
      if (!replayData.playerRace) missingFields.push('playerRace');
      if (!replayData.buildOrder) missingFields.push('buildOrder');
      
      if (missingFields.length > 0) {
        console.warn(`⚠️ AnalysisDisplay - Missing fields in replayData: ${missingFields.join(', ')}`);
      }
      
      // Log race information for debugging with more detail
      console.log('💡 AnalysisDisplay - Player race data:', {
        raw: replayData.playerRace,
        normalized: standardizeRaceName(replayData.playerRace),
        playerName: replayData.playerName || 'Unknown'
      });
      console.log('💡 AnalysisDisplay - Opponent race data:', {
        raw: replayData.opponentRace,
        normalized: standardizeRaceName(replayData.opponentRace),
        opponentName: replayData.opponentName || 'Unknown'
      });
      
      // Log build order data
      console.log('💡 AnalysisDisplay - Build order data:', 
        Array.isArray(replayData.buildOrder) 
          ? `${replayData.buildOrder.length} items` 
          : 'Missing build order');
    }
    
    if (rawParsedData) {
      console.log('💡 AnalysisDisplay - RawParsedData available with keys:', Object.keys(rawParsedData));
      
      // Log race information from raw data with more detail
      console.log('💡 AnalysisDisplay - Raw player data:', {
        race: rawParsedData.playerRace,
        normalized: standardizeRaceName(rawParsedData.playerRace),
        name: rawParsedData.playerName || 'Unknown'
      });
      console.log('💡 AnalysisDisplay - Raw opponent data:', {
        race: rawParsedData.opponentRace,
        normalized: standardizeRaceName(rawParsedData.opponentRace),
        name: rawParsedData.opponentName || 'Unknown'
      });
      
      // Log build order data
      if (rawParsedData.buildOrder) {
        console.log('💡 AnalysisDisplay - Raw build order:', 
          Array.isArray(rawParsedData.buildOrder) 
            ? `${rawParsedData.buildOrder.length} items` 
            : 'Invalid build order');
      } else {
        console.warn('⚠️ AnalysisDisplay - Missing build order in raw data');
      }
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
      
      // Ensure all required fields have values with fallbacks
      displayData = {
        ...rawParsedData,
        id: crypto.randomUUID(), // Add required id field if using rawParsedData
        playerName: rawParsedData.playerName || 'Spieler',
        opponentName: rawParsedData.opponentName || 'Gegner',
        playerRace: standardizeRaceName(rawParsedData.playerRace),
        opponentRace: standardizeRaceName(rawParsedData.opponentRace),
        map: rawParsedData.map || 'Unbekannte Karte',
        strengths: rawParsedData.strengths || ['Gute mechanische Fähigkeiten'],
        weaknesses: rawParsedData.weaknesses || ['Könnte Scouting verbessern'],
        recommendations: rawParsedData.recommendations || ['Übe Build-Order Timings'],
        buildOrder: rawParsedData.buildOrder || [],
        trainingPlan: [] // Empty array as fallback
      };
      console.log('💡 AnalysisDisplay - Created displayData from rawParsedData:', displayData);
    }
    
    // Now if we have valid display data
    if (displayData) {
      // Ensure race information is properly normalized before displaying
      // Use our improved standardizeRaceName function for consistent results
      const normalizedPlayerRace = standardizeRaceName(displayData.playerRace);
      const normalizedOpponentRace = standardizeRaceName(displayData.opponentRace);
      
      // Ensure player names are present
      const playerName = displayData.playerName || 'Spieler';
      const opponentName = displayData.opponentName || 'Gegner';
      
      console.log('💡 AnalysisDisplay - Final display data:', {
        player: `${playerName} (${normalizedPlayerRace})`,
        opponent: `${opponentName} (${normalizedOpponentRace})`,
        buildOrderItems: Array.isArray(displayData.buildOrder) ? displayData.buildOrder.length : 'None'
      });
      
      return (
        <>
          {/* Player Selector */}
          <PlayerSelector 
            player1={playerName} 
            player2={opponentName}
            race1={normalizedPlayerRace}
            race2={normalizedOpponentRace}
            selectedPlayerIndex={selectedPlayerIndex}
            onSelectPlayer={onPlayerSelect}
          />
          
          <div className="mt-4">
            <AnalysisResult data={{
              ...displayData,
              playerName,
              opponentName,
              playerRace: normalizedPlayerRace,
              opponentRace: normalizedOpponentRace,
              buildOrder: Array.isArray(displayData.buildOrder) ? displayData.buildOrder : []
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
