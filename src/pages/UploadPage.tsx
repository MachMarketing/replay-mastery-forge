
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
    fetchReplays();
  }, [fetchReplays]);
  
  // Helper function for race normalization
  const normalizeRace = (race: string): 'Terran' | 'Protoss' | 'Zerg' => {
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr') || normalizedRace.includes('t')) return 'Terran';
    if (normalizedRace.includes('prot') || normalizedRace.includes('p')) return 'Protoss';
    if (normalizedRace.includes('zerg') || normalizedRace.includes('z')) return 'Zerg';
    return 'Terran'; 
  };
  
  // Helper for result normalization
  const normalizeResult = (result: string): 'win' | 'loss' => {
    const normalizedResult = result.toLowerCase();
    return normalizedResult.includes('win') ? 'win' : 'loss';
  };

  // Handler for when upload is complete
  const handleUploadComplete = async (uploadedFile: File, parsedReplayData: AnalyzedReplayResult) => {
    console.log("Upload complete with data:", parsedReplayData);
    setFile(uploadedFile);
    setIsAnalyzing(true);
    setRawParsedData(parsedReplayData);
    
    try {
      // Short delay to show loading state for better UX
      setTimeout(() => {
        handlePlayerSelection(0);
      }, 300);
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

  // Handle player perspective selection
  const handlePlayerSelection = (playerIndex: number) => {
    console.log("Processing player selection:", playerIndex);
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
