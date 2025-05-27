
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

interface ServiceStatusCheckerProps {
  onStatusChange?: (isAvailable: boolean) => void;
}

const ServiceStatusChecker: React.FC<ServiceStatusCheckerProps> = ({ onStatusChange }) => {
  // Since we're using screparsed (browser-based), the service is always available
  React.useEffect(() => {
    onStatusChange?.(true);
  }, [onStatusChange]);

  return (
    <div className="mb-4">
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <span className="font-medium">Screparsed Parser bereit</span>
          <br />
          Browser-basierte Replay-Analyse (kein lokaler Service erforderlich)
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ServiceStatusChecker;
