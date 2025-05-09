
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReplayParser } from '@/hooks/useReplayParser';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExtendedReplayData } from '@/services/replayParser/types';
import { Loader2, AlertCircle, FileUp, Info } from 'lucide-react';
import AdvancedAnalysisResult from '@/components/AdvancedAnalysisResult';

const ParserTest = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExtendedReplayData | null>(null);
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
      setLogs(prev => [...prev, `[LOG] ${safeStringify(args)}`]);
    };
    
    console.error = (...args) => {
      originalError(...args);
      setLogs(prev => [...prev, `[ERROR] ${safeStringify(args)}`]);
      
      // Check for WASM errors
      const errorString = safeStringify(args);
      if (errorString.includes('WASM') || 
          errorString.includes('isTrusted') ||
          errorString.includes('execution error')) {
        setWasmError(true);
      }
    };
    
    console.warn = (...args) => {
      originalWarn(...args);
      setLogs(prev => [...prev, `[WARN] ${safeStringify(args)}`]);
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
  
  // Helper function to safely stringify any value
  const safeStringify = (args: any[]) => {
    return args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return `[Object that couldn't be stringified]`;
        }
      }
      return String(arg);
    }).join(' ');
  };
  
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
      const data = await parseReplay(selectedFile) as ExtendedReplayData;
      setResult(data);
      
      // Log extracted metrics for debugging
      if (data.advancedMetrics) {
        console.log('📊 Advanced Metrics Extracted:', {
          buildOrderItems: data.advancedMetrics.buildOrderTiming.player1.length,
          supplyBlocks: data.advancedMetrics.supplyManagement.player1.supplyBlocks.length,
          resourceData: data.advancedMetrics.resourceCollection.player1.collectionRate.minerals.length,
          productionEfficiency: data.advancedMetrics.productionEfficiency.player1.idleProductionTime.length > 0,
          actionsDistribution: data.advancedMetrics.actionDistribution.player1.macroPercentage
        });
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
          
          {result ? (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Erweiterte Replay Analyse</h2>
                <Button variant="outline" onClick={() => setResult(null)}>
                  Neues Replay hochladen
                </Button>
              </div>
              
              <AdvancedAnalysisResult data={result} isPremium={true} />
              
              {/* Debug JSON Output (hidden by default) */}
              <div className="mt-8">
                <details className="border rounded-md">
                  <summary className="p-2 font-medium cursor-pointer">
                    Raw JSON Data (Debug)
                  </summary>
                  <div className="p-4 border-t max-h-96 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap break-all">
                      {JSON.stringify(result, null, 2)}
                    </pre>
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
                        Test Enhanced Parser
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
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Diese erweiterte Parser-Version extrahiert die folgenden zusätzlichen Metriken:
                    </p>
                    
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li>Build Order mit exaktem Timing</li>
                      <li>Ressourceneffizienz und -sammlung</li>
                      <li>Supply-Management und Supply-Blocks</li>
                      <li>Armeewert und Einheitenkomposition über Zeit</li>
                      <li>Produktionseffizienz und Leerlaufzeiten</li>
                      <li>Expansions-Timing</li>
                      <li>Tech-Pfad und Forschung</li>
                      <li>Aufklärungseffektivität</li>
                      <li>Hotkey-Nutzung</li>
                      <li>Makro- vs. Mikro-Aktionsverteilung</li>
                    </ul>
                    
                    <Separator className="my-4" />
                    
                    <p className="text-sm text-muted-foreground">
                      Diese erweiterten Metriken bieten eine tiefere Einblicke in das Gameplay und helfen, 
                      spezifische Stärken und Schwächen zu identifizieren. Lade ein Replay hoch, um die 
                      vollständige Analyse zu sehen.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Debug Console */}
          {!result && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Debug Console</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 font-mono p-4 rounded-md h-64 overflow-auto">
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
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ParserTest;
