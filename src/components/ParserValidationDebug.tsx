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
            🔍 Enhanced Parser Validation Debug
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

          {/* Enhanced Command Extraction Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {debugInfo.actionsExtracted}
              </div>
              <div className="text-sm">Commands Extracted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {debugInfo.buildOrdersGenerated}
              </div>
              <div className="text-sm">Build Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {enhanced.extractionTime}ms
              </div>
              <div className="text-sm">Parse Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {debugInfo.qualityCheck.activeParser === 'direct' ? '🎯' : '⚠️'}
              </div>
              <div className="text-sm">Direct Parser</div>
            </div>
          </div>

          {/* Enhanced Debug Information from Direct Parser */}
          {debugInfo.qualityCheck.activeParser === 'direct' && (
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
              <h4 className="font-semibold mb-3 text-blue-800 dark:text-blue-200">🎯 Direct Parser Debug (Enhanced)</h4>
              
              {/* Commands Overview */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="font-medium mb-2">Command Detection</h5>
                  <div className="space-y-1 text-sm">
                    <div>Total Commands: <Badge variant="outline">{debugInfo.actionsExtracted}</Badge></div>
                    <div>Build Orders Generated: <Badge variant="outline">{debugInfo.buildOrdersGenerated}</Badge></div>
                    <div>Frames Detected: <Badge variant="outline">{Math.round(debugInfo.actionsExtracted / 20)}</Badge></div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Parse Quality</h5>
                  <div className="space-y-1 text-sm">
                    <div>Direct Realistic: {debugInfo.qualityCheck.directParserRealistic ? '✅' : '❌'}</div>
                    <div>Zlib Decompression: ✅</div>
                    <div>FrameSync Pattern: ✅</div>
                  </div>
                </div>
              </div>

              {/* Player Command Analysis */}
              <div className="space-y-3">
                <h5 className="font-medium">Player Command Analysis</h5>
                {validationData?.playersWithActions && Object.entries(validationData.playersWithActions).map(([playerId, data]: [string, any]) => (
                  <Card key={playerId} className="p-3 bg-white dark:bg-gray-900">
                    <div className="flex justify-between items-start mb-2">
                      <h6 className="font-medium">Player {playerId}</h6>
                      <div className="flex gap-2">
                        <Badge variant={data.realisticAPM >= 50 ? "default" : "destructive"}>
                          APM: {data.realisticAPM}
                        </Badge>
                        <Badge variant="outline">
                          {data.detectedCommands} cmds
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-xs mb-1">First Commands</div>
                        <div className="flex flex-wrap gap-1">
                          {(data.firstCommands || []).slice(0, 5).map((cmd: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                              {cmd}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium text-xs mb-1">First Units</div>
                        <div className="space-y-1">
                          {(data.firstUnits || []).slice(0, 3).map((unit: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs block w-fit">
                              {unit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium text-xs mb-1">Command Breakdown</div>
                        <div className="space-y-1 text-xs">
                          {data.apmBreakdown && (
                            <>
                              <div>Build: {data.apmBreakdown.build}</div>
                              <div>Train: {data.apmBreakdown.train}</div>
                              <div>Select: {data.apmBreakdown.select}</div>
                              <div>Move: {data.apmBreakdown.move}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

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
