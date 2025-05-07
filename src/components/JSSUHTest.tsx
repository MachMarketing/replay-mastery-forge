
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import JSSUH from 'jssuh';

const JSSUHTest: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');
  const [jssuhInfo, setJssuhInfo] = useState<any>(null);

  useEffect(() => {
    // On mount, check if JSSUH is loaded and get its keys
    if (JSSUH) {
      setJssuhInfo({
        type: typeof JSSUH,
        hasReplayParser: !!JSSUH.ReplayParser,
        isFunction: typeof JSSUH === 'function',
        keys: typeof JSSUH === 'object' ? Object.keys(JSSUH) : []
      });
    }
  }, []);

  const runTest = async () => {
    setStatus('testing');
    try {
      // Log what JSSUH gives us
      console.log('JSSUH module:', JSSUH);
      
      // Try to find the ReplayParser
      const ReplayParserClass = JSSUH.ReplayParser || 
                               JSSUH.default?.ReplayParser || 
                               (typeof JSSUH === 'function' ? JSSUH : null);
      
      if (!ReplayParserClass) {
        throw new Error('Could not find ReplayParser in JSSUH module');
      }
      
      // Test instantiating the ReplayParser
      const parser = new ReplayParserClass();
      
      // Check if it has the expected methods
      const hasOnMethod = typeof parser.on === 'function';
      const hasWriteMethod = typeof parser.write === 'function';
      const hasEndMethod = typeof parser.end === 'function';
      
      if (!hasOnMethod || !hasWriteMethod || !hasEndMethod) {
        throw new Error('Parser instance is missing required methods');
      }
      
      // Create a minimal test data
      const testData = new Uint8Array([
        0x28, 0x42, 0x29, 0x77, 0x31, 0x2e, 0x31, 0x36, 0x2e, 0x31, 
        0x20, 0x72, 0x65, 0x70, 0x6C, 0x61, 0x79, 0x20, 0x75, 0x62, 0x64
      ]);
      
      // Set up event handlers
      let success = false;
      
      parser.on('error', (err: any) => {
        console.error('Parser test error:', err);
      });
      
      parser.on('end', () => {
        success = true;
        setStatus('success');
        setResult('JSSUH parser test successful! The module is working correctly.');
      });
      
      // Try to write data
      parser.write(testData);
      parser.end();
      
      // If we didn't get an end event within 1 second, consider it a failure
      setTimeout(() => {
        if (!success) {
          throw new Error('Parser did not emit end event');
        }
      }, 1000);
      
    } catch (error) {
      console.error('JSSUH test error:', error);
      setStatus('error');
      setResult(`JSSUH test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">JSSUH Test Tool</h3>
      
      {jssuhInfo && (
        <div className="bg-muted/50 p-3 rounded text-sm">
          <p>JSSUH type: {jssuhInfo.type}</p>
          <p>Has ReplayParser: {jssuhInfo.hasReplayParser ? 'Yes' : 'No'}</p>
          <p>Is function: {jssuhInfo.isFunction ? 'Yes' : 'No'}</p>
          <p>Available keys: {jssuhInfo.keys.length > 0 ? jssuhInfo.keys.join(', ') : 'None'}</p>
        </div>
      )}
      
      <Button 
        onClick={runTest}
        disabled={status === 'testing'}
      >
        Test JSSUH Parser
      </Button>
      
      {status === 'testing' && (
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p>Testing JSSUH parser...</p>
        </div>
      )}
      
      {status === 'success' && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      )}
      
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default JSSUHTest;
