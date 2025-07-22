
import React, { useState } from 'react';
import ReplayUpload from '@/components/ReplayUpload';
import GeneralAnalysis from '@/components/GeneralAnalysis';
import ProAnalysisDashboard from '@/components/ProAnalysisDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, BarChart3, Upload as UploadIcon } from 'lucide-react';

const Upload: React.FC = () => {
  const [replayData, setReplayData] = useState<any | null>(null);

  const handleParseComplete = (data: any) => {
    console.log('[Upload] Enhanced SC:R parse complete:', data);
    setReplayData(data);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          ReplayCoach.gg
        </h1>
        <p className="text-lg text-muted-foreground mb-2">
          Professional StarCraft: Remastered Replay Analysis
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI-Powered Coaching
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Professional Analysis
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <UploadIcon className="h-3 w-3" />
            SC:R Compatible
          </Badge>
        </div>
      </div>

      {!replayData ? (
        <ReplayUpload onParseComplete={handleParseComplete} />
      ) : (
        <div className="space-y-6">
          {/* Success Message */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-green-900 mb-2">
                  🎉 Analysis Complete!
                </h2>
                <p className="text-green-700 mb-4">
                  Your StarCraft Remastered replay has been successfully parsed and analyzed. 
                  Explore the professional insights below.
                </p>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <Badge variant="outline" className="bg-white">
                    ✅ Commands Extracted
                  </Badge>
                  <Badge variant="outline" className="bg-white">
                    ✅ Build Order Analyzed
                  </Badge>
                  <Badge variant="outline" className="bg-white">
                    ✅ AI Coaching Generated
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Tabs */}
          <Tabs defaultValue="pro" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pro" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Pro Analysis
              </TabsTrigger>
              <TabsTrigger value="detailed" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Detailed View
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pro" className="mt-6">
              <ProAnalysisDashboard data={replayData} />
            </TabsContent>
            
            <TabsContent value="detailed" className="mt-6">
              <GeneralAnalysis data={replayData} />
            </TabsContent>
          </Tabs>

          {/* Upload Another */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Ready for More Analysis?</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <button 
                onClick={() => setReplayData(null)}
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <UploadIcon className="mr-2 h-4 w-4" />
                Upload Another Replay
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Upload;
