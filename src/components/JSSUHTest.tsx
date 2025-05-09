
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

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
          moduleDetails: moduleDetails,
          hasParse: typeof mod.parse === 'function'
        });
        
        // Check for available parse methods instead of trying to instantiate
        try {
          // Check available methods in the module itself
          const methods = [];
          
          // Look for parse method on the module
          if (typeof mod.parse === 'function') {
            methods.push('module.parse()');
          }
          
          // Check other exported functions that might be parsers
          Object.entries(mod).forEach(([key, value]) => {
            if (typeof value === 'function' && 
                (key.toLowerCase().includes('parse') || 
                 value.name?.toLowerCase().includes('parse'))) {
              methods.push(`${key}()`);
            }
          });
          
          setParserMethodsInfo(methods.length > 0 ? methods : ['No parsing methods found']);
        } catch (e) {
          console.error('Error analyzing parser methods:', e);
          setParserMethodsInfo(['Error analyzing parser methods: ' + String(e)]);
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
      // Import the module dynamically
      const mod = await import('screparsed');
      
      // Check if the module has a parse function we can use
      if (typeof mod.parse !== 'function') {
        throw new Error('No parse function available in screparsed module');
      }
      
      // Create a minimal test data
      const testData = new Uint8Array([
        0x28, 0x42, 0x29, 0x77, 0x31, 0x2e, 0x31, 0x36, 0x2e, 0x31, 
        0x20, 0x72, 0x65, 0x70, 0x6c, 0x61, 0x79, 0x20, 0x75, 0x62, 0x64
      ]);
      
      // Try parsing the test data using the module's parse function
      try {
        await mod.parse(testData);
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
          <p>Has parse function: {parserInfo.hasParse ? 'Yes' : 'No'}</p>
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
