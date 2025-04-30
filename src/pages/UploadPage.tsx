
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import AnalysisResult from '@/components/AnalysisResult';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useReplays, Replay } from '@/hooks/useReplays';
import { useToast } from '@/hooks/use-toast';
import { useReplayParser } from '@/hooks/useReplayParser';
import { ParsedReplayResult } from '@/services/replayParserService';

// Define an interface that extends ParsedReplayResult with the additional fields needed by AnalysisResult
interface ReplayData extends ParsedReplayResult {
  id?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isPremium] = useState(false);
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const { replays, fetchReplays } = useReplays();
  const { toast } = useToast();
  const { parseReplay, isProcessing, error: parserError } = useReplayParser();

  const handleUploadComplete = async (uploadedFile: File, parsedReplayData: ParsedReplayResult) => {
    setFile(uploadedFile);
    setIsAnalyzing(true);
    
    try {
      // Extend the parsedReplayData with the additional fields needed by AnalysisResult
      const extendedData: ReplayData = {
        ...parsedReplayData,
        // Add default values for the required fields
        id: crypto.randomUUID(),
        strengths: ["Good macro", "Consistent worker production"],
        weaknesses: ["Delayed expansion", "Insufficient scouting"],
        recommendations: ["Focus on early game scouting", "Work on build order optimization"]
      };
      
      setReplayData(extendedData);
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      
      // Refresh the replays list after successful upload
      fetchReplays();
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'There was an error analyzing your replay.',
        variant: 'destructive'
      });
      setIsAnalyzing(false);
    }
  };

  // Get recent uploads from replays list
  const recentReplays = replays.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Analyze Your Replay</h1>
          </div>
          
          <p className="text-muted-foreground mb-8">
            Upload your StarCraft: Brood War replay file to receive professional-level analysis 
            and personalized coaching.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Replay</CardTitle>
                  <CardDescription>
                    Upload a .rep file to analyze your gameplay
                  </CardDescription>
                </CardHeader>
                <CardContent>
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

                  {/* Parser status */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Parser Status</h3>
                      <div className={`h-2 w-2 rounded-full ${!parserError ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {parserError ? `Error: ${parserError}` : 'Go parser ready'}
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
                <div className="h-64 flex flex-col items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg">Analyzing your replay...</p>
                  <p className="text-sm text-muted-foreground mt-2">This typically takes 15-30 seconds</p>
                </div>
              ) : analysisComplete && replayData ? (
                <AnalysisResult data={replayData} isPremium={isPremium} />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center bg-secondary/20 rounded-lg border border-dashed border-border">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">No Replay Selected</h3>
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
