
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UploadBox from '@/components/UploadBox';
import AnalysisResult from '@/components/AnalysisResult';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

// Mock data for demonstration
const mockAnalysisData = {
  id: 'rep-123',
  playerName: 'Flash',
  opponentName: 'Jaedong',
  playerRace: 'Terran' as const,
  opponentRace: 'Zerg' as const,
  map: 'Fighting Spirit',
  duration: '15:43',
  date: '2025-04-28',
  result: 'win' as const,
  apm: 320,
  eapm: 280,
  matchup: 'TvZ',
  buildOrder: [
    { time: '00:10', supply: 8, action: 'Supply Depot' },
    { time: '00:45', supply: 10, action: 'Barracks' },
    { time: '01:25', supply: 12, action: 'Refinery' },
    { time: '01:50', supply: 14, action: 'Marine' },
    { time: '02:10', supply: 15, action: 'Factory' },
    { time: '03:00', supply: 18, action: 'Command Center' },
    { time: '03:25', supply: 19, action: 'Supply Depot' },
    { time: '03:40', supply: 21, action: 'Siege Tank' },
    { time: '04:10', supply: 23, action: 'Starport' },
    { time: '04:45', supply: 26, action: 'Medivac' },
  ],
  strengths: [
    'Excellent macro management with minimal supply blocks',
    'Effective resource management in the mid-game',
    'Good map control with multi-pronged attacks',
    'Strong defensive positioning against counter-attacks',
  ],
  weaknesses: [
    'Delayed tech transitions compared to standard builds',
    'Inconsistent scouting patterns in the early game',
    'Suboptimal unit composition against opponent\'s late-game army',
    'Multiple workers idle after harassment',
  ],
  recommendations: [
    'Focus on earlier scouting to adjust build accordingly',
    'Practice siege tank positioning for better area control',
    'Add more late-game anti-air capabilities',
    'Improve worker reassignment after harassment',
  ],
  trainingPlan: [
    { day: 1, focus: 'Early Game Scouting', drill: 'Practice sending first scout at optimal timing (1:30) in 5 consecutive games and record what you see.' },
    { day: 2, focus: 'Supply Timing', drill: 'Play 5 games focusing only on avoiding supply blocks in the first 7 minutes.' },
    { day: 3, focus: 'Siege Tank Positioning', drill: 'Practice positioning tanks on high ground and choke points against AI opponent.' },
    { day: 4, focus: 'Worker Management', drill: 'During harassment, practice quickly selecting idle workers and reassigning them to minerals.' },
    { day: 5, focus: 'Build Order Refinement', drill: 'Execute the recommended TvZ build order 5 times with perfect timing.' },
    { day: 6, focus: 'Multi-tasking', drill: 'Practice maintaining production while executing drop harassment.' },
    { day: 7, focus: 'Late Game Transitions', drill: 'Practice transitioning to appropriate late-game units against different compositions.' },
    { day: 8, focus: 'Micro Control', drill: 'Practice marine splitting against banelings in unit tester.' },
    { day: 9, focus: 'Economy Management', drill: 'Focus on consistent worker production and optimal saturation at all bases.' },
    { day: 10, focus: 'Full Game Integration', drill: 'Play 5 ranked games applying all concepts practiced, with focus on your weakest area.' },
  ],
  resourcesGraph: [
    { time: '01:00', minerals: 320, gas: 0 },
    { time: '03:00', minerals: 480, gas: 120 },
    { time: '05:00', minerals: 640, gas: 250 },
    { time: '07:00', minerals: 850, gas: 380 },
    { time: '09:00', minerals: 1100, gas: 520 },
    { time: '11:00', minerals: 1400, gas: 680 },
    { time: '13:00', minerals: 950, gas: 430 },
    { time: '15:00', minerals: 1200, gas: 580 },
  ],
};

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isPremium] = useState(false);

  const handleUploadComplete = (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsAnalyzing(true);
    
    // Simulate analysis process
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
    }, 3000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar isLoggedIn={true} username="Player123" />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">Analyze Your Replay</h1>
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

                  {/* Recent uploads section */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="text-sm font-medium mb-3">Recent Uploads</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded hover:bg-secondary/20 text-sm">
                        <span className="truncate mr-2">Flash vs Jaedong - TvZ.rep</span>
                        <span className="text-xs text-muted-foreground">Today</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded hover:bg-secondary/20 text-sm">
                        <span className="truncate mr-2">Bisu vs Stork - PvP.rep</span>
                        <span className="text-xs text-muted-foreground">Yesterday</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded hover:bg-secondary/20 text-sm">
                        <span className="truncate mr-2">Ladder Game - TvT.rep</span>
                        <span className="text-xs text-muted-foreground">2 days ago</span>
                      </div>
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
              ) : analysisComplete ? (
                <AnalysisResult data={mockAnalysisData} isPremium={isPremium} />
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
