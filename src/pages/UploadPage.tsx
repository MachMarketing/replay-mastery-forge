
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
  
  // For debugging - log state changes
  useEffect(() => {
    console.log('🔄 UploadPage - State update:', {
      isAnalyzing,
      analysisComplete,
      hasRawData: !!rawParsedData,
      hasReplayData: !!replayData,
    });
  }, [isAnalyzing, analysisComplete, rawParsedData, replayData]);
  
  // Handler for when upload is complete
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
    setRawParsedData(parsedReplayData);
    setIsAnalyzing(true);
    
    try {
      // Pass the data directly to handlePlayerSelection instead of relying on state
      // Critical fix: Pass parsedReplayData explicitly to avoid timing issues with state updates
      handlePlayerSelection(0, parsedReplayData);
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

  // Handle player perspective selection
  const handlePlayerSelection = (playerIndex: number, data: AnalyzedReplayResult = rawParsedData!) => {
    console.log("🎮 Processing player selection:", playerIndex);
    
    if (!data) {
      console.error('⛔ Cannot process player selection: No raw data available');
      setIsAnalyzing(false);
      return;
    }
    
    console.log("🎮 Processing player selection with playerIndex:", playerIndex);
    console.log("🎮 Processing with data:", data);
    
    setSelectedPlayerIndex(playerIndex);
    
    // Create adjusted data based on player selection
    let adjustedData: AnalyzedReplayResult;
    
    if (playerIndex === 0) {
      // First player is already correctly set up in data
      adjustedData = { ...data };
    } else {
      // Swap player and opponent for second player perspective
      adjustedData = {
        ...data,
        playerName: data.opponentName || 'Opponent',
        opponentName: data.playerName || 'Player',
        playerRace: data.opponentRace || 'Terran',
        opponentRace: data.playerRace || 'Terran',
        // Invert result
        result: data.result === 'win' ? 'loss' : 'win',
        // Swap strengths and weaknesses for more accurate coaching
        strengths: data.recommendations || [],
        weaknesses: data.weaknesses || [],
        recommendations: data.strengths || []
      };
    }
    
    // Normalize data
    const normalizedData: AnalyzedReplayResult = {
      ...adjustedData,
      playerRace: normalizeRace(adjustedData.playerRace || 'Terran'),
      opponentRace: normalizeRace(adjustedData.opponentRace || 'Terran'),
      result: normalizeResult(adjustedData.result || 'win'),
      strengths: adjustedData.strengths || [],
      weaknesses: adjustedData.weaknesses || [],
      recommendations: adjustedData.recommendations || [],
      // Ensure buildOrder exists
      buildOrder: adjustedData.buildOrder || []
    };
    
    console.log("🎮 Final normalized data:", normalizedData);
    
    // Extend the parsedReplayData with ID for AnalysisResult
    const extendedData: ReplayData = {
      ...normalizedData,
      id: crypto.randomUUID(),
    };
    
    // Set the replay data
    setReplayData(extendedData);
    
    // Ensure analysis complete flag is set
    setAnalysisComplete(true);
    
    // Finally set analyzing to false
    setIsAnalyzing(false);
    
    // Refresh the replays list after successful upload
    fetchReplays();
    
    // Add a success toast to give user feedback
    toast({
      title: "Analyse abgeschlossen",
      description: `Analyse abgeschlossen für ${file?.name || 'dein Replay'}`,
    });
  };

  // Helper function for race normalization
  const normalizeRace = (race: string): 'Terran' | 'Protoss' | 'Zerg' => {
    if (!race) return 'Terran';
    const normalizedRace = race.toLowerCase();
    if (normalizedRace.includes('terr') || normalizedRace.includes('t')) return 'Terran';
    if (normalizedRace.includes('prot') || normalizedRace.includes('p')) return 'Protoss';
    if (normalizedRace.includes('zerg') || normalizedRace.includes('z')) return 'Zerg';
    return 'Terran'; 
  };
  
  // Helper for result normalization
  const normalizeResult = (result: string): 'win' | 'loss' => {
    if (!result) return 'win';
    const normalizedResult = result.toLowerCase();
    return normalizedResult.includes('win') ? 'win' : 'loss';
  };

  // Get recent uploads from replays list
  const recentReplays = replays.slice(0, 3);

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
                      {recentReplays.length > 0 ? (
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
