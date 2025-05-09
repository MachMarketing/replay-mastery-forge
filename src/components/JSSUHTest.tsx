
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

// Define a more comprehensive interface for the screparsed module
interface ScreparsedModule {
  default?: any;
  ReplayParser?: any;
  ParsedReplay?: any;
  // Note: Don't explicitly define parse as it may not exist directly on the module
  [key: string]: any; // Allow other properties to be accessed dynamically
}

const ScreparsedTest: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');
  const [parserInfo, setParserInfo] = useState<any>(null);
  const [parserMethodsInfo, setParserMethodsInfo] = useState<string[]>([]);

  useEffect(() => {
    // On mount, check if screparsed is loaded
    const checkParser = async () => {
      try {
        console.log('Attempting to import screparsed module');
        // Try to import dynamically
        const mod = await import('screparsed') as ScreparsedModule;
        console.log('Successfully imported screparsed module', Object.keys(mod));
        
        // Get the detailed structure of the module
        let moduleDetails;
        try {
          moduleDetails = JSON.stringify(mod, (key, value) => {
            if (typeof value === 'function') return 'Function';
            return value;
          }, 2);
          console.log('Module structure:', moduleDetails);
        } catch (e) {
          console.error('Failed to stringify module structure:', e);
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
          console.log('Checking for parse methods in module');
          
          // Check for parse methods on the module and its exports
          if (mod.default && typeof mod.default === 'function') {
            methods.push('mod.default()');
            console.log('Found function as default export');
          }
          
          if (mod.ReplayParser) {
            methods.push('ReplayParser available');
            console.log('Found ReplayParser', typeof mod.ReplayParser);
            
            // Check if there are static methods on ReplayParser
            const replayParserMethods = Object.getOwnPropertyNames(mod.ReplayParser)
              .filter(name => typeof mod.ReplayParser[name] === 'function')
              .map(name => `ReplayParser.${name}()`);
            
            console.log('ReplayParser methods:', replayParserMethods);
            
            if (replayParserMethods.length > 0) {
              methods.push(...replayParserMethods);
            }
          }
          
          if (mod.ParsedReplay) {
            methods.push('ParsedReplay available');
            console.log('Found ParsedReplay', typeof mod.ParsedReplay);
            
            // Check if there are static methods on ParsedReplay
            const parsedReplayMethods = Object.getOwnPropertyNames(mod.ParsedReplay)
              .filter(name => typeof mod.ParsedReplay[name] === 'function')
              .map(name => `ParsedReplay.${name}()`);
            
            console.log('ParsedReplay methods:', parsedReplayMethods);
            
            if (parsedReplayMethods.length > 0) {
              methods.push(...parsedReplayMethods);
            }
          }
          
          // Check if mod.default has a parse method
          if (mod.default && typeof mod.default === 'object') {
            console.log('Default export is an object, checking for parse method');
            if (mod.default.parse && typeof mod.default.parse === 'function') {
              methods.push('mod.default.parse()');
              console.log('Found parse method on default export');
            } else {
              console.log('No parse method on default export', mod.default);
            }
          }
          
          // Check other exported functions
          Object.entries(mod).forEach(([key, value]) => {
            console.log(`Checking exported property: ${key}`, typeof value);
            if (typeof value === 'function' && 
                (key.toLowerCase().includes('parse') || 
                 (typeof (value as any).name === 'string' && 
                  (value as any).name.toLowerCase().includes('parse')))) {
              methods.push(`${key}()`);
              console.log(`Found potential parse function: ${key}`);
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
    console.log('Starting parser test');
    setStatus('testing');
    try {
      // Import the module dynamically
      console.log('Importing screparsed module for testing');
      const mod = await import('screparsed') as ScreparsedModule;
      console.log('Module imported successfully with keys:', Object.keys(mod));
      
      // Create a minimal test data
      const testData = new Uint8Array([
        0x28, 0x42, 0x29, 0x77, 0x31, 0x2e, 0x31, 0x36, 0x2e, 0x31, 
        0x20, 0x72, 0x65, 0x70, 0x6c, 0x61, 0x79, 0x20, 0x75, 0x62, 0x64
      ]);
      
      // Find a suitable parsing function
      let result = null;
      let parseFn: ((data: Uint8Array) => Promise<any> | any) | null = null;
      
      console.log('Available module keys:', Object.keys(mod));
      
      // IMPORTANT: Don't reference mod.parse directly since TypeScript doesn't recognize it
      // Instead, check if it exists at runtime
      
      // Check if the module has a parse function (dynamically)
      const hasParse = 'parse' in mod && typeof mod['parse'] === 'function';
      if (hasParse) {
        console.log('Found top-level parse function');
        parseFn = (data: Uint8Array) => {
          console.log('Calling top-level parse function');
          return (mod as any)['parse'](data);
        };
      }
      
      // Check for different parsing methods
      if (!parseFn && mod.ParsedReplay) {
        console.log('Checking ParsedReplay methods');
        
        // Check for methods that might be useful
        const methods = Object.getOwnPropertyNames(mod.ParsedReplay);
        console.log('Available ParsedReplay methods:', methods);
        
        for (const methodName of methods) {
          if (/from|parse|load|create/i.test(methodName) && 
              typeof mod.ParsedReplay[methodName] === 'function') {
            console.log(`Trying ParsedReplay.${methodName}`);
            const methodFn = mod.ParsedReplay[methodName];
            // Safe type casting with function check
            if (typeof methodFn === 'function') {
              parseFn = (data: Uint8Array) => {
                console.log(`Calling ParsedReplay.${methodName}`);
                // Use type assertion since we've verified it's a function
                return (methodFn as Function)(data);
              };
              break;
            }
          }
        }
      }
      
      if (!parseFn && mod.default) {
        console.log('Checking default export', typeof mod.default);
        if (typeof mod.default === 'function') {
          console.log('Default export is a function, using it directly');
          parseFn = (data: Uint8Array) => {
            console.log('Calling default export as function');
            // Convert to unknown first, then to Function to satisfy TypeScript
            return ((mod.default as unknown) as Function)(data);
          };
        } else if (mod.default) {
          // Check if mod.default has a parse property
          console.log('Default export is not a function, checking for parse method');
          const defaultModule = mod.default as any;
          console.log('Default module properties:', Object.keys(defaultModule));
          
          if (defaultModule && typeof defaultModule.parse === 'function') {
            console.log('Found parse method on default export');
            parseFn = (data: Uint8Array) => {
              console.log('Calling default.parse method');
              // Access the parse method using type assertion
              const parseMethod = defaultModule.parse;
              return parseMethod(data);
            };
          }
        }
      }
      
      // Last resort - try any function in the module
      if (!parseFn) {
        console.log('No standard parsing methods found, searching for any function');
        for (const key of Object.keys(mod)) {
          if (typeof mod[key] === 'function' && key !== 'ReplayParser' && key !== 'ParsedReplay') {
            console.log(`Trying ${key} function as a parser`);
            // Safely cast to a function only after checking
            const keyFn = mod[key];
            if (typeof keyFn === 'function') {
              parseFn = (data: Uint8Array) => {
                console.log(`Calling ${key} function`);
                return (keyFn as Function)(data);
              };
              console.log(`Using ${key} as parsing function`);
              break;
            }
          }
        }
      }
      
      if (parseFn) {
        try {
          console.log('Executing selected parse function with test data');
          result = await parseFn(testData);
          console.log('Parse result:', result);
          setStatus('success');
          setResult('Screparsed parser test successful! The module is working correctly.');
        } catch (err) {
          console.error('Parser function error:', err);
          throw err;
        }
      } else {
        console.error('No suitable parsing function found in screparsed module');
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
