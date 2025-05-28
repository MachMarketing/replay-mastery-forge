
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedReplayData } from '@/services/nativeReplayParser/enhancedScrepWrapper';

interface ParserValidationDebugProps {
  enhancedData: EnhancedReplayData;
}

export function ParserValidationDebug({ enhancedData }: ParserValidationDebugProps) {
  const { enhanced } = enhancedData;
  const { debugInfo, validationData } = enhanced;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Parser Validation Debug
            <Badge variant={enhanced.hasDetailedActions ? "default" : "destructive"}>
              {debugInfo.qualityCheck.activeParser.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parser Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {debugInfo.screpJsSuccess ? '✅' : '❌'}
              </div>
              <div className="text-sm">screp-js</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {debugInfo.directParserSuccess ? '✅' : '❌'}
              </div>
              <div className="text-sm">Direct Parser</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {debugInfo.nativeParserSuccess ? '✅' : '❌'}
              </div>
              <div className="text-sm">Native Parser</div>
            </div>
          </div>

          {/* Quality Check Results */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Quality Assessment</h4>
              <div className="space-y-1 text-sm">
                <div>Direct Parser: {debugInfo.qualityCheck.directParserRealistic ? '✅ Realistic' : '❌ Unrealistic'}</div>
                <div>Native Parser: {debugInfo.qualityCheck.nativeParserRealistic ? '✅ Realistic' : '❌ Unrealistic'}</div>
                <div>Active Parser: <Badge>{debugInfo.qualityCheck.activeParser}</Badge></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Extraction Stats</h4>
              <div className="space-y-1 text-sm">
                <div>Actions Extracted: <Badge variant="outline">{debugInfo.actionsExtracted}</Badge></div>
                <div>Build Orders: <Badge variant="outline">{debugInfo.buildOrdersGenerated}</Badge></div>
                <div>Time Taken: <Badge variant="outline">{enhanced.extractionTime}ms</Badge></div>
              </div>
            </div>
          </div>

          {/* APM Comparison */}
          <div>
            <h4 className="font-semibold mb-2">APM Validation</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">screp-js APM</div>
                <div>{debugInfo.qualityCheck.apmValidation.screpAPM.join(', ')}</div>
              </div>
              <div>
                <div className="font-medium">Direct APM</div>
                <div>{debugInfo.qualityCheck.apmValidation.directAPM.join(', ')}</div>
              </div>
              <div>
                <div className="font-medium">Native APM</div>
                <div>{debugInfo.qualityCheck.apmValidation.nativeAPM.join(', ')}</div>
              </div>
              <div>
                <div className="font-medium text-green-600">Chosen APM</div>
                <div className="font-bold">{debugInfo.qualityCheck.apmValidation.chosenAPM.join(', ')}</div>
              </div>
            </div>
          </div>

          {/* Player Action Validation */}
          {validationData?.playersWithActions && (
            <div>
              <h4 className="font-semibold mb-2">Player Action Validation</h4>
              <div className="space-y-3">
                {Object.entries(validationData.playersWithActions).map(([playerId, data]: [string, any]) => (
                  <Card key={playerId} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium">Player {playerId}</h5>
                      <Badge variant={data.realisticAPM >= 50 ? "default" : "destructive"}>
                        APM: {data.realisticAPM}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Detected Commands</div>
                        <div className="text-2xl font-bold text-blue-600">{data.detectedCommands}</div>
                      </div>
                      <div>
                        <div className="font-medium">First Commands</div>
                        <div className="flex gap-1">
                          {data.firstCommands.map((cmd: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cmd}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">First Units</div>
                        <div className="space-y-1">
                          {data.firstUnits.map((unit: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs block">
                              {unit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Error Information */}
          {(debugInfo.directParserError || debugInfo.nativeParserError) && (
            <div>
              <h4 className="font-semibold mb-2 text-red-600">Errors</h4>
              <div className="space-y-2 text-sm">
                {debugInfo.directParserError && (
                  <div className="p-2 bg-red-50 rounded border border-red-200">
                    <div className="font-medium">Direct Parser Error:</div>
                    <div className="text-red-700">{debugInfo.directParserError}</div>
                  </div>
                )}
                {debugInfo.nativeParserError && (
                  <div className="p-2 bg-orange-50 rounded border border-orange-200">
                    <div className="font-medium">Native Parser Error:</div>
                    <div className="text-orange-700">{debugInfo.nativeParserError}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
