
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { getReplayParserConstructor } from '@/services/replayParser/jssuhLoader';
import { Readable } from 'stream-browserify';

const JSSUHTest: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');
  const [jssuhInfo, setJssuhInfo] = useState<any>(null);
  const [parserMethodsInfo, setParserMethodsInfo] = useState<string[]>([]);

  useEffect(() => {
    // On mount, check if JSSUH is loaded
    const checkJSSUH = async () => {
      try {
        // Try to import dynamically
        const mod = await import('jssuh');
        
        // Get the detailed structure of the module
        let moduleDetails;
        try {
          moduleDetails = JSON.stringify(mod, (key, value) => {
            if (typeof value === 'function') return 'Function';
            return value;
          }, 2);
        } catch (e) {
          moduleDetails = 'Could not stringify module structure';
        }
        
        setJssuhInfo({
          type: typeof mod,
          hasReplayParser: !!mod.ReplayParser,
          isFunction: typeof mod.ReplayParser === 'function',
          keys: Object.keys(mod),
          defaultExport: mod.default ? 'Present' : 'Missing',
          moduleDetails: moduleDetails
        });
        
        // If we can create an instance, examine its methods
        if (typeof mod.ReplayParser === 'function') {
          try {
            const parser = new mod.ReplayParser({ encoding: 'cp1252' });
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(parser))
              .filter(name => typeof parser[name] === 'function' && name !== 'constructor');
            setParserMethodsInfo(methods);
          } catch (e) {
            setParserMethodsInfo(['Error creating parser instance: ' + String(e)]);
          }
        }
      } catch (error) {
        console.error('Error checking JSSUH:', error);
        setJssuhInfo({
          error: `Failed to load: ${error instanceof Error ? error.message : String(error)}`,
          type: 'unknown'
        });
      }
    };
    
    checkJSSUH();
  }, []);

  const runTest = async () => {
    setStatus('testing');
    try {
      // Use our getReplayParserConstructor helper
      const ReplayParserClass = await getReplayParserConstructor();
      console.log('JSSUH ReplayParser constructor:', ReplayParserClass);
      
      // Create parser with proper encoding option
      const parser = new ReplayParserClass({ encoding: 'cp1252' });
      
      // Check if it has the expected methods
      const hasOnMethod = typeof parser.on === 'function';
      const hasWriteMethod = typeof parser.write === 'function';
      const hasEndMethod = typeof parser.end === 'function';
      const hasPipeChkMethod = typeof parser.pipeChk === 'function';
      
      if (!hasOnMethod || !hasWriteMethod || !hasEndMethod) {
        throw new Error('Parser instance is missing required methods');
      }
      
      // Create a minimal test data
      const testData = new Uint8Array([
        0x28, 0x42, 0x29, 0x77, 0x31, 0x2e, 0x31, 0x36, 0x2e, 0x31, 
        0x20, 0x72, 0x65, 0x70, 0x6c, 0x61, 0x79, 0x20, 0x75, 0x62, 0x64
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
      
      // Try to write data using pipeChk if available
      if (hasPipeChkMethod) {
        console.log('Using pipeChk method for test');
        
        const readable = new Readable({
          read() {
            this.push(Buffer.from(testData));
            this.push(null);
          }
        });
        
        parser.pipeChk(readable);
      } else {
        // Fallback to write+end
        console.log('Using write+end method for test');
        parser.write(testData);
        parser.end();
      }
      
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
          <p>Available keys: {jssuhInfo.keys?.length > 0 ? jssuhInfo.keys.join(', ') : 'None'}</p>
          <p>Default export: {jssuhInfo.defaultExport}</p>
          
          {parserMethodsInfo.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Parser methods:</p>
              <ul className="list-disc pl-5 text-xs">
                {parserMethodsInfo.map((method, i) => (
                  <li key={i}>{method}</li>
                ))}
              </ul>
            </div>
          )}
          
          {jssuhInfo.error && <p className="text-destructive">Error: {jssuhInfo.error}</p>}
          
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium">Show module details</summary>
            <pre className="mt-1 text-xs overflow-auto max-h-40 bg-black/10 p-2 rounded">
              {jssuhInfo.moduleDetails || 'No details available'}
            </pre>
          </details>
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
