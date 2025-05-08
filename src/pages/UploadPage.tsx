import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useReplays, Replay } from '@/hooks/useReplays';
import { useToast } from '@/hooks/use-toast';
import { useReplayParser } from '@/hooks/useReplayParser';
import { AnalyzedReplayResult } from '@/services/replayParserService';
import AnalysisDisplay from '@/components/AnalysisDisplay';
import { standardizeRaceName } from '@/lib/replayUtils';

interface ReplayData extends AnalyzedReplayResult {
  id: string;
}

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isPremium] = useState(false);
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [rawParsedData, setRawParsedData] = useState<AnalyzedReplayResult | null>(null);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number>(0);
  const { replays, fetchReplays } = useReplays();
  const { toast } = useToast();
  const { isLoading, error } = useReplays();

  // Reset states when component unmounts
  useEffect(() => {
    return () => {
      setIsAnalyzing(false);
      setAnalysisComplete(false);
      setRawParsedData(null);
      setReplayData(null);
    };
  }, []);

  // Pre-fetch replays when the component loads
  useEffect(() => {
    fetchReplays().catch(err => {
      console.error('Failed to fetch replays:', err);
      toast({
        title: 'Error loading replays',
        description: 'Could not retrieve your previous replays. Please try refreshing the page.',
        variant: 'destructive'
      });
    });
  }, [fetchReplays]);
  
  // For debugging - log state changes
  useEffect(() => {
    console.log('🔄 UploadPage - State update:', {
      isAnalyzing,
      analysisComplete,
      hasRawData: !!rawParsedData,
      hasReplayData: !!replayData,
      selectedPlayerIndex
    });
  }, [isAnalyzing, analysisComplete, rawParsedData, replayData, selectedPlayerIndex]);
  
  // Handler for when upload is complete - now with improved data handling
  const handleUploadComplete = async (uploadedFile: File, parsedReplayData: AnalyzedReplayResult) => {
    console.log("🚀 Upload complete with data:", parsedReplayData);
    
    if (!parsedReplayData) {
      toast({
        title: 'Fehler',
        description: 'Es wurden keine Daten vom Parser zurückgegeben',
        variant: 'destructive'
      });
      return;
    }
    
    // First set state variables
    setFile(uploadedFile);
    setIsAnalyzing(true);
    
    try {
      // Make sure race information is properly standardized before setting state
      const standardizedData = {
        ...parsedReplayData,
        playerRace: standardizeRaceName(parsedReplayData.playerRace || 'Terran'),
        opponentRace: standardizeRaceName(parsedReplayData.opponentRace || 'Terran'),
        playerName: parsedReplayData.playerName || 'Spieler',
        opponentName: parsedReplayData.opponentName || 'Gegner',
        buildOrder: Array.isArray(parsedReplayData.buildOrder) ? parsedReplayData.buildOrder : [],
        matchup: parsedReplayData.matchup || `${parsedReplayData.playerRace.charAt(0)}v${parsedReplayData.opponentRace.charAt(0)}`,
      };
      
      // Set the raw parsed data first
      setRawParsedData(standardizedData);
      
      // Log race information after standardization
      console.log("🚀 Upload - Race information after standardization:", {
        playerRace: standardizedData.playerRace,
        opponentRace: standardizedData.opponentRace,
        playerName: standardizedData.playerName,
        opponentName: standardizedData.opponentName,
        buildOrderItems: standardizedData.buildOrder?.length || 0
      });
      
      // Pass the data directly to handlePlayerSelection with standardized races after small delay
      setTimeout(() => {
        // This sets replayData and analysisComplete = true
        handlePlayerSelection(0, standardizedData);
      }, 1000); // Short delay for smoother UX
    } catch (error) {
      console.error('⛔ Analysis error:', error);
      toast({
        title: 'Analyse fehlgeschlagen',
        description: 'Es gab einen Fehler bei der Analyse deines Replays.',
        variant: 'destructive'
      });
      setIsAnalyzing(false);
      setAnalysisComplete(false);
    }
  };

  // Handle player perspective selection with enhanced race handling and error prevention
  const handlePlayerSelection = (playerIndex: number, data: AnalyzedReplayResult = rawParsedData!) => {
    console.log("🎮 Processing player selection:", playerIndex);
    
    if (!data) {
      console.error('⛔ Cannot process player selection: No raw data available');
      setIsAnalyzing(false);
      return;
    }
    
    // Important: Update the selected player index
    setSelectedPlayerIndex(playerIndex);
    
    // Log race information before processing
    console.log("🎮 Race information before processing:", {
      playerRace: data.playerRace,
      opponentRace: data.opponentRace
    });
    
    try {
      // For both player perspectives, we create a valid ReplayData object
      // The actual perspective switching happens in the AnalysisDisplay component
      const extendedData: ReplayData = {
        ...JSON.parse(JSON.stringify(data)), // Deep copy to avoid reference issues
        id: crypto.randomUUID(),
      };
      
      // Set the replay data - AnalysisDisplay will handle the perspective
      setReplayData(extendedData);
      
      // Ensure analysis complete flag is set
      setAnalysisComplete(true);
      
      // Finally set analyzing to false
      setIsAnalyzing(false);
      
      // Add a success toast to give user feedback on selection
      if (playerIndex === 0) {
        toast({
          title: `Viewing ${data.playerName}'s Perspective`,
          description: `Analyzing from ${data.playerRace} player's view`,
        });
      } else {
        toast({
          title: `Viewing ${data.opponentName}'s Perspective`,
          description: `Analyzing from ${data.opponentRace} player's view`,
        });
      }
      
    } catch (error) {
      console.error('⛔ Error creating player perspective:', error);
      toast({
        title: 'Fehler beim Wechseln der Perspektive',
        description: 'Es gab ein Problem beim Umschalten auf die gewählte Spieler-Perspektive.',
        variant: 'destructive'
      });
    }
  };
  
  // Helper for result normalization
  const normalizeResult = (result: string): 'win' | 'loss' => {
    if (!result) return 'win';
    const normalizedResult = result.toLowerCase();
    return normalizedResult.includes('win') ? 'win' : 'loss';
  };

  // Get recent uploads from replays list with proper error handling
  const recentReplays = isLoading ? [] : replays.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-foreground">Analyse deines Replays</h1>
          </div>
          
          <p className="text-muted-foreground mb-8">
            Lade deine StarCraft: Brood War Replay-Datei hoch, um eine professionelle Analyse
            und persönliches Coaching zu erhalten.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="shadow-md">
                <CardHeader className="bg-card border-b">
                  <CardTitle className="text-lg">Replay hochladen</CardTitle>
                  <CardDescription>
                    Lade eine .rep Datei hoch, um dein Gameplay zu analysieren
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <UploadBox onUploadComplete={handleUploadComplete} />
                  
                  {/* Tips section */}
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Tipps:</h3>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Stelle sicher, dass du eine StarCraft: Brood War Replay-Datei (.rep) hochlädst</li>
                      <li>• Aktuelle Spiele bieten die relevanteste Analyse</li>
                      <li>• Spiele länger als 5 Minuten bieten bessere Einblicke</li>
                      <li>• Ladder-Spiele sind ideal für die Analyse</li>
                    </ul>
                  </div>

                  {/* Recent uploads section */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="text-sm font-medium mb-3">Neueste Uploads</h3>
                    <div className="space-y-2">
                      {error ? (
                        <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
                          <p>Fehler beim Laden der Replays: {error}</p>
                          <button 
                            onClick={fetchReplays} 
                            className="text-xs underline mt-1 hover:text-destructive/80"
                          >
                            Erneut versuchen
                          </button>
                        </div>
                      ) : isLoading ? (
                        <div className="flex justify-center p-4">
                          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                        </div>
                      ) : recentReplays.length > 0 ? (
                        recentReplays.map((replay: Replay) => (
                          <div key={replay.id} className="flex justify-between items-center p-2 rounded hover:bg-secondary/20 text-sm">
                            <span className="truncate mr-2 max-w-[160px]" title={replay.original_filename || `${replay.player_name || 'Unknown'} vs ${replay.opponent_name || 'Unknown'}`}>
                              {replay.original_filename || `${replay.player_name || 'Unknown'} vs ${replay.opponent_name || 'Unknown'}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(replay.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">Keine kürzlichen Uploads</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <AnalysisDisplay
                isAnalyzing={isAnalyzing}
                analysisComplete={analysisComplete}
                replayData={replayData}
                rawParsedData={rawParsedData}
                selectedPlayerIndex={selectedPlayerIndex}
                isPremium={isPremium}
                onPlayerSelect={handlePlayerSelection}
              />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default UploadPage;
