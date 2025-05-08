import React, { useEffect, useState } from 'react';
import { Loader2, Upload, AlertCircle, Clock, Database } from 'lucide-react';
import { AnalyzedReplayResult } from '@/services/replayParserService';
import AnalysisResult from '@/components/AnalysisResult';
import PlayerSelector from '@/components/PlayerSelector';
import { standardizeRaceName } from '@/lib/replayUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  // State to keep track of build orders for both players
  const [player1BuildOrder, setPlayer1BuildOrder] = useState<any[]>([]);
  const [player2BuildOrder, setPlayer2BuildOrder] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Debug rendering state
  useEffect(() => {
    console.log('💡 AnalysisDisplay - Component mounted');
    
    return () => {
      console.log('💡 AnalysisDisplay - Component unmounted');
    };
  }, []);
  
  // Effect to show toast when player changes for better user feedback
  useEffect(() => {
    if (analysisComplete && (replayData || rawParsedData)) {
      const playerData = replayData || rawParsedData;
      const viewingPlayerName = selectedPlayerIndex === 0 ? playerData?.playerName : playerData?.opponentName;
      const viewingRace = selectedPlayerIndex === 0 ? playerData?.playerRace : playerData?.opponentRace;
      
      if (viewingPlayerName && viewingRace) {
        console.log(`💡 AnalysisDisplay - Switched perspective to: ${viewingPlayerName} (${viewingRace})`);
        
        toast({
          title: `Switched to ${viewingPlayerName}'s perspective`,
          description: `Now viewing the game from ${viewingRace} player's view`,
        });
      }
    }
  }, [selectedPlayerIndex, analysisComplete, replayData, rawParsedData]);
  
  // Effect to process and separate build orders for both players
  useEffect(() => {
    if (analysisComplete && (replayData || rawParsedData)) {
      const data = replayData || rawParsedData;
      
      // For player 1, use the original build order
      if (Array.isArray(data?.buildOrder)) {
        setPlayer1BuildOrder(data.buildOrder.map(item => ({
          ...item,
          // Keep original build order intact
          action: item.action
        })));
      }
      
      // For player 2 (opponent), create inferred/estimated build order
      // In a real app, this would come from actual opponent data
      if (Array.isArray(data?.buildOrder)) {
        const opponentRace = standardizeRaceName(data?.opponentRace || 'Unknown');
        
        // Create estimate of opponent build order based on race
        let opponentBuild: any[] = [];
        
        if (opponentRace === 'Protoss') {
          opponentBuild = [
            { time: "0:00", supply: 4, action: "Start" },
            { time: "0:50", supply: 8, action: "Pylon" },
            { time: "1:45", supply: 10, action: "Gateway" },
            { time: "2:20", supply: 12, action: "Assimilator" },
            { time: "2:40", supply: 13, action: "Cybernetics Core" },
            { time: "3:15", supply: 15, action: "Zealot" },
            { time: "3:45", supply: 18, action: "Pylon" },
            { time: "4:10", supply: 20, action: "Dragoon" }
          ];
        } else if (opponentRace === 'Zerg') {
          opponentBuild = [
            { time: "0:00", supply: 4, action: "Start" },
            { time: "0:42", supply: 5, action: "Drone" },
            { time: "1:15", supply: 8, action: "Spawning Pool" },
            { time: "2:00", supply: 10, action: "6-Zergling" },
            { time: "2:30", supply: 9, action: "Extractor" },
            { time: "3:05", supply: 11, action: "Lair" },
            { time: "3:45", supply: 15, action: "Spire" },
            { time: "4:30", supply: 21, action: "Mutalisk" }
          ];
        } else { // Terran
          opponentBuild = [
            { time: "0:00", supply: 4, action: "Start" },
            { time: "0:45", supply: 8, action: "Supply Depot" },
            { time: "1:30", supply: 10, action: "Barracks" },
            { time: "2:15", supply: 12, action: "Refinery" },
            { time: "2:45", supply: 15, action: "Marine" },
            { time: "3:10", supply: 16, action: "Factory" },
            { time: "3:45", supply: 18, action: "Supply Depot" },
            { time: "4:20", supply: 21, action: "Vulture" }
          ];
        }
        
        setPlayer2BuildOrder(opponentBuild);
      }
    }
  }, [analysisComplete, replayData, rawParsedData]);
  
  // -- Render Logic --

  // 1. Show loading state while analyzing
  if (isAnalyzing) {
    console.log('💡 AnalysisDisplay - Rendering loading state');
    return (
      <div className="h-96 flex flex-col items-center justify-center sc-metal-frame backdrop-blur-sm border-gray-700/70">
        <div className="text-center max-w-md p-6">
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto">
              <Loader2 className="w-24 h-24 animate-spin text-blue-400" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm font-bold sc-terminal-text text-blue-400">
                {Math.round(Math.random() * 100)}%
              </div>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-4 sc-terminal-text bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300">
            Analysiere dein Replay...
          </h3>
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
      
      // Create a structured deep copy to avoid reference issues
      try {
        // Ensure all required fields have values with fallbacks
        displayData = {
          ...JSON.parse(JSON.stringify(rawParsedData)),
          id: crypto.randomUUID(), // Add required id field if using rawParsedData
          playerName: rawParsedData.playerName || 'Spieler',
          opponentName: rawParsedData.opponentName || 'Gegner',
          playerRace: standardizeRaceName(rawParsedData.playerRace || 'Terran'),
          opponentRace: standardizeRaceName(rawParsedData.opponentRace || 'Terran'),
          map: rawParsedData.map || 'Unbekannte Karte',
          strengths: rawParsedData.strengths || ['Gute mechanische Fähigkeiten'],
          weaknesses: rawParsedData.weaknesses || ['Könnte Scouting verbessern'],
          recommendations: rawParsedData.recommendations || ['Übe Build-Order Timings'],
          buildOrder: Array.isArray(rawParsedData.buildOrder) ? [...rawParsedData.buildOrder] : [],
          trainingPlan: [] // Empty array as fallback
        };
      } catch (error) {
        console.error('💡 AnalysisDisplay - Error creating displayData:', error);
      }
      
      console.log('💡 AnalysisDisplay - Created displayData from rawParsedData:', displayData);
    }
    
    // Now if we have valid display data
    if (displayData) {
      // Ensure race information is properly normalized before displaying
      const normalizedPlayerRace = standardizeRaceName(displayData.playerRace || 'Terran');
      const normalizedOpponentRace = standardizeRaceName(displayData.opponentRace || 'Terran');
      
      // Ensure player names are present
      const playerName = displayData.playerName || 'Spieler';
      const opponentName = displayData.opponentName || 'Gegner';
      
      // Ensure buildOrder is always an array
      const buildOrder = Array.isArray(displayData.buildOrder) ? displayData.buildOrder : [];
      
      console.log('💡 AnalysisDisplay - Final display data:', {
        player: `${playerName} (${normalizedPlayerRace})`,
        opponent: `${opponentName} (${normalizedOpponentRace})`,
        buildOrderItems: buildOrder.length
      });
      
      // Check if build order is missing
      const hasBuildOrder = Array.isArray(displayData.buildOrder) && displayData.buildOrder.length > 0;
      console.log('💡 AnalysisDisplay - Build order status:', hasBuildOrder ? 'Available' : 'Missing');
      
      // Create an adjusted version of the data for the selected player's perspective
      let viewData = { ...displayData };
      
      // Create proper perspective switching with actual data transformation
      if (selectedPlayerIndex === 1) {
        console.log('💡 AnalysisDisplay - Creating opponent perspective data');
        
        // Create inverted view for opponent perspective with actual data switch
        viewData = {
          ...JSON.parse(JSON.stringify(displayData)), // Deep copy to avoid reference issues
          id: displayData.id,
          // Swap names and races for display
          playerName: opponentName,
          opponentName: playerName,
          playerRace: normalizedOpponentRace,
          opponentRace: normalizedPlayerRace,
          // Swap result
          result: displayData.result === 'win' ? 'loss' : (displayData.result === 'loss' ? 'win' : displayData.result),
          
          // IMPORTANT: Generate opponent-focused analysis content
          strengths: [
            'Effektive Gegenwehr gegen deine Strategie',
            'Guter Einheitenmix gegen deine Komposition',
            'Timing-basierte Angriffe gegen deine Schwachpunkte'
          ],
          weaknesses: [
            'Angreifbare frühe Expansionsphase',
            'Begrenzte Scout-Informationen über deine Basis',
            'Verzögerter Tech-Übergang in der Mitte des Spiels'
          ],
          recommendations: [
            'Nutze frühe Aggression, um Entwicklung zu stören',
            'Setze auf mobile Einheiten für bessere Mapkontrolle',
            'Scout regelmäßig für bessere Informationen'
          ],
          
          // IMPORTANT: Use the proper build order for player 2
          buildOrder: player2BuildOrder
        };
      } else {
        // For player 1, ensure we use the player1's build order
        viewData.buildOrder = player1BuildOrder;
      }
      
      // Get the current player's race for styling
      const currentRace = selectedPlayerIndex === 0 ? normalizedPlayerRace : normalizedOpponentRace;
      const raceClass = currentRace.toLowerCase().includes('terr') ? 'terran' : 
                        currentRace.toLowerCase().includes('prot') ? 'protoss' : 
                        currentRace.toLowerCase().includes('zerg') ? 'zerg' : '';
      
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
          
          {/* Match title with player vs opponent */}
          <div className="sc-metal-frame mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-black via-gray-900 to-black p-4 text-center relative">
              <div className="absolute inset-0 opacity-20 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/lovable-uploads/5261e5c1-c559-406a-842c-978f3c7dc5b0.png')] opacity-10 bg-cover bg-center"></div>
              </div>
              
              <h2 className="text-2xl sc-terminal-text">
                <span className={`text-${selectedPlayerIndex === 0 ? 'blue' : 'yellow'}-400`}>
                  {selectedPlayerIndex === 0 ? playerName : opponentName}
                </span>
                <span className="text-gray-400 mx-2">vs.</span>
                <span className={`text-${selectedPlayerIndex === 1 ? 'blue' : 'yellow'}-400`}>
                  {selectedPlayerIndex === 1 ? playerName : opponentName}
                </span>
              </h2>
              
              <div className="mt-1 text-sm text-gray-400 flex items-center justify-center gap-4">
                <span>{displayData.map}</span>
                <span>•</span>
                <span className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" /> {displayData.duration}
                </span>
                <span>•</span>
                <span>{displayData.date}</span>
                
                {/* Result badge */}
                <span className={viewData.result === 'win' ? 'victory-banner' : 'defeat-banner'}>
                  {viewData.result === 'win' ? 'WIN' : 'LOSS'}
                </span>
                
                {/* APM indicator */}
                <span className="player-stats-badge">
                  <span className="text-gray-400">APM:</span>
                  <span className="player-stats-value">{viewData.apm}</span>
                </span>
              </div>
            </div>
            
            {/* Enhanced tabs with 3D depth effect */}
            <div className="blizzard-nav-tabs">
              {/* Overview tab */}
              <button 
                className={`blizzard-tab analysis-tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <div className="flex items-center">
                  <Database className="w-4 h-4 mr-1.5" />
                  <span>Overview</span>
                </div>
              </button>
              
              {/* Build Order tab */}
              <button 
                className={`blizzard-tab analysis-tab-button ${activeTab === 'buildOrder' ? 'active' : ''}`}
                onClick={() => setActiveTab('buildOrder')}
              >
                <div className="flex items-center">
                  <Database className="w-4 h-4 mr-1.5" />
                  <span>Build Order</span>
                </div>
              </button>
              
              {/* Analysis tab */}
              <button 
                className={`blizzard-tab analysis-tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
                onClick={() => setActiveTab('analysis')}
              >
                <div className="flex items-center">
                  <Database className="w-4 h-4 mr-1.5" />
                  <span>Analysis</span>
                </div>
              </button>
              
              {/* Training tab (premium) */}
              <button 
                className={`blizzard-tab analysis-tab-button ${activeTab === 'training' ? 'active' : ''} ${!isPremium ? 'opacity-50' : ''}`}
                onClick={() => isPremium && setActiveTab('training')}
                disabled={!isPremium}
              >
                <div className="flex items-center">
                  <Database className="w-4 h-4 mr-1.5" />
                  <span>Training</span>
                  {!isPremium && <span className="ml-1 text-xs">🔒</span>}
                </div>
              </button>
              
              {/* Stats tab (premium) */}
              <button 
                className={`blizzard-tab analysis-tab-button ${activeTab === 'stats' ? 'active' : ''} ${!isPremium ? 'opacity-50' : ''}`}
                onClick={() => isPremium && setActiveTab('stats')}
                disabled={!isPremium}
              >
                <div className="flex items-center">
                  <Database className="w-4 h-4 mr-1.5" />
                  <span>Stats</span>
                  {!isPremium && <span className="ml-1 text-xs">🔒</span>}
                </div>
              </button>
            </div>
          </div>
          
          {/* Build Order Warning */}
          {!hasBuildOrder && (
            <Alert variant="warning" className="mt-4 mb-4 bg-amber-900/30 border border-amber-700/50">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-400">
                Build Order konnte nicht aus dem Replay extrahiert werden. Dies kann bei sehr kurzen Spielen oder bei bestimmten Replay-Formaten vorkommen.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Custom tab content - with enhanced styling */}
          <div className="mt-4 sc-metal-frame overflow-hidden">
            {activeTab === 'overview' && (
              <div className="animate-fade-in">
                <div className="bg-gradient-to-r from-black via-gray-900 to-black p-4 border-b border-gray-700/50 flex items-center">
                  <div className={`w-5 h-5 rounded-full bg-${raceClass} mr-3 glow-${raceClass}`}></div>
                  <h3 className="text-xl sc-terminal-text">Übersicht</h3>
                </div>
                
                <div className="p-6 bg-gradient-to-b from-gray-900/80 to-black/95">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Player Strengths card */}
                    <div className="sc-card transform hover:scale-[1.01] transition-all duration-300 hover:shadow-blue-500/10">
                      <div className="sc-header">
                        <h4 className="font-semibold sc-terminal-text text-green-400">Stärken</h4>
                      </div>
                      <div className="p-4">
                        <ul className="space-y-2">
                          {viewData.strengths?.map((strength, i) => (
                            <li key={i} className="flex items-start">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 mr-2"></span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    {/* Player Weaknesses card */}
                    <div className="sc-card transform hover:scale-[1.01] transition-all duration-300 hover:shadow-red-500/10">
                      <div className="sc-header">
                        <h4 className="font-semibold sc-terminal-text text-red-400">Schwächen</h4>
                      </div>
                      <div className="p-4">
                        <ul className="space-y-2">
                          {viewData.weaknesses?.map((weakness, i) => (
                            <li key={i} className="flex items-start">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 mr-2"></span>
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    {/* Recommendations card */}
                    <div className="sc-card transform hover:scale-[1.01] transition-all duration-300 hover:shadow-yellow-500/10">
                      <div className="sc-header">
                        <h4 className="font-semibold sc-terminal-text text-yellow-400">Empfehlungen</h4>
                      </div>
                      <div className="p-4">
                        <ul className="space-y-2">
                          {viewData.recommendations?.map((rec, i) => (
                            <li key={i} className="flex items-start">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 mr-2"></span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Map preview */}
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-300 mb-3">Map Preview</h4>
                    <div className="sc-minimap border border-gray-700 h-40 rounded-sm relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 radar-scan">
                        <span className="sc-terminal-text text-blue-400">Map: {viewData.map}</span>
                      </div>
                      {viewData.map && (
                        <div className="absolute inset-0 opacity-30">
                          <div className="h-full w-full bg-gradient-to-br from-blue-900/30 to-transparent"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'buildOrder' && (
              <div className="animate-fade-in">
                <div className="bg-gradient-to-r from-black via-gray-900 to-black p-4 border-b border-gray-700/50 flex items-center">
                  <div className={`w-5 h-5 rounded-full bg-${raceClass} mr-3 glow-${raceClass}`}></div>
                  <h3 className="text-xl sc-terminal-text">Build Order Analysis</h3>
                </div>
                
                <ScrollArea className="h-[500px] sc-scrollbar">
                  <div className="p-4">
                    {/* Build Order table */}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-black/50 border-b border-gray-700/50">
                          <th className="text-left py-2 px-4 text-gray-400">Time</th>
                          <th className="text-left py-2 px-4 text-gray-400">Supply</th>
                          <th className="text-left py-2 px-4 text-gray-400">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewData.buildOrder?.map((item, index) => (
                          <tr 
                            key={`${item.time}-${index}`}
                            className="border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono text-blue-300">{item.time}</td>
                            <td className="py-3 px-4 font-mono text-yellow-300">{item.supply}</td>
                            <td className="py-3 px-4">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {activeTab === 'analysis' && (
              <div className="animate-fade-in">
                <div className="bg-gradient-to-r from-black via-gray-900 to-black p-4 border-b border-gray-700/50 flex items-center">
                  <h3 className="text-xl sc-terminal-text">Detailed Analysis</h3>
                </div>
                
                <div className="p-6 bg-gradient-to-b from-gray-900/80 to-black/95">
                  <AnalysisResult 
                    data={viewData} 
                    isPremium={isPremium} 
                  />
                </div>
              </div>
            )}
            
            {activeTab === 'training' && (
              <div className="p-6 bg-gradient-to-b from-gray-900/80 to-black/95 animate-fade-in">
                {isPremium ? (
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-4">Training Plan</h3>
                    <p>Premium training content would appear here.</p>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <h3 className="text-xl font-bold mb-4">Premium Feature</h3>
                    <p className="mb-4">Upgrade to Premium for personalized training plans.</p>
                    <Button className="blizzard-button">Upgrade Now</Button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'stats' && (
              <div className="p-6 bg-gradient-to-b from-gray-900/80 to-black/95 animate-fade-in">
                {isPremium ? (
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-4">Advanced Statistics</h3>
                    <p>Premium statistics content would appear here.</p>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <h3 className="text-xl font-bold mb-4">Premium Feature</h3>
                    <p className="mb-4">Upgrade to Premium for detailed statistics and analytics.</p>
                    <Button className="blizzard-button">Upgrade Now</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      );
    } else {
      console.error('💡 AnalysisDisplay - No valid display data available despite analysisComplete=true');
    }
  }
  
  // 3. Default fallback state when no data is available
  console.log('💡 AnalysisDisplay - Rendering upload placeholder');
  return (
    <div className="h-96 flex flex-col items-center justify-center sc-metal-frame backdrop-blur-sm border border-dashed border-gray-700/50 shadow-inner">
      <div className="text-center max-w-md p-6">
        <div className="w-20 h-20 bg-black/60 border border-blue-500/40 rounded-full mx-auto mb-6 flex items-center justify-center">
          <Upload className="h-10 w-10 text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold mb-3 sc-terminal-text">Kein Replay ausgewählt</h3>
        <p className="text-muted-foreground">
          Lade ein Replay hoch, um deine personalisierte Analyse hier zu sehen
        </p>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
