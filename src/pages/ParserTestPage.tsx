
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnalysisResult from '@/components/AnalysisResult';
import { parseReplay } from '@/services/replayParser';
import { ParsedReplayData } from '@/services/replayParser/types';

const ParserTestPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsingStatus, setParsingStatus] = useState<'idle' | 'uploading' | 'parsing' | 'complete' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedReplayData, setParsedReplayData] = useState<ParsedReplayData | null>(null);
  const [parsedOutput, setParsedOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
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
        // Simulate upload completion
        await new Promise(resolve => setTimeout(resolve, 1000));
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Now parse the replay
        setParsingStatus('parsing');
        
        // Use our unified parser
        console.log('Parsing with unified parser...');
        const result = await parseReplay(selectedFile);
        console.log('Parsing successful:', result);
        
        setParsedReplayData(result);
        setParsedOutput(JSON.stringify(result, null, 2));
        setParsingStatus('complete');
        
        toast({
          title: "Replay parsed successfully",
          description: `Analyzed: ${result.primaryPlayer.name} vs ${result.secondaryPlayer.name}`,
        });
      } catch (e) {
        clearInterval(progressInterval);
        throw e;
      }
    } catch (e) {
      setParsingStatus('error');
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      
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
        <h1 className="text-2xl font-bold mb-6">Replay Analyzer (Unified Parser)</h1>
        
        {parsedReplayData ? (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Game Analysis</h2>
              <Button variant="outline" onClick={() => setParsedReplayData(null)}>
                Upload Another Replay
              </Button>
            </div>
            <AnalysisResult data={parsedReplayData as any} isPremium={true} />
            
            {/* Debug JSON Output */}
            <div className="mt-8">
              <details className="border rounded-md">
                <summary className="p-2 font-medium cursor-pointer">
                  Show Raw JSON Data (Debug)
                </summary>
                <div className="p-4 border-t">
                  <Textarea 
                    className="font-mono text-xs h-[300px] bg-gray-100 dark:bg-gray-800"
                    value={parsedOutput} 
                    readOnly
                  />
                </div>
              </details>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>Upload your Starcraft: Brood War replay file to get professional-level analysis including:</p>
                  
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Detailed build order analysis</li>
                    <li>Key strengths and weaknesses in your gameplay</li>
                    <li>Strategic recommendations from pro-level coaches</li>
                    <li>Personalized training plan to improve your skills</li>
                    <li>Matchup-specific insights and counter strategies</li>
                  </ul>
                  
                  <div className="bg-primary/10 p-4 rounded-md mt-4">
                    <h3 className="font-medium mb-2">Why Use Our Analyzer?</h3>
                    <p className="text-sm">Our analysis engine is built using insights from professional Brood War players and coaches, 
                    designed to identify the specific patterns and mistakes that hold players back. Get the same level of 
                    feedback that pros receive, customized to your gameplay.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Debug Console */}
        {process.env.NODE_ENV === 'development' && !parsedReplayData && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Debug Console</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 font-mono p-4 rounded-md h-64 overflow-auto">
                <p className="text-sm text-gray-500">No logs yet. Parse a file to see debug output.</p>
                <p className="text-sm text-green-400 mt-2">Using unified screparsed parser</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </>
  );
};

export default ParserTestPage;
