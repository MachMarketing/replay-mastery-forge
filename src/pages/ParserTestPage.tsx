
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { runBrowserParserTest } from '@/test/parserTest';
import { runE2EParserTest } from '@/test/e2eParserTest';
import { Badge } from '@/components/ui/badge';
import { createMockFileFromUint8Array } from '@/services/fileReader';
import { Loader2, CheckCircle, AlertCircle, FileUp, RefreshCcw } from 'lucide-react';

const ParserTestPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [e2eResults, setE2eResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isE2eTestRunning, setIsE2eTestRunning] = useState(false);

  // Create mock test data to test the parser without a real file
  const createMockReplayData = () => {
    // This creates a very simple binary structure that mimics a .rep file header
    // Real replay files are more complex, but this helps test the parsing flow
    const mockData = new Uint8Array([
      0x28, 0x42, 0x29, 0x77, 0x31, 0x2e, 0x31, 0x36, 0x2e, 0x31, 0x20, 0x72, 
      0x65, 0x70, 0x6c, 0x61, 0x79, 0x20, 0x75, 0x62, 0x64, 0x00, 0x00, 0x00
    ]);
    return createMockFileFromUint8Array(mockData, 'test_mock.rep');
  };

  // Capture console logs
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.log = (...args) => {
      originalConsoleLog(...args);
      setLogs(prev => [...prev, `[LOG] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`]);
    };
    
    console.error = (...args) => {
      originalConsoleError(...args);
      setLogs(prev => [...prev, `[ERROR] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`]);
    };
    
    console.warn = (...args) => {
      originalConsoleWarn(...args);
      setLogs(prev => [...prev, `[WARN] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`]);
    };
    
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setE2eResults(null); // Reset E2E results when file changes
    }
  };
  
  const runTest = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setTestResults(null);
    setLogs([]);
    
    try {
      console.log(`Running unified browser parser test with file: ${file.name} (${file.size} bytes)`);
      const results = await runBrowserParserTest(file);
      setTestResults(results);
      console.log('Test completed successfully!');
    } catch (err) {
      console.error('Test failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTest = async () => {
    if (selectedFile) {
      runTest(selectedFile);
    } else {
      console.log('No file selected, running with mock data');
      const mockFile = createMockReplayData();
      runTest(mockFile);
    }
  };
  
  // Add E2E test function
  const handleRunE2ETest = async () => {
    if (!selectedFile) {
      console.error('No file selected for E2E test');
      return;
    }
    
    setIsE2eTestRunning(true);
    setE2eResults(null);
    
    try {
      console.log('Running E2E parser flow comparison test...');
      const results = await runE2EParserTest(selectedFile);
      setE2eResults(results);
      console.log('E2E test results:', results);
      
      if (results.success) {
        console.log('✅ E2E test successful - parser flows produce identical results');
      } else {
        console.error('❌ E2E test failed - parser flows produce different results:', results.differences);
      }
    } catch (err) {
      console.error('E2E test error:', err);
      setE2eResults({
        success: false,
        message: `Test fehgeschlagen: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setIsE2eTestRunning(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Unified Parser Test Page</h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Replay Parser Test</CardTitle>
                <CardDescription>
                  Test the unified StarCraft replay parser directly in your browser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="replayFile" className="text-sm font-medium">
                      Select a replay file
                    </label>
                    <input
                      id="replayFile"
                      type="file"
                      accept=".rep"
                      onChange={handleFileChange}
                      className="border border-input rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2">
                      {selectedFile ? selectedFile.name : 'No file selected (will use mock data)'}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={handleRunTest}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileUp className="mr-2 h-4 w-4" />
                          Run Parser Test
                        </>
                      )}
                    </Button>
                    
                    {selectedFile && testResults && (
                      <Button 
                        onClick={handleRunE2ETest}
                        disabled={isE2eTestRunning || !selectedFile}
                        variant="outline"
                        className="flex-1"
                      >
                        {isE2eTestRunning ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running E2E Test...
                          </>
                        ) : (
                          <>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Run E2E Parser Flow Test
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {/* E2E Test Results */}
                  {e2eResults && (
                    <div className={`mt-4 p-3 rounded-md border ${e2eResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-start">
                        {e2eResults.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${e2eResults.success ? 'text-green-700' : 'text-red-700'}`}>
                            {e2eResults.message}
                          </p>
                          
                          {e2eResults.differences && Object.keys(e2eResults.differences).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs font-medium cursor-pointer">
                                Unterschiede anzeigen
                              </summary>
                              <div className="mt-2 text-xs bg-black/5 p-2 rounded overflow-auto max-h-40">
                                <pre>
                                  {JSON.stringify(e2eResults.differences, null, 2)}
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Test Results card */}
            <Card>
              <CardHeader>
                <CardTitle>Parser Status</CardTitle>
                <CardDescription>
                  {isLoading ? 'Running test...' : error 
                    ? 'Test failed with errors' 
                    : testResults ? 'Test completed successfully' : 'Waiting to run test'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p>Processing replay file...</p>
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                ) : testResults ? (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <h3 className="font-medium">Test completed successfully</h3>
                        <p className="text-sm text-gray-500">
                          The parser was able to process the replay file
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Parsed Data:</h3>
                      <div className="bg-secondary/20 p-3 rounded-md overflow-auto max-h-60">
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(testResults, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                    <p>Ready to run test</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Console Logs */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Debug Logs</CardTitle>
              <CardDescription>
                Console output from the parser process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 font-mono p-4 rounded-md overflow-auto h-96">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className={`text-xs mb-1 ${
                      log.includes('[ERROR]') 
                        ? 'text-red-400' 
                        : log.includes('[WARN]') 
                          ? 'text-yellow-400' 
                          : 'text-green-400'
                    }`}>
                      {log}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No logs yet. Run a test to see output.</p>
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

export default ParserTestPage;
