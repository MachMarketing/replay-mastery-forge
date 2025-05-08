
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import axios, { AxiosError } from 'axios';
import { useDropzone } from 'react-dropzone';
import { useReplayParser } from '@/hooks/useReplayParser';
import { AnalyzedReplayResult } from '@/services/replayParserService';
import { uploadReplayFile } from '@/services/uploadService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Mock data for testing
const mockReplayData: Partial<AnalyzedReplayResult> = {
  playerName: "TestPlayer",
  opponentName: "TestOpponent",
  playerRace: "Terran",
  opponentRace: "Protoss",
  map: "Fighting Spirit",
  matchup: "TvP",
  duration: "15:42",
  durationMS: 942000,
  date: "2023-05-10",
  result: "win",
  apm: 180,
  eapm: 150,
  buildOrder: [
    { time: "0:00", supply: 4, action: "Start" },
    { time: "0:42", supply: 9, action: "Supply Depot" },
    { time: "1:30", supply: 12, action: "Barracks" },
    { time: "2:15", supply: 15, action: "Marine" }
  ],
  strengths: [
    "Good early game scouting",
    "Consistent worker production"
  ],
  weaknesses: [
    "Supply blocks at key moments",
    "Late game unit composition"
  ],
  recommendations: [
    "Focus on maintaining constant worker production",
    "Scout more aggressively in mid-game"
  ],
  trainingPlan: [
    { day: 1, focus: "Build order optimization", drill: "Practice standard opening 10 times" },
    { day: 2, focus: "Crisis management", drill: "Defend against early rush strategies" }
  ]
};

const ParserTestPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsingStatus, setParsingStatus] = useState<'idle' | 'uploading' | 'parsing' | 'complete' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedReplayData, setParsedReplayData] = useState<AnalyzedReplayResult | null>(null);
  const [parsedOutput, setParsedOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { parseReplay } = useReplayParser();
  const { toast } = useToast();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/octet-stream': ['.rep']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileSelection(acceptedFiles[0]);
      }
    }
  });

  // For mock testing
  const handleUseMockData = () => {
    setParsingStatus('complete');
    setParsedReplayData(mockReplayData as AnalyzedReplayResult);
    setParsedOutput(JSON.stringify(mockReplayData, null, 2));
    toast({
      title: "Mock data loaded",
      description: "Using test data for development",
    });
  };

  const handleFileSelection = async (selectedFile: File) => {
    try {
      setFile(selectedFile);
      setError(null);
      setParsedReplayData(null);
      setParsedOutput('');
      setParsingStatus('uploading');
      
      // Start with upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);
      
      try {
        // Upload file first
        const fileData = await uploadReplayFile(selectedFile);
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Now parse the replay
        setParsingStatus('parsing');
        const result = await parseReplay(selectedFile);
        
        if (!result) {
          throw new Error("Failed to parse replay - no result returned");
        }
        
        setParsedReplayData(result);
        setParsedOutput(JSON.stringify(result, null, 2));
        setParsingStatus('complete');
        
        toast({
          title: "Replay parsed successfully",
          description: `Analyzed: ${result.playerName} vs ${result.opponentName}`,
        });
      } catch (e) {
        clearInterval(progressInterval);
        throw e;
      }
    } catch (e) {
      setParsingStatus('error');
      const errorMessage = e instanceof AxiosError 
        ? e.response?.data?.message || e.message
        : e instanceof Error 
          ? e.message 
          : 'Unknown error occurred';
      
      setError(errorMessage);
      toast({
        title: "Error parsing replay",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const renderProgressStatus = () => {
    switch (parsingStatus) {
      case 'uploading':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading replay file...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        );
      case 'parsing':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Parsing replay data...</span>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse ml-1" style={{ animationDelay: '0.2s' }}></div>
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse ml-1" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
            <Progress value={100} className="h-2 animate-pulse" />
          </div>
        );
      case 'complete':
        return (
          <div className="text-sm text-green-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Parsing complete
          </div>
        );
      case 'error':
        return (
          <div className="text-sm text-red-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Error occurred
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">
        <h1 className="text-2xl font-bold mb-6">Replay Parser Test Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Replay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}`}
                >
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <p>Drop the replay file here...</p>
                  ) : (
                    <p>Drag & drop a replay file here, or click to select</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">Only .rep files are accepted</p>
                </div>
                
                {file && (
                  <div className="text-sm flex items-center">
                    <span className="font-medium mr-2">Selected file:</span>
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-gray-500 ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
                
                {renderProgressStatus()}
                
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleUseMockData}
                    variant="outline"
                  >
                    Use Mock Data
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {parsedReplayData && (
              <Card>
                <CardHeader>
                  <CardTitle>Parsed Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Player</p>
                        <p>{parsedReplayData.playerName} ({parsedReplayData.playerRace})</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Opponent</p>
                        <p>{parsedReplayData.opponentName} ({parsedReplayData.opponentRace})</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Map</p>
                        <p>{parsedReplayData.map}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p>{parsedReplayData.duration}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">APM</p>
                        <p>{parsedReplayData.apm}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Result</p>
                        <p className={parsedReplayData.result === 'win' ? 'text-green-500' : 'text-red-500'}>
                          {parsedReplayData.result === 'win' ? 'Victory' : 'Defeat'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Strengths</p>
                      <ul className="list-disc list-inside">
                        {parsedReplayData.strengths?.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Build Order (First Few Items)</p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left">Time</th>
                              <th className="text-left">Supply</th>
                              <th className="text-left">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedReplayData.buildOrder?.slice(0, 5).map((item, index) => (
                              <tr key={index}>
                                <td>{item.time}</td>
                                <td>{item.supply}</td>
                                <td>{item.action}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>JSON Output</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                className="font-mono text-xs h-[600px] bg-gray-100 dark:bg-gray-800"
                value={parsedOutput} 
                readOnly
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ParserTestPage;
