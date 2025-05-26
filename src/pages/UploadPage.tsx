
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useReplays, Replay } from '@/hooks/useReplays';
import { useToast } from '@/hooks/use-toast';
import { useReplayParser } from '@/hooks/useReplayParser';
import { ParsedReplayResult } from '@/services/replayParser/types';
import GamingAnalysisDisplay from '@/components/GamingAnalysisDisplay';

interface ReplayData extends ParsedReplayResult {
  id: string;
}

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isPremium] = useState(false);
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [rawParsedData, setRawParsedData] = useState<ParsedReplayResult | null>(null);
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
  
  // Handler for when upload is complete
  const handleUploadComplete = async (uploadedFile: File, parsedReplayData: ParsedReplayResult) => {
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
      // Set the raw parsed data first
      setRawParsedData(parsedReplayData);
      
      // Log player information
      console.log("🚀 Upload - Player information:", {
        primaryPlayer: parsedReplayData.primaryPlayer,
        secondaryPlayer: parsedReplayData.secondaryPlayer
      });
      
      // Pass the data directly to handlePlayerSelection after small delay
      setTimeout(() => {
        // This sets replayData and analysisComplete = true
        handlePlayerSelection(0, parsedReplayData);
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

  // Handle player perspective selection
  const handlePlayerSelection = (playerIndex: number, data: ParsedReplayResult = rawParsedData!) => {
    console.log("🎮 Processing player selection:", playerIndex);
    
    if (!data) {
      console.error('⛔ Cannot process player selection: No raw data available');
      setIsAnalyzing(false);
      return;
    }
    
    // Update the selected player index
    setSelectedPlayerIndex(playerIndex);
    
    try {
      // Create a ReplayData object with an ID
      const extendedData: ReplayData = {
        ...JSON.parse(JSON.stringify(data)), // Deep copy to avoid reference issues
        id: crypto.randomUUID(),
      };
      
      // Set the replay data
      setReplayData(extendedData);
      
      // Set analysis complete flag
      setAnalysisComplete(true);
      
      // Set analyzing to false
      setIsAnalyzing(false);
      
      // Add a success toast to give user feedback on selection
      const viewingPlayer = playerIndex === 0 ? data.primaryPlayer.name : data.secondaryPlayer.name;
      const viewingRace = playerIndex === 0 ? data.primaryPlayer.race : data.secondaryPlayer.race;
      
      toast({
        title: `Viewing ${viewingPlayer}'s Perspective`,
        description: `Analyzing from ${viewingRace} player's view`,
      });
      
    } catch (error) {
      console.error('⛔ Error creating player perspective:', error);
      toast({
        title: 'Fehler beim Wechseln der Perspektive',
        description: 'Es gab ein Problem beim Umschalten auf die gewählte Spieler-Perspektive.',
        variant: 'destructive'
      });
    }
  };

  // Get recent uploads from replays list
  const recentReplays = isLoading ? [] : replays.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Navbar />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Analyse deines Replays
            </h1>
          </div>
          
          <p className="text-gray-300 mb-8">
            Lade deine StarCraft: Brood War Replay-Datei hoch, um eine professionelle Analyse
            und persönliches Coaching zu erhalten.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-xl">
                <CardHeader className="bg-gray-800/50 border-b border-gray-700/50">
                  <CardTitle className="text-lg text-white">Replay hochladen</CardTitle>
                  <CardDescription className="text-gray-300">
                    Lade eine .rep Datei hoch, um dein Gameplay zu analysieren
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <UploadBox onUploadComplete={handleUploadComplete} />
                  
                  {/* Tips section */}
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2 text-white">Tipps:</h3>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Stelle sicher, dass du eine StarCraft: Brood War Replay-Datei (.rep) hochlädst</li>
                      <li>• Aktuelle Spiele bieten die relevanteste Analyse</li>
                      <li>• Spiele länger als 5 Minuten bieten bessere Einblicke</li>
                      <li>• Ladder-Spiele sind ideal für die Analyse</li>
                    </ul>
                  </div>

                  {/* Recent uploads section */}
                  <div className="mt-6 pt-6 border-t border-gray-700/50">
                    <h3 className="text-sm font-medium mb-3 text-white">Neueste Uploads</h3>
                    <div className="space-y-2">
                      {error ? (
                        <div className="p-3 rounded bg-red-900/20 text-red-400 text-sm border border-red-500/20">
                          <p>Fehler beim Laden der Replays: {error}</p>
                          <button 
                            onClick={fetchReplays} 
                            className="text-xs underline mt-1 hover:text-red-300"
                          >
                            Erneut versuchen
                          </button>
                        </div>
                      ) : isLoading ? (
                        <div className="flex justify-center p-4">
                          <div className="h-5 w-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
                        </div>
                      ) : recentReplays.length > 0 ? (
                        recentReplays.map((replay: Replay) => (
                          <div key={replay.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-800/30 text-sm border border-gray-700/30">
                            <span className="truncate mr-2 max-w-[160px] text-gray-300" title={replay.original_filename || `${replay.player_name || 'Unknown'} vs ${replay.opponent_name || 'Unknown'}`}>
                              {replay.original_filename || `${replay.player_name || 'Unknown'} vs ${replay.opponent_name || 'Unknown'}`}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(replay.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">Keine kürzlichen Uploads</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <GamingAnalysisDisplay
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
