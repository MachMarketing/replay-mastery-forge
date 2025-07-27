import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDropzone } from 'react-dropzone';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { EnhancedDataMapper, EnhancedReplayResult } from '@/services/nativeReplayParser/enhancedDataMapper';
import PlayerSelector from '@/components/PlayerSelector';

const ParserDebug: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');
  const [rawOutput, setRawOutput] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  const [parsedData, setParsedData] = useState<EnhancedReplayResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Check if enhanced parser is available
  useEffect(() => {
    console.log('Enhanced Data Mapper loaded and ready');
    setResult('Enhanced Data Mapper successfully loaded');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/octet-stream': ['.rep']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    }
  });
  
  const handleParseFile = async () => {
    if (!file) return;
    
    setStatus('parsing');
    setProgress(0);
    setErrorMessage(null);
    setRawOutput('');
    setParsedData(null);
    
    // Progress simulation
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 95));
    }, 100);
    
    try {
      console.log('Parsing file with Enhanced Data Mapper:', file.name);
      const result = await EnhancedDataMapper.parseReplay(file);
      
      clearInterval(interval);
      setProgress(100);
      setStatus('success');
      
      console.log('Enhanced parse result:', result);
      setRawOutput(JSON.stringify(result, null, 2));
      setParsedData(result);
      
      const player1 = result.players[0]?.name || 'Unknown';
      const player2 = result.players[1]?.name || 'Unknown';
      setResult(`Enhanced parsing successful: ${player1} vs ${player2} | Quality: ${result.dataQuality.reliability}`);
    } catch (error) {
      clearInterval(interval);
      setProgress(0);
      setStatus('error');
      
      const message = error instanceof Error ? error.message : String(error);
      console.error('Enhanced parsing error:', message);
      setErrorMessage(message);
      setResult(`Enhanced parsing failed for ${file.name}: ${message}`);
    }
  };

  const handlePlayerSelect = (index: number) => {
    setSelectedPlayerIndex(index);
  };

  const renderProgressStatus = () => {
    if (status === 'parsing') {
      return (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Parsing...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      );
    }
    return null;
  };
  
  return (
    <>
      <Navbar />
      <div className="container mx-auto py-12 mt-16">
        <h1 className="text-3xl font-bold mb-8">BWRemastered Parser Debug</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Replay File Parser</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded p-8 text-center cursor-pointer ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <p>{isDragActive ? "Drop the file here" : "Drag & drop a .rep file here, or click to select"}</p>
                )}
              </div>
              
              {file && (
                <Button 
                  onClick={handleParseFile} 
                  disabled={status === 'parsing'} 
                  className="w-full"
                >
                  Parse Replay
                </Button>
              )}
              
              {renderProgressStatus()}
              
              {status === 'success' && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>{result}</AlertDescription>
                </Alert>
              )}
              
              {status === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              {parsedData && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Player Selection</h3>
                  <PlayerSelector 
                    player1={{
                      name: parsedData.players[0]?.name || 'Unknown',
                      race: parsedData.players[0]?.race || 'Unknown',
                      apm: parsedData.realMetrics[0]?.apm || 0
                    }}
                    player2={{
                      name: parsedData.players[1]?.name || 'Unknown',
                      race: parsedData.players[1]?.race || 'Unknown',
                      apm: parsedData.realMetrics[1]?.apm || 0
                    }}
                    selectedPlayerIndex={selectedPlayerIndex}
                    onPlayerSelect={handlePlayerSelect}
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Parser Output</CardTitle>
            </CardHeader>
            <CardContent>
              {parsedData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium mb-1">Player {selectedPlayerIndex + 1}</h3>
                      <p>Name: {selectedPlayerIndex === 0 ? parsedData.players[0]?.name : parsedData.players[1]?.name}</p>
                      <p>Race: {selectedPlayerIndex === 0 ? parsedData.players[0]?.race : parsedData.players[1]?.race}</p>
                      <p>APM: {parsedData.realMetrics[selectedPlayerIndex]?.apm || 0}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-1">Game Info</h3>
                      <p>Map: {parsedData.header.mapName}</p>
                      <p>Duration: {parsedData.header.duration}</p>
                      <p>Frames: {parsedData.header.frames}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1">Build Order</h3>
                    <div className="max-h-64 overflow-y-auto border rounded-md p-2 text-sm">
                      {(parsedData.enhancedBuildOrders[selectedPlayerIndex] || [])?.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <span>{item.time}</span>
                          <span>Supply: {item.supply}</span>
                          <span>{item.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <details className="border rounded">
                    <summary className="p-2 cursor-pointer font-medium">Raw JSON Output</summary>
                    <Textarea 
                      className="h-64 font-mono text-xs" 
                      value={rawOutput}
                      readOnly
                    />
                  </details>
                </div>
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <p>Upload and parse a replay to see output</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ParserDebug;
