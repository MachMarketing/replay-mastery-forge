
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface ServiceStatusCheckerProps {
  onStatusChange?: (isAvailable: boolean) => void;
}

const ServiceStatusChecker: React.FC<ServiceStatusCheckerProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [isChecking, setIsChecking] = useState(false);

  const checkServiceStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('http://localhost:8000/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        setStatus('available');
        onStatusChange?.(true);
      } else {
        setStatus('unavailable');
        onStatusChange?.(false);
      }
    } catch (error) {
      console.error('Service status check failed:', error);
      setStatus('unavailable');
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkServiceStatus();
  }, []);

  const renderStatus = () => {
    switch (status) {
      case 'checking':
        return (
          <Alert className="bg-blue-50 border-blue-200">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-800">
              Überprüfe SCREP-Service Status...
            </AlertDescription>
          </Alert>
        );
      
      case 'available':
        return (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <span className="font-medium">SCREP-Service verfügbar</span>
              <br />
              Ready für Replay-Analyse
            </AlertDescription>
          </Alert>
        );
      
      case 'unavailable':
        return (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <span className="font-medium">SCREP-Service nicht verfügbar</span>
              <br />
              <div className="mt-2 space-y-1 text-sm">
                <p>Service starten:</p>
                <code className="bg-red-100 px-2 py-1 rounded text-xs">
                  cd screp-service && go run main.go
                </code>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={checkServiceStatus}
                disabled={isChecking}
              >
                {isChecking ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Erneut prüfen
              </Button>
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="mb-4">
      {renderStatus()}
    </div>
  );
};

export default ServiceStatusChecker;
