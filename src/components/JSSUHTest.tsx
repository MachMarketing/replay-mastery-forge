
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { ReplayParser } from 'screparsed';

const ScreparsedTest: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');
  const [parserInfo, setParserInfo] = useState<any>(null);
  const [parserMethodsInfo, setParserMethodsInfo] = useState<string[]>([]);

  useEffect(() => {
    // On mount, check if screparsed is loaded
    const checkParser = async () => {
      try {
        // Try to import dynamically
        const mod = await import('screparsed');
        
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
        
        setParserInfo({
          type: typeof mod,
          hasReplayParser: !!mod.ReplayParser,
          isFunction: typeof mod.ReplayParser === 'function',
          keys: Object.keys(mod),
          defaultExport: mod.default ? 'Present' : 'Missing',
          moduleDetails: moduleDetails
        });
        
        // Instead of examining prototype methods, check for the constructor
        if (mod.ReplayParser) {
          try {
            const parser = new mod.ReplayParser();
            console.log('Parser instance created:', parser);
            
            // Get instance methods
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(parser))
              .filter(name => name !== 'constructor');
            
            setParserMethodsInfo(methods);
          } catch (e) {
            console.error('Error creating parser instance:', e);
            setParserMethodsInfo(['Error creating parser instance: ' + String(e)]);
          }
        }
      } catch (error) {
        console.error('Error checking parser:', error);
        setParserInfo({
          error: `Failed to load: ${error instanceof Error ? error.message : String(error)}`,
          type: 'unknown'
        });
      }
    };
    
    checkParser();
  }, []);

  const runTest = async () => {
    setStatus('testing');
    try {
      // Create a parser instance - this is the proper way to use ReplayParser
      const parser = new ReplayParser();
      console.log('Created parser instance for testing');
      
      // Check if the instance has a parse method
      if (typeof parser.parse !== 'function') {
        throw new Error('Parser instance is missing required parse method');
      }
      
      // Create a minimal test data
      const testData = new Uint8Array([
        0x28, 0x42, 0x29, 0x77, 0x31, 0x2e, 0x31, 0x36, 0x2e, 0x31, 
        0x20, 0x72, 0x65, 0x70, 0x6c, 0x61, 0x79, 0x20, 0x75, 0x62, 0x64
      ]);
      
      // Try parsing the test data using the instance method
      try {
        await parser.parse(testData);
        setStatus('success');
        setResult('Screparsed parser test successful! The module is working correctly.');
      } catch (err) {
        console.error('Parser test error:', err);
        throw err;
      }
      
    } catch (error) {
      console.error('Parser test error:', error);
      setStatus('error');
      setResult(`Parser test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Screparsed Parser Test Tool</h3>
      
      {parserInfo && (
        <div className="bg-muted/50 p-3 rounded text-sm">
          <p>Parser module type: {parserInfo.type}</p>
          <p>Has ReplayParser: {parserInfo.hasReplayParser ? 'Yes' : 'No'}</p>
          <p>Is function: {parserInfo.isFunction ? 'Yes' : 'No'}</p>
          <p>Available keys: {parserInfo.keys?.length > 0 ? parserInfo.keys.join(', ') : 'None'}</p>
          <p>Default export: {parserInfo.defaultExport}</p>
          
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
          
          {parserInfo.error && <p className="text-destructive">Error: {parserInfo.error}</p>}
          
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium">Show module details</summary>
            <pre className="mt-1 text-xs overflow-auto max-h-40 bg-black/10 p-2 rounded">
              {parserInfo.moduleDetails || 'No details available'}
            </pre>
          </details>
        </div>
      )}
      
      <Button 
        onClick={runTest}
        disabled={status === 'testing'}
      >
        Test Parser
      </Button>
      
      {status === 'testing' && (
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p>Testing parser...</p>
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

export default ScreparsedTest;
