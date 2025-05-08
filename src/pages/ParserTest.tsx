
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReplayParser } from '@/hooks/useReplayParser';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, FileUp, Info } from 'lucide-react';

const ParserTest = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [wasmError, setWasmError] = useState<boolean>(false);
  const { parseReplay, isProcessing, error } = useReplayParser();
  
  // Capture console logs for debugging
  React.useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, `[LOG] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ')}`]);
    };
    
    console.error = (...args) => {
      originalError(...args);
      setLogs(prev => [...prev, `[ERROR] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ')}`]);
      
      // Check for WASM errors
      const errorString = args.join(' ');
      if (errorString.includes('WASM') || 
          errorString.includes('isTrusted') ||
          errorString.includes('execution error')) {
        setWasmError(true);
      }
    };
    
    console.warn = (...args) => {
      originalWarn(...args);
      setLogs(prev => [...prev, `[WARN] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ')}`]);
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async () => {
    if (!selectedFile) return;
    
    setLogs([]);
    setResult(null);
    setWasmError(false);
    try {
      const data = await parseReplay(selectedFile);
      setResult(data);
      
      // Check if we got fallback data
      if (data && data.primaryPlayer && data.primaryPlayer.name === 'Player' && !data.primaryPlayer.buildOrder.length) {
        setWasmError(true);
      }
    } catch (err) {
      console.error('Parser test error:', err);
      if (err instanceof Error && 
         (err.message.includes('WASM') || 
          err.message.includes('execution'))) {
        setWasmError(true);
      }
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">Parser Test Tool</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Replay</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".rep"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90"
                  />
                  
                  <div className="text-sm">
                    {selectedFile ? (
                      <p>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</p>
                    ) : (
                      <p>No file selected</p>
                    )}
                  </div>
                  
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!selectedFile || isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileUp className="mr-2 h-4 w-4" />
                        Test Parser
                      </>
                    )}
                  </Button>
                  
                  {wasmError && (
                    <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                      <Info className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <span className="font-medium">Browser compatibility issue detected.</span> 
                        <br />
                        The WASM parser may not be fully compatible with your browser.
                        Using fallback parser with limited functionality.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Results Section */}
            <Card>
              <CardHeader>
                <CardTitle>Parser Results</CardTitle>
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="mt-4">Processing replay file...</p>
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : result ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-lg">Replay Information:</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="text-sm">Player:</div>
                        <div className="text-sm font-medium">{result.playerName}</div>
                        
                        <div className="text-sm">Opponent:</div>
                        <div className="text-sm font-medium">{result.opponentName}</div>
                        
                        <div className="text-sm">Map:</div>
                        <div className="text-sm font-medium">{result.map}</div>
                        
                        <div className="text-sm">Matchup:</div>
                        <div className="text-sm font-medium">{result.matchup}</div>
                        
                        <div className="text-sm">Result:</div>
                        <div className="text-sm font-medium">{result.result}</div>
                        
                        <div className="text-sm">APM:</div>
                        <div className="text-sm font-medium">{result.apm}</div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium text-lg">Raw JSON:</h3>
                      <div className="bg-secondary/20 p-2 rounded-md mt-2 max-h-60 overflow-auto">
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-10">
                    <p>Upload a .rep file to see parsing results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Debug Console */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Debug Console</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 font-mono p-4 rounded-md h-96 overflow-auto">
                {logs.length > 0 ? (
                  logs.map((log, i) => (
                    <div 
                      key={i} 
                      className={`text-xs mb-1 ${
                        log.includes('[ERROR]') ? 'text-red-500' : 
                        log.includes('[WARN]') ? 'text-yellow-400' : 
                        'text-green-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No logs yet. Parse a file to see debug output.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ParserTest;
