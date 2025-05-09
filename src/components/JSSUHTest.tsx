
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
          hasParseMethod: false // We'll update this when checking methods
        });
        
        // Check for available parse methods
        try {
          // Check available methods in the module itself
          const methods = [];
          
          // Check for parse methods on the module and its exports
          if (mod.default && typeof mod.default === 'function') {
            methods.push('mod.default()');
          }
          
          if (mod.ReplayParser) {
            methods.push('ReplayParser available');
            
            // Check if there are static methods on ReplayParser
            const replayParserMethods = Object.getOwnPropertyNames(mod.ReplayParser)
              .filter(name => typeof mod.ReplayParser[name] === 'function')
              .map(name => `ReplayParser.${name}()`);
            
            if (replayParserMethods.length > 0) {
              methods.push(...replayParserMethods);
            }
          }
          
          if (mod.ParsedReplay) {
            methods.push('ParsedReplay available');
            
            // Check if there are static methods on ParsedReplay
            const parsedReplayMethods = Object.getOwnPropertyNames(mod.ParsedReplay)
              .filter(name => typeof mod.ParsedReplay[name] === 'function')
              .map(name => `ParsedReplay.${name}()`);
            
            if (parsedReplayMethods.length > 0) {
              methods.push(...parsedReplayMethods);
            }
          }
          
          // Check other exported functions
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
      
      // Create a minimal test data
      const testData = new Uint8Array([
        0x28, 0x42, 0x29, 0x77, 0x31, 0x2e, 0x31, 0x36, 0x2e, 0x31, 
        0x20, 0x72, 0x65, 0x70, 0x6c, 0x61, 0x79, 0x20, 0x75, 0x62, 0x64
      ]);
      
      // Find a suitable parsing function
      let result = null;
      let parseFn: Function | null = null;
      
      console.log('Available module keys:', Object.keys(mod));
      
      // Check for different parsing methods
      if (mod.ParsedReplay && typeof mod.ParsedReplay.fromBuffer === 'function') {
        console.log('Using ParsedReplay.fromBuffer');
        parseFn = mod.ParsedReplay.fromBuffer;
      } else if (mod.ReplayParser && mod.ReplayParser.prototype && typeof mod.ReplayParser.prototype.parse === 'function') {
        console.log('Using ReplayParser prototype method');
        // This is just for detection, we won't use it directly due to private constructor
      } else if (mod.default && typeof mod.default.parse === 'function') {
        console.log('Using default export parse method');
        parseFn = mod.default.parse;
      } else if (mod.default && typeof mod.default === 'function') {
        console.log('Using default export as function');
        parseFn = mod.default;
      }
      
      if (parseFn) {
        try {
          result = await parseFn(testData);
          setStatus('success');
          setResult('Screparsed parser test successful! The module is working correctly.');
        } catch (err) {
          console.error('Parser function error:', err);
          throw err;
        }
      } else {
        throw new Error('No suitable parsing function found in screparsed module');
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
