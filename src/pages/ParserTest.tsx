
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEnhancedReplayParser } from '@/hooks/useEnhancedReplayParser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { JssuhReplayResult } from '@/services/nativeReplayParser/jssuhParser';

const ParserTest: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsingStatus, setParsingStatus] = useState<'idle' | 'uploading' | 'parsing' | 'complete' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedReplayData, setParsedReplayData] = useState<JssuhReplayResult | null>(null);
  const { parseReplay, error, progress } = useEnhancedReplayParser();
  const { toast } = useToast();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/octet-stream': ['.rep']
    },
    maxFiles: 1,
    onDrop: handleFileSelection
  });

  async function handleFileSelection(acceptedFiles: File[]) {
    if (acceptedFiles.length === 0) return;
    
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setParsedReplayData(null);
    setParsingStatus('uploading');
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => prev >= 90 ? 90 : prev + 10);
    }, 100);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setParsingStatus('parsing');
      
      const result = await parseReplay(selectedFile);
      
      setParsedReplayData(result);
      setParsingStatus('complete');
      
      // Get player names from enhanced data
      const mainPlayer = result.players[0]?.name || 'Unknown';
      const opponent = result.players[1]?.name || 'Unknown';
      
      toast({
        title: "Enhanced Replay erfolgreich analysiert",
        description: `${mainPlayer} vs ${opponent}`,
      });
      
    } catch (e) {
      clearInterval(progressInterval);
      setParsingStatus('error');
      const errorMessage = e instanceof Error ? e.message : 'Unbekannter Fehler';
      toast({
        title: "Fehler beim Enhanced Parsing",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }

  const renderProgressStatus = () => {
    switch (parsingStatus) {
      case 'uploading':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Datei wird hochgeladen...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        );
      case 'parsing':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Enhanced Replay wird analysiert...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        );
      case 'complete':
        return (
          <div className="text-sm text-green-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Enhanced Analyse abgeschlossen
          </div>
        );
      case 'error':
        return (
          <div className="text-sm text-red-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Enhanced Parse Fehler
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
        <h1 className="text-2xl font-bold mb-6">Enhanced Replay Analyzer</h1>
        
        {parsedReplayData ? (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Enhanced Analyse Ergebnis</h2>
              <Button variant="outline" onClick={() => setParsedReplayData(null)}>
                Neue Replay hochladen
              </Button>
            </div>
            <div className="bg-card p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">jssuh Parser Rohdaten</h3>
              <pre className="bg-muted p-4 rounded overflow-auto text-xs max-h-96">
                {JSON.stringify(parsedReplayData, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Replay hochladen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}`}
                >
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <p>Enhanced Replay-Datei hier ablegen...</p>
                  ) : (
                    <p>Enhanced Replay-Datei hierher ziehen oder klicken zum Auswählen</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">Nur .rep Dateien werden unterstützt</p>
                </div>
                
                {file && (
                  <div className="text-sm flex items-center">
                    <span className="font-medium mr-2">Ausgewählte Datei:</span>
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
                <CardTitle>Über den Enhanced Analyzer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>Lade deine StarCraft: Remastered Replay-Datei hoch für eine enhanced Analyse:</p>
                  
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Enhanced Command Extraktion mit Hex-Analyse</li>
                    <li>Echte APM-Berechnungen aus tatsächlichen Aktionen</li>
                    <li>Intelligente Build Order Generierung</li>
                    <li>Gameplay-Pattern Erkennung</li>
                    <li>Micro vs Macro Analyse</li>
                    <li>Realistische Performance-Metriken</li>
                  </ul>
                  
                  <div className="bg-primary/10 p-4 rounded-md mt-4">
                    <h3 className="font-medium mb-2">✅ Enhanced Data Mapper</h3>
                    <p className="text-sm">Unser Enhanced Parser kombiniert screp-js mit 
                    intelligenter Hex-Command-Analyse für echte StarCraft: Remastered 
                    Action-Daten und realistische Gameplay-Insights.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default ParserTest;
