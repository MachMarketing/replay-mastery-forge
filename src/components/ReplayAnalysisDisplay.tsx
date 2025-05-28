
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { ReplayAnalysisResult } from '@/services/nativeReplayParser/replayAnalyzer';

interface ReplayAnalysisDisplayProps {
  analysis: ReplayAnalysisResult;
}

const ReplayAnalysisDisplay: React.FC<ReplayAnalysisDisplayProps> = ({ analysis }) => {
  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Datei-Analyse: {analysis.fileInfo.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Info */}
          <div>
            <h4 className="font-medium mb-2">Datei-Informationen</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Größe:</span>
                <p className="font-mono">{(analysis.fileInfo.size / 1024).toFixed(2)} KB</p>
              </div>
              <div>
                <span className="text-muted-foreground">Typ:</span>
                <p className="font-mono">{analysis.fileInfo.type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Magic:</span>
                <p className="font-mono">{analysis.formatDetection.magic}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Format Detection */}
          <div>
            <h4 className="font-medium mb-2">Format-Erkennung</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={analysis.formatDetection.isCompressed ? "destructive" : "default"}>
                  {analysis.formatDetection.isCompressed ? "Komprimiert" : "Unkomprimiert"}
                </Badge>
                <Badge variant="outline">{analysis.formatDetection.detectedFormat}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Geschätzte Version:</strong> {analysis.formatDetection.estimatedVersion}
              </p>
            </div>
          </div>

          <Separator />

          {/* screp-js Compatibility */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              {getStatusIcon(analysis.screpJsCompatibility.parseSuccess)}
              screp-js Kompatibilität
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={analysis.screpJsCompatibility.available ? "default" : "destructive"}>
                  {analysis.screpJsCompatibility.available ? "Verfügbar" : "Nicht verfügbar"}
                </Badge>
                <Badge variant={analysis.screpJsCompatibility.parseSuccess ? "default" : "destructive"}>
                  {analysis.screpJsCompatibility.parseSuccess ? "Parse erfolgreich" : "Parse fehlgeschlagen"}
                </Badge>
              </div>
              {analysis.screpJsCompatibility.error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  <strong>Fehler:</strong> {analysis.screpJsCompatibility.error}
                </p>
              )}
              {analysis.screpJsCompatibility.resultKeys && (
                <p className="text-sm text-muted-foreground">
                  <strong>Ergebnis-Keys:</strong> {analysis.screpJsCompatibility.resultKeys.join(', ')}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Custom Parser Results */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              {getStatusIcon(analysis.customParserResults.parseSuccess)}
              Custom Parser Ergebnisse
            </h4>
            {analysis.customParserResults.parseSuccess && analysis.customParserResults.extractedData ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Map:</span>
                  <p className="font-mono">{analysis.customParserResults.extractedData.mapName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Spieler:</span>
                  <p className="font-mono">{analysis.customParserResults.extractedData.playersFound}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dauer:</span>
                  <p className="font-mono">{analysis.customParserResults.extractedData.duration}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Commands:</span>
                  <p className="font-mono">{analysis.customParserResults.extractedData.commandsFound}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Spieler-Namen:</span>
                  <p className="font-mono text-xs">
                    {analysis.customParserResults.extractedData.playerNames.join(', ')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                <strong>Fehler:</strong> {analysis.customParserResults.error}
              </p>
            )}
          </div>

          <Separator />

          {/* Recommendations */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Empfehlungen
            </h4>
            <ul className="space-y-1 text-sm">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Hex Dumps */}
          <div>
            <h4 className="font-medium mb-2">Hex-Dumps (Debug)</h4>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-1">Datei-Header:</h5>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {analysis.hexDump.first256Bytes}
                </pre>
              </div>
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-1">Spieler-Daten:</h5>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {analysis.hexDump.playerDataSection}
                </pre>
              </div>
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-1">Commands-Bereich:</h5>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {analysis.hexDump.commandsSection}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReplayAnalysisDisplay;
