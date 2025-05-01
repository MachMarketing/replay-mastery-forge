
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import AnalysisResult from '@/components/AnalysisResult';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadIcon } from 'lucide-react';
import { useReplays, Replay } from '@/hooks/useReplays';
import { useToast } from '@/hooks/use-toast';
import { useReplayParser } from '@/hooks/useReplayParser';
import { AnalyzedReplayResult } from '@/services/replayParserService';
import PlayerSelector from '@/components/PlayerSelector';

// Define an interface that extends AnalyzedReplayResult with the additional fields needed by AnalysisResult
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
  const { parseReplay, isProcessing } = useReplayParser();

  // Reset analysis state when component unmounts
  useEffect(() => {
    return () => {
      setIsAnalyzing(false);
      setAnalysisComplete(false);
    };
  }, []);

  // Helper function to ensure race is one of the valid types
  const normalizeRace = (race: string): 'Terran' | 'Protoss' | 'Zerg' => {
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr') || normalizedRace.includes('t')) return 'Terran';
    if (normalizedRace.includes('prot') || normalizedRace.includes('p')) return 'Protoss';
    if (normalizedRace.includes('zerg') || normalizedRace.includes('z')) return 'Zerg';
    return 'Terran'; // Default fallback
  };
  
  // Helper function to normalize result to win/loss
  const normalizeResult = (result: string): 'win' | 'loss' => {
    const normalizedResult = result.toLowerCase();
    return normalizedResult.includes('win') ? 'win' : 'loss';
  };

  const handleUploadComplete = async (uploadedFile: File, parsedReplayData: AnalyzedReplayResult) => {
    console.log("Upload complete with data:", parsedReplayData);
    setFile(uploadedFile);
    setIsAnalyzing(true);
    setRawParsedData(parsedReplayData);
    
    try {
      // Default to first player (index 0) - with slight delay to show the loading state
      setTimeout(() => {
        handlePlayerSelection(0);
      }, 500);
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'There was an error analyzing your replay.',
        variant: 'destructive'
      });
      setIsAnalyzing(false);
      setAnalysisComplete(false);
    }
  };

  const handlePlayerSelection = (playerIndex: number) => {
    if (!rawParsedData) {
      console.error('Cannot process player selection: No raw data available');
      setIsAnalyzing(false);
      return;
    }
    
    console.log("Processing player selection:", playerIndex, "with data:", rawParsedData);
    
    setSelectedPlayerIndex(playerIndex);
    
    // Create adjusted data based on player selection
    let adjustedData: AnalyzedReplayResult;
    
    if (playerIndex === 0) {
      // First player is already correctly set up in rawParsedData
      adjustedData = { ...rawParsedData };
    } else {
      // Swap player and opponent for second player perspective
      adjustedData = {
        ...rawParsedData,
        playerName: rawParsedData.opponentName,
        opponentName: rawParsedData.playerName,
        playerRace: rawParsedData.opponentRace,
        opponentRace: rawParsedData.playerRace,
        // Invert result
        result: rawParsedData.result === 'win' ? 'loss' : 'win',
        // Swap strengths and weaknesses for more accurate coaching
        strengths: rawParsedData.recommendations ? [...rawParsedData.recommendations].slice(0, 3) : [],
        weaknesses: rawParsedData.weaknesses ? [...rawParsedData.weaknesses].slice(0, 3) : [],
        recommendations: rawParsedData.strengths ? [...rawParsedData.strengths].slice(0, 3) : []
      };
    }
    
    // Ensure race values and result are properly normalized
    const normalizedData = {
      ...adjustedData,
      playerRace: normalizeRace(adjustedData.playerRace),
      opponentRace: normalizeRace(adjustedData.opponentRace),
      result: normalizeResult(adjustedData.result),
      // Ensure all required arrays exist
      strengths: adjustedData.strengths || [],
      weaknesses: adjustedData.weaknesses || [],
      recommendations: adjustedData.recommendations || []
    };
    
    console.log("Final normalized data:", normalizedData);
    
    // Extend the parsedReplayData with the additional fields needed by AnalysisResult
    const extendedData: ReplayData = {
      ...normalizedData,
      // Add required values for the fields
      id: crypto.randomUUID(),
    };
    
    setReplayData(extendedData);
    setIsAnalyzing(false);
    setAnalysisComplete(true);
    
    // Refresh the replays list after successful upload
    fetchReplays();
  };

  // Get recent uploads from replays list
  const recentReplays = replays.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-foreground">Analyze Your Replay</h1>
          </div>
          
          <p className="text-muted-foreground mb-8">
            Upload your StarCraft: Brood War replay file to receive professional-level analysis 
            and personalized coaching.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="shadow-md">
                <CardHeader className="bg-card border-b">
                  <CardTitle className="text-lg">Upload Replay</CardTitle>
                  <CardDescription>
                    Upload a .rep file to analyze your gameplay
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <UploadBox onUploadComplete={handleUploadComplete} />
                  
                  {/* Tips section */}
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Tips:</h3>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Make sure you're uploading a StarCraft: Brood War replay (.rep) file</li>
                      <li>• Recent games provide the most relevant analysis</li>
                      <li>• Games longer than 5 minutes provide better insights</li>
                      <li>• Ladder games are ideal for analysis</li>
                    </ul>
                  </div>

                  {/* Parser status - now always browser-based */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Parser Status</h3>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {isProcessing ? 'Processing replay...' : 'Browser parser ready'}
                    </p>
                  </div>

                  {/* Recent uploads section */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="text-sm font-medium mb-3">Recent Uploads</h3>
                    <div className="space-y-2">
                      {recentReplays.length > 0 ? (
                        recentReplays.map((replay: Replay) => (
                          <div key={replay.id} className="flex justify-between items-center p-2 rounded hover:bg-secondary/20 text-sm">
                            <span className="truncate mr-2">
                              {replay.original_filename || `${replay.player_name || 'Unknown'} vs ${replay.opponent_name || 'Unknown'}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(replay.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No recent uploads</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              {isAnalyzing ? (
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
              ) : analysisComplete && replayData ? (
                <>
                  {/* Player Selector */}
                  <PlayerSelector 
                    player1={rawParsedData?.playerName || 'Player'} 
                    player2={rawParsedData?.opponentName || 'Opponent'}
                    race1={normalizeRace(rawParsedData?.playerRace || 'Terran')}
                    race2={normalizeRace(rawParsedData?.opponentRace || 'Terran')}
                    selectedPlayerIndex={selectedPlayerIndex}
                    onSelectPlayer={handlePlayerSelection}
                  />
                  
                  <div className="mt-4">
                    <AnalysisResult data={replayData} isPremium={isPremium} />
                  </div>
                </>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default UploadPage;
